#!/usr/bin/env python3
"""
Move original (non-sequential) image files to a backup folder or delete them.

Usage:
  python scripts/remove_original_kanji_images.py public/kanji/level-7 public/kanji/level-8

By default this moves any file in the `images` folder whose basename is not
pure digits (e.g. "001.png") into `images/originals_backup/<level>/`.
Pass `--delete` as first arg to permanently delete instead of moving.
"""
import sys
import os
import re
import shutil


def process_level(level_dir, do_delete=False):
    images_dir = os.path.join(level_dir, 'images')
    if not os.path.isdir(images_dir):
        print(f"images directory not found: {images_dir}")
        return

    files = [f for f in os.listdir(images_dir) if os.path.isfile(os.path.join(images_dir, f))]
    files.sort()
    if not files:
        print(f"no image files in {images_dir}")
        return

    digit_re = re.compile(r'^\d+$')
    to_move = []
    for fname in files:
        name, _ = os.path.splitext(fname)
        if not digit_re.match(name):
            to_move.append(fname)

    if not to_move:
        print(f"no originals to move/delete in {images_dir}")
        return

    if do_delete:
        for fname in to_move:
            p = os.path.join(images_dir, fname)
            try:
                os.remove(p)
            except Exception as e:
                print(f"failed to delete {p}: {e}")
        print(f"deleted {len(to_move)} files in {images_dir}")
        return

    # move to backup
    backup_root = os.path.join(images_dir, 'originals_backup')
    os.makedirs(backup_root, exist_ok=True)
    moved = 0
    for fname in to_move:
        src = os.path.join(images_dir, fname)
        dst = os.path.join(backup_root, fname)
        try:
            shutil.move(src, dst)
            moved += 1
        except Exception as e:
            print(f"failed to move {src} -> {dst}: {e}")

    print(f"moved {moved} original files from {images_dir} to {backup_root}")


def main():
    args = sys.argv[1:]
    do_delete = False
    if not args:
        print('Usage: python scripts/remove_original_kanji_images.py [--delete] <level-dir> [<level-dir> ...]')
        sys.exit(1)
    if args[0] == '--delete':
        do_delete = True
        args = args[1:]
    if not args:
        print('No level directories provided')
        sys.exit(1)

    for level in args:
        process_level(level, do_delete=do_delete)


if __name__ == '__main__':
    main()
