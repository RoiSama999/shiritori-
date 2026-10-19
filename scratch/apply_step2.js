const fs = require('fs');

let html = fs.readFileSync('index.v2.html', 'utf8');

// 1. Add Sakura Canvas
if (!html.includes('id="sakuraPetalsCanvas"')) {
  html = html.replace('<div id="toast"', '<canvas id="sakuraPetalsCanvas"></canvas>\n  <div id="toast"');
  console.log('Added sakuraPetalsCanvas');
}

// 2. Add Theme Quick Button in Header
if (!html.includes('id="themeQuickToggleBtn"')) {
  const headerSettingsBtn = '<button class="sfx-btn" id="settingsBtn"';
  const themeBtnHtml = `<button class="sfx-btn" id="themeQuickToggleBtn" onclick="openThemePickerModal()" title="Đổi phong cách giao diện & Sáng/Tối">🎨</button>\n        <button class="sfx-btn" id="settingsBtn"`;
  html = html.replace(headerSettingsBtn, themeBtnHtml);
  console.log('Added themeQuickToggleBtn to header');
}

// 3. Add Theme Picker Modal Overlay
const themePickerModalHtml = `
<!-- Theme Picker Modal: Chuyển Đổi Phong Cách Giao Diện & Sáng/Tối -->
<div class="modal-overlay" id="themePickerModalOverlay">
  <div class="modal-box" style="max-width:500px;text-align:left;max-height:90vh;max-height:90dvh;overflow-y:auto">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;border-bottom:1px solid var(--border);padding-bottom:.65rem">
      <div style="display:flex;align-items:center;gap:.5rem">
        <span style="font-size:1.4rem">🎨</span>
        <div>
          <div style="font-size:1.15rem;font-weight:800;color:var(--text-primary);font-family:var(--font-serif)">Phong Cách Giao Diện</div>
          <div style="font-size:.75rem;color:var(--text-muted)">Tùy biến không gian học tiếng Nhật theo sở thích của bạn</div>
        </div>
      </div>
      <button class="btn btn-ghost btn-sm" onclick="closeThemePickerModal()" style="padding:.2rem .6rem;font-size:1rem;line-height:1" title="Đóng">✕</button>
    </div>

    <!-- Theme Mode Switcher (Sáng / Tối) -->
    <div style="background:var(--bg-surface);border:1px solid var(--border);border-radius:var(--radius-md);padding:.75rem;margin-bottom:1rem">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div>
          <div style="font-size:.85rem;font-weight:700;color:var(--text-primary)">Ánh Sáng & Tương Phản:</div>
          <div style="font-size:.72rem;color:var(--text-muted)">Chuyển đổi giữa chế độ Ngày & Đêm</div>
        </div>
        <div style="display:flex;gap:.35rem;background:var(--bg-card);padding:3px;border-radius:var(--radius-full);border:1px solid var(--border)">
          <button class="btn btn-sm btn-ghost theme-mode-btn" id="themeModeDarkBtn" onclick="setThemeMode('dark')" style="font-size:.75rem;padding:.2rem .65rem;border-radius:var(--radius-full)">🌙 Tối</button>
          <button class="btn btn-sm btn-ghost theme-mode-btn" id="themeModeLightBtn" onclick="setThemeMode('light')" style="font-size:.75rem;padding:.2rem .65rem;border-radius:var(--radius-full)">☀️ Sáng</button>
        </div>
      </div>
    </div>

    <!-- 3 Theme Style Cards -->
    <div style="display:flex;flex-direction:column;gap:.75rem">
      <!-- Style 1: Tokyo Neon Arcade -->
      <div class="theme-style-card" id="themeCard_arcade" onclick="setThemeStyle('arcade')" style="cursor:pointer;background:var(--bg-surface);border:2px solid var(--border);border-radius:var(--radius-md);padding:.9rem;transition:all .2s ease">
        <div style="display:flex;justify-content:space-between;align-items:flex-start">
          <div style="display:flex;gap:.6rem;align-items:center">
            <span style="font-size:1.6rem">⚡</span>
            <div>
              <div style="font-weight:800;font-size:.95rem;color:var(--text-primary)">Tokyo Neon Arcade</div>
              <div style="font-size:.75rem;color:var(--text-muted)">Cyberpunk tương lai, rực rỡ phong cách game thùng Akihabara</div>
            </div>
          </div>
          <span class="theme-check-badge" id="check_arcade" style="font-size:.85rem;color:var(--neon-cyan)">●</span>
        </div>
        <div style="display:flex;gap:.4rem;margin-top:.6rem">
          <span style="display:inline-block;width:18px;height:18px;border-radius:50%;background:#07080e;border:1px solid #334"></span>
          <span style="display:inline-block;width:18px;height:18px;border-radius:50%;background:#05d9e8"></span>
          <span style="display:inline-block;width:18px;height:18px;border-radius:50%;background:#ff2a6d"></span>
          <span style="display:inline-block;width:18px;height:18px;border-radius:50%;background:#ffbe0b"></span>
        </div>
      </div>

      <!-- Style 2: Sakura Elegance (Tao nhã chuẩn Nhật) -->
      <div class="theme-style-card" id="themeCard_sakura" onclick="setThemeStyle('sakura')" style="cursor:pointer;background:var(--bg-surface);border:2px solid var(--border);border-radius:var(--radius-md);padding:.9rem;transition:all .2s ease">
        <div style="display:flex;justify-content:space-between;align-items:flex-start">
          <div style="display:flex;gap:.6rem;align-items:center">
            <span style="font-size:1.6rem">🌸</span>
            <div>
              <div style="font-weight:800;font-size:.95rem;color:var(--text-primary)">Sakura Elegance (Tao Nhã Chuẩn Nhật)</div>
              <div style="font-size:.75rem;color:var(--text-muted)">Phong cách truyền thống Nhật Bản wabi-sabi, cánh hoa đào bay thanh tịnh</div>
            </div>
          </div>
          <span class="theme-check-badge" id="check_sakura" style="font-size:.85rem;color:var(--neon-sakura)">●</span>
        </div>
        <div style="display:flex;gap:.4rem;margin-top:.6rem">
          <span style="display:inline-block;width:18px;height:18px;border-radius:50%;background:#fcf8f5;border:1px solid #dcd0c8"></span>
          <span style="display:inline-block;width:18px;height:18px;border-radius:50%;background:#d84a75"></span>
          <span style="display:inline-block;width:18px;height:18px;border-radius:50%;background:#52794c"></span>
          <span style="display:inline-block;width:18px;height:18px;border-radius:50%;background:#b38222"></span>
        </div>
      </div>

      <!-- Style 3: Kawaii Anime Neko (Cute kẹo ngọt & tai mèo) -->
      <div class="theme-style-card" id="themeCard_neko" onclick="setThemeStyle('neko')" style="cursor:pointer;background:var(--bg-surface);border:2px solid var(--border);border-radius:var(--radius-md);padding:.9rem;transition:all .2s ease">
        <div style="display:flex;justify-content:space-between;align-items:flex-start">
          <div style="display:flex;gap:.6rem;align-items:center">
            <span style="font-size:1.6rem">🐾</span>
            <div>
              <div style="font-weight:800;font-size:.95rem;color:var(--text-primary)">Kawaii Anime Neko (Anime Cute Mèo)</div>
              <div style="font-size:.75rem;color:var(--text-muted)">Kẹo ngọt dâu sữa pastel, tai mèo ngộ nghĩnh và trợ lý Anime Chibi dễ thương</div>
            </div>
          </div>
          <span class="theme-check-badge" id="check_neko" style="font-size:.85rem;color:var(--neon-pink)">●</span>
        </div>
        <div style="display:flex;gap:.4rem;margin-top:.6rem">
          <span style="display:inline-block;width:18px;height:18px;border-radius:50%;background:#fff5f8;border:1px solid #fed1e6"></span>
          <span style="display:inline-block;width:18px;height:18px;border-radius:50%;background:#ff4d85"></span>
          <span style="display:inline-block;width:18px;height:18px;border-radius:50%;background:#a855f7"></span>
          <span style="display:inline-block;width:18px;height:18px;border-radius:50%;background:#38bdf8"></span>
        </div>
      </div>
    </div>

    <div style="margin-top:1.25rem;text-align:right">
      <button class="btn btn-primary btn-sm" onclick="closeThemePickerModal()" style="padding:.4rem 1.2rem">Hoàn Tất ✓</button>
    </div>
  </div>
</div>
`;

if (!html.includes('id="themePickerModalOverlay"')) {
  const insertMarker = '<div class="modal-overlay" id="settingsModalOverlay">';
  html = html.replace(insertMarker, themePickerModalHtml + '\n' + insertMarker);
  console.log('Added themePickerModalOverlay');
}

fs.writeFileSync('index.v2.html', html);
console.log('Step 2 complete.');
