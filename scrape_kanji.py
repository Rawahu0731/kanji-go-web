#!/usr/bin/env python3
"""
漢字データをスクレイピングするスクリプト

使用方法:
    python scrape_kanji.py <URL> <出力ディレクトリ>

例:
    python scrape_kanji.py https://w.atwiki.jp/yuia_sk/pages/16.html public/kanji/level-7
"""

import argparse
import csv
import os
import re
import sys
from pathlib import Path
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup


def download_image(image_url, save_path):
    """画像をダウンロードして保存する"""
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
        response = requests.get(image_url, headers=headers, timeout=10)
        response.raise_for_status()
        
        with open(save_path, 'wb') as f:
            f.write(response.content)
        print(f"  画像を保存: {save_path}")
        return True
    except Exception as e:
        print(f"  画像のダウンロードに失敗: {image_url} - {e}")
        return False


def extract_reading_from_element(element, skip_id=False):
    """要素から読み方を再帰的に抽出する（内部用ヘルパー関数）
    
    color: #F54738; のspan要素は ''で囲む
    """
    parts = []
    
    for content in element.children:
        # 文字列ノード
        if isinstance(content, str):
            text = content.strip()
            if not text:
                continue
            # HTMLコメントの断片を除外
            if text.startswith('<!--') or text == '@@@@@':
                continue
            # skip_idがTrueの場合、ID表記を除外
            if skip_id and (text.startswith('ID:') or text.startswith('ID')):
                continue
            parts.append(text)
        
        # タグノード
        elif hasattr(content, 'name'):
            style = content.get('style', '') or ''
            
            # color: #F54738 の場合は送り仮名として ''で囲む
            if '#F54738' in style or '#f54738' in style.lower():
                # この要素内のテキストを取得（コメントを除外）
                inner_text = ''.join([
                    s.strip() for s in content.strings 
                    if s.strip() and not s.strip().startswith('<!--') and s.strip() != '@@@@@'
                ])
                if inner_text:
                    parts.append(f"'{inner_text}'")
            else:
                # 再帰的に子要素を処理
                sub_parts = extract_reading_from_element(content, skip_id=False)
                if sub_parts:
                    parts.append(sub_parts)
    
    return ''.join(parts)


def extract_reading_from_h3(h3_element):
    """h3要素から読み方を抽出する
    
    例: "ID:0001 あやしい" -> "あや'しい'"
    color: #F54738; のspan要素は ''で囲む
    """
    reading = extract_reading_from_element(h3_element, skip_id=True)
    
    if not reading:
        return None
    
    # 全角スペースと「等」を削除
    reading = reading.replace('　', '').replace('等', '')
    
    return reading.strip() if reading else None


def scrape_kanji_data(url, output_dir):
    """指定されたURLまたはローカルファイルから漢字データをスクレイピングする"""
    
    print(f"URLまたはファイルにアクセス中: {url}")
    
    # ページを取得
    try:
        # ローカルファイルかどうかチェック
        if os.path.exists(url):
            print(f"ローカルファイルから読み込み: {url}")
            with open(url, 'r', encoding='utf-8') as f:
                html_content = f.read()
        else:
            # セッションを使用
            session = requests.Session()
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Language': 'ja,en-US;q=0.7,en;q=0.3',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
                'Cache-Control': 'max-age=0',
            }
            response = session.get(url, headers=headers, timeout=10)
            response.raise_for_status()
            response.encoding = response.apparent_encoding  # 文字化け対策
            html_content = response.text
    
        soup = BeautifulSoup(html_content, 'html.parser')
    except Exception as e:
        print(f"エラー: ページの取得に失敗しました - {e}")
        return False
    
    soup = BeautifulSoup(html_content, 'html.parser')
    
    # 出力ディレクトリを作成
    output_path = Path(output_dir)
    images_dir = output_path / 'images'
    images_dir.mkdir(parents=True, exist_ok=True)
    
    # CSVデータを格納するリスト
    csv_data = []
    
    # h3タグを全て取得
    h3_tags = soup.find_all('h3')
    
    if not h3_tags:
        print("警告: h3タグが見つかりませんでした")
        return False
    
    print(f"\n{len(h3_tags)}個のh3タグを発見")
    
    for idx, h3 in enumerate(h3_tags, start=1):
        print(f"\n処理中 [{idx}/{len(h3_tags)}]: {h3.get_text(strip=True)[:50]}...")
        
        # h3のテキストにID:0000のような形式が含まれているかチェック
        h3_text = h3.get_text(strip=True)
        if not re.match(r'^ID:\d{4}', h3_text):
            print(f"  スキップ: ID形式が見つかりません")
            continue
        
        # h3から読み方を抽出（h3要素全体を渡す）
        reading = extract_reading_from_h3(h3)
        
        if not reading:
            print(f"  スキップ: 読み方が見つかりませんでした")
            continue
        
        print(f"  読み方: {reading}")
        
        # h3の次の要素から画像を探す
        current = h3.next_sibling
        image_url = None
        image_saved = False
        has_additional_text = False
        additional_texts = []
        main_div = None
        
        # h3の後の要素を順に確認
        while current:
            # 次のh3が来たら終了
            if hasattr(current, 'name') and current.name == 'h3':
                break
            
            # imgタグまたはpictureタグを探す
            if hasattr(current, 'name') and current.name:
                # divタグを保存（画像とテキストが含まれている）
                if current.name == 'div' and not image_saved:
                    main_div = current
                
                # pictureタグ内のsource要素を探す
                picture = current.find('picture') if current.name != 'picture' else current
                img = None
                
                if picture and not image_saved:
                    # imgタグからsrcを取得
                    img_tag = picture.find('img')
                    if img_tag:
                        image_url = img_tag.get('src')
                        if image_url:
                            # プロトコルがない場合は追加
                            if image_url.startswith('//'):
                                image_url = 'https:' + image_url
                            # 相対URLを絶対URLに変換
                            image_url = urljoin(url, image_url)
                            
                            # 画像ファイル名を生成
                            # ファイル名を安全な形式に変換（'を削除）
                            safe_reading = reading.replace('、', ',').replace('/', '_').replace('\\', '_').replace("'", '')
                            image_filename = f"{idx}_{safe_reading}.png"
                            image_path = images_dir / image_filename
                            
                            # 画像をダウンロード
                            if download_image(image_url, image_path):
                                image_saved = True
                                
                                # main_divから追加情報を抽出
                                if main_div:
                                    # divの直接の子要素からテキストノードを抽出
                                    for child in main_div.children:
                                        # テキストノードの場合
                                        if isinstance(child, str):
                                            text = child.strip()
                                            if text and not text.startswith('<!--'):
                                                additional_texts.append(text)
                                                has_additional_text = True
                                
                                # CSVに保存（追加情報があれば含める）
                                additional_info = '　'.join(additional_texts) if additional_texts else ''
                                csv_data.append({
                                    'path': f'images/{image_filename}',
                                    'reading': reading,
                                    'additional_info': additional_info
                                })
                
                # pictureが見つからない場合はimgタグを直接探す
                if not image_saved:
                    img_tag = current.find('img') if current.name != 'img' else current
                    if img_tag:
                        image_url = img_tag.get('src')
                        if image_url:
                            # プロトコルがない場合は追加
                            if image_url.startswith('//'):
                                image_url = 'https:' + image_url
                            # 相対URLを絶対URLに変換
                            image_url = urljoin(url, image_url)
                            
                            # 画像ファイル名を生成
                            safe_reading = reading.replace('、', ',').replace('/', '_').replace('\\', '_').replace("'", '')
                            image_filename = f"{idx}_{safe_reading}.png"
                            image_path = images_dir / image_filename
                            
                            # 画像をダウンロード
                            if download_image(image_url, image_path):
                                image_saved = True
                                
                                # main_divから追加情報を抽出
                                if main_div:
                                    # divの直接の子要素からテキストノードを抽出
                                    for child in main_div.children:
                                        # テキストノードの場合
                                        if isinstance(child, str):
                                            text = child.strip()
                                            if text and not text.startswith('<!--'):
                                                additional_texts.append(text)
                                                has_additional_text = True
                                
                                # CSVに保存（追加情報があれば含める）
                                additional_info = '　'.join(additional_texts) if additional_texts else ''
                                csv_data.append({
                                    'path': f'images/{image_filename}',
                                    'reading': reading,
                                    'additional_info': additional_info
                                })
            
            current = current.next_sibling
        
        # 追加テキストがあれば表示
        if has_additional_text:
            print(f"  追加情報: {', '.join(additional_texts)}")
        
        if not image_saved:
            print(f"  警告: 画像が見つかりませんでした")
    
    # CSVファイルに書き込み
    if csv_data:
        csv_path = output_path / 'mappings.csv'
        with open(csv_path, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=['path', 'reading', 'additional_info'])
            writer.writeheader()
            writer.writerows(csv_data)
        
        print(f"\n✓ CSVファイルを保存: {csv_path}")
        print(f"✓ 合計 {len(csv_data)} 件のデータを保存しました")
        return True
    else:
        print("\nエラー: データが取得できませんでした")
        return False


def main():
    parser = argparse.ArgumentParser(
        description='漢字データをスクレイピングしてCSVと画像を保存します',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
使用例:
  python scrape_kanji.py https://w.atwiki.jp/yuia_sk/pages/16.html public/kanji/level-7
  python scrape_kanji.py https://w.atwiki.jp/yuia_sk/pages/17.html public/kanji/level-8
        """
    )
    
    parser.add_argument('url', help='スクレイピング対象のURL')
    parser.add_argument('output_dir', help='出力ディレクトリのパス')
    
    args = parser.parse_args()
    
    # スクレイピング実行
    success = scrape_kanji_data(args.url, args.output_dir)
    
    if success:
        print("\n✓ スクレイピングが完了しました!")
        sys.exit(0)
    else:
        print("\n✗ スクレイピングに失敗しました")
        sys.exit(1)


if __name__ == '__main__':
    main()
