const fs = require('fs');
const content = fs.readFileSync('index.v2.html', 'utf8');
const lines = content.split('\n');

let inHub = false;
let hubLines = [];
let startLine = 0;
lines.forEach((l, i) => {
  if (l.includes('id="tab-hub"')) {
    inHub = true;
    startLine = i + 1;
  }
  if (inHub) hubLines.push((i+1) + ': ' + l);
  if (inHub && l.includes('id="tab-quest"')) inHub = false;
});

console.log('Hub starts at line:', startLine, 'Total lines:', hubLines.length);
console.log('--- Hub Head HTML ---');
console.log(hubLines.slice(0, 80).join('\n'));
