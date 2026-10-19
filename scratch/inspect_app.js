const fs = require('fs');
const content = fs.readFileSync('index.v2.html', 'utf8');

// Find screens
const screenMatches = [...content.matchAll(/id=["']([^"']*(?:screen|tab|view|panel|hub|dojo|anime)[^"']*)["']/gi)];
console.log('Screens/views found (first 30):', [...new Set(screenMatches.map(m => m[1]))].slice(0, 30));

// Find switchTab calls
const tabMatches = [...content.matchAll(/switchTab\(['"]([^'"]+)['"]\)/g)];
console.log('Tabs in switchTab:', [...new Set(tabMatches.map(m => m[1]))]);

// Find bottom nav or main nav buttons
const navBar = content.match(/<nav[\s\S]*?<\/nav>/i);
if (navBar) {
  console.log('Main Nav Bar HTML:\n', navBar[0]);
}

// Find dojo section
const dojoIndex = content.indexOf('tab-dojo');
if (dojoIndex !== -1) {
  console.log('Dojo section snippet:\n', content.slice(dojoIndex, dojoIndex + 1500));
}

// Find music / anime mv section
const musicIndex = content.indexOf('tab-music');
if (musicIndex !== -1) {
  console.log('Music section snippet:\n', content.slice(musicIndex, musicIndex + 1200));
}
