#!/usr/bin/env python3
"""
level-8のデータを直接抽出するスクリプト
ユーザーから提供されたHTMLデータを元に、CSVと画像URLのリストを生成する
"""

import csv
import re
from pathlib import Path

# ユーザーから提供されたHTMLから抽出したデータ
kanji_data = [
    {"id": "0001", "reading": "せい", "image_url": "https://img.atwiki.jp/yuia_sk/attach/17/55/ID081.png"},
    {"id": "0002", "reading": "とう", "image_url": "https://img.atwiki.jp/yuia_sk/attach/17/14/ID82.png"},
    {"id": "0003", "reading": "か", "image_url": "https://img.atwiki.jp/yuia_sk/attach/17/13/ID83.png"},
    {"id": "0004", "reading": "こう", "image_url": "https://img.atwiki.jp/yuia_sk/attach/17/12/ID84.png"},
    {"id": "0005", "reading": "かい", "image_url": "https://img.atwiki.jp/yuia_sk/attach/17/11/ID85.png"},
    {"id": "0006", "reading": "ぜん", "image_url": "https://img.atwiki.jp/yuia_sk/attach/17/21/ID86.png"},
    {"id": "0007", "reading": "ろく", "image_url": "https://img.atwiki.jp/yuia_sk/attach/17/20/ID87.png"},
    {"id": "0008", "reading": "ふ", "image_url": "https://img.atwiki.jp/yuia_sk/attach/17/19/ID88.png"},
    {"id": "0009", "reading": "てん", "image_url": "https://img.atwiki.jp/yuia_sk/attach/17/18/ID89.png"},
    {"id": "0010", "reading": "しょく", "image_url": "https://img.atwiki.jp/yuia_sk/attach/17/17/ID810.png"},
    {"id": "0011", "reading": "えい、ふん", "image_url": "https://img.atwiki.jp/yuia_sk/attach/17/16/ID811.png"},
    {"id": "0012", "reading": "そう、す", "image_url": "https://img.atwiki.jp/yuia_sk/attach/17/54/ID0812.png"},
    {"id": "0013", "reading": "か", "image_url": "https://img.atwiki.jp/yuia_sk/attach/17/53/ID0813.png"},
    {"id": "0014", "reading": "り", "image_url": "https://img.atwiki.jp/yuia_sk/attach/17/52/ID0814.png"},
    {"id": "0015", "reading": "とう", "image_url": "https://img.atwiki.jp/yuia_sk/attach/17/51/ID0815.png"},
    {"id": "0016", "reading": "きん、こん", "image_url": "https://img.atwiki.jp/yuia_sk/attach/17/50/ID0816.png"},
    {"id": "0017", "reading": "せき、しゃく", "image_url": "https://img.atwiki.jp/yuia_sk/attach/17/49/ID0817.png"},
    {"id": "0018", "reading": "ばく", "image_url": "https://img.atwiki.jp/yuia_sk/attach/17/48/ID0818.png"},
    {"id": "0019", "reading": "そ、ぞ", "image_url": "https://img.atwiki.jp/yuia_sk/attach/17/47/ID0819.png"},
    {"id": "0020", "reading": "ほう", "image_url": "https://img.atwiki.jp/yuia_sk/attach/17/46/ID0820.png"},
    {"id": "0021", "reading": "ほつ", "image_url": "https://img.atwiki.jp/yuia_sk/attach/17/121/ID0821.png"},
    {"id": "0022", "reading": "こう", "image_url": "https://img.atwiki.jp/yuia_sk/attach/17/120/ID0822.png"},
    {"id": "0023", "reading": "しん", "image_url": "https://img.atwiki.jp/yuia_sk/attach/17/119/ID0823.png"},
    {"id": "0024", "reading": "い", "image_url": "https://img.atwiki.jp/yuia_sk/attach/17/118/ID0824.png"},
    {"id": "0025", "reading": "しょう", "image_url": "https://img.atwiki.jp/yuia_sk/attach/17/117/ID0825.png"},
    {"id": "0026", "reading": "こ", "image_url": "https://img.atwiki.jp/yuia_sk/attach/17/116/ID0826.png"},
    {"id": "0027", "reading": "たい", "image_url": "https://img.atwiki.jp/yuia_sk/attach/17/115/ID0827.png"},
    {"id": "0028", "reading": "ぎょく、ほう", "image_url": "https://img.atwiki.jp/yuia_sk/attach/17/114/ID0828.png"},
    {"id": "0029", "reading": "きゅう", "image_url": "https://img.atwiki.jp/yuia_sk/attach/17/113/ID0829.png"},
    {"id": "0030", "reading": "じゃく", "image_url": "https://img.atwiki.jp/yuia_sk/attach/17/112/ID0830.png"},
    {"id": "0031", "reading": "るい", "image_url": "https://img.atwiki.jp/yuia_sk/attach/17/338/ID0831.jpg"},
    {"id": "0032", "reading": "けい", "image_url": "https://img.atwiki.jp/yuia_sk/attach/17/337/ID0832.jpg"},
    {"id": "0033", "reading": "うん", "image_url": "https://img.atwiki.jp/yuia_sk/attach/17/237/ID0833.png"},
    {"id": "0034", "reading": "ろう", "image_url": "https://img.atwiki.jp/yuia_sk/attach/17/236/ID0834.png"},
    {"id": "0035", "reading": "ご", "image_url": "https://img.atwiki.jp/yuia_sk/attach/17/235/ID0835.png"},
    {"id": "0036", "reading": "やく", "image_url": "https://img.atwiki.jp/yuia_sk/attach/17/234/ID0836.png"},
    {"id": "0037", "reading": "りゅう、りょう", "image_url": "https://img.atwiki.jp/yuia_sk/attach/17/233/ID0837.png"},
    {"id": "0038", "reading": "ひょう、きゅう", "image_url": "https://img.atwiki.jp/yuia_sk/attach/17/232/ID0838.png"},
    {"id": "0039", "reading": "えい", "image_url": "https://img.atwiki.jp/yuia_sk/attach/17/231/ID0839.png"},
    {"id": "0040", "reading": "に、じ", "image_url": "https://img.atwiki.jp/yuia_sk/attach/17/230/ID0840.png"},
    {"id": "0041", "reading": "びょう", "image_url": "https://img.atwiki.jp/yuia_sk/attach/17/229/ID0841.png"},
    {"id": "0042", "reading": "へつ", "image_url": "https://img.atwiki.jp/yuia_sk/attach/17/228/ID0842.png"},
    {"id": "0043", "reading": "かん", "image_url": "https://img.atwiki.jp/yuia_sk/attach/17/226/ID0843.png"},
    {"id": "0044", "reading": "ぼん", "image_url": "https://img.atwiki.jp/yuia_sk/attach/17/227/ID0844.png"},
    {"id": "0045", "reading": "ぶ、む", "image_url": "https://img.atwiki.jp/yuia_sk/attach/17/225/ID0845.png"},
    {"id": "0046", "reading": "ゆう", "image_url": "https://img.atwiki.jp/yuia_sk/attach/17/224/ID0846.png"},
    {"id": "0047", "reading": "りょう", "image_url": "https://img.atwiki.jp/yuia_sk/attach/17/223/ID0847.png"},
    {"id": "0048", "reading": "かん", "image_url": "https://img.atwiki.jp/yuia_sk/attach/17/222/ID0848.png"},
    {"id": "0049", "reading": "さつ、き", "image_url": "https://img.atwiki.jp/yuia_sk/attach/17/221/ID0849.png"},
    {"id": "0050", "reading": "さ", "image_url": "https://img.atwiki.jp/yuia_sk/attach/17/220/ID0850.png"},
    {"id": "0051", "reading": "い", "image_url": "https://img.atwiki.jp/yuia_sk/attach/17/375/ID0851.png"},
    {"id": "0052", "reading": "きょ", "image_url": "https://img.atwiki.jp/yuia_sk/attach/17/374/ID0852.png"},
    {"id": "0053", "reading": "けつ", "image_url": "https://img.atwiki.jp/yuia_sk/attach/17/373/ID0853.png"},
    {"id": "0054", "reading": "さつ", "image_url": "https://img.atwiki.jp/yuia_sk/attach/17/372/ID0854.png"},
    {"id": "0055", "reading": "ぎょう", "image_url": "https://img.atwiki.jp/yuia_sk/attach/17/371/ID0855.png"},
    {"id": "0056", "reading": "お", "image_url": "https://img.atwiki.jp/yuia_sk/attach/17/370/ID0856.png"},
    {"id": "0057", "reading": "きん", "image_url": "https://img.atwiki.jp/yuia_sk/attach/17/369/ID0857.png"},
    {"id": "0058", "reading": "もく", "image_url": "https://img.atwiki.jp/yuia_sk/attach/17/368/ID0858.png"},
    {"id": "0059", "reading": "せき", "image_url": "https://img.atwiki.jp/yuia_sk/attach/17/367/ID0859.png"},
    {"id": "0060", "reading": "どう", "image_url": "https://img.atwiki.jp/yuia_sk/attach/17/366/ID0860.png"},
    {"id": "0061", "reading": "こう", "image_url": "https://img.atwiki.jp/yuia_sk/attach/17/1111/ID0861.png"},
    {"id": "0062", "reading": "えん", "image_url": "https://img.atwiki.jp/yuia_sk/attach/17/1110/ID0862.png"},
    {"id": "0063", "reading": "りゅう、り", "image_url": "https://img.atwiki.jp/yuia_sk/attach/17/1109/ID0863.png"},
    {"id": "0064", "reading": "しき、さつ", "image_url": "https://img.atwiki.jp/yuia_sk/attach/17/1108/ID0864.png"},
    {"id": "0065", "reading": "きょう", "image_url": "https://img.atwiki.jp/yuia_sk/attach/17/1107/ID0865.png"},
    {"id": "0066", "reading": "こう", "image_url": "https://img.atwiki.jp/yuia_sk/attach/17/1106/ID0866.png"},
    {"id": "0067", "reading": "しん", "image_url": "https://img.atwiki.jp/yuia_sk/attach/17/1105/ID0867.png"},
    {"id": "0068", "reading": "こう", "image_url": "https://img.atwiki.jp/yuia_sk/attach/17/1104/ID0868.png"},
    {"id": "0069", "reading": "わつ", "image_url": "https://img.atwiki.jp/yuia_sk/attach/17/1103/ID0869.png"},
    {"id": "0070", "reading": "しん", "image_url": "https://img.atwiki.jp/yuia_sk/attach/17/1102/ID0870.png"},
    {"id": "0071", "reading": "とう、だつ", "image_url": "https://img.atwiki.jp/yuia_sk/attach/17/1934/ID08711.png"},
    {"id": "0072", "reading": "る", "image_url": "https://img.atwiki.jp/yuia_sk/attach/17/1925/ID0872.png"},
    {"id": "0073", "reading": "えき", "image_url": "https://img.atwiki.jp/yuia_sk/attach/17/1926/ID0873.png"},
    {"id": "0074", "reading": "きん", "image_url": "https://img.atwiki.jp/yuia_sk/attach/17/1927/ID0874.png"},
    {"id": "0075", "reading": "えん", "image_url": "https://img.atwiki.jp/yuia_sk/attach/17/1928/ID0875.png"},
    {"id": "0076", "reading": "よる", "image_url": "https://img.atwiki.jp/yuia_sk/attach/17/1935/スクリーンショット 2025-12-01 225057.png"},
    {"id": "0077", "reading": "こる", "image_url": "https://img.atwiki.jp/yuia_sk/attach/17/1929/ID0877.png"},
    {"id": "0078", "reading": "へび", "image_url": "https://img.atwiki.jp/yuia_sk/attach/17/1932/ID08778.png"},
    {"id": "0079", "reading": "おおう", "image_url": "https://img.atwiki.jp/yuia_sk/attach/17/1930/ID0879.png"},
    {"id": "0080", "reading": "さむい", "image_url": "https://img.atwiki.jp/yuia_sk/attach/17/1931/ID0880.png"},
]

def main():
    output_dir = Path("public/kanji/level-8")
    images_dir = output_dir / "images"
    images_dir.mkdir(parents=True, exist_ok=True)
    
    # CSVデータを作成
    csv_data = []
    
    for idx, item in enumerate(kanji_data, start=1):
        reading = item["reading"]
        image_url = item["image_url"]
        
        # ファイル名を生成
        safe_reading = reading.replace('、', ',').replace('/', '_').replace('\\', '_').replace("'", '')
        
        # 元のファイル名から拡張子を取得
        ext = '.png'
        if image_url.endswith('.jpg'):
            ext = '.jpg'
        
        image_filename = f"{idx}_{safe_reading}{ext}"
        
        csv_data.append({
            'path': f'images/{image_filename}',
            'reading': reading,
            'additional_info': '',
            'image_url': image_url  # ダウンロード用に保存
        })
        
        print(f"{idx}. {reading} -> {image_filename}")
    
    # CSVファイルに書き込み
    csv_path = output_dir / 'mappings.csv'
    with open(csv_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=['path', 'reading', 'additional_info'])
        writer.writeheader()
        for row in csv_data:
            writer.writerow({
                'path': row['path'],
                'reading': row['reading'],
                'additional_info': row['additional_info']
            })
    
    print(f"\n✓ CSVファイルを保存: {csv_path}")
    print(f"✓ 合計 {len(csv_data)} 件のデータを保存しました")
    
    # 画像URLリストを保存
    urls_path = output_dir / 'image_urls.txt'
    with open(urls_path, 'w', encoding='utf-8') as f:
        for item in csv_data:
            f.write(f"{item['image_url']}\t{item['path']}\n")
    
    print(f"✓ 画像URLリストを保存: {urls_path}")
    print("\n次のステップ:")
    print("画像をダウンロードするには:")
    print(f"  cd {output_dir} && cat image_urls.txt | while IFS=$'\\t' read url path; do curl -L -o \"$path\" \"$url\"; done")

if __name__ == '__main__':
    main()
