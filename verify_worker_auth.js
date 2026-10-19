// verify_worker_auth.js - Kiểm thử toàn diện worker-auth.js
const fs = require('fs');

console.log('--- BẮT ĐẦU KIỂM THỬ WORKER-AUTH.JS ---');

// Mock KV Store
class MockKV {
  constructor() {
    this.store = new Map();
  }
  async get(key) {
    return this.store.has(key) ? this.store.get(key) : null;
  }
  async put(key, value, options) {
    this.store.set(key, String(value));
  }
  async delete(key) {
    this.store.delete(key);
  }
}

// Load Worker module
async function runTests() {
  const workerModule = await import('./worker-auth.js');
  const worker = workerModule.default;
  const mockKV = new MockKV();
  const env = { AUTH_KV: mockKV };

  function makeRequest(url, method = 'GET', body = null, headers = {}, origin = 'https://www.emi.io.vn') {
    const h = new Headers({
      'Origin': origin,
      'CF-Connecting-IP': '127.0.0.1',
      ...headers
    });
    let reqBody = null;
    if (body) {
      h.set('Content-Type', 'application/json');
      reqBody = JSON.stringify(body);
    }
    return new Request(url, { method, headers: h, body: reqBody });
  }

  // 1. Test CORS Preflight
  const optReq = makeRequest('http://auth.local/api/login', 'OPTIONS');
  const optRes = await worker.fetch(optReq, env);
  if (optRes.status !== 204) throw new Error(`CORS OPTIONS status không phải 204: ${optRes.status}`);
  if (optRes.headers.get('Access-Control-Allow-Origin') !== 'https://www.emi.io.vn') {
    throw new Error('CORS Allow-Origin không đúng');
  }
  console.log('✓ CORS OPTIONS preflight hoạt động chính xác.');

  // 2. Test Đăng ký tài khoản
  const regReq = makeRequest('http://auth.local/api/register', 'POST', {
    username: 'samurai_ninja',
    password: 'securePassword123',
    initialData: {
      name: 'Samurai',
      avatar: '🥷',
      bio: 'Chinh phục N5!',
      target: 'N4',
      xp: 150,
      streak: 3
    }
  });
  const regRes = await worker.fetch(regReq, env);
  if (regRes.status !== 201) {
    const err = await regRes.json();
    throw new Error(`Đăng ký thất bại: ${JSON.stringify(err)}`);
  }
  const regData = await regRes.json();
  if (!regData.success || !regData.token || !regData.recoveryCode) {
    throw new Error('Dữ liệu đăng ký thiếu token hoặc recoveryCode');
  }
  const recoveryCode = regData.recoveryCode;
  const token1 = regData.token;
  console.log(`✓ Đăng ký tài khoản thành công! Recovery Code: ${recoveryCode}`);

  // Kiểm tra KV: Không lưu mật khẩu nguyên văn
  const storedUserRaw = await mockKV.get('user:samurai_ninja');
  if (storedUserRaw.includes('securePassword123')) {
    throw new Error('NGHIÊM TRỌNG: Mật khẩu nguyên văn bị lộ trong KV!');
  }
  const storedUser = JSON.parse(storedUserRaw);
  if (!storedUser.saltHex || !storedUser.hashHex || !storedUser.recoveryHashHex) {
    throw new Error('KV thiếu saltHex hoặc hashHex hoặc recoveryHashHex');
  }
  console.log('✓ Mật khẩu được băm an toàn bằng PBKDF2 + salt ngẫu nhiên riêng.');

  // 3. Test Đăng nhập đúng mật khẩu
  const loginReq = makeRequest('http://auth.local/api/login', 'POST', {
    username: 'samurai_ninja',
    password: 'securePassword123'
  });
  const loginRes = await worker.fetch(loginReq, env);
  if (loginRes.status !== 200) throw new Error('Đăng nhập đúng mật khẩu bị lỗi');
  const loginData = await loginRes.json();
  if (!loginData.success || !loginData.token) throw new Error('Đăng nhập không trả token');
  const token2 = loginData.token;
  console.log('✓ Đăng nhập đúng mật khẩu thành công, cấp token mới.');

  // 4. Test Đăng nhập sai mật khẩu & Rate Limit
  for (let i = 1; i <= 4; i++) {
    const failReq = makeRequest('http://auth.local/api/login', 'POST', {
      username: 'samurai_ninja',
      password: 'wrongPassword'
    });
    const failRes = await worker.fetch(failReq, env);
    if (failRes.status !== 401) throw new Error(`Lần sai thứ ${i} không trả status 401`);
  }
  // Lần 5: Đạt ngưỡng khóa
  const failReq5 = makeRequest('http://auth.local/api/login', 'POST', {
    username: 'samurai_ninja',
    password: 'wrongPassword'
  });
  await worker.fetch(failReq5, env);

  // Lần 6: Phải bị 429 Too Many Requests
  const failReq6 = makeRequest('http://auth.local/api/login', 'POST', {
    username: 'samurai_ninja',
    password: 'wrongPassword'
  });
  const failRes6 = await worker.fetch(failReq6, env);
  if (failRes6.status !== 429) throw new Error(`Rate limit không khóa, status: ${failRes6.status}`);
  console.log('✓ Giới hạn đăng nhập sai (Rate Limit) khóa tạm thời chính xác sau 5 lần sai.');

  // Reset rate limit key trong mockKV để test các bước tiếp theo
  await mockKV.delete('rate:ip:127.0.0.1');
  await mockKV.delete('rate:user:samurai_ninja');

  // 5. Test Lấy thông tin user qua Bearer Token (/api/me)
  const meReq = makeRequest('http://auth.local/api/me', 'GET', null, {
    'Authorization': `Bearer ${token2}`
  });
  const meRes = await worker.fetch(meReq, env);
  if (meRes.status !== 200) throw new Error('/api/me thất bại');
  const meData = await meRes.json();
  if (meData.user.profile.displayName !== 'Samurai' || meData.user.gameData.xp !== 150) {
    throw new Error('Dữ liệu /api/me không khớp profile hoặc gameData ban đầu');
  }
  console.log('✓ /api/me xác thực Bearer token và trả dữ liệu chính xác.');

  // 6. Test Cập nhật hồ sơ (/api/profile)
  const profReq = makeRequest('http://auth.local/api/profile', 'PUT', {
    displayName: 'Samurai Master',
    avatar: '🌸',
    bio: 'Đã hoàn thành N5, đang hướng tới N4!',
    jlptTarget: 'N4'
  }, { 'Authorization': `Bearer ${token2}` });
  const profRes = await worker.fetch(profReq, env);
  if (profRes.status !== 200) throw new Error('/api/profile cập nhật thất bại');
  console.log('✓ /api/profile cập nhật tên, avatar, bio, jlptTarget thành công.');

  // 7. Test Đồng bộ tiến độ trò chơi (/api/sync)
  const syncReq = makeRequest('http://auth.local/api/sync', 'PUT', {
    gameData: {
      xp: 320,
      streak: 5,
      voicePref: 'Microsoft Nanami Online (Natural) - Japanese',
      questData: {
        stars: { N5: [3, 2, 0, 0, 0, 0, 0, 0, 0, 0], N4: [0,0,0,0,0,0,0,0,0,0], N3: [0,0,0,0,0,0,0,0,0,0] },
        unlockedStages: { N5: 2, N4: 0, N3: 0 },
        unlockedLevels: { N5: true, N4: false, N3: false },
        wrongWords: [{ kanji: '明日', kana: 'あした', vi: 'Ngày mai' }]
      }
    }
  }, { 'Authorization': `Bearer ${token2}` });
  const syncRes = await worker.fetch(syncReq, env);
  if (syncRes.status !== 200) throw new Error('/api/sync thất bại');
  const syncData = await syncRes.json();
  if (syncData.gameData.xp !== 320 || syncData.gameData.questData.stars.N5[0] !== 3) {
    throw new Error('Dữ liệu đồng bộ gameData không đúng');
  }
  console.log('✓ /api/sync đồng bộ EXP, sao Hành Trình, từ hay sai và cài đặt giọng đọc thành công.');

  // 8. Test Đặt lại mật khẩu bằng Mã Khôi Phục (/api/reset-password)
  const resetReq = makeRequest('http://auth.local/api/reset-password', 'POST', {
    username: 'samurai_ninja',
    recoveryCode: recoveryCode,
    newPassword: 'brandNewPassword999'
  });
  const resetRes = await worker.fetch(resetReq, env);
  if (resetRes.status !== 200) {
    const err = await resetRes.json();
    throw new Error(`Đặt lại mật khẩu thất bại: ${JSON.stringify(err)}`);
  }
  const resetData = await resetRes.json();
  if (!resetData.newRecoveryCode || !resetData.token) {
    throw new Error('Đặt lại mật khẩu không cấp mã khôi phục mới');
  }
  console.log(`✓ Đặt lại mật khẩu bằng Recovery Code thành công! Mã khôi phục mới: ${resetData.newRecoveryCode}`);

  // Test đăng nhập bằng mật khẩu mới
  const loginNewReq = makeRequest('http://auth.local/api/login', 'POST', {
    username: 'samurai_ninja',
    password: 'brandNewPassword999'
  });
  const loginNewRes = await worker.fetch(loginNewReq, env);
  if (loginNewRes.status !== 200) throw new Error('Không đăng nhập được bằng mật khẩu mới sau khi reset');
  const token3 = (await loginNewRes.json()).token;

  // 9. Test Xóa tài khoản (/api/account)
  const delReq = makeRequest('http://auth.local/api/account', 'DELETE', {
    password: 'brandNewPassword999'
  }, { 'Authorization': `Bearer ${token3}` });
  const delRes = await worker.fetch(delReq, env);
  if (delRes.status !== 200) throw new Error('Xóa tài khoản thất bại');
  const deletedCheck = await mockKV.get('user:samurai_ninja');
  if (deletedCheck !== null) throw new Error('Tài khoản chưa bị xóa khỏi KV');
  console.log('✓ Xóa vĩnh viễn tài khoản và toàn bộ dữ liệu trong KV thành công.');

  console.log('\n======================================================');
  console.log('TẤT CẢ KIỂM THỬ WORKER-AUTH.JS ĐỀU PASS 100%!');
  console.log('======================================================');
}

runTests().catch(err => {
  console.error('FAIL:', err);
  process.exit(1);
});
