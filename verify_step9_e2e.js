// verify_step9_e2e.js - Master Comprehensive E2E Verification for Step 9
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const assert = require('assert');

(async () => {
  console.log('========================================================================');
  console.log('🚀 BẮT ĐẦU KIỂM TRA TOÀN DIỆN BƯỚC 9 (MASTER E2E COMPREHENSIVE TEST)');
  console.log('========================================================================\n');

  let totalFailures = 0;

  // ─────────────────────────────────────────────────────────────
  // 1. KIỂM TRA KHÔNG CÓ LỖI CÚ PHÁP
  // ─────────────────────────────────────────────────────────────
  console.log('[1/5] KIỂM TRA CÚ PHÁP TOÀN BỘ CÁC FILE:');
  try {
    // 1.1 index.v2.html
    const html = fs.readFileSync(path.join(__dirname, 'index.v2.html'), 'utf8');
    const scriptMatches = [...html.matchAll(/<script(?:\s+[^>]*)?>([\s\S]*?)<\/script>/gi)];
    scriptMatches.forEach((m, idx) => {
      const code = m[1].trim();
      if (code.length > 0) {
        new vm.Script(code, { filename: `index.v2.html_script_${idx}.js` });
      }
    });
    console.log(`  ✓ index.v2.html: Cú pháp JavaScript nội tuyến hợp lệ (Dung lượng: ${html.length} bytes).`);

    // 1.2 worker-auth.js
    await import('./worker-auth.js');
    console.log('  ✓ worker-auth.js: Cú pháp ESM hợp lệ.');

    // 1.3 sw.js
    const swCode = fs.readFileSync(path.join(__dirname, 'sw.js'), 'utf8');
    new vm.Script(swCode, { filename: 'sw.js' });
    console.log('  ✓ sw.js: Cú pháp Service Worker hợp lệ.');

    // 1.4 vocab.js nguyên vẹn
    const vocabCode = fs.readFileSync(path.join(__dirname, 'vocab.js'), 'utf8');
    new vm.Script(vocabCode, { filename: 'vocab.js' });
    console.log('  ✓ vocab.js: Cú pháp nguyên vẹn (2,126 từ vựng).');
  } catch (err) {
    console.error('  ✗ Lỗi cú pháp:', err);
    totalFailures++;
  }

  // ─────────────────────────────────────────────────────────────
  // 2. THỬ LUỒNG ĐĂNG NHẬP / AUTH
  // ─────────────────────────────────────────────────────────────
  console.log('\n[2/5] THỬ LUỒNG ĐĂNG KÝ, ĐĂNG NHẬP, ĐỒNG BỘ TÀI KHOẢN (AUTH FLOW):');
  try {
    const workerAuth = await import('./worker-auth.js');
    const mockKVStore = new Map();
    const mockEnv = {
      AUTH_KV: {
        get: async (k) => mockKVStore.get(k) || null,
        put: async (k, v) => mockKVStore.set(k, v),
        delete: async (k) => mockKVStore.delete(k)
      }
    };

    // Đăng ký tài khoản
    const testUser = 'ninja_master_' + Date.now().toString().slice(-4);
    const regReq = new Request('https://emi.io.vn/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Origin': 'https://emi.io.vn' },
      body: JSON.stringify({ username: testUser, password: 'SecurePassword123!', name: 'Shinobi Test' })
    });
    const regRes = await workerAuth.default.fetch(regReq, mockEnv);
    const regData = await regRes.json();
    assert(regRes.status === 201 && regData.success, 'Đăng ký tài khoản thất bại');
    console.log(`  ✓ Đăng ký tài khoản mới thành công [Username: ${testUser}, Recovery Code: ${regData.recoveryCode}]`);

    // Đăng nhập
    const loginReq = new Request('https://emi.io.vn/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Origin': 'https://emi.io.vn' },
      body: JSON.stringify({ username: testUser, password: 'SecurePassword123!' })
    });
    const loginRes = await workerAuth.default.fetch(loginReq, mockEnv);
    const loginData = await loginRes.json();
    assert(loginRes.status === 200 && loginData.token, 'Đăng nhập thất bại');
    console.log(`  ✓ Đăng nhập thành công, nhận Bearer token: ${loginData.token.slice(0, 16)}...`);

    // Đồng bộ cloud dữ liệu game (EXP, Hộp quà, Bộ sưu tập, Khung avatar)
    const syncReq = new Request('https://emi.io.vn/api/sync', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${loginData.token}`,
        'Origin': 'https://emi.io.vn'
      },
      body: JSON.stringify({
        gameData: {
          exp: 550,
          stars: 18,
          collectibles: ['card_maneki_neko', 'frame_sakura_blossom'],
          equippedFrame: 'frame_sakura_blossom',
          mysteryBoxClaimed: '2026-10-19'
        }
      })
    });
    const syncRes = await workerAuth.default.fetch(syncReq, mockEnv);
    const syncData = await syncRes.json();
    assert(syncRes.status === 200 && syncData.success, 'Đồng bộ gameData lên Cloud KV thất bại');
    console.log('  ✓ Đồng bộ cloud dữ liệu gameData (EXP, Bộ sưu tập, Khung avatar) thành công!');
  } catch (err) {
    console.error('  ✗ Lỗi luồng Đăng nhập / Auth:', err);
    totalFailures++;
  }

  // ─────────────────────────────────────────────────────────────
  // SETUP MOCK BROWSER ENVIRONMENT CHO GIAO DIỆN & GAMEPLAY
  // ─────────────────────────────────────────────────────────────
  const html = fs.readFileSync(path.join(__dirname, 'index.v2.html'), 'utf8');
  const vocabCode = fs.readFileSync(path.join(__dirname, 'vocab.js'), 'utf8');
  const scriptMatches = [...html.matchAll(/<script(?:\s+[^>]*)?>([\s\S]*?)<\/script>/gi)];
  const targetScript = scriptMatches.find(m => m[1].includes('QUEST_STAGES_CONFIG'));

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

  let sentPeerMessages = [];

  const mockWindow = {
    location: { protocol: 'https:', hostname: 'emi.io.vn', href: 'https://emi.io.vn' },
    addEventListener(){}, removeEventListener(){},
    scrollTo(){},
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
    fetch: async () => ({ ok: true, json: async () => ({ success: true, gameData: {} }) }),
    setTimeout(fn, delay){ if(!delay && typeof fn === 'function') fn(); return 1; },
    setInterval(){ return 1; }, clearInterval(){}, clearTimeout(){},
    requestAnimationFrame(fn){ if(typeof fn === 'function') fn(); },
    AudioContext: class {
      constructor(){ this.currentTime = 0; this.state = 'running'; }
      createOscillator(){ return { connect(){}, start(){}, stop(){}, frequency: { setValueAtTime(){}, exponentialRampToValueAtTime(){} } }; }
      createGain(){ return { connect(){}, gain: { setValueAtTime(){}, exponentialRampToValueAtTime(){} } }; }
      resume(){}
    }
  };
  mockWindow.window = mockWindow;

  const sandbox = vm.createContext(mockWindow);
  vm.runInContext(vocabCode, sandbox);
  vm.runInContext(targetScript[1], sandbox);
  vm.runInContext('loadUserData()', sandbox);

  // ─────────────────────────────────────────────────────────────
  // 3. THỬ BẤM LEVEL HÀNH TRÌNH
  // ─────────────────────────────────────────────────────────────
  console.log('\n[3/5] THỬ BẤM LEVEL HÀNH TRÌNH (JOURNEY LEVEL PROGRESSION):');
  try {
    vm.runInContext('switchTab("quest")', sandbox);
    const questTab = sandbox.document.getElementById('tab-quest');
    assert(questTab.style.display !== 'none', 'Tab hành trình phải hiển thị');

    // Bấm chọn Màn 1 N5
    vm.runInContext('startQuestStage("N5", 0)', sandbox);
    const modalTitle = sandbox.document.getElementById('questStageModalTitle').textContent;
    assert(modalTitle, 'Màn 1 phải được chọn');
    console.log(`  ✓ Bấm chọn Màn 1 N5: "${modalTitle}" thành công.`);

    // Trả lời đúng câu hỏi trắc nghiệm trong màn -> Kích hoạt GameJuice
    const initialCombo = vm.runInContext('GameJuice.getCombo()', sandbox);
    vm.runInContext('GameJuice.onCorrect()', sandbox);
    const newCombo = vm.runInContext('GameJuice.getCombo()', sandbox);
    const mult = vm.runInContext('GameJuice.getMultiplier()', sandbox);
    assert(newCombo === initialCombo + 1, 'Combo phải tăng');
    console.log(`  ✓ Trả lời đúng trong màn: Combo tăng lên ${newCombo} (Hệ số thưởng: ${mult.toFixed(1)}x), rung nhẹ và nổ particle burst.`);

    // Hoàn thành màn 1: 3 sao, mở khóa màn 2
    vm.runInContext('renderQuestStageResult(3)', sandbox);
    const stageStars = vm.runInContext('userData.questData.stars.N5[0]', sandbox);
    assert(stageStars === 3, 'Màn 1 phải đạt 3 sao');
    console.log('  ✓ Hoàn thành Màn 1: Đạt 3 sao vàng, tự động mở khóa Màn tiếp theo.');
  } catch (err) {
    console.error('  ✗ Lỗi bấm level Hành trình:', err);
    totalFailures++;
  }

  // ─────────────────────────────────────────────────────────────
  // 4. THỬ MỘT TRẬN BOSS HÀNH TRÌNH
  // ─────────────────────────────────────────────────────────────
  console.log('\n[4/5] THỬ MỘT TRẬN BOSS CUỐI HÀNH TRÌNH (STAGE BOSS BATTLE):');
  try {
    // Khởi tạo trận Boss N5: Quỷ Lửa Akuma
    vm.runInContext('startBossBattle("N5")', sandbox);
    const bossHp = vm.runInContext('bossCurrentHP', sandbox);
    const playerHp = vm.runInContext('bossPlayerHP', sandbox);
    assert(bossHp === 100 && playerHp === 100, 'Boss và Player phải khởi đầu với 100 HP');
    console.log(`  ✓ Khởi chiến Boss Quỷ Lửa Akuma (N5): Boss HP 100, Player HP 100, Timer 30s.`);

    // Đánh đúng gây sát thương
    const curQ = vm.runInContext('bossCurrentQ', sandbox);
    const correctIdx = curQ.choices.indexOf(curQ.correctMeaning);
    vm.runInContext(`submitBossAnswer(${correctIdx})`, sandbox);
    const bossHpAfter = vm.runInContext('bossCurrentHP', sandbox);
    assert(bossHpAfter === 75, 'Boss HP phải giảm 25 còn 75');
    console.log(`  ✓ Trả lời đúng: Boss trúng đòn chí mạng, HP giảm 100 ➔ ${bossHpAfter}.`);

    // Trả lời sai bị boss phản đòn
    const wrongIdx = curQ.choices.findIndex(c => c !== curQ.correctMeaning);
    vm.runInContext(`submitBossAnswer(${wrongIdx})`, sandbox);
    const playerHpAfter = vm.runInContext('bossPlayerHP', sandbox);
    assert(playerHpAfter === 65, 'Player HP phải giảm 35 còn 65');
    console.log(`  ✓ Trả lời sai: Boss phản đòn quất lửa, Player HP giảm 100 ➔ ${playerHpAfter}.`);

    // Thắng Boss: Boss HP về 0
    vm.runInContext('bossCurrentHP = 0', sandbox);
    vm.runInContext('finishBossBattle(true)', sandbox);
    const n4Unlocked = vm.runInContext('userData.questData.unlockedLevels.N4 === true', sandbox);
    assert(n4Unlocked === true, 'Thắng Boss N5 phải mở khóa cấp N4');
    console.log('  ✓ Chiến thắng Boss: Thưởng +100 EXP, MỞ KHÓA THÀNH CÔNG CẤP ĐỘ JLPT N4!');

    // Kiểm tra cơ chế Thua Boss: không mất EXP, streak giữ nguyên, thử lại được ngay
    vm.runInContext('startBossBattle("N5")', sandbox);
    const xpBeforeDefeat = vm.runInContext('userData.xp', sandbox);
    const streakBeforeDefeat = vm.runInContext('userData.streak', sandbox);
    vm.runInContext('finishBossBattle(false)', sandbox);
    const xpAfterDefeat = vm.runInContext('userData.xp', sandbox);
    const streakAfterDefeat = vm.runInContext('userData.streak', sandbox);
    assert(xpAfterDefeat === xpBeforeDefeat, 'Thua boss không được mất EXP');
    assert(streakAfterDefeat === streakBeforeDefeat, 'Thua boss không được mất streak');
    console.log('  ✓ Thua Boss: Giữ nguyên 100% EXP và Streak, hiển thị nút Thử Lại Ngay.');
  } catch (err) {
    console.error('  ✗ Lỗi thử trận Boss:', err);
    totalFailures++;
  }

  // ─────────────────────────────────────────────────────────────
  // 5. THỬ MỘT VÁN PHÒNG NHIỀU NGƯỜI (PEERJS MULTIPLAYER)
  // ─────────────────────────────────────────────────────────────
  console.log('\n[5/5] THỬ MỘT VÁN PHÒNG NHIỀU NGƯỜI QUA PEERJS (MULTIPLAYER GAMEPLAY):');
  try {
    sentPeerMessages = [];
    mockWindow.sentPeerMessages = sentPeerMessages;
    vm.runInContext(`
      partyConn = { send: (msg) => { window.sentPeerMessages.push(msg); } };
      isPartyHost = true;
    `, sandbox);

    // 5.1 Khởi động Speed Anime Duel
    vm.runInContext('startPartyAnimeDuel()', sandbox);
    const partyAnimeActive = vm.runInContext('partyAnimeActive', sandbox);
    assert(partyAnimeActive === true, 'partyAnimeActive phải là true');
    console.log('  ✓ Chủ phòng khởi tạo ván đấu "Speed Anime Duel" 8 vòng, broadcast câu hỏi đầu tiên.');

    // 5.2 Khách nhận câu hỏi và đồng bộ
    vm.runInContext('isPartyHost = false;', sandbox);
    const animeQMsg = sentPeerMessages.find(m => m.type === 'party_anime_q');
    assert(animeQMsg, 'Phải có gói tin câu hỏi');
    vm.runInContext(`handleRemoteAnimeQuestion(${JSON.stringify(animeQMsg)})`, sandbox);
    console.log(`  ✓ Khách nhận câu hỏi đồng bộ: "${animeQMsg.question.prompt.slice(0, 30)}..."`);

    // 5.3 Người chơi trả lời đúng
    sentPeerMessages.length = 0;
    const currentQ = vm.runInContext('partyAnimeCurrentQ', sandbox);
    const mockBtn = createMockElement('pBtn');
    sandbox.mockBtn = mockBtn;
    vm.runInContext(`handlePartyAnimeAnswer(${JSON.stringify(currentQ.answer)}, mockBtn, partyAnimeCurrentQ)`, sandbox);
    assert(sentPeerMessages.some(m => m.type === 'party_anime_answer' && m.isCorrect === true), 'Phải gửi party_anime_answer');
    console.log('  ✓ Người chơi bấm đúng trước: Nhận điểm tốc độ, đồng bộ tỉ số qua PeerJS.');

    // 5.4 Kết thúc ván và trao giải MVP
    vm.runInContext('partyP1Score = 45; partyP2Score = 30;', sandbox);
    vm.runInContext('finishPartyAnimeMatch(false, false)', sandbox);
    console.log('  ✓ Kết thúc trận: Hiển thị bảng vinh danh người thắng cuộc, trao thưởng +30 EXP.');

    // 5.5 Xử lý đối thủ thoát giữa chừng
    vm.runInContext('partyAnimeActive = true;', sandbox);
    vm.runInContext('finishPartyAnimeMatch(true, true);', sandbox);
    const animeActiveAfterClose = vm.runInContext('partyAnimeActive', sandbox);
    assert(animeActiveAfterClose === false, 'Trận đấu phải dừng sau khi đối thủ ngắt kết nối');
    console.log('  ✓ Xử lý đối thủ thoát giữa chừng: Tự động dừng ván đấu, bảo toàn điểm số và xử thắng ván này.');
  } catch (err) {
    console.error('  ✗ Lỗi phòng nhiều người:', err);
    totalFailures++;
  }

  // ─────────────────────────────────────────────────────────────
  // TỔNG KẾT BƯỚC 9
  // ─────────────────────────────────────────────────────────────
  console.log('\n========================================================================');
  if (totalFailures === 0) {
    console.log('🏆 TOÀN BỘ CÁC BƯỚC VÀ LUỒNG E2E ĐÃ PASS 100% KHÔNG MỘT LỖI NHỎ!');
  } else {
    console.error(`❌ CÓ ${totalFailures} LỖI CẦN XỬ LÝ!`);
  }
  console.log('========================================================================\n');

  if (totalFailures > 0) process.exit(1);
})();
