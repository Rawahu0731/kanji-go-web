#!/usr/bin/env python3
import requests
from bs4 import BeautifulSoup

url = "https://w.atwiki.jp/yuia_sk/pages/16.html"
response = requests.get(url, timeout=10)
response.encoding = response.apparent_encoding

soup = BeautifulSoup(response.text, 'html.parser')
h3_tags = soup.find_all('h3')

print("最初の20個のh3とその下の要素を表示:\n")

for i, h3 in enumerate(h3_tags[:20], 1):
    print(f"\n{'='*80}")
    print(f"=== h3 #{i} ===")
    print(f"{'='*80}")
    print(f"h3のHTML:\n{h3}\n")
    print(f"h3のテキスト: {h3.get_text()}\n")
    
    # h3の後の要素を表示
    print("h3の後の要素:")
    current = h3.next_sibling
    element_count = 0
    
    while current and element_count < 10:
        if hasattr(current, 'name') and current.name:
            if current.name == 'h3':
                print(f"\n  次のh3に到達したので終了")
                break
            
            print(f"\n  要素 {element_count}: <{current.name}>")
            # div要素は全体を表示
            if current.name == 'div':
                print(f"  HTML:\n{current.prettify()[:1000]}")
            else:
                print(f"  HTML: {str(current)[:500]}")
            
            element_count += 1
        
        current = current.next_sibling
    
    print()

