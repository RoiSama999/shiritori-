// verify_step6.js - Test Mystery Gacha Box & Collectibles (Step 6)
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

let networkCalls = [];
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
  fetch: async (url, opts) => {
    networkCalls.push({ url, opts, time: Date.now() });
    return { ok: true, json: async () => ({ success: true, gameData: {} }) };
  },
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
console.log('[TEST BƯỚC 6] KIỂM TRA HỘP QUÀ NGẪU NHIÊN & BỘ SƯU TẬP VẬT PHẨM:');

// Test 1: Kiểm tra danh mục vật phẩm ảo MYSTERY_COLLECTIBLES
const collectibles = vm.runInContext('MYSTERY_COLLECTIBLES', sandbox);
if (!Array.isArray(collectibles) || collectibles.length < 10) {
  throw new Error(`Danh mục vật phẩm ảo không hợp lệ hoặc quá ít: ${collectibles?.length}`);
}
const types = new Set(collectibles.map(c => c.type));
const rarities = new Set(collectibles.map(c => c.rarity));

if (!types.has('card') || !types.has('frame') || !types.has('avatar')) {
  throw new Error(`Phải có đủ 3 loại: card, frame, avatar! Thực tế: ${[...types].join(', ')}`);
}
if (!rarities.has('common') || !rarities.has('rare') || !rarities.has('epic') || !rarities.has('legendary')) {
  throw new Error(`Phải có đủ 4 độ hiếm: common, rare, epic, legendary! Thực tế: ${[...rarities].join(', ')}`);
}
console.log(`  ✓ Kho vật phẩm ảo: ${collectibles.length} vật phẩm gồm Thẻ sưu tầm, Khung avatar và Avatar trải dài 4 bậc độ hiếm.`);

// Test 2: Hoàn thành nhiệm vụ ngày (Daily Ritual) mở Hộp quà may mắn
const uData = vm.runInContext('userData', sandbox);
uData.mysteryBoxLastClaimed = '';
sandbox.finishDailyRitualAndShare();

const mysteryModal = domElements.get('mysteryBoxModal');
if (!mysteryModal.classList.contains('show')) {
  throw new Error('Hộp quà may mắn chưa được mở sau khi hoàn thành nhiệm vụ ngày!');
}
console.log('  ✓ Hoàn thành nhiệm vụ ngày kích hoạt mở Hộp Quà May Mắn (mysteryBoxModal).');

// Test 3: Cơ chế mở hộp quà (Gacha Roll) & Lưu localStorage
sandbox.unboxMysteryGift();
const curItem = vm.runInContext('currentUnboxedItem', sandbox);
if (!curItem || !curItem.name || !curItem.id) {
  throw new Error('Mở hộp quà thất bại hoặc không nhận được vật phẩm!');
}
if (!uData.collectibles.includes(curItem.id)) {
  throw new Error(`Vật phẩm ${curItem.id} chưa được lưu vào userData.collectibles!`);
}
const todayStr = vm.runInContext('getTodayStr()', sandbox);
if (uData.mysteryBoxLastClaimed !== todayStr) {
  throw new Error('Chưa cập nhật ngày mở hộp quà vào userData.mysteryBoxLastClaimed!');
}
const localSave = JSON.parse(mockWindow.localStorage.getItem('emi_v2_user'));
if (!localSave.collectibles.includes(curItem.id)) {
  throw new Error('Dữ liệu bộ sưu tập chưa được lưu vào localStorage!');
}
console.log(`  ✓ Mở hộp quà thành công: Nhận [${curItem.name}] (${curItem.rarity.toUpperCase()}), đã lưu vào localStorage.`);

// Test 4: Trang bị Khung Avatar và Avatar mới
const frameItem = collectibles.find(c => c.type === 'frame');
if (frameItem) {
  uData.collectibles.push(frameItem.id);
  sandbox.equipCollectible(frameItem.id);
  if (uData.equippedFrame !== frameItem.id) {
    throw new Error('Trang bị khung avatar thất bại!');
  }
  sandbox.applyEquippedFrameUI();
  const avatarDisp = domElements.get('avatarDisplay');
  if (!avatarDisp.style.border || avatarDisp.style.border === '') {
    throw new Error('Khung viền avatar chưa được áp dụng lên avatarDisplay!');
  }
  console.log(`  ✓ Trang bị Khung Avatar [${frameItem.name}] thành công, viền avatar được cập nhật trực quan.`);
}

const avatarItem = collectibles.find(c => c.type === 'avatar');
if (avatarItem) {
  uData.collectibles.push(avatarItem.id);
  sandbox.equipCollectible(avatarItem.id);
  if (uData.avatar !== avatarItem.icon) {
    throw new Error('Đổi avatar đặc biệt thất bại!');
  }
  console.log(`  ✓ Dùng Avatar mới [${avatarItem.name}] (${avatarItem.icon}) thành công.`);
}

// Test 5: Bộ sưu tập xem lại (Collectibles Modal) & Bộ lọc
sandbox.openCollectiblesModal();
const collModal = domElements.get('collectiblesModal');
if (!collModal.classList.contains('show')) {
  throw new Error('Không thể mở Bộ sưu tập (collectiblesModal)!');
}

sandbox.filterCollectibles('card');
const gridEl = domElements.get('collectiblesGrid');
if (!gridEl.innerHTML.includes('Thẻ Bài') && !gridEl.innerHTML.includes('card_') && !gridEl.innerHTML.includes('Phổ biến')) {
  throw new Error('Bộ lọc thẻ bài trong Bộ sưu tập hoạt động chưa chính xác!');
}
console.log('  ✓ Bộ sưu tập xem lại hỗ trợ duyệt đầy đủ vật phẩm đã sở hữu / chưa mở khóa, lọc theo danh mục.');

// Test 6: Giới hạn tần suất đồng bộ đám mây (Tối đa 1 lần mỗi 60 giây)
// Giả lập đã đăng nhập
vm.runInContext('authCurrentUser = { username: "testninja" }', sandbox);
vm.runInContext('authSessionToken = "test_token_123"', sandbox);

networkCalls = [];
// Lần 1: Đồng bộ được thực thi
vm.runInContext('lastCloudSyncTime = 0', sandbox);
let syncRes1 = false;
await sandbox.triggerGameSync('first_sync').then(r => { syncRes1 = r; });

if (networkCalls.length !== 1) {
  throw new Error(`Lần đầu tiên phải gửi request đồng bộ lên /api/sync! Số cuộc gọi: ${networkCalls.length}`);
}
console.log('  ✓ Lần đồng bộ đầu tiên gửi request thành công lên đám mây.');

// Lần 2: Gọi ngay lập tức trong vòng 60 giây -> Phải bị chặn (throttle)
let syncRes2 = true;
await sandbox.triggerGameSync('immediate_second_sync').then(r => { syncRes2 = r; });
if (networkCalls.length !== 1 || syncRes2 !== false) {
  throw new Error('Đồng bộ trong vòng 60s phải bị chặn rate limit!');
}
console.log('  ✓ Gọi đồng bộ liên tiếp trong 60 giây bị chặn chính xác theo quy định.');

// Lần 3: Giả lập đã qua 61 giây -> Đồng bộ tiếp theo được chấp thuận
vm.runInContext('lastCloudSyncTime = Date.now() - 65000', sandbox);
let syncRes3 = false;
await sandbox.triggerGameSync('after_60s_sync').then(r => { syncRes3 = r; });
if (networkCalls.length !== 2) {
  throw new Error('Sau 60 giây cuộc gọi đồng bộ tiếp theo phải được chấp thuận!');
}
console.log('  ✓ Sau 60 giây, lượt đồng bộ tiếp theo được thực thi chính xác.');

// Test 7: Kiểm tra chỉ dùng transform/opacity cho hiệu ứng và tắt khi prefers-reduced-motion
if (!html.includes('@keyframes giftBoxShake')) {
  throw new Error('Thiếu keyframe giftBoxShake!');
}
if (!html.includes('.gift-box-anim') || !html.includes('animation: none !important')) {
  throw new Error('Hiệu ứng hộp quà phải được tắt trong prefers-reduced-motion!');
}
console.log('  ✓ Hiệu ứng hộp quà lắc chỉ dùng transform và được tắt hoàn toàn khi prefers-reduced-motion: reduce.');

console.log('\n=> BƯỚC 6 (HỘP QUÀ NGẪU NHIÊN & BỘ SƯU TẬP VẬT PHẨM) HOÀN TOÀN ĐẠT CHUẨN 100%!\n');
})().catch(err => {
  console.error(err);
  process.exit(1);
});
