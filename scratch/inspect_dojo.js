const fs = require('fs');
const content = fs.readFileSync('index.v2.html', 'utf8');
const lines = content.split('\n');

let inDojo = false;
let dojoLines = [];
let startLine = 0;
lines.forEach((l, i) => {
  if (l.includes('id="tab-dojo"')) {
    inDojo = true;
    startLine = i + 1;
  }
  if (inDojo) dojoLines.push((i+1) + ': ' + l);
  if (inDojo && l.includes('id="tab-lounge"')) inDojo = false;
});

console.log('Dojo starts at line:', startLine, 'Total lines:', dojoLines.length);
console.log('--- Subtabs HTML ---');
console.log(dojoLines.slice(0, 50).join('\n'));
