const fs = require('fs');

let html = fs.readFileSync('index.v2.html', 'utf8');

// 1. UPDATE SETTINGS MODAL: ADD SECTION 0 (THEME PICKER)
const settingsStart = html.indexOf('<div class="modal-overlay" id="settingsModalOverlay">');
if (settingsStart !== -1) {
  const sec1Marker = '<!-- Section 1: Nguồn Âm Thanh Từ Vựng (VOICEVOX Studio) -->';
  const themeSecHtml = `<!-- Section 0: Phong Cách Giao Diện & Sáng/Tối -->
      <div style="background:var(--bg-surface);border:1px solid var(--border);border-radius:var(--radius-md);padding:.9rem">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.5rem">
          <div style="display:flex;align-items:center;gap:.4rem">
            <span style="font-size:1.1rem">🎨</span>
            <span style="font-size:.82rem;font-weight:800;color:var(--neon-sakura);letter-spacing:.03em">PHONG CÁCH GIAO DIỆN & MÀU SẮC:</span>
          </div>
          <span id="settingsCurrentThemeBadge" style="font-size:.72rem;padding:.15rem .5rem;border-radius:var(--radius-full);background:rgba(255,42,109,0.15);color:var(--neon-sakura);border:1px solid var(--neon-sakura);font-weight:700">Tokyo Arcade</span>
        </div>
        <div style="font-size:.8rem;color:var(--text-secondary);line-height:1.45;margin-bottom:.75rem">
          Chọn giữa 3 phong cách độc đáo: <strong>Tokyo Arcade</strong> (Cyberpunk), <strong>Sakura Elegance</strong> (Tao nhã chuẩn Nhật), và <strong>Kawaii Anime Neko</strong> (Cute tai mèo & Chibi), cùng chế độ Sáng / Tối.
        </div>
        <button class="btn btn-primary btn-sm btn-full" onclick="openThemePickerModal()" style="font-size:.8rem">
          🎨 Tùy Chỉnh Phong Cách & Sáng Tối
        </button>
      </div>\n\n      ` + sec1Marker;

  if (!html.includes('id="settingsCurrentThemeBadge"')) {
    html = html.replace(sec1Marker, themeSecHtml);
    console.log('Added Theme Section to Settings modal');
  }
}

// 2. EXPAND ANIME_LIST TO 50 SONGS
const newSongsCode = fs.readFileSync('scratch/new_songs.js', 'utf8');
const newSongsMatch = newSongsCode.match(/const NEW_SONGS = (\[[\s\S]*?\]);/);
if (newSongsMatch) {
  const newSongsArray = eval(newSongsMatch[1]);
  console.log('Loaded new songs to append:', newSongsArray.length);

  // Find end of ANIME_LIST
  const alStart = html.indexOf('const ANIME_LIST = [');
  const alEnd = html.indexOf('];', alStart);
  
  if (alStart !== -1 && alEnd !== -1) {
    const currentListStr = html.substring(alStart, alEnd);
    // Check if new songs already appended
    if (!currentListStr.includes('bMXeS_G4XnQ')) {
      const formattedNewSongs = newSongsArray.map(s => '  ' + JSON.stringify(s, null, 2).replace(/\n/g, '\n  ')).join(',\n');
      const replacement = currentListStr.trim() + ',\n' + formattedNewSongs + '\n];';
      html = html.substring(0, alStart) + 'const ANIME_LIST = [\n' + replacement.substring('const ANIME_LIST = [\n'.length) + html.substring(alEnd + 2);
      console.log('Expanded ANIME_LIST with 14 new songs!');
    }
  }
}

fs.writeFileSync('index.v2.html', html);
console.log('Step 3 (Themes in Settings + 50 Songs) applied.');
