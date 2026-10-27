
import csv
import re
import time
from io import BytesIO
from pathlib import Path
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup, Tag, NavigableString
from PIL import Image


# ==================================================
# 設定：実行前にここを変更する
# ==================================================

LEVEL = 7

START_URL = "https://w.atwiki.jp/yuia_sk/pages/16.html"

# ==================================================
# 基本設定
# ==================================================

BASE_DIR = Path(__file__).resolve().parent
WIKI_DOMAIN = "w.atwiki.jp"

CSV_COLUMNS = [
    "path",
    "reading",
    "additional_info",
    "components",
]

HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; KanjiDataCollector/1.0)"
}

REQUEST_DELAY = 0.5


def normalize_text(text):
    """余分な空白を整理する。"""
    return re.sub(r"\s+", " ", text).strip()


def is_red(node):
    """文字またはその祖先要素が赤文字指定か判定する。"""
    current = node if isinstance(node, Tag) else node.parent

    while isinstance(current, Tag):
        color = current.get("color", "").lower().replace(" ", "")
        style = current.get("style", "").lower().replace(" ", "")

        if color in {
            "red",
            "#f00",
            "#ff0000",
            "rgb(255,0,0)",
        }:
            return True

        if re.search(
            r"color:(?:red|#f00(?:0)?|#ff0000|rgb\(255,0,0\))"
            r"(?:;|$|!)",
            style,
        ):
            return True

        current = current.parent

    return False


def extract_reading(h3):
    """
    h3から読み方を抽出する。
    赤文字部分を半角のシングルクォートで囲む。
    """
    parts = []

    for node in h3.descendants:
        if not isinstance(node, NavigableString):
            continue

        text = str(node)

        # 問題IDを除去する
        if not parts:
            text = re.sub(
                r"^\s*ID\s*:\s*Lv\d+_\d+\s*",
                "",
                text,
                count=1,
                flags=re.IGNORECASE,
            )

        if not text:
            continue

        red = is_red(node)

        # 同じ色の隣接するテキストをまとめる
        if parts and parts[-1][0] == red:
            parts[-1] = (red, parts[-1][1] + text)
        else:
            parts.append((red, text))

    result = "".join(
        f"'{text}'" if red else text
        for red, text in parts
    )

    return result.strip()


def extract_problem_id(h3):
    """見出しからレベル番号と問題番号を取得する。"""
    text = h3.get_text(" ", strip=True)

    match = re.search(
        r"ID\s*:\s*Lv(\d+)_(\d+)",
        text,
        re.IGNORECASE,
    )

    if not match:
        return None, None

    return int(match.group(1)), int(match.group(2))


def safe_filename(text):
    """ファイル名に使えない文字を置換する。"""
    text = text.replace("、", ",")

    # ファイル名から送り仮名の区切り記号を取り除く
    text = text.replace("'", "")

    text = re.sub(r'[\\/:*?"<>|\x00-\x1f]', "_", text)

    return text.strip(" .") or "unknown"


def get_problem_section(h3):
    """現在のh3から次のh3までの要素を取得する。"""
    elements = []

    for element in h3.find_all_next():
        if element.name == "h3":
            break

        elements.append(element)

    return elements


def extract_image_url(section, page_url):
    """問題画像のURLを取得する。"""
    for element in section:
        if element.name != "img":
            continue

        image_src = element.get("src")

        if not image_src:
            continue

        parent = element.parent

        # 画像が画像ファイルへのリンクで囲まれていればリンク先を優先
        if isinstance(parent, Tag) and parent.name == "a":
            href = parent.get("href")

            if href:
                linked_url = urljoin(page_url, href)
                path = urlparse(linked_url).path.lower()

                if re.search(
                    r"\.(png|jpe?g|gif|webp|bmp)(?:$)",
                    path,
                ):
                    return linked_url

        return urljoin(page_url, image_src)

    return None


def extract_additional_info(section):
    """
    問題の追加情報を取得する。
    テキスト・IDS・意味の説明は除外する。
    """
    values = []

    excluded_prefixes = (
        "テキスト：",
        "テキスト:",
        "意味：",
        "意味:",
        "IDS：",
        "IDS:",
    )

    for element in section:
        if element.name != "p":
            continue

        if element.find("img") is not None:
            continue

        text = normalize_text(
            element.get_text(" ", strip=True)
        )

        if not text:
            continue

        if text.startswith(excluded_prefixes):
            continue

        values.append(text)

    # 同じ情報の重複を除去する
    return "　".join(dict.fromkeys(values))


def download_as_png(session, image_url, destination):
    """画像をダウンロードしてPNG形式で保存する。"""
    response = session.get(
        image_url,
        timeout=30,
    )
    response.raise_for_status()

    with Image.open(BytesIO(response.content)) as image:
        image.load()

        if image.mode not in ("RGB", "RGBA"):
            if "transparency" in image.info:
                image = image.convert("RGBA")
            else:
                image = image.convert("RGB")

        image.save(destination, format="PNG")


def get_continuation_urls(soup, current_url, level):
    """同じレベルの続きのページへのリンクを探す。"""
    urls = []

    page_text = normalize_text(
        soup.get_text(" ", strip=True)
    )

    level_match = re.search(r"Lv\.\s*(\d+)", page_text)

    # ページ内にレベル番号がある場合は確認する
    if level_match and int(level_match.group(1)) != level:
        return urls

    for anchor in soup.find_all("a", href=True):
        text = normalize_text(
            anchor.get_text(" ", strip=True)
        )

        if not re.search(r"ID\s*:\s*\d+\s*~", text):
            continue

        url = urljoin(current_url, anchor["href"])
        parsed = urlparse(url)

        if parsed.netloc.lower() != WIKI_DOMAIN:
            continue

        if url not in urls:
            urls.append(url)

    return urls


def scrape_page(session, page_url, level, image_dir):
    """1ページ分の問題データを取得する。"""
    print(f"\n取得中: {page_url}")

    response = session.get(
        page_url,
        timeout=30,
    )
    response.raise_for_status()

    soup = BeautifulSoup(response.text, "html.parser")

    records = []
    headings = soup.find_all("h3")

    for h3 in headings:
        page_level, number = extract_problem_id(h3)

        if page_level is None or number is None:
            continue

        if page_level != level:
            continue

        reading = extract_reading(h3)

        if not reading:
            print(f"  警告: ID {number} の読み方を取得できません")
            continue

        section = get_problem_section(h3)
        image_url = extract_image_url(section, page_url)

        if not image_url:
            print(f"  警告: ID {number} の画像が見つかりません")
            continue

        filename_reading = safe_filename(reading)
        filename = f"{number}_{filename_reading}.png"
        destination = image_dir / filename

        try:
            download_as_png(
                session,
                image_url,
                destination,
            )
        except Exception as error:
            print(f"  画像取得失敗 ID {number}: {error}")
            continue

        additional_info = extract_additional_info(section)

        records.append({
            "path": f"images/{filename}",
            "reading": reading,
            "additional_info": additional_info,
            "components": "",
            "_number": number,
        })

        print(f"  OK: {number} {reading}")

        time.sleep(REQUEST_DELAY)

    next_urls = get_continuation_urls(
        soup,
        page_url,
        level,
    )

    return records, next_urls


def main():
    level = LEVEL
    start_url = START_URL

    # 設定を表示して、実行前に確認する
    print("=" * 55)
    print("漢字スクレイピング")
    print("=" * 55)
    print(f"取得レベル : {level}")
    print(f"開始URL    : {start_url}")
    print(f"保存先     : public/kanji/level-{level}/")
    print("既存ファイル: 削除しない")
    print("=" * 55)

    confirm = input("この設定で開始しますか？ (y/n): ").strip().lower()

    if confirm != "y":
        print("キャンセルしました。")
        return

    output_dir = (
        BASE_DIR
        / "public"
        / "kanji"
        / f"level-{level}"
    )

    image_dir = output_dir / "images"
    csv_path = output_dir / "mappings.csv"

    # フォルダが存在しない場合だけ作成する
    image_dir.mkdir(parents=True, exist_ok=True)

    session = requests.Session()
    session.headers.update(HEADERS)

    pending_urls = [start_url]
    visited_urls = set()
    all_records = []

    # ページを順番に巡回する
    while pending_urls:
        page_url = pending_urls.pop(0)

        if page_url in visited_urls:
            continue

        visited_urls.add(page_url)

        try:
            records, next_urls = scrape_page(
                session,
                page_url,
                level,
                image_dir,
            )

            all_records.extend(records)

            for url in next_urls:
                if (
                    url not in visited_urls
                    and url not in pending_urls
                ):
                    pending_urls.append(url)

        except Exception as error:
            print(f"ページ取得失敗: {page_url}")
            print(f"理由: {error}")

        time.sleep(REQUEST_DELAY)

    # 問題番号順に並べる
    all_records.sort(
        key=lambda row: row["_number"]
    )

    # 既存CSVに登録済みのpathを取得する
    existing_paths = set()

    if csv_path.exists() and csv_path.stat().st_size > 0:
        with csv_path.open(
            "r",
            encoding="utf-8-sig",
            newline="",
        ) as file:
            reader = csv.DictReader(file)

            for row in reader:
                if row.get("path"):
                    existing_paths.add(row["path"])

    new_records = []

    for row in all_records:
        row.pop("_number", None)

        if row["path"] in existing_paths:
            print(f"CSV重複のためスキップ: {row['path']}")
            continue

        new_records.append(row)
        existing_paths.add(row["path"])

    # CSVが空または存在しない場合のみヘッダーを書く
    needs_header = (
        not csv_path.exists()
        or csv_path.stat().st_size == 0
    )

    with csv_path.open(
        "a",
        encoding="utf-8-sig",
        newline="",
    ) as file:
        writer = csv.DictWriter(
            file,
            fieldnames=CSV_COLUMNS,
        )

        if needs_header:
            writer.writeheader()

        writer.writerows(new_records)

    print("\n" + "=" * 55)
    print("スクレイピング完了")
    print("=" * 55)
    print(f"取得ページ数       : {len(visited_urls)}")
    print(f"取得した問題数     : {len(all_records)}")
    print(f"CSVへの新規追加数  : {len(new_records)}")
    print(f"画像保存先         : {image_dir}")
    print(f"CSV保存先          : {csv_path}")
    print("=" * 55)


if __name__ == "__main__":
    main()
