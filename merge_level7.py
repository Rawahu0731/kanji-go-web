#!/usr/bin/env python3
"""temp_dir の mappings.csv と images を既存の level-7 ディレクトリにマージするスクリプト

使い方:
    python merge_level7.py /absolute/path/to/temp_dir /absolute/path/to/target_dir

例:
    python merge_level7.py public/kanji/level-7-36 public/kanji/level-7
"""
import csv
import os
import shutil
import sys
from pathlib import Path


def safe_filename(s: str):
    # 画像用の簡易ファイル名クリーニング
    for bad in ['/', '\\', '"', "'", ':', '*', '?', '<', '>', '|']:
        s = s.replace(bad, '_')
    s = s.replace('、', ',')
    return s


def main():
    if len(sys.argv) < 3:
        print('usage: merge_level7.py <temp_dir> <target_dir>')
        sys.exit(1)

    temp_dir = Path(sys.argv[1])
    target_dir = Path(sys.argv[2])

    temp_csv = temp_dir / 'mappings.csv'
    temp_images = temp_dir / 'images'
    target_csv = target_dir / 'mappings.csv'
    target_images = target_dir / 'images'

    if not temp_csv.exists():
        print('temp mappings.csv not found:', temp_csv)
        sys.exit(1)
    if not temp_images.exists():
        print('temp images dir not found:', temp_images)
        sys.exit(1)
    if not target_csv.exists():
        print('target mappings.csv not found:', target_csv)
        sys.exit(1)
    if not target_images.exists():
        target_images.mkdir(parents=True, exist_ok=True)

    # 既存のCSVを読み込む
    with open(target_csv, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        existing_fieldnames = reader.fieldnames or ['path','reading']
        existing_rows = list(reader)

    # 新しく追加するCSVを読み込む
    with open(temp_csv, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        temp_fieldnames = reader.fieldnames or ['path','reading']
        temp_rows = list(reader)

    # 結合後のフィールド名を統一
    fieldnames = ['path','reading','additional_info']

    # 既存行に additional_info カラムが無ければ空フィールドを追加
    for r in existing_rows:
        if 'additional_info' not in r:
            r['additional_info'] = ''

    # 画像の最大連番を既存から取得
    max_idx = 0
    for r in existing_rows:
        p = r.get('path','')
        if p:
            name = os.path.basename(p)
            try:
                idx = int(name.split('_',1)[0])
                if idx > max_idx:
                    max_idx = idx
            except Exception:
                continue

    next_idx = max_idx + 1

    new_rows = []
    for tr in temp_rows:
        src_path = temp_images / os.path.basename(tr['path'])
        # 読みがあることを前提に安全なファイル名を作る
        reading = tr.get('reading','')
        safe_read = safe_filename(reading)
        new_name = f"{next_idx}_{safe_read}.png"
        dst_path = target_images / new_name
        # コピー
        try:
            shutil.copy2(src_path, dst_path)
        except Exception as e:
            print('failed to copy', src_path, '->', dst_path, e)
            continue
        # 追加情報
        additional = tr.get('additional_info','') if 'additional_info' in tr else ''
        new_rows.append({'path': f'images/{new_name}', 'reading': reading, 'additional_info': additional})
        next_idx += 1

    # 結合して上書き
    combined = existing_rows + new_rows
    with open(target_csv, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(combined)

    print(f'merged {len(new_rows)} rows into {target_csv}')

if __name__ == '__main__':
    main()
