const fs = require('fs');

let html = fs.readFileSync('index.v2.html', 'utf8');

// Replace all \` with ` in the injected section
// Check occurrences of \`
console.log('Occurrences of \\`:', (html.match(/\\`/g) || []).length);
html = html.replace(/\\`/g, '`');

// Also check occurrences of \${
console.log('Occurrences of \\${:', (html.match(/\\\${/g) || []).length);
html = html.replace(/\\\${/g, '${');

fs.writeFileSync('index.v2.html', html);
console.log('Fixed backslash escaped backticks!');
