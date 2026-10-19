// verify_step7.js - Test Interactive Scenario Roleplay (Step 7)
const fs = require('fs');
const vm = require('vm');
const path = require('path');

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
    dataset: {}, appendChild(){}, querySelectorAll(){return[];},
    addEventListener(){}
  };
}

let spokenTexts = [];
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
    speak(u){ spokenTexts.push(u.text); },
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
console.log('[TEST BƯỚC 7] KIỂM TRA HỘI THOẠI TƯƠNG TÁC TÌNH HUỐNG (N5 SCENARIO ROLEPLAY):');

// Test 1: Kiểm tra tối thiểu 3 tình huống ở cấp N5 (Konbini, Nhà ga, Nhà hàng)
const db = vm.runInContext('SCENARIO_DATABASE', sandbox);
if (!Array.isArray(db) || db.length < 3) {
  throw new Error(`Phải có tối thiểu 3 tình huống! Hiện có: ${db?.length}`);
}

const scenarioIds = db.map(s => s.id);
if (!scenarioIds.includes('konbini') || !scenarioIds.includes('station') || !scenarioIds.includes('ramen')) {
  throw new Error(`Thiếu một trong các tình huống cơ bản: konbini, station, ramen! Có: ${scenarioIds.join(', ')}`);
}
console.log(`  ✓ Có đủ ${db.length} tình huống N5 chuẩn: Cửa hàng tiện lợi (Konbini), Nhà ga tàu điện (Station), Quán ăn Ramen.`);

// Test 2: Mỗi tình huống có Furigana, Romaji, Nghĩa Việt và Giọng đọc
db.forEach(sc => {
  if (!sc.turns || sc.turns.length < 3) {
    throw new Error(`Tình huống ${sc.title} phải có ít nhất 3 lượt thoại!`);
  }
  sc.turns.forEach((t, idx) => {
    if (!t.npc.furigana.includes('<ruby>') || !t.npc.romaji || !t.npc.viet || !t.npc.plain) {
      throw new Error(`Lượt thoại ${idx+1} của ${sc.title} thiếu Furigana, Romaji, Nghĩa Việt hoặc Plain text!`);
    }
    if (!t.choices || t.choices.length !== 3) {
      throw new Error(`Lượt thoại ${idx+1} của ${sc.title} phải có đúng 3 lựa chọn trả lời!`);
    }
    const hasCorrect = t.choices.some(c => c.isCorrect);
    if (!hasCorrect) {
      throw new Error(`Lượt thoại ${idx+1} của ${sc.title} thiếu lựa chọn đúng!`);
    }
  });
});
console.log('  ✓ Toàn bộ lượt thoại đều có đầy đủ Furigana (<ruby>), Romaji, Dịch nghĩa tiếng Việt và văn bản đọc TTS.');

// Test 3: Tích hợp vào Dojo & Khởi động tình huống Konbini
sandbox.switchDojoMode('scenario');
const scenView = domElements.get('dojoScenarioView');
if (scenView.style.display !== 'block') {
  throw new Error('Chuyển sang tab scenario trong Dojo thất bại!');
}
console.log('  ✓ Tích hợp thành công vào thanh điều hướng Võ Đường Dojo (switchDojoMode("scenario")).');

// Test 4: Bắt đầu tình huống Konbini
spokenTexts = [];
sandbox.startScenario('konbini');
const curScenId = vm.runInContext('activeScenarioId', sandbox);
if (curScenId !== 'konbini') {
  throw new Error('Khởi động tình huống konbini thất bại!');
}
if (spokenTexts.length === 0) {
  throw new Error('Chưa tự động đọc phát âm lời thoại mở đầu của NPC bằng giọng Nhật!');
}
console.log(`  ✓ Bắt đầu tình huống Konbini, tự động phát âm lời thoại của nhân viên: "${spokenTexts[0]}".`);

// Test 5: Chọn sai -> Có giải thích rõ ràng & Tự động đưa từ sai vào danh sách ôn lặp SRS
const uData = vm.runInContext('userData', sandbox);
if (!uData.questData) uData.questData = { wrongWords: [] };
const wrongWordsBefore = uData.questData.wrongWords.length;

// Turn 1: Choice 1 là sai (Gochisousama deshita)
sandbox.handleScenarioChoice(1);
const fbBox = domElements.get('scenarioFeedbackBox');
if (!fbBox.innerHTML.includes('LỰA CHỌN CHƯA PHÙ HỢP') || !fbBox.innerHTML.includes('Gochisousama')) {
  throw new Error('Chọn sai phải hiển thị giải thích chi tiết ngữ cảnh!');
}
const wrongWordsAfter = uData.questData.wrongWords.length;
if (wrongWordsAfter <= wrongWordsBefore) {
  throw new Error('Chọn sai phải tự động đưa từ sai vào danh sách ôn lặp SRS!');
}
const addedWord = uData.questData.wrongWords[uData.questData.wrongWords.length - 1];
console.log(`  ✓ Chọn sai được giải thích cặn kẽ và tự động thêm vào SRS: "${addedWord.kanji || addedWord.hiragana}" (${addedWord.meaning}).`);

// Test 6: Chọn sai vẫn đi tiếp câu chuyện được
sandbox.advanceScenarioTurn();
const stepAfterWrong = vm.runInContext('activeScenarioStep', sandbox);
if (stepAfterWrong !== 1) {
  throw new Error(`Chọn sai vẫn phải đi tiếp được chặng kế tiếp! Hiện tại: step=${stepAfterWrong}`);
}
console.log('  ✓ Chọn sai vẫn tiếp tục câu chuyện sang chặng kế tiếp mà không bị kẹt hay gián đoạn.');

// Test 7: Chọn đúng -> Khen ngợi, tăng điểm combo, hoàn thành hết các chặng
sandbox.handleScenarioChoice(0); // Chặng 2 đúng
sandbox.advanceScenarioTurn();

sandbox.handleScenarioChoice(0); // Chặng 3 đúng
sandbox.advanceScenarioTurn();

sandbox.handleScenarioChoice(0); // Chặng 4 đúng
sandbox.advanceScenarioTurn(); // Kết thúc

const arenaEl = domElements.get('scenarioArenaArea');
if (!arenaEl.innerHTML.includes('HOÀN THÀNH TÌNH HUỐNG') || !arenaEl.innerHTML.includes('+30 EXP')) {
  throw new Error('Màn hình kết thúc tình huống chưa hiển thị hoặc thiếu thưởng EXP!');
}
console.log('  ✓ Hoàn thành trọn vẹn tình huống: Hiển thị bảng tổng kết kết quả, trao thưởng +30 EXP và kích hoạt đồng bộ.');

console.log('\n=> BƯỚC 7 (HỘI THOẠI TƯƠNG TÁC TÌNH HUỐNG N5) HOÀN TOÀN ĐẠT CHUẨN 100%!\n');
})().catch(err => {
  console.error(err);
  process.exit(1);
});
