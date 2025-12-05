#!/usr/bin/env python3
"""
ユーザーから提供されたHTMLを直接処理するスクリプト
"""

# HTMLコンテンツをここに埋め込む
# ユーザーから提供されたHTMLを保存して処理

import sys

# このスクリプトは、標準入力からHTMLを受け取って、
# scrape_kanji.pyと同じ処理を実行します

if __name__ == '__main__':
    print("このスクリプトは直接実行できません。")
    print("代わりに、以下のコマンドを使用してください：")
    print()
    print("1. ブラウザでHTMLを全選択してコピー")
    print("2. cat > page_17.html を実行")
    print("3. 貼り付けてCtrl+Dで保存")
    print("4. python scrape_kanji.py page_17.html public/kanji/level-8")
    sys.exit(1)
