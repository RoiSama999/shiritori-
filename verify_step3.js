// verify_step3.js - Test Sakura Bot Pet System (Step 3)
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

console.log('[TEST BƯỚC 3] KIỂM TRA LINH VẬT SAKURA BOT NUÔI ĐƯỢC:');

// Test 1: Cấu hình giai đoạn tiến hóa và trang phục
const evoStages = vm.runInContext('SAKURA_EVO_STAGES', sandbox);
const outfits = vm.runInContext('SAKURA_OUTFITS', sandbox);
if (!evoStages || evoStages.length < 5) throw new Error('Cần tối thiểu 5 giai đoạn tiến hóa Sakura Bot');
if (!outfits || outfits.length < 5) throw new Error('Cần tối thiểu 5 bộ trang phục mở khóa bằng EXP');
console.log(`  ✓ Đã thiết lập ${evoStages.length} giai đoạn tiến hóa và ${outfits.length} bộ trang phục mở khóa bằng EXP.`);

// Test 2: Tiến hóa theo streak và số từ đã thuộc
const uData = vm.runInContext('userData', sandbox);
uData.streak = 1;
uData.fcMastered = [];
let evo = sandbox.getSakuraEvolutionStage();
if (evo.currentStage.level !== 1) throw new Error(`Người mới phải ở cấp 1 (Mầm non), thực tế: ${evo.currentStage.name}`);
console.log(`  ✓ Giai đoạn 1 chuẩn xác: ${evo.currentStage.name} (${evo.currentStage.emoji})`);

uData.streak = 7;
uData.fcMastered = new Array(35).fill('word');
evo = sandbox.getSakuraEvolutionStage();
if (evo.currentStage.level < 2) throw new Error('Đủ 7 ngày streak và 35 từ phải lên cấp 2');
console.log(`  ✓ Tiến hóa cấp 2 thành công: ${evo.currentStage.name} (${evo.currentStage.emoji}) khi đủ streak/từ!`);

// Test 3: Cơ chế mood: Không phạt chết, vắng vài ngày chỉ hơi buồn và chào đón lại
uData.lastDate = new Date(Date.now() - 3 * 86400000).toDateString(); // Vắng 3 ngày
const mood = sandbox.getSakuraMood();
if (mood.mood !== 'lonely' || !mood.text.includes('nhớ bạn')) {
  throw new Error('Vắng 3 ngày Sakura phải hơi buồn và chào đón lại mà không phạt chết!');
}
console.log(`  ✓ Mood vắng ngày thân thiện: "${mood.text}" (Không có cơ chế chết hay phạt nặng).`);

// Test 4: Mở khóa trang phục bằng EXP
uData.xp = 200; // Chưa đủ 500 EXP cho đồ học sinh
sandbox.selectSakuraOutfit('school');
if (uData.sakuraPet.outfit === 'school') {
  throw new Error('Chưa đủ 500 EXP không được mặc đồ học sinh!');
}

uData.xp = 1800; // Đã đủ cho ninja (1500)
sandbox.selectSakuraOutfit('ninja');
if (uData.sakuraPet.outfit !== 'ninja') {
  throw new Error('Đủ 1800 EXP phải đổi được sang trang phục Ninja!');
}
console.log('  ✓ Hệ thống trang phục mở khóa bằng EXP hoạt động chính xác (Đã đổi sang: Ninja).');

// Test 5: Tương tác xoa đầu
sandbox.interactWithSakuraPet();
const bubble = domElements.get('sakuraPetSpeechBubble');
if (!bubble.textContent || bubble.textContent.length < 5) {
  throw new Error('Tương tác xoa đầu phải cập nhật lời thoại của Sakura!');
}
console.log(`  ✓ Tương tác xoa đầu Sakura Bot thành công: ${bubble.textContent}`);

console.log('\n=> BƯỚC 3 (LINH VẬT SAKURA BOT) HOÀN TOÀN ĐẠT CHUẨN!\n');
