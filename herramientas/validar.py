#!/usr/bin/env python3
"""Validador de datos del Atlas de la Filosofía.

Uso:
    python3 herramientas/validar.py                 # valida todos los archivos de datos/
    python3 herramientas/validar.py datos/x.json    # valida solo los archivos indicados

Los archivos se validan juntos, porque un enlace de un archivo puede apuntar
a un nodo de otro (por ejemplo, una relación «paralelo a» entre tradiciones).
Termina con código 1 si encuentra errores.
"""
import collections
import glob
import json
import os
import re
import sys

TIPOS_NODO = {"autor", "obra", "concepto", "tesis", "escuela", "contexto", "tematica"}
TRADICIONES = {"grecorromana", "india", "china", "proximo_oriente", "transversal"}
CERTEZAS = set("DPCL")
ENLACE = re.compile(r"\[\[([^\]|]+)(?:\|[^\]]*)?\]\]")
REFERENCIA = re.compile(r"\(([^()]*· [^()]*)\)")


def cargar(rutas):
    nodos, relaciones, tipos = [], [], {}
    for ruta in rutas:
        with open(ruta, encoding="utf-8") as f:
            datos = json.load(f)
        for n in datos.get("nodos", []):
            n["_archivo"] = os.path.basename(ruta)
            nodos.append(n)
        for r in datos.get("relaciones", []):
            r["_archivo"] = os.path.basename(ruta)
            relaciones.append(r)
        tipos.update(datos.get("tiposRelacion", {}))
    return nodos, relaciones, tipos


def validar(nodos, relaciones, tipos):
    errores, avisos = [], []
    cuenta = collections.Counter(n["id"] for n in nodos)
    for i, veces in cuenta.items():
        if veces > 1:
            # Las temáticas se repiten a propósito en cada archivo; solo avisamos si difieren.
            iguales = {json.dumps({k: v for k, v in n.items() if k != "_archivo"}, sort_keys=True)
                       for n in nodos if n["id"] == i}
            if len(iguales) > 1:
                errores.append(f"{i}: definido {veces} veces con contenido distinto")
    ids = set(cuenta)

    for n in nodos:
        i = n["id"]
        if n.get("tipo") not in TIPOS_NODO:
            errores.append(f"{i}: tipo desconocido «{n.get('tipo')}»")
        elif not i.startswith(n["tipo"] + "."):
            errores.append(f"{i}: el prefijo del id no coincide con el tipo")
        for campo in ("nombre", "tradicion", "contextos", "resumen"):
            if campo not in n:
                errores.append(f"{i}: falta el campo obligatorio «{campo}»")
        if n.get("tradicion") not in TRADICIONES:
            errores.append(f"{i}: tradición desconocida «{n.get('tradicion')}»")
        for campo in ("contextos", "tematicas", "escuelas"):
            for ref in n.get(campo, []):
                if ref not in ids:
                    errores.append(f"{i}: {campo} apunta a «{ref}», que no existe")
        for campo in ("resumen", "profundizacion", "anecdotas"):
            texto = n.get(campo, "")
            if texto.count("[[") != texto.count("]]"):
                errores.append(f"{i}: corchetes desparejados en {campo}")
            for destino in ENLACE.findall(texto):
                if destino not in ids:
                    errores.append(f"{i}: enlace roto a «{destino}» en {campo}")
        if n.get("tipo") == "autor":
            if n.get("circulo") not in (1, 2, 3):
                errores.append(f"{i}: círculo debe ser 1, 2 o 3")
            if not n.get("fechas"):
                errores.append(f"{i}: faltan las fechas")
            if n.get("circulo") == 1:
                for campo in ("profundizacion", "anecdotas"):
                    if not n.get(campo):
                        errores.append(f"{i}: autor del círculo 1 sin {campo}")
            anecdotas = n.get("anecdotas", "")
            if anecdotas:
                for ref in REFERENCIA.findall(anecdotas):
                    if not re.search(r" · [ABCL]$", ref):
                        errores.append(f"{i}: referencia mal formada «({ref})»")
                if not re.search(r"· [ABCL]\)\.?$", anecdotas.strip()):
                    errores.append(f"{i}: la última anécdota no termina con su referencia")

    ids_rel = collections.Counter(r["id"] for r in relaciones)
    for i, veces in ids_rel.items():
        if veces > 1:
            errores.append(f"relación {i}: id repetido")
    conectados = set()
    tradicion = {n["id"]: n.get("tradicion") for n in nodos}
    for r in relaciones:
        rid = r["id"]
        for extremo in ("origen", "destino"):
            if r.get(extremo) not in ids:
                errores.append(f"{rid}: {extremo} «{r.get(extremo)}» no existe")
        if r.get("tipo") not in tipos:
            errores.append(f"{rid}: tipo de relación desconocido «{r.get('tipo')}»")
        if r.get("certeza") not in CERTEZAS:
            errores.append(f"{rid}: certeza debe ser D, P, C o L")
        if r.get("tipo") == "paralelo_a" and not r.get("ejeComparacion"):
            errores.append(f"{rid}: «paralelo a» sin ejeComparacion")
        if (r.get("tipo") == "influyo_en"
                and tradicion.get(r.get("origen")) != tradicion.get(r.get("destino"))
                and not r.get("fuente")):
            errores.append(f"{rid}: «influyó en» entre tradiciones sin fuente antigua citada")
        conectados |= {r.get("origen"), r.get("destino")}

    aislados = sorted(n["id"] for n in nodos
                      if n["id"] not in conectados and n["tipo"] in ("autor", "obra", "concepto", "tesis"))
    if aislados:
        avisos.append("nodos sin ninguna relación: " + ", ".join(aislados))
    return errores, avisos


def main():
    rutas = sys.argv[1:] or sorted(glob.glob(os.path.join(os.path.dirname(__file__), "..", "datos", "*.json")))
    if not rutas:
        print("No hay archivos de datos que validar.")
        return 1
    nodos, relaciones, tipos = cargar(rutas)
    errores, avisos = validar(nodos, relaciones, tipos)
    print("Archivos:", ", ".join(os.path.basename(r) for r in rutas))
    if errores:
        print(f"\n{len(errores)} ERRORES:")
        for e in errores:
            print("  -", e)
    else:
        print("\nSin errores.")
    for a in avisos:
        print("AVISO:", a)
    unicos = {n["id"]: n for n in nodos}.values()
    print("\nResumen:", dict(collections.Counter(n["tipo"] for n in unicos)),
          f"| {len(unicos)} nodos | {len(relaciones)} relaciones")
    return 1 if errores else 0


if __name__ == "__main__":
    sys.exit(main())
