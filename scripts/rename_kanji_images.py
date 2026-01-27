#!/usr/bin/env python3
"""
Rename kanji image files in given level directories to sequential numeric names
and update the local mappings.csv to point to the new filenames.

Usage:
  python scripts/rename_kanji_images.py public/kanji/level-7
  python scripts/rename_kanji_images.py public/kanji/level-8

This script copies files to new names (keeps originals) and writes a backup
of the original mappings.csv as mappings.csv.bak.
"""
import sys
import os
import shutil
import csv


def process_level(level_dir):
    images_dir = os.path.join(level_dir, 'images')
    mappings_path = os.path.join(level_dir, 'mappings.csv')

    if not os.path.isdir(images_dir):
        print(f"images directory not found: {images_dir}")
        return
    if not os.path.isfile(mappings_path):
        print(f"mappings.csv not found: {mappings_path}")
        return

    files = [f for f in os.listdir(images_dir) if os.path.isfile(os.path.join(images_dir, f))]
    files.sort()
    if not files:
        print(f"no image files in {images_dir}")
        return

    padding = max(3, len(str(len(files))))
    mapping = {}
    for i, fname in enumerate(files, start=1):
        ext = os.path.splitext(fname)[1]
        newname = f"{str(i).zfill(padding)}{ext}"
        mapping[fname] = newname

    # Copy files to new names (do not overwrite existing new name)
    for old, new in mapping.items():
        src = os.path.join(images_dir, old)
        dst = os.path.join(images_dir, new)
        if os.path.exists(dst):
            print(f"target exists, skipping copy: {dst}")
            continue
        try:
            shutil.copy2(src, dst)
        except Exception as e:
            print(f"failed to copy {src} -> {dst}: {e}")

    # Update mappings.csv
    bak_path = mappings_path + '.bak'
    shutil.copy2(mappings_path, bak_path)

    rows = []
    with open(mappings_path, newline='', encoding='utf-8') as f:
        reader = csv.reader(f)
        for row in reader:
            if not row:
                rows.append(row)
                continue
            path = row[0]
            if path.startswith('images/'):
                oldbase = os.path.basename(path)
                if oldbase in mapping:
                    row[0] = 'images/' + mapping[oldbase]
            rows.append(row)

    # Write updated csv
    with open(mappings_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerows(rows)

    print(f"processed {level_dir}: {len(mapping)} files; backup at {bak_path}")


def main():
    if len(sys.argv) < 2:
        print('Usage: python scripts/rename_kanji_images.py <level-dir> [<level-dir> ...]')
        sys.exit(1)
    for level in sys.argv[1:]:
        process_level(level)


if __name__ == '__main__':
    main()
