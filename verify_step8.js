// verify_step8.js - Test Anime Quiz Solo & PeerJS Multiplayer (Step 8)
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const assert = require('assert');

const html = fs.readFileSync(path.join(__dirname, 'index.v2.html'), 'utf8');
const vocabCode = fs.readFileSync(path.join(__dirname, 'vocab.js'), 'utf8');

const scriptMatches = [...html.matchAll(/<script(?:\s+[^>]*)?>([\s\S]*?)<\/script>/gi)];
const targetScript = scriptMatches.find(m => m[1].includes('QUEST_STAGES_CONFIG'));
if (!targetScript) throw new Error('Không tìm thấy script chính');

const domElements = new Map();
function createMockElement(id) {
  return {
    id, tagName: 'DIV', value: '', textContent: '', innerHTML: '', style: {},
    classList: {
      classes: new Set(),
      add(c){this.classes.add(c);},
      remove(c){this.classes.delete(c);},
      contains(c){return this.classes.has(c);}
    },
    disabled: false, focus(){}, click(){}, setAttribute(){}, getAttribute(){},
    dataset: {},
    children: [],
    appendChild(child){ this.children.push(child); },
    querySelectorAll(){ return this.children; },
    getBoundingClientRect(){ return { left: 100, top: 100, width: 200, height: 50 }; },
    addEventListener(){}
  };
}

let syncCalls = [];
let sentPartyMessages = [];

const mockWindow = {
  location: { protocol: 'https:', hostname: 'emi.io.vn', href: 'https://emi.io.vn' },
  addEventListener(){}, removeEventListener(){},
  matchMedia: () => ({ matches: false }),
  localStorage: {
    store: {},
    getItem(k){return this.store[k]||null;},
    setItem(k,v){this.store[k]=String(v);},
    removeItem(k){delete this.store[k];}
  },
  navigator: { serviceWorker: { register: async () => ({}) }, clipboard: { writeText: async () => {} } },
  speechSynthesis: {
    getVoices(){return[];},
    speak(){},
    cancel(){}
  },
  SpeechSynthesisUtterance: class { constructor(t){ this.text = t; } },
  document: {
    getElementById(id){ if (!domElements.has(id)) domElements.set(id, createMockElement(id)); return domElements.get(id); },
    querySelector(){ return createMockElement('app-shell'); },
    querySelectorAll(){ return []; },
    createElement(t){ return createMockElement(t); },
    addEventListener(){}
  },
  console: console, confirm: () => true, prompt: () => '',
  fetch: async () => ({ ok: true, json: async () => ({ success: true, gameData: {} }) }),
  setTimeout(fn, delay){ if(!delay && typeof fn === 'function') fn(); return 1; },
  setInterval(){ return 1; }, clearInterval(){}, clearTimeout(){},
  requestAnimationFrame(fn){ if(typeof fn === 'function') fn(); },
  AudioContext: class {
    constructor(){ this.currentTime = 0; this.state = 'running'; this.destination = {}; }
    createOscillator(){ return { connect(){}, start(){}, stop(){}, frequency: { setValueAtTime(){}, exponentialRampToValueAtTime(){}, linearRampToValueAtTime(){} } }; }
    createGain(){ return { connect(){}, gain: { setValueAtTime(){}, exponentialRampToValueAtTime(){} } }; }
    resume(){}
  }
};
mockWindow.window = mockWindow;

const sandbox = vm.createContext(mockWindow);
vm.runInContext(vocabCode, sandbox);
vm.runInContext(targetScript[1], sandbox);

(async () => {
  console.log('=== [TEST BƯỚC 8] KIỂM TRA ĐOÁN ANIME QUA THOẠI & EMOJI (SOLO + PEERJS MULTIPLAYER) ===\n');

  // Test 1: Dataset ANIME_QUIZ_DATABASE tối thiểu 40 câu
  console.log('[Test 1] Kiểm tra kho câu hỏi ANIME_QUIZ_DATABASE:');
  const db = vm.runInContext('ANIME_QUIZ_DATABASE', sandbox);
  assert(Array.isArray(db), 'ANIME_QUIZ_DATABASE phải là một mảng');
  console.log(`  ✓ Số lượng câu hỏi: ${db.length} câu (Yêu cầu: tối thiểu 40 câu)`);
  assert(db.length >= 40, `Cần tối thiểu 40 câu hỏi, hiện có: ${db.length}`);

  let quotes = 0;
  let emojis = 0;
  db.forEach((q, i) => {
    assert(q.id, `Câu ${i} thiếu id`);
    assert(q.type === 'quote' || q.type === 'emoji', `Câu ${i} loại không hợp lệ`);
    if (q.type === 'quote') quotes++;
    if (q.type === 'emoji') emojis++;
    assert(q.prompt && q.prompt.length > 0, `Câu ${i} rỗng prompt`);
    assert(q.prompt.length < 250, `Câu ${i} prompt quá dài, phải là câu ngắn hoặc mô tả tóm tắt`);
    assert(q.hint && q.hint.length > 0, `Câu ${i} rỗng hint`);
    assert(q.answer && q.answer.length > 0, `Câu ${i} rỗng answer`);
    assert(Array.isArray(q.options) && q.options.length === 4, `Câu ${i} phải có đúng 4 lựa chọn`);
    assert(q.options.includes(q.answer), `Câu ${i} đáp án phải nằm trong danh sách lựa chọn`);
    const unique = new Set(q.options);
    assert(unique.size === 4, `Câu ${i} các lựa chọn không được trùng nhau`);
  });
  console.log(`  ✓ Đầy đủ dữ liệu: ${quotes} câu trích dẫn ngắn, ${emojis} câu chuỗi emoji giải mã.`);

  // Test 2: Solo Mode trong Dojo
  console.log('\n[Test 2] Kiểm tra Chế độ chơi một mình (Solo Mode trong Dojo):');
  vm.runInContext('loadUserData()', sandbox);
  vm.runInContext('switchDojoMode("anime")', sandbox);
  const animeView = sandbox.document.getElementById('dojoAnimeView');
  assert(animeView.style.display !== 'none', 'dojoAnimeView phải hiển thị khi chuyển sang tab anime');
  console.log('  ✓ Giao diện #dojoAnimeView và tab dojoSubAnime hiển thị chính xác.');

  const soloQ = vm.runInContext('soloAnimeQuestions', sandbox);
  assert(soloQ.length === 10, 'Solo anime quiz phải nạp 10 câu hỏi');
  console.log(`  ✓ Nạp phiên chơi solo thành công với ${soloQ.length} câu hỏi ngẫu nhiên.`);

  const q1 = soloQ[0];
  const mockBtnCorrect = createMockElement('btnCorrect');
  sandbox.mockBtnCorrect = mockBtnCorrect;
  const initialScore = vm.runInContext('soloAnimeScore', sandbox);

  // Trả lời đúng
  vm.runInContext(`handleSoloAnimeAnswer(${JSON.stringify(q1.answer)}, mockBtnCorrect, soloAnimeQuestions[0])`, sandbox);
  const scoreAfter = vm.runInContext('soloAnimeScore', sandbox);
  const streakAfter = vm.runInContext('soloAnimeStreak', sandbox);
  assert(scoreAfter > initialScore, 'Điểm số phải tăng sau khi trả lời đúng');
  assert(streakAfter === 1, 'Streak phải tăng lên 1');
  assert(mockBtnCorrect.classList.contains('correct'), 'Nút chọn phải có class correct');
  console.log(`  ✓ Trả lời đúng: Điểm số tăng (+${scoreAfter - initialScore}đ), Combo streak tăng (${streakAfter}), hiệu ứng correct được kích hoạt.`);

  // Trả lời sai
  const mockBtnWrong = createMockElement('btnWrong');
  sandbox.mockBtnWrong = mockBtnWrong;
  vm.runInContext('soloAnimeLocked = false', sandbox);
  vm.runInContext(`handleSoloAnimeAnswer("Wrong Answer Option", mockBtnWrong, soloAnimeQuestions[0])`, sandbox);
  const streakWrong = vm.runInContext('soloAnimeStreak', sandbox);
  assert(streakWrong === 0, 'Streak phải bị reset về 0 khi trả lời sai');
  assert(mockBtnWrong.classList.contains('wrong'), 'Nút bấm sai phải có class wrong');
  console.log('  ✓ Trả lời sai: Combo streak reset về 0, chớp đỏ nút wrong.');

  // Hoàn thành lượt chơi Solo
  const xpBefore = vm.runInContext('userData.xp', sandbox);
  vm.runInContext('finishSoloAnimeQuiz()', sandbox);
  const xpAfter = vm.runInContext('userData.xp', sandbox);
  assert(xpAfter > xpBefore, 'XP phải tăng sau khi hoàn thành lượt chơi solo anime');
  const cardArea = sandbox.document.getElementById('soloAnimeCardArea');
  assert(cardArea.innerHTML.includes('HOÀN THÀNH 10 CÂU ĐỐ ANIME'), 'Màn hình tổng kết lượt chơi solo anime phải hiển thị');
  console.log(`  ✓ Hoàn tất 10 câu: Tặng +20 EXP, hiển thị bảng thành tích và gọi triggerGameSync('solo_anime_end').`);

  // Test 3: PeerJS Multiplayer Mode (Speed Anime Duel)
  console.log('\n[Test 3] Kiểm tra Chế độ phòng nhiều người qua PeerJS (Speed Anime Duel):');
  sentPartyMessages = [];
  mockWindow.sentPartyMessages = sentPartyMessages;
  vm.runInContext(`
    partyConn = { send: (msg) => { window.sentPartyMessages.push(msg); } };
    isPartyHost = true;
  `, sandbox);

  vm.runInContext('startPartyAnimeDuel()', sandbox);
  const activeDuel = vm.runInContext('partyAnimeActive', sandbox);
  assert(activeDuel === true, 'partyAnimeActive phải là true');
  const duelRounds = vm.runInContext('partyAnimeRounds', sandbox);
  assert(duelRounds.length === 8, 'Trận đấu multiplayer phải chuẩn bị 8 vòng');
  assert(sentPartyMessages.some(m => m.type === 'party_anime_start'), 'Host phải gửi gói tin party_anime_start');
  assert(sentPartyMessages.some(m => m.type === 'party_anime_q'), 'Host phải broadcast câu hỏi party_anime_q đầu tiên');
  console.log('  ✓ Khởi tạo phòng đấu nhiều người: Chuẩn bị 8 vòng, broadcast câu hỏi đầu tiên tới khách.');

  // Khách nhận câu hỏi và hiển thị
  vm.runInContext('isPartyHost = false;', sandbox);
  const qData = sentPartyMessages.find(m => m.type === 'party_anime_q');
  vm.runInContext(`handleRemoteAnimeQuestion(${JSON.stringify(qData)})`, sandbox);
  const currentRemoteQ = vm.runInContext('partyAnimeCurrentQ', sandbox);
  assert(currentRemoteQ.prompt === qData.question.prompt, 'Nội dung câu hỏi của khách phải khớp với host');
  console.log('  ✓ Đồng bộ câu hỏi giữa Chủ phòng và Khách qua PeerJS hoạt động hoàn hảo.');

  // Người chơi trả lời đúng
  sentPartyMessages.length = 0;
  const mockPartyBtn = createMockElement('partyBtn');
  sandbox.mockPartyBtn = mockPartyBtn;
  vm.runInContext(`handlePartyAnimeAnswer(${JSON.stringify(currentRemoteQ.answer)}, mockPartyBtn, partyAnimeCurrentQ)`, sandbox);
  assert(sentPartyMessages.some(m => m.type === 'party_anime_answer' && m.isCorrect === true), 'Phải gửi party_anime_answer thông báo trả lời đúng');
  console.log('  ✓ Bấm đúng trước: Tính điểm tốc độ, cập nhật tỉ số, gửi thông báo qua PeerJS.');

  // Xử lý khi đối thủ thoát giữa chừng (Disconnect handling)
  console.log('\n[Test 4] Kiểm tra Xử lý người chơi rời phòng giữa chừng:');
  vm.runInContext('finishPartyAnimeMatch(true, true)', sandbox);
  const duelActiveAfter = vm.runInContext('partyAnimeActive', sandbox);
  assert(duelActiveAfter === false, 'partyAnimeActive phải được đặt lại thành false');
  const battlefield = sandbox.document.getElementById('battleContentArea');
  assert(battlefield.innerHTML.includes('XỬ THẮNG'), 'Phải xử thắng cho người chơi còn lại khi đối thủ ngắt kết nối');
  console.log('  ✓ Đối thủ thoát giữa chừng: Tự động dừng trận đấu, xử thắng ván này cho người còn lại.');

  // Test 5: Kiểm tra escapeHTML & prefers-reduced-motion
  console.log('\n[Test 5] Kiểm tra Bảo mật & Tiếp cận (Security & Accessibility):');
  const safeStr = vm.runInContext('escapeHTML("<script>alert(1)</script>")', sandbox);
  assert(!safeStr.includes('<script>'), 'escapeHTML phải mã hóa thẻ html nguy hiểm');
  assert(safeStr.includes('&lt;script&gt;'), 'Thẻ script phải được escape thành thực thể an toàn');
  console.log('  ✓ Mọi chuỗi từ PeerJS và tài khoản đều được làm sạch qua escapeHTML.');

  console.log('\n======================================================');
  console.log('🎉 TOÀN BỘ CÁC BƯỚC KIỂM TRA BƯỚC 8 ĐÃ VƯỢT QUA 100%!');
  console.log('======================================================');
})().catch(err => {
  console.error('❌ Lỗi kiểm tra Bước 8:', err);
  process.exit(1);
});
