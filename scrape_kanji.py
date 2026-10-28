
import csv
import re
import time
from copy import copy
from io import BytesIO
from pathlib import Path
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup, Tag, NavigableString, Comment
from PIL import Image


# ============================================================
# 設定
# ============================================================

LEVEL = 3

# 取得するページを順番に指定する
URLS = [
    "https://w.atwiki.jp/yuia_sk/pages/29.html"   
]

BASE_DIR = Path(__file__).resolve().parent
PUBLIC_DIR = BASE_DIR / "public"
LEVEL_DIR = PUBLIC_DIR / "kanji" / f"level-{LEVEL}"
IMAGE_DIR = LEVEL_DIR / "images"
CSV_PATH = LEVEL_DIR / "mappings.csv"

CSV_COLUMNS = [
    "path",
    "reading",
    "additional_info",
    "components",
]

WIKI_DOMAIN = "w.atwiki.jp"

REQUEST_INTERVAL = 1.0

# 画像のダウンロード設定
DOWNLOAD_MAX_ATTEMPTS = 3
DOWNLOAD_RETRY_INTERVAL = 2.0
DOWNLOAD_TIMEOUT = 30

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/131.0.0.0 Safari/537.36"
    )
}


# ============================================================
# ジャンル設定
# ============================================================

genres = [
    "動物",
    "植物・藻類",
    "地名・建造物",
    "人名",
    "スラング",
    "飲食",
    "単位",
    "演目・外題",
    "則天文字",
    "チュノム",
    "元素",
    "嘘字",
    "簡体字",
    "文学の漢字",
    "字義未詳",
    "西夏文字",
    "女真文字",
]


# ============================================================
# 共通処理
# ============================================================

def normalize_text(text):
    """連続する空白や改行を整理する。"""
    return re.sub(r"\s+", " ", text).strip()


def is_red(tag):
    """赤文字のspanかどうかを判定する。"""
    if not isinstance(tag, Tag):
        return False

    style = tag.get("style", "").lower().replace(" ", "")
    color = tag.get("color", "").lower().replace(" ", "")

    return (
        "#f54738" in style
        or "rgb(245,71,56)" in style
        or color in {"red", "#f54738"}
    )


def extract_problem_id(h3):
    """見出しからレベルと問題番号を取得する。"""
    text = h3.get_text(" ", strip=True)

    match = re.search(
        r"ID\s*:\s*Lv\.?\s*(\d+)\s*[_＿]\s*(\d+)",
        text,
        re.IGNORECASE,
    )

    if match:
        return int(match.group(1)), int(match.group(2))

    match = re.search(
        r"ID\s*:\s*(\d+)",
        text,
        re.IGNORECASE,
    )

    if match:
        return LEVEL, int(match.group(1))

    return None, None


def extract_reading(h3):
    """
    問題見出しから読みを取得する。
    赤文字部分はASCIIアポストロフィで囲む。
    HTMLコメントは読みとして扱わない。
    """
    target = h3.find(
        "span",
        style=re.compile(r"font-weight\s*:\s*bold", re.IGNORECASE),
    )

    if target is None:
        target = h3

    parts = []

    def walk(node, inside_red=False):
        if isinstance(node, Comment):
            return

        if isinstance(node, NavigableString):
            text = str(node).replace("@@@@@", "")
            if text:
                parts.append(
                    ("RED" if inside_red else "NORMAL", text)
                )
            return

        if not isinstance(node, Tag):
            return

        red = inside_red or is_red(node)

        for child in node.children:
            walk(child, red)

    for child in target.children:
        walk(child)

    output = []
    red_buffer = []

    def flush_red():
        if red_buffer:
            red_text = "".join(red_buffer).strip()

            if red_text:
                output.append("'" + red_text + "'")

            red_buffer.clear()

    for kind, text in parts:
        if kind == "RED":
            red_buffer.append(text)
        else:
            flush_red()
            output.append(text)

    flush_red()

    reading = "".join(output)

    # ID情報が混ざっていた場合、ID以降を除去
    reading = re.sub(
        r"ID\s*:\s*Lv\.?\s*\d+\s*[_＿]\s*\d+.*$",
        "",
        reading,
        flags=re.IGNORECASE,
    )

    # 全角・半角スペースの後ろにある「等」以降を除外
    reading = re.sub(r"[ 　]+等.*$", "", reading)

    return reading.strip()


def safe_filename(reading):
    """読みをファイル名に使用できる形式へ変換する。"""
    text = reading.replace("'", "").replace("’", "")
    text = text.replace("@@@@@", "")
    text = text.replace("、", ",")

    # ファイル名に使用できない文字を除外
    text = re.sub(r'[\\/:*?"<>|]', "", text)

    return text.strip() or "unknown"


def get_problem_section(h3):
    """見出しから次のh3の直前までを1問分として取得する。"""
    elements = [h3]

    for sibling in h3.next_siblings:
        if isinstance(sibling, Tag) and sibling.name == "h3":
            break

        elements.append(sibling)

    return elements


# ============================================================
# HTMLのテキスト処理
# ============================================================

def clone_without_unwanted_tags(element):
    """元のHTMLを変更せず、不要なタグを取り除いた複製を返す。"""
    cloned = copy(element)

    if isinstance(cloned, Tag):
        for tag in cloned.find_all(
            ["script", "style", "img", "picture"]
        ):
            tag.decompose()

    return cloned


def extract_image_url(section, page_url):
    """問題部分から画像URLを取得する。"""
    for element in section:
        if not isinstance(element, Tag):
            continue

        images = []

        if element.name == "img":
            images.append(element)

        images.extend(element.find_all("img"))

        for img in images:
            src = (
                img.get("data-src")
                or img.get("src")
                or img.get("data-original")
            )

            if not src or src.startswith("data:"):
                continue

            return urljoin(page_url, src)

        # picture内のsourceにあるsrcsetも確認
        for source in element.find_all("source"):
            srcset = source.get("srcset", "").strip()

            if srcset:
                src = srcset.split(",")[0].strip().split()[0]

                if src:
                    return urljoin(page_url, src)

    return None


def extract_additional_info(section):
    """
    問題部分から登録済みのジャンルだけを取得する。

    「4文字指定 植物・藻類」のように、ジャンル以外の文字が
    同じ要素に含まれていてもジャンル名だけを抽出する。

    同じジャンルが複数回見つかった場合は重複を除去する。
    """
    found_genres = []

    for element in section:
        if not isinstance(element, Tag):
            continue

        text = normalize_text(
            element.get_text(" ", strip=True)
        )

        for genre in genres:
            if genre in text and genre not in found_genres:
                found_genres.append(genre)

    return "　".join(found_genres)


def extract_components(section):
    """
    LEVELが8の場合は常に空文字を返す。

    それ以外のレベルでは「テキスト」と「IDS」を取得して連結する。
    IDSが存在しない場合はテキストだけを返す。
    """
    if LEVEL == 8:
        return ""

    text_content = ""
    ids_content = ""

    for element in section:
        if not isinstance(element, Tag):
            continue

        cloned = clone_without_unwanted_tags(element)

        text = cloned.get_text(" ", strip=True)
        text = text.replace("@@@@@", "")

        # テキスト部分を取得
        text_match = re.search(
            r"テキスト\s*[:：]\s*(.*?)"
            r"(?=\s*IDS\s*[:：]|\s*意味\s*[:：]|$)",
            text,
        )

        if text_match and not text_content:
            text_content = text_match.group(1).strip()

        # IDS部分を取得
        ids_match = re.search(
            r"IDS\s*[:：]\s*(.*?)"
            r"(?=\s*意味\s*[:：]|$)",
            text,
        )

        if ids_match and not ids_content:
            ids_content = ids_match.group(1).strip()

    return text_content + ids_content


# ============================================================
# 画像ダウンロード・PNG保存
# ============================================================

def download_as_png(image_url, output_path, session):
    """
    画像をダウンロードしてPNG形式で保存する。

    通信エラーや画像読み込みエラーが起きた場合、
    最大3回まで再試行する。
    """
    last_error = None

    for attempt in range(1, DOWNLOAD_MAX_ATTEMPTS + 1):
        try:
            response = session.get(
                image_url,
                timeout=DOWNLOAD_TIMEOUT,
            )
            response.raise_for_status()

            with Image.open(BytesIO(response.content)) as image:
                image.load()

                if image.mode not in ("RGB", "RGBA"):
                    if "transparency" in image.info:
                        image = image.convert("RGBA")
                    else:
                        image = image.convert("RGB")

                output_path.parent.mkdir(
                    parents=True,
                    exist_ok=True,
                )

                image.save(output_path, format="PNG")

            return

        except Exception as error:
            last_error = error

            if attempt < DOWNLOAD_MAX_ATTEMPTS:
                print(
                    f"    [RETRY] 画像取得失敗 "
                    f"({attempt}/{DOWNLOAD_MAX_ATTEMPTS}回目): "
                    f"{type(error).__name__}: {error}"
                )
                time.sleep(DOWNLOAD_RETRY_INTERVAL)

    raise RuntimeError(
        f"{DOWNLOAD_MAX_ATTEMPTS}回試行しましたが画像を取得できませんでした。"
        f" 最後のエラー: {type(last_error).__name__}: {last_error}"
    ) from last_error


# ============================================================
# CSV読み込み・保存
# ============================================================

def load_existing_records():
    """既存CSVを読み込み、pathをキーに保持する。"""
    records = {}

    if not CSV_PATH.exists():
        return records

    with CSV_PATH.open(
        "r",
        encoding="utf-8-sig",
        newline="",
    ) as file:
        reader = csv.DictReader(file)

        for row in reader:
            path = row.get("path", "")

            if not path:
                continue

            records[path] = {
                "path": path,
                "reading": row.get("reading", ""),
                "additional_info": row.get("additional_info", ""),
                "components": row.get("components", ""),
            }

    return records


def save_records(records):
    """全レコードをCSVへ保存する。"""
    CSV_PATH.parent.mkdir(parents=True, exist_ok=True)

    def sort_key(item):
        path = item[0]
        match = re.search(r"/(\d+)_", path)

        if match:
            return int(match.group(1))

        return float("inf")

    sorted_records = sorted(
        records.items(),
        key=sort_key,
    )

    with CSV_PATH.open(
        "w",
        encoding="utf-8-sig",
        newline="",
    ) as file:
        writer = csv.DictWriter(
            file,
            fieldnames=CSV_COLUMNS,
        )

        writer.writeheader()

        for _, record in sorted_records:
            writer.writerow(record)


# ============================================================
# 1ページ分のスクレイピング
# ============================================================

def scrape_page(url, session):
    """指定URLにあるLEVELの問題を取得する。"""
    response = session.get(url, timeout=30)
    response.raise_for_status()

    soup = BeautifulSoup(response.text, "html.parser")

    records = []
    failed_ids = []

    for h3 in soup.find_all("h3"):
        page_level, number = extract_problem_id(h3)

        if page_level != LEVEL or number is None:
            continue

        section = get_problem_section(h3)

        reading = extract_reading(h3)

        if not reading:
            print(f"  [SKIP] 読みを取得できません: ID {number}")
            continue

        image_url = extract_image_url(section, url)

        if not image_url:
            print(f"  [SKIP] 画像が見つかりません: ID {number}")
            failed_ids.append(number)
            continue

        filename_reading = safe_filename(reading)
        filename = f"{number}_{filename_reading}.png"
        image_path = IMAGE_DIR / filename

        relative_path = image_path.relative_to(PUBLIC_DIR).as_posix()

        # ジャンルと構成要素を抽出
        additional_info = extract_additional_info(section)
        components = extract_components(section)

        try:
            download_as_png(image_url, image_path, session)

            record = {
                "path": relative_path,
                "reading": reading,
                "additional_info": additional_info,
                "components": components,
            }

            records.append(record)

            print(
                f"  [OK] ID {number}: {filename} "
                f"| additional_info={additional_info!r} "
                f"| components={components!r}"
            )

        except Exception as error:
            print(
                f"  [ERROR] ID {number}: "
                f"{type(error).__name__}: {error}"
            )
            failed_ids.append(number)

        time.sleep(REQUEST_INTERVAL)

    if failed_ids:
        print(
            f"\n  [WARNING] このページで取得できなかったID: "
            f"{', '.join(map(str, sorted(set(failed_ids))))}"
        )

    return records, failed_ids


# ============================================================
# メイン処理
# ============================================================

def main():
    IMAGE_DIR.mkdir(parents=True, exist_ok=True)
    CSV_PATH.parent.mkdir(parents=True, exist_ok=True)

    print(f"レベル: {LEVEL}")
    print(f"画像保存先: {IMAGE_DIR}")
    print(f"CSV保存先: {CSV_PATH}")
    print(f"取得ページ数: {len(URLS)}")
    print(f"画像取得の最大試行回数: {DOWNLOAD_MAX_ATTEMPTS}回")

    # 既存CSVを読み込む
    all_records = load_existing_records()

    # 最後にまとめて表示する、取得失敗IDの一覧
    all_failed_ids = []

    with requests.Session() as session:
        session.headers.update(HEADERS)

        for index, url in enumerate(URLS, start=1):
            print()
            print("=" * 60)
            print(f"ページ {index}/{len(URLS)}")
            print(url)
            print("=" * 60)

            parsed = urlparse(url)

            if parsed.netloc.lower() != WIKI_DOMAIN:
                print(f"[SKIP] 想定外のドメインです: {url}")
                continue

            try:
                page_records, failed_ids = scrape_page(url, session)

                all_failed_ids.extend(failed_ids)

                # 同じpathがあれば情報を更新し、新規なら追加
                for record in page_records:
                    all_records[record["path"]] = record

                # 1ページごとにCSVを保存
                save_records(all_records)

                print()
                print(f"このページの取得件数: {len(page_records)}")
                print(f"CSV登録総数: {len(all_records)}")
                print("CSVを保存しました。")

            except Exception as error:
                print(
                    f"[ERROR] ページの取得に失敗しました: {url}\n"
                    f"{type(error).__name__}: {error}"
                )

                # エラー時も取得済みデータを保存
                save_records(all_records)
                print("それまでのCSVデータを保存しました。")

            time.sleep(REQUEST_INTERVAL)

    # 最終保存
    save_records(all_records)

    # 重複を除いて番号順に整理
    all_failed_ids = sorted(set(all_failed_ids))

    print()
    print("=" * 60)
    print("処理終了")
    print(f"CSV登録総数: {len(all_records)}")

    if all_failed_ids:
        print()
        print("【要確認：取得できなかった問題】")
        print(f"失敗件数: {len(all_failed_ids)}")
        print("抜けている可能性があるID:")
        print(", ".join(map(str, all_failed_ids)))
        print()
        print("上記のIDは画像取得に失敗したため、今回のCSVに")
        print("新しいレコードが追加されていない可能性があります。")
    else:
        print()
        print("画像取得に失敗したIDはありませんでした。")

    print()
    print(f"画像保存先: {IMAGE_DIR}")
    print(f"CSV保存先: {CSV_PATH}")
    print("=" * 60)


if __name__ == "__main__":
    main()
