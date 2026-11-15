// Bundle the React source (React itself loads from cdnjs) and inline it with the CSS into one artifact page.
import { build } from 'esbuild';
import { readFileSync, writeFileSync } from 'node:fs';
const here = new URL('.', import.meta.url).pathname;
const r = await build({
  entryPoints: [here + 'src/app.jsx'], bundle: true, write: false, format: 'iife', minify: true, target: ['es2019'],
  jsx: 'transform', jsxFactory: 'React.createElement', jsxFragment: 'React.Fragment', loader: { '.js': 'jsx' }, legalComments: 'none'
});
const js = r.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const css = readFileSync(here + 'src/styles.css', 'utf8');
const html = readFileSync(here + 'shell.html', 'utf8').replace('/*CSS*/', () => css).replace('/*APP*/', () => js);
const out = here + '../edge-shines-sales-assistant.html';
writeFileSync(out, html);
console.log('wrote', out, (html.length / 1024).toFixed(0) + ' KB');
