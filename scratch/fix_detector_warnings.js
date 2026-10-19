const fs = require('fs');

let html = fs.readFileSync('index.v2.html', 'utf8');

// 1. Fix Speech Rate buttons font sizes (bump from .65rem/10.4px to 12px)
html = html.replace(/<small style="color:var\(--text-muted\);font-size:\.65rem">/g, '<span style="color:var(--text-muted);font-size:12px;display:block">');
html = html.replace(/<small style="font-size:\.65rem">/g, '<span style="font-size:12px;display:block">');
html = html.replace(/<\/small>/g, '</span>');

// 2. Fix Kicker 1 in mysteryBoxPreOpen
const kicker1Old = `<div style="font-size:.78rem;font-weight:800;color:var(--neon-gold);letter-spacing:1px;text-transform:uppercase;margin-bottom:.4rem">
        ✨ PHẦN THƯỞNG NGHI THỨC NGÀY ✨
      </div>
      <h3 style="font-size:1.4rem;font-weight:900;margin:0 0 .5rem;color:#fff">Hộp Quà May Mắn Sakura</h3>`;

const kicker1New = `<h3 style="font-size:1.4rem;font-weight:900;margin:0 0 .5rem;color:var(--neon-gold)">🎁 Hộp Quà May Mắn Sakura</h3>`;

if (html.includes(kicker1Old)) {
  html = html.replace(kicker1Old, kicker1New);
  console.log('Removed kicker 1');
}

// 3. Fix Kicker 2 in mysteryBoxPostOpen
const kicker2Old = `<div style="font-size:.78rem;font-weight:800;letter-spacing:1px;text-transform:uppercase;margin-bottom:.4rem" id="mysteryItemRarityBadge">
        [ HUYỀN THOẠI ]
      </div>
      <h3 style="font-size:1.4rem;font-weight:900;margin:0 0 .2rem;color:#fff" id="mysteryItemName">
        Vật Phẩm Mới
      </h3>`;

const kicker2New = `<div style="display:flex;align-items:center;justify-content:center;gap:.5rem;margin-bottom:.5rem">
        <h3 style="font-size:1.35rem;font-weight:900;margin:0;color:#fff" id="mysteryItemName">Vật Phẩm Mới</h3>
        <span class="mode-badge" style="font-size:12px;padding:.15rem .5rem;color:var(--neon-gold);border-color:var(--neon-gold)" id="mysteryItemRarityBadge">Huyền Thoại</span>
      </div>`;

if (html.includes(kicker2Old)) {
  html = html.replace(kicker2Old, kicker2New);
  console.log('Removed kicker 2');
}

fs.writeFileSync('index.v2.html', html);
console.log('Detector fixes applied!');
