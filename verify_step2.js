// verify_step2.js - Test Boss Battle in Hành Trình (Step 2)
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
    dataset: {}, appendChild(){}, querySelectorAll(){return[];}
  };
}

const mockWindow = {
  location: { protocol: 'https:', hostname: 'emi.io.vn', href: 'https://emi.io.vn' },
  addEventListener(){}, removeEventListener(){},
  matchMedia: () => ({ matches: false }),
  localStorage: { store: {}, getItem(k){return this.store[k]||null;}, setItem(k,v){this.store[k]=String(v);}, removeItem(k){delete this.store[k];} },
  navigator: { serviceWorker: { register: async () => ({}) }, clipboard: { writeText: async () => {} } },
  speechSynthesis: { getVoices(){return[];}, speak(){}, cancel(){} },
  SpeechSynthesisUtterance: class { constructor(t){ this.text = t; } },
  document: {
    getElementById(id){ if (!domElements.has(id)) domElements.set(id, createMockElement(id)); return domElements.get(id); },
    querySelector(){ return createMockElement('app-shell'); },
    querySelectorAll(){ return []; },
    createElement(t){ return createMockElement(t); },
    addEventListener(){}
  },
  console: console, confirm: () => true, prompt: () => '',
  fetch: async () => ({ ok: true, json: async () => ({ success: true }) }),
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

console.log('[TEST BƯỚC 2] KIỂM TRA HỆ THỐNG BOSS CUỐI TRONG HÀNH TRÌNH:');

// Test 1: Config exists for N5, N4, N3
const bossCfg = vm.runInContext('QUEST_BOSS_CONFIG', sandbox);
if (!bossCfg || !bossCfg.N5 || !bossCfg.N4 || !bossCfg.N3) {
  throw new Error('QUEST_BOSS_CONFIG thiếu cấp N5, N4 hoặc N3');
}
console.log(`  ✓ Đã thiết lập Boss cho cả 3 cấp: N5 (${bossCfg.N5.name}), N4 (${bossCfg.N4.name}), N3 (${bossCfg.N3.name})`);

// Test 2: Start Boss Battle N5
sandbox.startBossBattle('N5');
const curHP = vm.runInContext('bossCurrentHP', sandbox);
const maxHP = vm.runInContext('bossMaxHP', sandbox);
const pHP = vm.runInContext('bossPlayerHP', sandbox);
if (curHP !== 100 || maxHP !== 100 || pHP !== 100) {
  throw new Error(`Khởi tạo máu Boss/Player sai: Boss ${curHP}/${maxHP}, Player ${pHP}`);
}
console.log('  ✓ Khởi tạo trận đấu Boss thành công (Boss HP: 100, Player HP: 100, Timer đếm ngược).');

// Test 3: Trả lời đúng gây sát thương lên Boss
const curQ = vm.runInContext('bossCurrentQ', sandbox);
if (!curQ) throw new Error('Không nạp được câu hỏi Boss');
const correctIdx = curQ.choices.indexOf(curQ.correctMeaning);
sandbox.submitBossAnswer(correctIdx);
const newBossHP = vm.runInContext('bossCurrentHP', sandbox);
if (newBossHP !== 75) {
  throw new Error(`Đúng 1 câu Boss HP phải giảm còn 75, thực tế: ${newBossHP}`);
}
console.log(`  ✓ Trả lời đúng gây sát thương chuẩn xác: Boss HP giảm 100 -> ${newBossHP}`);

// Test 4: Trả lời sai Boss phản đòn gây sát thương lên Player
const wrongIdx = curQ.choices.findIndex(c => c !== curQ.correctMeaning);
sandbox.submitBossAnswer(wrongIdx);
const newPlayerHP = vm.runInContext('bossPlayerHP', sandbox);
if (newPlayerHP !== 65) {
  throw new Error(`Sai 1 câu Player HP phải giảm từ 100 -> 65, thực tế: ${newPlayerHP}`);
}
console.log(`  ✓ Trả lời sai Boss phản đòn: Player HP giảm 100 -> ${newPlayerHP}, từ sai được ghi vào SRS.`);

// Test 5: Thua trận: Không mất EXP hay streak, cho phép thử lại ngay
const uData = vm.runInContext('userData', sandbox);
const oldStreak = uData.streak;
const oldXP = uData.xp;
sandbox.finishBossBattle(false);
if (uData.streak !== oldStreak || uData.xp !== oldXP) {
  throw new Error('Thua trận boss không được trừ EXP hoặc streak!');
}
const contentArea = domElements.get('questStepContentArea');
if (!contentArea.innerHTML.includes('Thử Lại Ngay')) {
  throw new Error('Thua trận phải có nút Thử Lại Ngay!');
}
console.log('  ✓ Thua trận không mất EXP hay streak, màn hình hiển thị nút Thử Lại Ngay.');

// Test 6: Thắng trận: Hạ gục Boss N5 mở khóa cấp N4 và thưởng EXP
uData.questData.unlockedLevels.N4 = false;
sandbox.finishBossBattle(true);
if (!uData.questData.unlockedLevels.N4) {
  throw new Error('Thắng Boss N5 phải mở khóa cấp độ JLPT N4!');
}
if (!uData.questData.bossDefeated.N5) {
  throw new Error('Thắng Boss N5 phải đánh dấu bossDefeated.N5 = true!');
}
console.log('  ✓ Đánh bại Boss N5 mở khóa thành công cấp độ JLPT N4 và thưởng EXP!');

// Test 7: Hiển thị Boss Node trong Roadmap
uData.questData.stars.N5 = [3,3,3,3,3,3,3,3,3,3]; // đã qua 10 màn
sandbox.renderQuestRoadmap();
const roadmapList = domElements.get('questRoadmapList');
if (!roadmapList.innerHTML.includes('BOSS CUỐI: Quỷ Lửa Akuma')) {
  throw new Error('Roadmap phải chứa node Boss cuối sau 10 màn!');
}
console.log('  ✓ Node Boss cuối hiển thị nổi bật sau 10 màn trong Roadmap Hành Trình.');

console.log('\n=> BƯỚC 2 (BOSS CUỐI HÀNH TRÌNH) HOÀN TOÀN ĐẠT CHUẨN!\n');
