// verify_exp_balance.js - Comprehensive test of EXP Rebalance, Level Progression, Anti-Grind, and JLPT Separation
const fs = require('fs');
const vm = require('vm');
const path = require('path');

console.log('================================================================');
console.log('BẮT ĐẦU KIỂM THỬ HỆ THỐNG CÂN BẰNG EXP & RANK (BƯỚC 1 -> 6)');
console.log('================================================================\n');

const html = fs.readFileSync(path.join(__dirname, 'index.v2.html'), 'utf8');
const vocabCode = fs.readFileSync(path.join(__dirname, 'vocab.js'), 'utf8');

const scriptMatches = [...html.matchAll(/<script(?:\s+[^>]*)?>([\s\S]*?)<\/script>/gi)];
const targetScript = scriptMatches.find(m => m[1].includes('QUEST_STAGES_CONFIG'));
if (!targetScript) throw new Error('Không tìm thấy script chính trong index.v2.html');

const domElements = new Map();
function createMockElement(id) {
  return {
    id, tagName: 'DIV', value: '', textContent: '', innerHTML: '', style: {},
    classList: { classes: new Set(), add(c){this.classes.add(c);}, remove(c){this.classes.delete(c);}, contains(c){return this.classes.has(c);} },
    disabled: false, focus(){}, click(){}, setAttribute(){}, getAttribute(){}, dataset: {}, appendChild(){}, querySelectorAll(){return[];}
  };
}

const mockWindow = {
  location: { protocol: 'https:', hostname: 'emi.io.vn', href: 'https://emi.io.vn' },
  addEventListener(){}, removeEventListener(){},
  localStorage: { store: {}, getItem(k){return this.store[k]||null;}, setItem(k,v){this.store[k]=String(v);}, removeItem(k){delete this.store[k];} },
  navigator: { serviceWorker: { register: async () => ({}) }, clipboard: { writeText: async () => {} } },
  speechSynthesis: { getVoices(){return[];}, speak(){}, cancel(){} },
  matchMedia: () => ({ matches: false }),
  document: { getElementById(id){ if (!domElements.has(id)) domElements.set(id, createMockElement(id)); return domElements.get(id); }, querySelector(sel){ return createMockElement('app-shell'); }, querySelectorAll(){return[];}, createElement(t){return createMockElement(t);}, addEventListener(){} },
  console: console, confirm: () => true, prompt: () => '',
  fetch: async () => ({ ok: true, json: async () => ({ success: true }) }),
  setTimeout(fn){if(typeof fn==='function') fn(); return 1;}, setInterval(){return 1;}, clearInterval(){}, clearTimeout(){},
  requestAnimationFrame(fn){if(typeof fn==='function') fn();},
  AudioContext: class { constructor(){ this.currentTime = 0; } createOscillator(){ return { connect(){}, start(){}, stop(){}, frequency: { setValueAtTime(){}, exponentialRampToValueAtTime(){} } }; } createGain(){ return { connect(){}, gain: { setValueAtTime(){}, exponentialRampToValueAtTime(){} } }; } },
  Image: class {}, Audio: class { play(){} }
};
mockWindow.window = mockWindow;

const sandbox = vm.createContext(mockWindow);
vm.runInContext(vocabCode, sandbox);
vm.runInContext(targetScript[1], sandbox);

// 1. Kiểm tra Bảng Cấp Độ & Đường cong EXP
console.log('[1] KIỂM TRA ĐƯỜNG CONG LÊN CẤP & MỐC CHUNIN:');
const levels = vm.runInContext('LEVEL_PROGRESSION', sandbox);
if (!levels || levels.length < 15) throw new Error('LEVEL_PROGRESSION phải có ít nhất 15 cấp độ!');

// Kiểm tra cấp 1
if (levels[0].minXP !== 0 || levels[0].maxXP !== 150) {
  throw new Error(`Cấp 1 phải bắt đầu từ 0 và cần 150 EXP (Thực tế: ${levels[0].minXP} -> ${levels[0].maxXP})`);
}

// Kiểm tra hệ số tăng ~1.4x
for (let i = 1; i < 10; i++) {
  const prevStep = levels[i-1].maxXP - levels[i-1].minXP;
  const curStep = levels[i].maxXP - levels[i].minXP;
  const ratio = curStep / prevStep;
  if (ratio < 1.35 || ratio > 1.45) {
    throw new Error(`Tỉ lệ tăng cấp ${i} -> ${i+1} (${ratio.toFixed(2)}) không xấp xỉ 1.4!`);
  }
}
console.log('  ✓ Hệ số tăng EXP mỗi cấp xấp xỉ đúng chuẩn 1.4x.');

// Kiểm tra mốc Chunin (Cấp 7)
const chunin = levels.find(l => l.title.includes('CHUNIN'));
if (!chunin) throw new Error('Không tìm thấy rank CHUNIN!');
console.log(`  ✓ Mốc Chunin (Cấp ${chunin.level}): Cần tích lũy ${chunin.minXP} - ${chunin.maxXP} EXP.`);
const daysAt150 = chunin.minXP / 150;
const daysAt200 = chunin.minXP / 200;
console.log(`  ✓ Thời gian học để đạt Chunin với 150 - 200 EXP/ngày: ${daysAt200.toFixed(1)} đến ${daysAt150.toFixed(1)} ngày (~2 đến 3 tuần)!`);
if (daysAt200 < 11 || daysAt150 > 23) {
  throw new Error('Thời gian lên Chunin không nằm trong khoảng 2 đến 3 tuần!');
}

// 2. Kiểm tra tách Rank khỏi nhãn JLPT
console.log('\n[2] KIỂM TRA TÁCH RANK KHỎI NHÃN JLPT:');
for (const l of levels) {
  if (l.title.includes('N5') || l.title.includes('N4') || l.title.includes('N3') || l.title.includes('N2') || l.title.includes('N1')) {
    throw new Error(`Danh hiệu game "${l.title}" vẫn còn chứa nhãn JLPT!`);
  }
}
console.log('  ✓ 100% danh hiệu Rank trong hệ thống đều là danh hiệu game thuần túy (Học viên, Genin, Chunin, Jonin...), không gộp nhãn N5/N4/N3.');

// 3. Kiểm tra nhãn JLPT theo dữ liệu SRS
console.log('\n[3] KIỂM TRA NHÃN JLPT THEO DỮ LIỆU SRS:');
const uData = vm.runInContext('userData', sandbox);
uData.questData.wrongWords = [];
uData.fcMastered = [];
let mastery = sandbox.getJlptMastery();
if (mastery.hasN5 || mastery.hasN4 || mastery.hasN3) {
  throw new Error('Người chơi chưa học từ nào mà đã có nhãn JLPT!');
}
console.log('  ✓ Người mới chưa có từ nào trong SRS -> Không hiển thị nhãn JLPT N5/N4/N3.');

// Thêm 55 từ N5 vào SRS với box >= 3
for (let i = 0; i < 55; i++) {
  uData.questData.wrongWords.push({
    kanji: `n5_word_${i}`,
    hiragana: `word_${i}`,
    level: 'N5',
    box: 3
  });
}
mastery = sandbox.getJlptMastery();
if (!mastery.hasN5 || mastery.hasN4 || mastery.hasN3) {
  throw new Error('Có 55 từ N5 box >= 3 nhưng không kích hoạt nhãn N5, hoặc kích hoạt nhầm N4/N3!');
}
console.log('  ✓ Đủ 55 từ N5 trong SRS (Hộp >= 3) -> Mở khóa chính xác nhãn [JLPT N5]!');

// 4. Kiểm tra Cơ Chế Chống Cày EXP
console.log('\n[4] KIỂM TRA CƠ CHẾ CHỐNG CÀY EXP (ANTI-GRIND):');
uData.xp = 0;
uData.antiGrind = { date: sandbox.getTodayStr(), grindXpToday: 0, history: {} };

// Hoạt động lần đầu: 100% EXP
const gain1 = sandbox.addXP(45, 'quest_N5_0', true);
if (gain1 !== 45 || uData.xp !== 45) {
  throw new Error(`Lần đầu làm bài phải nhận 100% EXP (+45), nhưng nhận được: ${gain1}`);
}
console.log('  ✓ Lần đầu vượt màn: Nhận đủ 100% EXP (+45 EXP).');

// Hoạt động lặp lại cùng màn trong 24h: 10% EXP
const gain2 = sandbox.addXP(45, 'quest_N5_0', true);
if (gain2 !== 5) { // Math.round(45 * 0.1) = 5
  throw new Error(`Làm lại trong 24h phải nhận 10% EXP (+5), nhưng nhận được: ${gain2}`);
}
if (uData.antiGrind.grindXpToday !== 5) {
  throw new Error(`Bộ đếm cày lặp grindXpToday phải là 5, thực tế: ${uData.antiGrind.grindXpToday}`);
}
console.log('  ✓ Làm lại cùng màn trong 24 giờ: Nhận đúng 10% EXP (+5 EXP) và ghi nhận vào grindXpToday.');

// EXP chỉ cộng khi trả lời đúng (isCorrect = false)
const xpBeforeWrong = uData.xp;
const gainWrong = sandbox.addXP(50, 'quest_N5_1', false);
if (gainWrong !== 0 || uData.xp !== xpBeforeWrong) {
  throw new Error('Trả lời sai/không đạt nhưng vẫn được cộng EXP!');
}
console.log('  ✓ Trả lời sai (isCorrect = false): Nhận 0 EXP.');

// Giới hạn tối đa 300 EXP/ngày từ hoạt động lặp
uData.antiGrind.grindXpToday = 295;
const gainCap1 = sandbox.addXP(45, 'quest_N5_0', true); // đáng lẽ nhận 5, nhưng trần còn 5
if (gainCap1 !== 5 || uData.antiGrind.grindXpToday !== 300) {
  throw new Error(`Chạm trần 300 EXP lặp thất bại, nhận được: ${gainCap1}`);
}

const gainCap2 = sandbox.addXP(45, 'quest_N5_0', true); // vượt quá trần 300 -> nhận 0
if (gainCap2 !== 0) {
  throw new Error(`Vượt trần 300 EXP lặp phải nhận 0 EXP, thực tế nhận được: ${gainCap2}`);
}
console.log('  ✓ Đạt trần 300 EXP cày lặp trong ngày: Các hoạt động lặp tiếp theo nhận 0 EXP.');

// Hoạt động mới hoàn toàn vẫn nhận 100% EXP dù trần cày lặp đã chạm 300
const gainNew = sandbox.addXP(45, 'quest_N5_9', true);
if (gainNew !== 45) {
  throw new Error(`Hoạt động mới phải nhận 100% EXP (+45) dù đã chạm trần lặp, thực tế nhận: ${gainNew}`);
}
console.log('  ✓ Dù trần cày lặp đã chạm 300, hoạt động MỚI vẫn được nhận 100% EXP bình thường.');

// 5. Kiểm tra migration expVersion
console.log('\n[5] KIỂM TRA MIGRATION EXPVERSION:');
const testOldUser = {
  name: 'Old Player',
  xp: 1500,
  streak: 5,
  fcMastered: ['từ_1', 'từ_2', 'từ_3'],
  questData: {
    stars: { N5: [3, 3, 3, 0, 0, 0, 0, 0, 0, 0], N4: [0,0,0,0,0,0,0,0,0,0], N3: [0,0,0,0,0,0,0,0,0,0] },
    wrongWords: []
  }
};
sandbox.localStorage.setItem('emi_v2_user', JSON.stringify(testOldUser));
sandbox.loadUserData();
const migratedUser = vm.runInContext('userData', sandbox);
if (migratedUser.expVersion !== 2) {
  throw new Error(`expVersion sau migration phải là 2, thực tế: ${migratedUser.expVersion}`);
}
if (!migratedUser.antiGrind || migratedUser.antiGrind.grindXpToday !== 0) {
  throw new Error('antiGrind chưa được khởi tạo sau migration! Giá trị: ' + JSON.stringify(migratedUser.antiGrind));
}
console.log(`  ✓ Nâng cấp tài khoản cũ lên expVersion 2 thành công! EXP: ${migratedUser.xp}, Rank mới: ${sandbox.getRank(migratedUser.xp).title}`);

console.log('\n======================================================');
console.log('TẤT CẢ TIÊU CHÍ CÂN BẰNG EXP & RANK ĐỀU PASS 100%!');
console.log('======================================================');
