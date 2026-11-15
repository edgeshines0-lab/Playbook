# Edge Shines Sales Assistant

Interactive phone-sales assistant built from the Edge Shines sales playbook workbook.

- `edge-shines-sales-assistant.html` — the built single-file app.
- `extract.py` — pulls every worksheet's content, word for word, into structured data.
- `src/` — page shell, styles and app logic.

Sections: search, 12-step call flow, objections, estimator, AI mockup prompts, FLYRA quoting,
text templates, service facts, the full playbook (every tab, expandable) and items to review.

Optional runtime features (the page works without them):
- **Ask Claude** (`sample` capability): Claude picks matching playbook entries for an unusual
  question; the page only ever shows the playbook's own wording. Runs on the viewer's Claude account.
- **Rep name** (`user` capability): scripts use the viewer's first name instead of "Emily".

Pricing: every build applies `pricing2026.py`, the 2026 policy: **3-year agreement only**,
roofline $6/ft, ground stakes $6/ft, mini lights $30/strand. The workbook's older 2-/4-year rate rows
are replaced so they can never come back on a rebuild.

Rebuild after the playbook changes:

```
python3 -I build.py path/to/Edge_Shines_Sales_Playbook.xlsx
python3 -I build.py --from-html        # rebuild from the data already in the page (no workbook needed)
```

The extractor reads fixed cell ranges per tab, so if rows are added or moved in the workbook, update `extract.py` to match.
