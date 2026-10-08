#!/usr/bin/env python3
"""Valida los datos del Atlas de la Filosofía con el validador común del núcleo.

El validador vive en el repositorio ATLAS_NUCLEO. Este script lo busca y lo
ejecuta sobre este atlas:

    python3 herramientas/validar.py [--con RUTA_DE_OTRO_ATLAS ...]

Dónde busca el núcleo, por este orden:
  1. la variable de entorno ATLAS_NUCLEO;
  2. una carpeta atlas_nucleo o ATLAS_NUCLEO junto a este repositorio.

Para tenerlo, basta con clonar los dos repositorios en la misma carpeta:
    git clone https://github.com/caducidad/ATLAS_NUCLEO atlas_nucleo
"""
import os
import subprocess
import sys

AQUI = os.path.dirname(os.path.abspath(__file__))
ATLAS = os.path.normpath(os.path.join(AQUI, ".."))


def buscar_nucleo():
    candidatos = [os.environ.get("ATLAS_NUCLEO", "")]
    padre = os.path.dirname(ATLAS)
    candidatos += [os.path.join(padre, nombre) for nombre in ("atlas_nucleo", "ATLAS_NUCLEO")]
    for ruta in candidatos:
        if ruta and os.path.exists(os.path.join(ruta, "herramientas", "validar.py")):
            return ruta
    return None


def main():
    nucleo = buscar_nucleo()
    if not nucleo:
        print(__doc__)
        print("No encuentro el núcleo. Clónalo junto a este repositorio o indica su ruta en ATLAS_NUCLEO.")
        return 1
    orden = [sys.executable, os.path.join(nucleo, "herramientas", "validar.py"), ATLAS] + sys.argv[1:]
    return subprocess.call(orden)


if __name__ == "__main__":
    sys.exit(main())
