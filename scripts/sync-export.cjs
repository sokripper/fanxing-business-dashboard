// Keep the standalone export in sync without requiring the original authoring app.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const base = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(base, 'meeting-dashboard.html'), 'utf8').trim();
const destination = path.join(base, 'index.html');
const document = fs.readFileSync(destination, 'utf8');
const escape = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#x27;');
const begin = escape('<!-- dashboard:begin -->');
const end = escape('<!-- dashboard:end -->');
assert.ok(source.startsWith('<!-- dashboard:begin -->') && source.endsWith('<!-- dashboard:end -->'));
const first = document.indexOf(begin);
const last = document.indexOf(end, first);
assert.ok(first >= 0 && last > first, 'Standalone export markers are missing');
assert.equal(document.indexOf(begin, first + begin.length), -1, 'Duplicate export markers');
const result = document.slice(0, first) + escape(source) + document.slice(last + end.length);
if (process.argv.includes('--check')) {
  assert.equal(document, result, 'index.html is stale; run npm run build');
  console.log('PASS: standalone export matches source');
} else {
  fs.writeFileSync(destination, result);
  console.log('Updated index.html');
}
