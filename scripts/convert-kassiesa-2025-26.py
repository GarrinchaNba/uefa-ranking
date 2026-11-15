#!/usr/bin/env python3
"""Convert the user-supplied 2025/26 Kassies match page to match rows."""

import csv
import re
import sys
import uuid
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "data" / "UEFA European Cup Matches 2025_2026.html"
OUTPUT = ROOT / "data" / "matches" / "2025-26.csv"
IDENTITIES = ROOT / "data" / "matches" / "club-identities.csv"
URL = "https://kassiesa.net/uefa/data/method5/match2026.html"
SOURCE_ID = "kassiesa-2025-26"
SCORE = re.compile(r"^(\d+)\s*-\s*(\d+)$")
COMPETITIONS = {
    "CHAMPIONS LEAGUE": "champions-league",
    "EUROPA LEAGUE": "europa-league",
    "CONFERENCE LEAGUE": "conference-league",
}
FIELDS = (
    "season", "competition", "round", "leg", "home_club_id", "home_club", "home_association",
    "away_club_id", "away_club", "away_association", "home_score", "away_score",
    "home_penalties", "away_penalties", "source_url",
)


class Tables(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.tables = []
        self.table = None
        self.row = None
        self.cell = None
        self.depth = 0

    def handle_starttag(self, tag, attrs):
        if tag == "table":
            self.depth += 1
            if self.depth == 1:
                self.table = []
        elif self.depth == 1 and tag == "tr":
            self.row = []
        elif self.depth == 1 and self.row is not None and tag in ("td", "th"):
            self.cell = []

    def handle_data(self, data):
        if self.cell is not None:
            self.cell.append(data)

    def handle_endtag(self, tag):
        if self.depth == 1 and self.cell is not None and tag in ("td", "th"):
            self.row.append(" ".join("".join(self.cell).split()))
            self.cell = None
        elif self.depth == 1 and tag == "tr" and self.row is not None:
            self.table.append(self.row)
            self.row = None
        elif tag == "table" and self.depth:
            if self.depth == 1:
                self.tables.append(self.table)
                self.table = None
            self.depth -= 1


def parse_score(value):
    match = SCORE.fullmatch(value)
    if not match:
        raise ValueError(f"Unrecognized score: {value!r}")
    return match.groups()


def parse(content):
    parser = Tables()
    parser.feed(content)
    matches = []
    seen = set()
    for table in parser.tables:
        if not table or len(table[0]) != 1 or table[0][0] not in COMPETITIONS:
            raise ValueError("Unexpected competition table")
        competition = COMPETITIONS[table[0][0]]
        if competition in seen:
            raise ValueError(f"Duplicate competition: {competition}")
        seen.add(competition)
        round_name = None
        last_tie = None
        for cells in table[1:]:
            if len(cells) == 1:
                if cells[0]:
                    round_name = cells[0]
                last_tie = None
                continue
            if len(cells) == 2 and cells[0].startswith("Penalty shootout: "):
                if last_tie is None:
                    raise ValueError("Shootout without a preceding match")
                home, away = last_tie["home_club"], last_tie["away_club"]
                label = cells[0].removeprefix("Penalty shootout: ")
                first, second = parse_score(cells[1])
                if label == f"{home} - {away}":
                    last_tie["home_penalties"], last_tie["away_penalties"] = first, second
                elif label == f"{away} - {home}":
                    last_tie["home_penalties"], last_tie["away_penalties"] = second, first
                else:
                    raise ValueError(f"Shootout teams do not match previous tie: {label}")
                last_tie = None
                continue
            if len(cells) != 6 or not round_name or not all(cells[:5]):
                raise ValueError(f"Unrecognized match row in {competition}: {cells!r}")
            team1, association1, team2, association2, first, second = cells
            if team1 == team2:
                raise ValueError(f"Identical opponents: {team1}")
            results = [(team1, association1, team2, association2, first)]
            if second:
                team1_score, team2_score = parse_score(second)
                results.append((team2, association2, team1, association1, f"{team2_score}-{team1_score}"))
            for index, (home, home_assoc, away, away_assoc, score) in enumerate(results, 1):
                home_score, away_score = parse_score(score)
                match = {
                    "season": "2025-26", "competition": competition, "round": round_name,
                    "leg": str(index) if second else "", "home_club": home,
                    "home_association": home_assoc, "away_club": away,
                    "away_association": away_assoc, "home_score": home_score,
                    "away_score": away_score, "home_penalties": "", "away_penalties": "",
                    "source_url": URL,
                }
                matches.append(match)
            last_tie = matches[-1]
    if seen != set(COMPETITIONS.values()) or not matches:
        raise ValueError("Missing competition or match results")
    return matches


def create_registry(matches):
    teams = sorted({
        (row[f"{side}_club"], row[f"{side}_association"])
        for row in matches for side in ("home", "away")
    })
    with IDENTITIES.open("x", encoding="utf-8", newline="") as output:
        writer = csv.writer(output)
        writer.writerow(("club_id", "source", "source_club", "source_association"))
        for name, association in teams:
            identity = uuid.uuid5(uuid.NAMESPACE_URL, f"{URL}#{association}:{name}")
            writer.writerow((f"club-{identity}", SOURCE_ID, name, association))


def assign_identities(matches):
    with IDENTITIES.open(encoding="utf-8", newline="") as source:
        reader = csv.DictReader(source)
        if reader.fieldnames != ["club_id", "source", "source_club", "source_association"]:
            raise ValueError("Invalid club identity registry columns")
        aliases = {}
        for record in reader:
            if not all(record.values()):
                raise ValueError("Incomplete club identity registry entry")
            key = (record["source"], record["source_club"], record["source_association"])
            if key in aliases:
                raise ValueError(f"Duplicate club identity alias: {key}")
            aliases[key] = record["club_id"]
    for row in matches:
        for side in ("home", "away"):
            key = (SOURCE_ID, row[f"{side}_club"], row[f"{side}_association"])
            if key not in aliases:
                raise ValueError(f"Missing club identity: {key}")
            row[f"{side}_club_id"] = aliases[key]
        if row["home_club_id"] == row["away_club_id"]:
            raise ValueError(f"Both opponents map to the same identity: {row}")
    return matches


def main():
    matches = parse(SOURCE.read_text(encoding="utf-8-sig"))
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    if sys.argv[1:] == ["--init-identities"]:
        create_registry(matches)
    elif sys.argv[1:]:
        raise ValueError("Usage: convert-kassiesa-2025-26.py [--init-identities]")
    assign_identities(matches)
    with OUTPUT.open("w", encoding="utf-8", newline="") as output:
        writer = csv.DictWriter(output, fieldnames=FIELDS)
        writer.writeheader()
        writer.writerows(matches)
    print(f"Wrote {len(matches)} matches to {OUTPUT.relative_to(ROOT)}")


if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError) as error:
        print(f"Conversion failed: {error}", file=sys.stderr)
        sys.exit(1)
