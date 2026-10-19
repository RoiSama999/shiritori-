// verify_step1.js - Test GameJuice (Step 1)
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

console.log('[TEST BƯỚC 1] KIỂM TRA HỆ THỐNG GAME JUICE:');

// Test 1: GameJuice object exists
const gj = vm.runInContext('GameJuice', sandbox);
if (!gj) throw new Error('GameJuice chưa được khởi tạo!');
console.log('  ✓ GameJuice engine tồn tại.');

// Test 2: Combo tracking and multiplier scaling
gj.resetCombo();
if (gj.getCombo() !== 0 || gj.getMultiplier() !== 1.0) throw new Error('Reset combo thất bại');

gj.onCorrect();
if (gj.getCombo() !== 1 || gj.getMultiplier() !== 1.0) throw new Error('Combo 1 sai');

gj.onCorrect();
if (gj.getCombo() !== 2 || gj.getMultiplier() !== 1.2) throw new Error('Combo 2 multiplier phải là 1.2');

gj.onCorrect();
if (gj.getCombo() !== 3 || gj.getMultiplier() !== 1.4) throw new Error('Combo 3 multiplier phải là 1.4');

gj.onCorrect();
if (gj.getCombo() !== 4 || gj.getMultiplier() !== 1.6) throw new Error('Combo 4 multiplier phải là 1.6');

gj.onCorrect();
if (gj.getCombo() !== 5 || gj.getMultiplier() !== 2.0) throw new Error('Combo 5 multiplier phải là 2.0');
console.log(`  ✓ Combo và Multiplier tăng bậc chuẩn xác (Combo 5 -> x${gj.getMultiplier()})`);

// Test 3: Wrong answer resets combo
gj.onWrong();
if (gj.getCombo() !== 0 || gj.getMultiplier() !== 1.0) throw new Error('Sai phải reset combo về 0');
console.log('  ✓ Trả lời sai reset combo về 0 và multiplier về 1.0');

// Test 4: playSfx hooks into GameJuice
sandbox.playSfx('correct');
if (gj.getCombo() !== 1) throw new Error('playSfx correct không tăng combo');
sandbox.playSfx('correct');
if (gj.getCombo() !== 2) throw new Error('playSfx correct lần 2 không tăng combo lên 2');
sandbox.playSfx('wrong');
if (gj.getCombo() !== 0) throw new Error('playSfx wrong không reset combo');
console.log('  ✓ playSfx("correct") và playSfx("wrong") tích hợp liền mạch với GameJuice.');

// Test 5: Toggles
const initSfx = vm.runInContext('sfxEnabled', sandbox);
sandbox.toggleSfx();
const nextSfx = vm.runInContext('sfxEnabled', sandbox);
if (nextSfx === initSfx) throw new Error('toggleSfx không đổi trạng thái');
sandbox.toggleSfx();

const initVfx = vm.runInContext('vfxEnabled', sandbox);
sandbox.toggleVfx();
const nextVfx = vm.runInContext('vfxEnabled', sandbox);
if (nextVfx === initVfx) throw new Error('toggleVfx không đổi trạng thái');
sandbox.toggleVfx();
console.log('  ✓ Nút bật/tắt âm thanh (SFX) và hiệu ứng (VFX) hoạt động chính xác.');

console.log('\n=> BƯỚC 1 (CẢM GIÁC CHƠI / GAME JUICE) HOÀN TOÀN ĐẠT CHUẨN!\n');
