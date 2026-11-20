# Victorian budget and historical financial data

Official source: **State of Victoria (Department of Treasury and Finance)**. Downloaded on **20 November 2026** over direct HTTPS. Original XLSX/PDF bytes are retained without modification in `raw/`.

## What is included

- **15 Excel workbooks**: general-government operating statements, balance sheets, cash flows, equity and expenses by function; whole-of-state statements; revenue/expense and cash-flow aggregates; net debt, net financial liabilities and infrastructure investment; and macroeconomic data.
- **2026 Victorian Pre-Election Budget Update** (November 2026), in PDF. This is a later update to the May 2026 budget, not the original budget papers.
- `manifest.json`: direct download URLs, official source pages and link labels, HTTP results, retrieval timestamps, byte sizes and SHA-256 checksums. The `not_downloaded` array explicitly lists original-budget PDFs not obtained.
- `workbook-inventory.json`: sheet names, dimensions and financial-year labels found in cells. This is an index, not a cleaned or harmonised statistical series. An empty financial-year-label list may mean the sheet uses calendar years/dates or another layout; it does not mean the sheet contains no history.

## Official references

1. [State Budget](https://www.dtf.vic.gov.au/state-budget) and [2026–27 State Budget](https://www.dtf.vic.gov.au/2026-27-state-budget): official starting points for the budget papers.
2. [2026 Victorian Pre-Election Budget Update](https://www.dtf.vic.gov.au/2026-victorian-pre-election-budget-update): source for the downloaded November report.
3. [State financial data sets](https://www.dtf.vic.gov.au/state-financial-data-sets): Treasury's historical dataset index. This is the working path; the earlier candidate `/state-financial-data` returns 404.
4. [Aggregate financial statements](https://www.dtf.vic.gov.au/aggregate-financial-statements): historical and forward-estimate general-government and whole-of-state workbooks.
5. [Other financial aggregates](https://www.dtf.vic.gov.au/other-financial-aggregates): fiscal aggregates and related historical series. This snapshot selects the five November 2026 general-government aggregate workbooks, rather than all quarterly/non-financial-public-sector tables.
6. [Macroeconomic indicators](https://www.dtf.vic.gov.au/macroeconomic-indicators): 2026–27 budget macroeconomic workbook.
7. [Previous budgets](https://www.dtf.vic.gov.au/previous-budgets): archive for separately published historical budgets. The complete annual archive has not been mirrored here.

## Historical coverage and interpretation

Read each workbook's **Introduction**, table headers and footnotes before extracting values. For example:

- `1.1_2026-PEBU-Consolidated-GG-Comprehensive-Operating-Statement.xlsx`, Introduction, describes the general-government operating series from **1996–97 to 2029–30**.
- `1.3_2026-PEBU-Consolidated-GG-Cash-Flow-Statement.xlsx`, Introduction, describes cash-flow history and estimates from **1986–87 to 2029–30**.
- `1.5_2026-PEBU-Consolidated-GG-Expenses-by-COFOG.xlsx`, Introduction, describes government-purpose history beginning in **1961–62**. Its early cash-to-accrual conversion uses statistical modelling; these are not uniformly comparable original cash observations.
- `Macroeconomic-data_2026-27-Budget.xlsx` contains historical and forecast vintages for output, employment, unemployment, prices, wages and population; financial-year labels span **1989–90 to 2029–30**.

Future-year figures are estimates/forecasts, not historical outcomes. Tables can include multiple budget/update vintages for the same year; do not collapse those into a single observation. The workbooks describe revisions, accounting-standard changes and remaining breaks in series, including changes from 2019–20 and (where stated) AASB 17 from 2026–27. General government and whole of State are different reporting sectors and must not be added together.

Units vary by table: some statements use **$ million**, aggregate debt series use **$ billion**, and economic series include percentages and chain-volume measures. Preserve the actual source units and labels. No inflation adjustment, currency conversion, forecast validation or party-policy comparison has been applied here.

## Original budget-paper download limitation

The original 2026–27 budget-paper pages are accessible, but link their PDFs to **`s3.ap-southeast-2.amazonaws.com`**. A Statement of Finances PDF request returned a proxy CONNECT 403. The five original-paper PDF links are recorded in `manifest.json` as not downloaded; the other S3 links were discovered but not fetched. This snapshot includes current official budget-related data and historical workbooks, but **not the full original budget-paper PDF set**. The additional host needs an authorised network grant before those files can be retrieved.

## Attribution and reuse

Attribute the original material to **State of Victoria (Department of Treasury and Finance)** and cite the relevant source-page and download URLs from `manifest.json`. Raw files are unchanged. The downloaded pre-election report's copyright page states **Creative Commons Attribution 4.0**, excluding branding such as government logos. Do not assume that statement automatically licenses every workbook or third-party component; check the applicable document/source terms for further reuse.

## Verify this snapshot

Each download returned HTTP 200; spreadsheet ZIP structure and workbook loading were checked, and the PDF was parsed with `pdftotext`. These checks establish readable downloaded files, not independent verification of every financial figure.

```sh
python3 - <<'CHECK'
import hashlib, json
from pathlib import Path
root = Path('data/victorian-budget')
manifest = json.loads((root / 'manifest.json').read_text())
for entry in manifest['downloaded']:
    data = (root / entry['file']).read_bytes()
    assert len(data) == entry['bytes'], entry['file']
    assert hashlib.sha256(data).hexdigest() == entry['sha256'], entry['file']
print(f"Verified {len(manifest['downloaded'])} downloaded files")
CHECK
```

## File references

| Downloaded file | Official source page |
| --- | --- |
| [1.1_2026-PEBU-Consolidated-GG-Comprehensive-Operating-Statement.xlsx](raw/1.1_2026-PEBU-Consolidated-GG-Comprehensive-Operating-Statement.xlsx) | [Aggregate financial statements | dtf.vic.gov.au](https://www.dtf.vic.gov.au/aggregate-financial-statements) |
| [1.2_2026-PEBU-Consolidated-GG-Balance-Sheet.xlsx](raw/1.2_2026-PEBU-Consolidated-GG-Balance-Sheet.xlsx) | [Aggregate financial statements | dtf.vic.gov.au](https://www.dtf.vic.gov.au/aggregate-financial-statements) |
| [1.3_2026-PEBU-Consolidated-GG-Cash-Flow-Statement.xlsx](raw/1.3_2026-PEBU-Consolidated-GG-Cash-Flow-Statement.xlsx) | [Aggregate financial statements | dtf.vic.gov.au](https://www.dtf.vic.gov.au/aggregate-financial-statements) |
| [1.4_2026-PEBU-Consolidated-GG-Statement-of-Changes-in-Equity.xlsx](raw/1.4_2026-PEBU-Consolidated-GG-Statement-of-Changes-in-Equity.xlsx) | [Aggregate financial statements | dtf.vic.gov.au](https://www.dtf.vic.gov.au/aggregate-financial-statements) |
| [1.5_2026-PEBU-Consolidated-GG-Expenses-by-COFOG.xlsx](raw/1.5_2026-PEBU-Consolidated-GG-Expenses-by-COFOG.xlsx) | [Aggregate financial statements | dtf.vic.gov.au](https://www.dtf.vic.gov.au/aggregate-financial-statements) |
| [2.1_2025-26-AFR-Consolidated-SoV-Comprehensive-Operating-Statement.xlsx](raw/2.1_2025-26-AFR-Consolidated-SoV-Comprehensive-Operating-Statement.xlsx) | [Aggregate financial statements | dtf.vic.gov.au](https://www.dtf.vic.gov.au/aggregate-financial-statements) |
| [2.2_2025-26-AFR-Consolidated-SoV-Comprehensive-Balance-Sheet.xlsx](raw/2.2_2025-26-AFR-Consolidated-SoV-Comprehensive-Balance-Sheet.xlsx) | [Aggregate financial statements | dtf.vic.gov.au](https://www.dtf.vic.gov.au/aggregate-financial-statements) |
| [2.3_2025-26-AFR-Consolidated-SoV-Cash-Flow-Statement.xlsx](raw/2.3_2025-26-AFR-Consolidated-SoV-Cash-Flow-Statement.xlsx) | [Aggregate financial statements | dtf.vic.gov.au](https://www.dtf.vic.gov.au/aggregate-financial-statements) |
| [2.4_2025-26-AFR-Consolidated-SoV-Statement-of-Changes-in-Equity.xlsx](raw/2.4_2025-26-AFR-Consolidated-SoV-Statement-of-Changes-in-Equity.xlsx) | [Aggregate financial statements | dtf.vic.gov.au](https://www.dtf.vic.gov.au/aggregate-financial-statements) |
| [2.1_2026-PEBU-Operating-Statements-Aggregates-GG.xlsx](raw/2.1_2026-PEBU-Operating-Statements-Aggregates-GG.xlsx) | [Other financial aggregates | dtf.vic.gov.au](https://www.dtf.vic.gov.au/other-financial-aggregates) |
| [2.2_2026-PEBU-Cash-Flow-Statements-Aggregates-GG.xlsx](raw/2.2_2026-PEBU-Cash-Flow-Statements-Aggregates-GG.xlsx) | [Other financial aggregates | dtf.vic.gov.au](https://www.dtf.vic.gov.au/other-financial-aggregates) |
| [2.3_2026-PEBU-Net-Debt-GG.xlsx](raw/2.3_2026-PEBU-Net-Debt-GG.xlsx) | [Other financial aggregates | dtf.vic.gov.au](https://www.dtf.vic.gov.au/other-financial-aggregates) |
| [2.4_2026-PEBU-Net-Financial-Liability-GG.xlsx](raw/2.4_2026-PEBU-Net-Financial-Liability-GG.xlsx) | [Other financial aggregates | dtf.vic.gov.au](https://www.dtf.vic.gov.au/other-financial-aggregates) |
| [2.5_2026-PEBU-Net-Infrastructure-Investment-GG.xlsx](raw/2.5_2026-PEBU-Net-Infrastructure-Investment-GG.xlsx) | [Other financial aggregates | dtf.vic.gov.au](https://www.dtf.vic.gov.au/other-financial-aggregates) |
| [Macroeconomic-data_2026-27-Budget.xlsx](raw/Macroeconomic-data_2026-27-Budget.xlsx) | [Macroeconomic indicators | dtf.vic.gov.au](https://www.dtf.vic.gov.au/macroeconomic-indicators) |
| [2026-Victorian-Pre-Election-Budget-Update.pdf](raw/2026-Victorian-Pre-Election-Budget-Update.pdf) | [2026 Victorian Pre-Election Budget Update | dtf.vic.gov.au](https://www.dtf.vic.gov.au/2026-victorian-pre-election-budget-update) |
