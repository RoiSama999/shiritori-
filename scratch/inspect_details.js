const fs = require('fs');
const content = fs.readFileSync('index.v2.html', 'utf8');

// Inspect switchDojoMode implementations
const dojoModeMatches = content.match(/function switchDojoMode[\s\S]*?^}/m);
if (dojoModeMatches) {
  console.log('--- switchDojoMode ---');
  console.log(dojoModeMatches[0]);
}

// Find all dojo views in HTML
const dojoSection = content.substring(content.indexOf('id="tab-dojo"'), content.indexOf('id="tab-lounge"'));
console.log('--- Dojo Subviews IDs in HTML ---');
const subviews = [...dojoSection.matchAll(/id="([^"]+)"/g)].map(m => m[1]);
console.log(subviews);

// Inspect MUSIC_DB / songs
const musicDbMatch = content.match(/const\s+(?:ANIME_SONGS|MUSIC_DB|SONG_LIST)\s*=\s*\[[\s\S]*?\];/);
if (musicDbMatch) {
  console.log('--- Music DB (first 500 chars) ---');
  console.log(musicDbMatch[0].slice(0, 500));
  const count = (musicDbMatch[0].match(/id:/g) || []).length;
  console.log('Total songs count:', count);
} else {
  // search for where songs are defined
  const m = content.match(/(?:ANIME_SONGS|MUSIC_DB|songs|trackList|animeTracks)\s*=\s*\[/g);
  console.log('Song arrays matched:', m);
}

// Inspect Hub section
const hubSection = content.substring(content.indexOf('id="tab-hub"'), content.indexOf('id="tab-quest"'));
console.log('--- Hub Section length:', hubSection.length);
