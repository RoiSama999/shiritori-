const fs = require('fs');
const content = fs.readFileSync('index.v2.html', 'utf8');

const m = content.match(/const\s+SAKURA_OUTFITS\s*=\s*\[[\s\S]*?\];/);
if (m) console.log('SAKURA_OUTFITS:\n', m[0]);

const modalIdx = content.indexOf('id="sakuraWardrobeModal"');
if (modalIdx !== -1) {
  console.log('--- Wardrobe modal HTML snippet ---');
  console.log(content.slice(modalIdx - 50, modalIdx + 1500));
}

// Find wardrobe JS functions
const wardrobeFuncs = content.match(/function\s+(?:openSakuraWardrobeModal|renderSakuraWardrobe|equipSakuraOutfit)[\s\S]*?^}/gm);
if (wardrobeFuncs) {
  console.log('--- Wardrobe functions ---');
  wardrobeFuncs.forEach(f => console.log(f.slice(0, 400)));
}
