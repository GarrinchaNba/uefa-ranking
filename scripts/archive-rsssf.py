#!/usr/bin/env python3
"""Archive RSSSF European club competition season pages with attribution."""

import csv
import re
import sys
import time
from pathlib import Path
from urllib.parse import urljoin, urlsplit
from urllib.request import Request, urlopen

from bs4 import BeautifulSoup


INDEX = "https://www.rsssf.org/ec/ecomp.html"
OUTPUT = Path(__file__).resolve().parent.parent / "data" / "rsssf"
LINK = re.compile(r"^ec(\d{4})(\d{2})\.html$")


def fetch(url):
    request = Request(url, headers={"User-Agent": "UEFA-ranking archive research (historical results)"})
    with urlopen(request, timeout=30) as response:
        if response.status != 200:
            raise RuntimeError(f"{url}: unexpected HTTP {response.status}")
        return response.read()


def season_links(index):
    soup = BeautifulSoup(index, "html.parser")
    links = {}
    for anchor in soup.find_all("a", href=True):
        match = LINK.fullmatch(anchor["href"])
        if not match:
            continue
        year, following = match.groups()
        if int(following) != (int(year) + 1) % 100:
            raise ValueError(f"Invalid season link: {anchor['href']}")
        url = urljoin(INDEX, anchor["href"])
        if urlsplit(url).netloc != "www.rsssf.org":
            raise ValueError(f"Unexpected source host: {url}")
        links[f"{year}-{following}"] = url
    if not links:
        raise ValueError("No season links found in RSSSF index")
    return sorted(links.items())


def attribution(content, url):
    soup = BeautifulSoup(content, "html.parser")
    text = " ".join(soup.get_text(" ").split())
    about = text.rfind("About this document")
    section = text[about:] if about >= 0 else ""
    author = re.search(r"Authors?\s*:\s*(.+?)(?:\s+Last updated|\s+Email|\s+Copyright|\s+\(C\))", section, re.I)
    if not author or not re.search(
        r"free to copy this document in whole or part provided that proper acknowledgement",
        section,
        re.I,
    ):
        raise ValueError(f"{url}: attribution or permission statement not recognized")
    if not soup.find("pre"):
        raise ValueError(f"{url}: no result sections found")
    return author.group(1).strip()


def main():
    links = season_links(fetch(INDEX))
    html_dir = OUTPUT / "html"
    html_dir.mkdir(parents=True, exist_ok=True)
    records = []
    for season, url in links:
        path = html_dir / f"{season}.html"
        if path.exists():
            content = path.read_bytes()
        else:
            time.sleep(1)
            content = fetch(url)
        authors = attribution(content, url)
        if not path.exists():
            path.write_bytes(content)
        records.append((season, url, authors, f"html/{path.name}"))
        print(f"{season}: archived", flush=True)
    with (OUTPUT / "sources.csv").open("w", encoding="utf-8", newline="") as output:
        writer = csv.writer(output)
        writer.writerow(("season", "source_url", "authors", "local_html"))
        writer.writerows(records)
    print(f"Archived {len(records)} seasons; score conversion is not implemented.")


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(f"Archive failed: {error}", file=sys.stderr)
        sys.exit(1)
