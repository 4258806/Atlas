#!/usr/bin/env python3
"""Atlas Full: explicit local administration, dry-run by default."""
import sys

sys.dont_write_bytecode = True
from atlas_full.cli import main

if __name__ == '__main__':
    main()
