"""Build edge-shines-sales-assistant.html from the playbook workbook + src/ files.
Usage: python3 -I build.py path/to/playbook.xlsx
       python3 -I build.py --from-html   (reuse the workbook data already inside the built page)

Every build applies pricing2026.apply(): 3-year agreement only, $6/ft roofline,
$6/ft ground stakes, $30 per mini-light strand."""
import json, re, subprocess, sys, pathlib
root = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(root))
import pricing2026
out_path = root / 'edge-shines-sales-assistant.html'
if sys.argv[1:] == ['--from-html']:
    m = re.search(r'const DATA=(\{.*?\});\n', out_path.read_text(), re.S)
    raw = m.group(1)
else:
    raw = subprocess.run([sys.executable, '-I', str(root / 'extract.py'), sys.argv[1]], check=True, capture_output=True, text=True).stdout.strip()
    raw = raw[len('const DATA='):].rstrip(';')
data = pricing2026.apply(json.loads(raw))
shell = (root / 'src/shell.html').read_text()
out = (shell.replace('/*CSS*/', (root / 'src/styles.css').read_text())
            .replace('/*DATA*/', 'const DATA=' + json.dumps(data, ensure_ascii=False) + ';')
            .replace('/*APP*/', (root / 'src/app.js').read_text()))
out_path.write_text(out)
print('wrote', len(out), 'bytes')
