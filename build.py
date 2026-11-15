"""Build edge-shines-sales-assistant.html from the playbook workbook + src/ files.
Usage: python3 -I build.py path/to/playbook.xlsx"""
import subprocess, sys, pathlib
root = pathlib.Path(__file__).resolve().parent
data = subprocess.run([sys.executable, '-I', str(root/'extract.py'), sys.argv[1]], check=True, capture_output=True, text=True).stdout
shell = (root/'src/shell.html').read_text()
out = shell.replace('/*CSS*/', (root/'src/styles.css').read_text()).replace('/*DATA*/', data.strip()).replace('/*APP*/', (root/'src/app.js').read_text())
(root/'edge-shines-sales-assistant.html').write_text(out)
print('wrote', len(out), 'bytes')
