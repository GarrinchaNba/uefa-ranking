# RSSSF European club competition archive

The HTML files are copies of season pages from the [RSSSF European Cups Archive](https://www.rsssf.org/ec/ecomp.html). `sources.csv` identifies the original URL and authors for each season. The source pages state that copying is permitted with proper acknowledgement; the original copyright notices and attribution are retained in each file.

The archive covers 1955/56 through 2024/25. It is raw reference material, not a verified match dataset. In particular, score lines may combine two legs, aggregates, penalty shootouts and annotations; some data and country labels require independent checking. No coefficient reconstruction or comparison against UEFA has been performed.

Refresh or resume the archive with `python3 scripts/archive-rsssf.py` (requires Beautiful Soup 4). Existing season files are not overwritten. The script checks each page's attribution and copying permission before saving it and spaces network requests by at least one second.
