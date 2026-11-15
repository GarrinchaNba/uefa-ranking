import csv
import importlib.util
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
SPEC = importlib.util.spec_from_file_location(
    "kassiesa_converter", ROOT / "scripts" / "convert-kassiesa-2025-26.py",
)
converter = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(converter)


class KassiesaConversionTest(unittest.TestCase):
    def test_two_legs_and_penalty_order(self):
        html = """
        <table><tr><th>CHAMPIONS LEAGUE</th></tr>
        <tr><th>1st Qualifying Round</th></tr>
        <tr><td>Alpha</td><td>Aaa</td><td>Beta</td><td>Bbb</td>
        <td>2-0</td><td>0-2</td></tr>
        <tr><td>Penalty shootout: Alpha - Beta</td><td>4-5</td></tr></table>
        <table><tr><th>EUROPA LEAGUE</th></tr><tr><th>Final</th></tr>
        <tr><td>Gamma</td><td>Ccc</td><td>Delta</td><td>Ddd</td>
        <td>1-0</td><td></td></tr></table>
        <table><tr><th>CONFERENCE LEAGUE</th></tr><tr><th>Final</th></tr>
        <tr><td>Epsilon</td><td>Eee</td><td>Zeta</td><td>Fff</td>
        <td>0-0</td><td></td></tr></table>
        """
        rows = converter.parse(html)
        self.assertEqual(len(rows), 4)
        self.assertEqual((rows[0]["home_club"], rows[0]["home_score"], rows[0]["away_score"]),
                         ("Alpha", "2", "0"))
        self.assertEqual((rows[1]["home_club"], rows[1]["home_score"], rows[1]["away_score"]),
                         ("Beta", "2", "0"))
        self.assertEqual((rows[1]["home_penalties"], rows[1]["away_penalties"]), ("5", "4"))
        self.assertEqual(rows[2]["leg"], "")

    def test_return_leg_score_uses_home_away_order(self):
        rows = converter.parse(converter.SOURCE.read_text(encoding="utf-8-sig"))
        match = next(row for row in rows
                     if row["home_club"] == "Inter Club d'Escaldes" and row["away_club"] == "FCSB")
        self.assertEqual((match["home_score"], match["away_score"]), ("2", "1"))

    def test_invalid_shootout_is_not_silently_discarded(self):
        html = """
        <table><tr><th>CHAMPIONS LEAGUE</th></tr><tr><th>Final</th></tr>
        <tr><td>Alpha</td><td>Aaa</td><td>Beta</td><td>Bbb</td>
        <td>0-0</td><td></td></tr>
        <tr><td>Penalty shootout: Alpha - Other</td><td>4-5</td></tr></table>
        """
        with self.assertRaisesRegex(ValueError, "Shootout teams"):
            converter.parse(html)

    def test_local_export_reproducible(self):
        source = converter.SOURCE.read_text(encoding="utf-8-sig")
        expected = converter.assign_identities(converter.parse(source))
        with converter.OUTPUT.open(encoding="utf-8", newline="") as file:
            actual = list(csv.DictReader(file))
        self.assertEqual(actual, expected)
        self.assertEqual(len(actual), 961)
        self.assertTrue(all(row["home_club_id"] and row["away_club_id"] for row in actual))
        self.assertEqual(sum(bool(row["home_penalties"]) for row in actual), 17)
        self.assertEqual(
            {name: sum(row["competition"] == name for row in actual)
             for name in converter.COMPETITIONS.values()},
            {"champions-league": 281, "europa-league": 271, "conference-league": 409},
        )

    def test_source_names_have_consistent_identity(self):
        rows = converter.assign_identities(converter.parse(
            converter.SOURCE.read_text(encoding="utf-8-sig"),
        ))
        ids = {}
        for row in rows:
            for side in ("home", "away"):
                name = (row[f"{side}_club"], row[f"{side}_association"])
                ids.setdefault(name, set()).add(row[f"{side}_club_id"])
        self.assertEqual(len(ids), 236)
        self.assertTrue(all(len(values) == 1 for values in ids.values()))
        self.assertEqual(len({next(iter(values)) for values in ids.values()}), len(ids))


if __name__ == "__main__":
    unittest.main()
