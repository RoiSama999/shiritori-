const fs = require('fs');
const content = fs.readFileSync('index.v2.html', 'utf8');

const dojoStart = content.indexOf('<main class="screen" id="tab-dojo">');
const dojoEnd = content.indexOf('</main>', dojoStart);

console.log('Dojo HTML length:', dojoEnd - dojoStart);
const dojoHtml = content.substring(dojoStart, dojoEnd + 7);

// Check current subtabs
const subtabs = dojoHtml.match(/<div class="dojo-subtabs">[\s\S]*?<\/div>/);
if (subtabs) {
  console.log('--- Subtabs HTML ---');
  console.log(subtabs[0]);
}
