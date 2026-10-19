const fs = require('fs');

let html = fs.readFileSync('index.v2.html', 'utf8');

// 1. UPDATE DOJO SIDEBAR BUTTONS
const originalDojoSubtabs = `<div class="dojo-subtabs">
          <button class="btn btn-sm btn-cyan dojo-tab-btn" id="dojoSubFC" onclick="switchDojoMode('fc')">📇 Flashcard</button>
          <button class="btn btn-sm btn-ghost dojo-tab-btn" id="dojoSubQuiz" onclick="switchDojoMode('quiz')">📝 Trắc Nghiệm</button>
          <button class="btn btn-sm btn-ghost dojo-tab-btn" id="dojoSubPron" onclick="switchDojoMode('pron')">🎤 Phát Âm AI</button>
          <button class="btn btn-sm btn-ghost dojo-tab-btn" id="dojoSubKana" onclick="switchDojoMode('kana')">🔤 Bảng Chữ Kana</button>
          <button class="btn btn-sm btn-ghost dojo-tab-btn" id="dojoSubDictation" onclick="switchDojoMode('dictation')">🎧 Nghe Chép Chính Tả</button>
          <button class="btn btn-sm btn-ghost dojo-tab-btn" id="dojoSubScenario" onclick="switchDojoMode('scenario')">🏪 Tình Huống N5</button>
          <button class="btn btn-sm btn-ghost dojo-tab-btn" id="dojoSubAnime" onclick="switchDojoMode('anime')">🎭 Đoán Anime</button>
        </div>`;

const streamlinedDojoSubtabs = `<div class="dojo-subtabs">
          <button class="btn btn-sm btn-cyan dojo-tab-btn" id="dojoSubFC" onclick="switchDojoMode('fc')">📇 Luyện Thẻ & Trắc Nghiệm</button>
          <button class="btn btn-sm btn-ghost dojo-tab-btn" id="dojoSubPron" onclick="switchDojoMode('pron')">🎧 Luyện Nghe & Nói</button>
          <button class="btn btn-sm btn-ghost dojo-tab-btn" id="dojoSubBlitz" onclick="switchDojoMode('blitz')">⚡ Phản Xạ 60 Giây</button>
          <button class="btn btn-sm btn-ghost dojo-tab-btn" id="dojoSubKana" onclick="switchDojoMode('kana')">🔤 Bảng Chữ Kana</button>
          <button class="btn btn-sm btn-ghost dojo-tab-btn" id="dojoSubScenario" onclick="switchDojoMode('scenario')">🏪 Tình Huống N5</button>
          <button class="btn btn-sm btn-ghost dojo-tab-btn" id="dojoSubAnime" onclick="switchDojoMode('anime')">🎭 Đố Vui Anime</button>

          <!-- Backwards-compatibility hidden elements for dojoSubQuiz & dojoSubDictation so element lookups never fail -->
          <button id="dojoSubQuiz" onclick="switchDojoMode('quiz')" style="display:none"></button>
          <button id="dojoSubDictation" onclick="switchDojoMode('dictation')" style="display:none"></button>
        </div>`;

if (html.includes(originalDojoSubtabs)) {
  html = html.replace(originalDojoSubtabs, streamlinedDojoSubtabs);
  console.log('Streamlined Dojo sidebar subtabs');
}

// 2. ADD TOGGLE SWITCHERS INSIDE VOCAB (FC & QUIZ) AND AUDIO (PRON & DICTATION)
const fcViewStart = '<div id="dojoFCView">';
const fcToggleBar = `<div id="dojoFCView">
          <div class="vocab-toggle-bar" style="display:flex;justify-content:center;gap:.4rem;margin-bottom:1rem;background:var(--bg-surface);padding:4px;border-radius:var(--radius-full);border:1px solid var(--border);max-width:380px;margin-left:auto;margin-right:auto">
            <button class="btn btn-sm btn-cyan" id="btnSubToggleFC" onclick="switchDojoMode('fc')" style="flex:1;border-radius:var(--radius-full);font-size:.78rem">🔄 Thẻ Lật 3D</button>
            <button class="btn btn-sm btn-ghost" id="btnSubToggleQuiz" onclick="switchDojoMode('quiz')" style="flex:1;border-radius:var(--radius-full);font-size:.78rem">📝 Trắc Nghiệm</button>
          </div>`;

if (html.includes(fcViewStart) && !html.includes('id="btnSubToggleFC"')) {
  html = html.replace(fcViewStart, fcToggleBar);
  console.log('Added Vocab toggle bar to dojoFCView');
}

const quizViewStart = '<div id="dojoQuizView" style="display:none">';
const quizToggleBar = `<div id="dojoQuizView" style="display:none">
          <div class="vocab-toggle-bar" style="display:flex;justify-content:center;gap:.4rem;margin-bottom:1rem;background:var(--bg-surface);padding:4px;border-radius:var(--radius-full);border:1px solid var(--border);max-width:380px;margin-left:auto;margin-right:auto">
            <button class="btn btn-sm btn-ghost" onclick="switchDojoMode('fc')" style="flex:1;border-radius:var(--radius-full);font-size:.78rem">🔄 Thẻ Lật 3D</button>
            <button class="btn btn-sm btn-cyan" onclick="switchDojoMode('quiz')" style="flex:1;border-radius:var(--radius-full);font-size:.78rem">📝 Trắc Nghiệm</button>
          </div>`;

if (html.includes(quizViewStart) && !html.includes('id="dojoQuizView" style="display:none">\n          <div class="vocab-toggle-bar"')) {
  html = html.replace(quizViewStart, quizToggleBar);
  console.log('Added Vocab toggle bar to dojoQuizView');
}

const pronViewStart = '<div id="dojoPronView" style="display:none">';
const pronToggleBar = `<div id="dojoPronView" style="display:none">
          <div class="audio-toggle-bar" style="display:flex;justify-content:center;gap:.4rem;margin-bottom:1rem;background:var(--bg-surface);padding:4px;border-radius:var(--radius-full);border:1px solid var(--border);max-width:400px;margin-left:auto;margin-right:auto">
            <button class="btn btn-sm btn-cyan" id="btnSubTogglePron" onclick="switchDojoMode('pron')" style="flex:1;border-radius:var(--radius-full);font-size:.78rem">🎤 Luyện Nói Qua Mic</button>
            <button class="btn btn-sm btn-ghost" id="btnSubToggleDictation" onclick="switchDojoMode('dictation')" style="flex:1;border-radius:var(--radius-full);font-size:.78rem">🎧 Nghe Chép SRS</button>
          </div>`;

if (html.includes(pronViewStart) && !html.includes('id="btnSubTogglePron"')) {
  html = html.replace(pronViewStart, pronToggleBar);
  console.log('Added Audio toggle bar to dojoPronView');
}

const dictViewStart = '<div id="dojoDictationView" style="display:none">';
const dictToggleBar = `<div id="dojoDictationView" style="display:none">
          <div class="audio-toggle-bar" style="display:flex;justify-content:center;gap:.4rem;margin-bottom:1rem;background:var(--bg-surface);padding:4px;border-radius:var(--radius-full);border:1px solid var(--border);max-width:400px;margin-left:auto;margin-right:auto">
            <button class="btn btn-sm btn-ghost" onclick="switchDojoMode('pron')" style="flex:1;border-radius:var(--radius-full);font-size:.78rem">🎤 Luyện Nói Qua Mic</button>
            <button class="btn btn-sm btn-cyan" onclick="switchDojoMode('dictation')" style="flex:1;border-radius:var(--radius-full);font-size:.78rem">🎧 Nghe Chép SRS</button>
          </div>`;

if (html.includes(dictViewStart) && !html.includes('id="dojoDictationView" style="display:none">\n          <div class="audio-toggle-bar"')) {
  html = html.replace(dictViewStart, dictToggleBar);
  console.log('Added Audio toggle bar to dojoDictationView');
}

// 3. ADD DOJO SPEED BLITZ 60S VIEW
const blitzViewHtml = `
        <!-- SPEED BLITZ 60S VIEW (TÍNH NĂNG MỚI ĐỘT PHÁ) -->
        <div id="dojoBlitzView" style="display:none">
          <div class="card" style="padding:1.4rem;text-align:center">
            <!-- Header bar with Timer, Score, Streak -->
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;flex-wrap:wrap;gap:.5rem;padding-bottom:.75rem;border-bottom:1px solid var(--border)">
              <div style="display:flex;align-items:center;gap:.4rem">
                <span style="font-size:1.3rem">⚡</span>
                <span style="font-size:.95rem;font-weight:800;color:var(--neon-gold)">PHẢN XẠ CHỚP NHOÁNG 60S</span>
              </div>
              <div style="display:flex;align-items:center;gap:.6rem">
                <div style="font-size:.82rem;color:var(--text-muted)">Kỷ lục: <strong style="color:var(--neon-gold)" id="blitzHighScoreVal">0</strong></div>
                <div class="timer-pill" id="blitzTimerDisplay" style="font-size:1.05rem;min-width:65px;padding:.25rem .75rem;border-color:var(--neon-gold);color:var(--neon-gold)">60s</div>
              </div>
            </div>

            <!-- Start screen (before playing) -->
            <div id="blitzIntroScreen" style="padding:1.5rem 1rem">
              <div style="font-size:3rem;margin-bottom:.5rem">⏱️⚡</div>
              <div style="font-size:1.2rem;font-weight:800;color:var(--text-primary);margin-bottom:.4rem">Thử Thách Phản Xạ 60 Giây</div>
              <div style="font-size:.85rem;color:var(--text-secondary);max-width:440px;margin:0 auto 1.25rem;line-height:1.5">
                Trả lời nhanh nhất có thể trong 60 giây! Mỗi chuỗi đúng liên tiếp (streak) sẽ tăng hệ số nhân thưởng lên tới <strong>x3.0</strong>!
              </div>
              <button class="btn btn-primary" onclick="startBlitzGame()" style="min-width:180px;font-size:1.05rem;padding:.75rem 1.75rem;border-radius:var(--radius-full)">
                Bắt Đầu Ngay ⚡
              </button>
            </div>

            <!-- Active Gameplay Arena -->
            <div id="blitzArenaScreen" style="display:none">
              <!-- Live HUD: Score & Streak Multiplier -->
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;background:var(--bg-surface);padding:.6rem 1rem;border-radius:var(--radius-md);border:1px solid var(--border)">
                <div style="font-size:.85rem;font-weight:700">Điểm: <strong style="color:var(--neon-gold);font-size:1.2rem" id="blitzLiveScore">0</strong></div>
                <div id="blitzMultiplierBadge" style="font-size:.8rem;font-weight:800;padding:.2rem .6rem;border-radius:var(--radius-full);background:rgba(255,190,11,0.15);color:var(--neon-gold);border:1px solid var(--neon-gold)">COMBO x1.0</div>
                <div style="font-size:.85rem;color:var(--text-muted)">Chuỗi: <span id="blitzLiveStreak" style="color:var(--neon-lime);font-weight:700">0 🔥</span></div>
              </div>

              <!-- Question Kanji Card -->
              <div style="background:var(--bg-surface);border:1px solid var(--border);border-radius:var(--radius-lg);padding:1.5rem 1rem;margin-bottom:1.2rem">
                <div style="font-size:.78rem;color:var(--text-muted);margin-bottom:.25rem">TỪ NÀY CÓ NGHĨA LÀ GÌ?</div>
                <div style="font-family:var(--font-kanji);font-size:2.4rem;font-weight:900;color:var(--neon-cyan);margin:.2rem 0" id="blitzKanji">桜</div>
                <div style="font-size:1.05rem;color:var(--neon-sakura);font-weight:700" id="blitzReading">さくら</div>
              </div>

              <!-- 4 Choice Options -->
              <div class="quiz-options-grid" id="blitzOptionsGrid" style="max-width:560px;margin:0 auto"></div>
              
              <div id="blitzFeedbackPopup" style="min-height:26px;margin-top:.75rem;font-size:.9rem;font-weight:800"></div>
            </div>

            <!-- Game Over Summary Screen -->
            <div id="blitzResultScreen" style="display:none;padding:1rem 0">
              <div style="font-size:2.8rem;margin-bottom:.4rem">🏆</div>
              <div style="font-size:1.25rem;font-weight:800;color:var(--neon-gold);margin-bottom:.3rem">HẾT GIỜ! HOÀN THÀNH THỬ THÁCH</div>
              <div id="blitzNewRecordBadge" style="display:none;margin-bottom:.75rem;font-size:.82rem;font-weight:800;color:var(--neon-sakura);background:rgba(255,42,109,0.15);padding:.25rem .75rem;border-radius:var(--radius-full);display:inline-block">🎉 KỶ LỤC CÁ NHÂN MỚI!</div>

              <div style="display:grid;grid-template-columns:repeat(3, 1fr);gap:.6rem;max-width:440px;margin:1rem auto;text-align:center">
                <div style="background:var(--bg-surface);padding:.75rem .4rem;border-radius:var(--radius-md);border:1px solid var(--border)">
                  <div style="font-size:.75rem;color:var(--text-muted)">TỔNG ĐIỂM</div>
                  <div style="font-size:1.4rem;font-weight:800;color:var(--neon-gold)" id="blitzFinalScore">0</div>
                </div>
                <div style="background:var(--bg-surface);padding:.75rem .4rem;border-radius:var(--radius-md);border:1px solid var(--border)">
                  <div style="font-size:.75rem;color:var(--text-muted)">CHÍNH XÁC</div>
                  <div style="font-size:1.4rem;font-weight:800;color:var(--neon-lime)" id="blitzFinalAccuracy">0%</div>
                </div>
                <div style="background:var(--bg-surface);padding:.75rem .4rem;border-radius:var(--radius-md);border:1px solid var(--border)">
                  <div style="font-size:.75rem;color:var(--text-muted)">MAX COMBO</div>
                  <div style="font-size:1.4rem;font-weight:800;color:var(--neon-sakura)" id="blitzFinalMaxStreak">0 🔥</div>
                </div>
              </div>

              <div style="font-size:.9rem;color:var(--text-secondary);margin-bottom:1.25rem">
                Danh hiệu phản xạ: <strong style="color:var(--neon-cyan)" id="blitzRankTitle">Ninja Tốc Độ</strong>
              </div>

              <div style="display:flex;gap:.5rem;justify-content:center;max-width:380px;margin:0 auto">
                <button class="btn btn-primary" onclick="startBlitzGame()" style="flex:1">Chơi Lại Ván Mới ⚡</button>
                <button class="btn btn-ghost" onclick="switchDojoMode('fc')" style="flex:1">Về Thẻ Từ 📇</button>
              </div>
            </div>
          </div>
        </div>
`;

if (!html.includes('id="dojoBlitzView"')) {
  const dojoAnimeViewMarker = '<div id="dojoAnimeView" style="display:none">';
  html = html.replace(dojoAnimeViewMarker, blitzViewHtml + '\n        ' + dojoAnimeViewMarker);
  console.log('Added dojoBlitzView to Dojo');
}

// 4. ADD SONG VOCABULARY CARD & CATEGORY PILLS TO ANIME MV LOUNGE
const loungeDeckMarker = '<div class="playlist-cards" id="playlistDeck"';
const loungeCategoryPillsHtml = `<!-- Category Pills for Anime MV -->
          <div style="display:flex;gap:.35rem;overflow-x:auto;padding-bottom:.4rem;margin-bottom:.65rem;scrollbar-width:none">
            <button class="btn btn-sm btn-cyan mv-cat-pill" id="mvCatAll" onclick="setMvCategory('ALL')" style="font-size:.72rem;padding:.2rem .6rem;flex-shrink:0;border-radius:var(--radius-full)">🌸 Tất Cả (50)</button>
            <button class="btn btn-sm btn-ghost mv-cat-pill" id="mvCatHot" onclick="setMvCategory('HOT')" style="font-size:.72rem;padding:.2rem .6rem;flex-shrink:0;border-radius:var(--radius-full)">🔥 Hot Mới 2023-2026</button>
            <button class="btn btn-sm btn-ghost mv-cat-pill" id="mvCatShonen" onclick="setMvCategory('SHONEN')" style="font-size:.72rem;padding:.2rem .6rem;flex-shrink:0;border-radius:var(--radius-full)">⚔️ Shonen Sôi Động</button>
            <button class="btn btn-sm btn-ghost mv-cat-pill" id="mvCatBallad" onclick="setMvCategory('BALLAD')" style="font-size:.72rem;padding:.2rem .6rem;flex-shrink:0;border-radius:var(--radius-full)">🍃 Nhẹ Nhàng & Cảm Xúc</button>
            <button class="btn btn-sm btn-ghost mv-cat-pill" id="mvCatClassic" onclick="setMvCategory('CLASSIC')" style="font-size:.72rem;padding:.2rem .6rem;flex-shrink:0;border-radius:var(--radius-full)">👑 Huyền Thoại</button>
          </div>\n          ` + loungeDeckMarker;

if (html.includes(loungeDeckMarker) && !html.includes('id="mvCatAll"')) {
  html = html.replace(loungeDeckMarker, loungeCategoryPillsHtml);
  console.log('Added category pills to Anime MV playlist');
}

// 5. ADD SONG KEY VOCABULARY BOX UNDER LYRICS
const lyricBoxEnd = '</div>\n          </div>\n\n          <div style="display:flex;gap:.5rem;flex-wrap:wrap">';
const songVocabCardHtml = `</div>
          </div>

          <!-- Song Key Vocabulary Breakdown Card -->
          <div style="background:var(--bg-surface);border:1px solid var(--border);border-radius:var(--radius-md);padding:.75rem;margin:.75rem 0" id="songKeyVocabBox">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.4rem">
              <div style="font-size:.78rem;font-weight:800;color:var(--neon-cyan);display:flex;align-items:center;gap:.3rem">
                <span>📚</span>
                <span>TỪ VỰNG TIÊU BIỂU TRONG BÀI:</span>
              </div>
              <button class="btn btn-ghost btn-sm" onclick="openKaraokeModal()" style="font-size:.72rem;padding:.15rem .5rem;color:var(--neon-gold)" title="Mở phòng hát toàn màn hình">
                🎤 Chế Độ Karaoke
              </button>
            </div>
            <div id="songKeyVocabList" style="display:flex;flex-direction:column;gap:.35rem">
              <!-- Rendered by JS -->
            </div>
          </div>

          <div style="display:flex;gap:.5rem;flex-wrap:wrap">`;

if (html.includes(lyricBoxEnd) && !html.includes('id="songKeyVocabBox"')) {
  html = html.replace(lyricBoxEnd, songVocabCardHtml);
  console.log('Added songKeyVocabBox to Lounge');
}

// 6. ADD KARAOKE MODAL OVERLAY
const karaokeModalHtml = `
<!-- Karaoke Focus Modal: Lời Bài Hát Lớn Song Ngữ -->
<div class="modal-overlay" id="karaokeModalOverlay">
  <div class="modal-box" style="max-width:640px;text-align:center;max-height:90vh;max-height:90dvh;overflow-y:auto;padding:1.5rem">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;border-bottom:1px solid var(--border);padding-bottom:.65rem">
      <div style="display:flex;align-items:center;gap:.5rem">
        <span style="font-size:1.5rem">🎤</span>
        <div style="text-align:left">
          <div style="font-size:1.1rem;font-weight:800;color:var(--neon-gold)" id="karaokeSongTitle">Tên bài hát</div>
          <div style="font-size:.78rem;color:var(--text-muted)" id="karaokeAnimeTitle">Anime title</div>
        </div>
      </div>
      <button class="btn btn-ghost btn-sm" onclick="closeKaraokeModal()" style="padding:.2rem .6rem;font-size:1rem;line-height:1" title="Đóng">✕</button>
    </div>

    <div style="padding:1.5rem 1rem;background:var(--bg-surface);border-radius:var(--radius-lg);border:1px solid var(--border);margin-bottom:1.25rem">
      <div style="font-size:.78rem;letter-spacing:.05em;color:var(--neon-cyan);margin-bottom:.5rem">LỜI BÀI HÁT TIẾNG NHẬT:</div>
      <div style="font-family:var(--font-kanji);font-size:1.6rem;font-weight:900;line-height:1.7;color:#fff;margin-bottom:.75rem" id="karaokeLyricKanji">
        ...
      </div>
      <div style="font-size:1.05rem;color:var(--neon-sakura);font-weight:700;margin-bottom:.5rem" id="karaokeLyricRomaji">
        ...
      </div>
      <div style="font-size:.95rem;color:var(--text-secondary);font-style:italic" id="karaokeLyricViet">
        ...
      </div>
    </div>

    <div style="display:flex;gap:.5rem;justify-content:center">
      <button class="btn btn-ghost" onclick="speakCurrentLyricTTS()">🔊 Nghe Đọc Lời</button>
      <button class="btn btn-primary" onclick="closeKaraokeModal()">Tiếp Tục Thưởng Thức 🎵</button>
    </div>
  </div>
</div>
`;

if (!html.includes('id="karaokeModalOverlay"')) {
  const insertMarker = '<div class="modal-overlay" id="themePickerModalOverlay">';
  html = html.replace(insertMarker, karaokeModalHtml + '\n' + insertMarker);
  console.log('Added karaokeModalOverlay');
}

fs.writeFileSync('index.v2.html', html);
console.log('Step 4 complete.');
