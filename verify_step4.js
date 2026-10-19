// verify_step4.js - Test PeerJS Co-op Boss Battle (Step 4)
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

const sentMessages = [];
const mockPartyConn = {
  send(data) { sentMessages.push(data); },
  on(event, handler) {}
};

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

console.log('[TEST BƯỚC 4] KIỂM TRA ĐÁNH BOSS HỢP TÁC TRONG PHÒNG QUA PEERJS:');

// Setup mock players
sandbox.document.getElementById('p1Name').textContent = 'NinjaHost';
sandbox.document.getElementById('p2Name').textContent = 'Guest<script>';
const uData = vm.runInContext('userData', sandbox);
uData.name = 'NinjaHost';
sandbox.mockPartyConn = mockPartyConn;
vm.runInContext('partyConn = mockPartyConn', sandbox);
vm.runInContext('isPartyHost = true', sandbox);

// Test 1: Khởi động phòng đánh Boss Hợp Tác
sandbox.startPartyCoopBoss();
const curHP = vm.runInContext('coopBossCurrentHP', sandbox);
const maxHP = vm.runInContext('coopBossMaxHP', sandbox);
if (curHP !== 300 || maxHP !== 300) {
  throw new Error(`Thanh máu Boss chung khởi tạo sai: ${curHP}/${maxHP}`);
}
console.log('  ✓ Khởi tạo phòng đấu Boss Hợp Tác thành công (Chung thanh máu 300 HP).');

// Test 2: Chủ phòng phát câu hỏi cho cả phòng
const curQ = vm.runInContext('coopBossCurrentQ', sandbox);
if (!curQ || !curQ.word || !curQ.options || curQ.options.length !== 4) {
  throw new Error('Chủ phòng phát câu hỏi thất bại hoặc câu hỏi thiếu 4 lựa chọn');
}
const lastMsg = sentMessages[sentMessages.length - 1];
if (!lastMsg || lastMsg.type !== 'coop_boss_question') {
  throw new Error('Chủ phòng chưa phát tin nhắn coop_boss_question qua PeerJS!');
}
console.log(`  ✓ Chủ phòng phát câu hỏi: "${curQ.word}" (4 đáp án) tới toàn bộ phòng qua PeerJS.`);

// Test 3: Trả lời đúng gây sát thương lên thanh máu chung
sandbox.handleCoopBossAnswer(curQ.rightMeaning, createMockElement('btn'));
const hpAfterP1 = vm.runInContext('coopBossCurrentHP', sandbox);
if (hpAfterP1 !== 275) {
  throw new Error(`Boss HP phải giảm từ 300 -> 275 sau khi đúng, thực tế: ${hpAfterP1}`);
}
const contrib = vm.runInContext('coopDamageContrib', sandbox);
if (contrib['NinjaHost'] !== 25) {
  throw new Error(`Đóng góp sát thương của NinjaHost phải là 25, thực tế: ${contrib['NinjaHost']}`);
}
console.log(`  ✓ Người chơi 1 trả lời đúng: Thanh máu chung giảm 300 -> ${hpAfterP1} HP, ghi nhận đóng góp: 25 HP.`);

// Test 4: Đồng đội ở xa gửi sát thương (coop_boss_hit)
sandbox.handleRemoteCoopBossHit({
  damage: 25,
  senderName: 'Guest<script>'
});
const hpAfterRemote = vm.runInContext('coopBossCurrentHP', sandbox);
if (hpAfterRemote !== 250) {
  throw new Error(`Thanh máu Boss chung phải giảm tiếp xuống 250, thực tế: ${hpAfterRemote}`);
}
if (contrib['Guest<script>'] !== 25) {
  throw new Error(`Đóng góp của Guest phải là 25, thực tế: ${contrib['Guest<script>']}`);
}
console.log(`  ✓ Nhận sát thương từ đồng đội qua mạng: Boss HP giảm tiếp còn ${hpAfterRemote} HP, đóng góp đồng đội: 25 HP.`);

// Test 5: Kết thúc ván và Bảng đóng góp sát thương từng người
sandbox.finishCoopBossMatch(true);
const contentArea = domElements.get('battleContentArea');
if (!contentArea.innerHTML.includes('BẢNG ĐÓNG GÓP SÁT THƯƠNG')) {
  throw new Error('Màn hình kết thúc phải có bảng đóng góp sát thương!');
}
if (contentArea.innerHTML.includes('<script>')) {
  throw new Error('Tên người chơi chưa được escapeHTML!');
}
if (!contentArea.innerHTML.includes('&lt;script&gt;')) {
  throw new Error('Tên người chơi phải được mã hóa an toàn qua escapeHTML!');
}
console.log('  ✓ Bảng đóng góp sát thương cuối ván hiển thị chi tiết phần trăm và mã hóa an toàn qua escapeHTML.');

// Test 6: Xử lý người rời phòng giữa chừng
sandbox.finishCoopBossMatch(false, true);
if (!domElements.get('battleContentArea').innerHTML.includes('Đồng đội đã rời phòng giữa chừng')) {
  throw new Error('Xử lý thoát phòng giữa chừng chưa đúng thông báo');
}
console.log('  ✓ Xử lý người rời phòng giữa chừng an toàn, không bị treo game.');

console.log('\n=> BƯỚC 4 (ĐÁNH BOSS HỢP TÁC PEERJS) HOÀN TOÀN ĐẠT CHUẨN!\n');
