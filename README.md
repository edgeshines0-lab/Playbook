# Edge Shines Sales Assistant

Interactive phone-sales assistant built from the Edge Shines sales playbook workbook.

- `edge-shines-sales-assistant.html` — the built single-file app.
- `extract.py` — pulls every worksheet's content, word for word, into structured data.
- `src/` — page shell, styles and app logic.

Rebuild after the playbook changes:

```
python3 -I build.py path/to/Edge_Shines_Sales_Playbook.xlsx
```

The extractor reads fixed cell ranges per tab, so if rows are added or moved in the workbook, update `extract.py` to match.
