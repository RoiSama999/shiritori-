const fs = require('fs');
const content = fs.readFileSync('index.v2.html', 'utf8');

const regex = /style="[^"]*color:\s*(?:#fff(?:fff)?|white)[^"]*"/gi;
const matches = [...content.matchAll(regex)];
console.log('Total inline styles with white color:', matches.length);

const snippets = [];
for (const m of matches) {
  const start = Math.max(0, m.index - 50);
  const end = Math.min(content.length, m.index + m[0].length + 50);
  snippets.push(content.slice(start, end).replace(/\n/g, ' '));
}
console.log('First 25 snippets:');
snippets.slice(0, 25).forEach((s, i) => console.log(`${i+1}. ${s}`));
