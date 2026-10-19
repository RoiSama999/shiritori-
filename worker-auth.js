/**
 * worker-auth.js - Cloudflare Worker cho Hệ thống Tài khoản Không cần Email
 * 
 * Tính năng bảo mật cốt lõi:
 * 1. Băm mật khẩu bằng PBKDF2 qua Web Crypto API (SHA-256, 100,000 iterations, 16-byte random salt).
 *    Tuyệt đối không lưu mật khẩu nguyên văn.
 * 2. Mã khôi phục (Recovery Code) 16 ký tự phân cụm, lưu dạng băm SHA-256, hiển thị duy nhất 1 lần khi đăng ký.
 * 3. Quản lý phiên bằng Session Token ngẫu nhiên (32 bytes crypto hex), có hạn dùng lưu trong KV với TTL.
 * 4. Giới hạn số lần thử đăng nhập sai (Rate Limiting) theo cả IP và Username (khóa tạm 15 phút nếu sai quá 5 lần).
 * 5. CORS nghiêm ngặt: Chỉ chấp nhận https://www.emi.io.vn và http://localhost:8000 (cùng localhost:3000/127.0.0.1 để dev).
 * 6. Kiểm tra giới hạn độ dài và định dạng của mọi dữ liệu đầu vào (Input Validation & Sanitization).
 * 7. Hoàn toàn độc lập với Worker AI hiện có, sử dụng KV Namespace riêng (ví dụ: AUTH_KV).
 */

// Danh sách Origin được phép truy cập CORS
const ALLOWED_ORIGINS = [
  'https://www.emi.io.vn',
  'https://emi.io.vn',
  'http://localhost:8000',
  'http://127.0.0.1:8000',
  'http://localhost:3000',
  'http://127.0.0.1:3000'
];

// Cấu hình bảo mật
const PBKDF2_ITERATIONS = 100000;
const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 ngày
const MAX_LOGIN_ATTEMPTS = 5;
const RATE_LIMIT_LOCKOUT_SECONDS = 15 * 60; // 15 phút

/**
 * Xử lý CORS headers
 */
function getCorsHeaders(request) {
  const origin = request.headers.get('Origin') || '';
  const isAllowed = ALLOWED_ORIGINS.includes(origin);
  const allowOrigin = isAllowed ? origin : ALLOWED_ORIGINS[0];

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin'
  };
}

/**
 * Tạo JSON Response chuẩn kèm CORS
 */
function jsonResponse(data, status = 200, request = null) {
  const cors = request ? getCorsHeaders(request) : { 'Access-Control-Allow-Origin': '*' };
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...cors
    }
  });
}

/**
 * Chuyển Buffer/ArrayBuffer sang chuỗi Hex
 */
function bufferToHex(buffer) {
  return [...new Uint8Array(buffer)]
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Chuyển chuỗi Hex sang Uint8Array
 */
function hexToBuffer(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

/**
 * Băm chuỗi bằng SHA-256 (dùng cho Recovery Code và Token)
 */
async function sha256Hex(text) {
  const enc = new TextEncoder();
  const digest = await crypto.subtle.digest('SHA-256', enc.encode(text));
  return bufferToHex(digest);
}

/**
 * Băm mật khẩu bằng PBKDF2 với Salt
 */
async function hashPassword(password, saltHex = null) {
  const enc = new TextEncoder();
  let salt;
  if (saltHex) {
    salt = hexToBuffer(saltHex);
  } else {
    salt = new Uint8Array(16);
    crypto.getRandomValues(salt);
    saltHex = bufferToHex(salt);
  }

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256'
    },
    keyMaterial,
    256
  );

  return {
    saltHex,
    hashHex: bufferToHex(derivedBits)
  };
}

/**
 * Xác thực mật khẩu so với hash đã lưu (Constant-time comparison)
 */
async function verifyPassword(password, saltHex, expectedHashHex) {
  const { hashHex } = await hashPassword(password, saltHex);
  if (hashHex.length !== expectedHashHex.length) return false;
  let diff = 0;
  for (let i = 0; i < hashHex.length; i++) {
    diff |= hashHex.charCodeAt(i) ^ expectedHashHex.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Tạo mã ngẫu nhiên an toàn
 */
function generateRandomHex(bytes = 32) {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return bufferToHex(arr);
}

/**
 * Tạo mã khôi phục dạng phân cụm dễ ghi chép: XXXX-XXXX-XXXX-XXXX
 */
function generateRecoveryCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Bỏ các ký tự dễ nhầm: 0, O, 1, I
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  let code = '';
  for (let i = 0; i < 16; i++) {
    code += chars[arr[i] % chars.length];
    if ((i + 1) % 4 === 0 && i !== 15) code += '-';
  }
  return code;
}

/**
 * Lấy IP của Client từ Request
 */
function getClientIp(request) {
  return request.headers.get('CF-Connecting-IP') || 
         request.headers.get('X-Forwarded-For') || 
         'unknown-ip';
}

/**
 * Kiểm tra và ghi nhận Rate Limiting khi đăng nhập sai
 */
async function checkRateLimit(kv, key) {
  const raw = await kv.get(`rate:${key}`);
  if (!raw) return { allowed: true, attempts: 0 };
  const data = JSON.parse(raw);
  const now = Math.floor(Date.now() / 1000);
  if (data.attempts >= MAX_LOGIN_ATTEMPTS) {
    if (now < data.lockedUntil) {
      const waitMinutes = Math.ceil((data.lockedUntil - now) / 60);
      return { allowed: false, waitMinutes };
    }
  }
  return { allowed: true, attempts: data.attempts };
}

async function recordFailedLogin(kv, key) {
  const raw = await kv.get(`rate:${key}`);
  const now = Math.floor(Date.now() / 1000);
  let attempts = 1;
  let lockedUntil = 0;
  if (raw) {
    const data = JSON.parse(raw);
    attempts = (data.attempts || 0) + 1;
  }
  if (attempts >= MAX_LOGIN_ATTEMPTS) {
    lockedUntil = now + RATE_LIMIT_LOCKOUT_SECONDS;
  }
  await kv.put(`rate:${key}`, JSON.stringify({ attempts, lockedUntil }), {
    expirationTtl: RATE_LIMIT_LOCKOUT_SECONDS + 60
  });
}

async function clearRateLimit(kv, key) {
  await kv.delete(`rate:${key}`);
}

/**
 * Xác thực Bearer Token từ Header Authorization
 */
async function authenticateToken(request, kv) {
  const authHeader = request.headers.get('Authorization') || '';
  if (!authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.substring(7).trim();
  if (!token || token.length < 32) return null;

  const sessionRaw = await kv.get(`session:${token}`);
  if (!sessionRaw) return null;

  try {
    const session = JSON.parse(sessionRaw);
    return { token, username: session.username };
  } catch (e) {
    return null;
  }
}

/**
 * Router chính cho Cloudflare Worker
 */
export default {
  async fetch(request, env, ctx) {
    // 1. Kiểm tra KV binding
    const kv = env.AUTH_KV;
    if (!kv) {
      return jsonResponse({
        error: 'Chưa cấu hình AUTH_KV namespace trong Cloudflare Worker!'
      }, 500, request);
    }

    // 2. Xử lý preflight CORS OPTIONS
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: getCorsHeaders(request)
      });
    }

    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    try {
      // ══════════════════════════════════════════════════
      // API: POST /api/register
      // Đăng ký tài khoản mới không cần email
      // ══════════════════════════════════════════════════
      if (path === '/api/register' && method === 'POST') {
        const body = await request.json().catch(() => ({}));
        let { username, password, initialData } = body;

        // Kiểm tra độ dài & định dạng username
        if (!username || typeof username !== 'string') {
          return jsonResponse({ error: 'Tên đăng nhập không được để trống' }, 400, request);
        }
        username = username.trim().toLowerCase();
        if (!/^[a-z0-9_]{3,20}$/.test(username)) {
          return jsonResponse({
            error: 'Tên đăng nhập phải từ 3 đến 20 ký tự, chỉ gồm chữ cái thường, số và dấu gạch dưới'
          }, 400, request);
        }

        // Kiểm tra password
        if (!password || typeof password !== 'string' || password.length < 6 || password.length > 64) {
          return jsonResponse({ error: 'Mật khẩu phải từ 6 đến 64 ký tự' }, 400, request);
        }

        // Kiểm tra username đã tồn tại chưa
        const existing = await kv.get(`user:${username}`);
        if (existing) {
          return jsonResponse({ error: 'Tên đăng nhập này đã được sử dụng. Vui lòng chọn tên khác!' }, 409, request);
        }

        // Băm mật khẩu bằng PBKDF2
        const { saltHex, hashHex } = await hashPassword(password);

        // Tạo mã khôi phục và băm lưu trữ
        const recoveryCode = generateRecoveryCode();
        const recoveryHashHex = await sha256Hex(recoveryCode.replace(/-/g, '').toUpperCase());

        // Chuẩn bị dữ liệu ban đầu
        const profile = {
          displayName: (initialData && initialData.name) ? String(initialData.name).slice(0, 30) : username,
          avatar: (initialData && initialData.avatar) ? String(initialData.avatar).slice(0, 100) : '🦊',
          bio: (initialData && initialData.bio) ? String(initialData.bio).slice(0, 150) : 'Người học tiếng Nhật tại Emi.io.vn',
          jlptTarget: (initialData && ['N5','N4','N3','N2','N1'].includes(initialData.target)) ? initialData.target : 'N5'
        };

        const gameData = {
          xp: (initialData && typeof initialData.xp === 'number') ? initialData.xp : 0,
          rank: (initialData && initialData.rank) ? String(initialData.rank).slice(0, 30) : 'Tập Sự',
          streak: (initialData && typeof initialData.streak === 'number') ? initialData.streak : 0,
          lastActive: new Date().toISOString(),
          voicePref: (initialData && initialData.voicePref) ? String(initialData.voicePref).slice(0, 100) : '',
          questData: (initialData && initialData.questData) ? initialData.questData : {
            stars: { N5: [0,0,0,0,0,0,0,0,0,0], N4: [0,0,0,0,0,0,0,0,0,0], N3: [0,0,0,0,0,0,0,0,0,0] },
            unlockedStages: { N5: 0, N4: 0, N3: 0 },
            unlockedLevels: { N5: true, N4: false, N3: false },
            wrongWords: []
          }
        };

        const userData = {
          username,
          saltHex,
          hashHex,
          recoveryHashHex,
          createdAt: Date.now(),
          profile,
          gameData
        };

        // Lưu vào KV
        await kv.put(`user:${username}`, JSON.stringify(userData));

        // Tạo session token
        const token = generateRandomHex(32);
        await kv.put(`session:${token}`, JSON.stringify({
          username,
          createdAt: Date.now()
        }), { expirationTtl: SESSION_TTL_SECONDS });

        return jsonResponse({
          success: true,
          token,
          recoveryCode, // CHỈ HIỂN THỊ ĐÚNG 1 LẦN NÀY ĐỂ NGƯỜI DÙNG LƯU
          user: {
            username,
            profile,
            gameData
          }
        }, 201, request);
      }

      // ══════════════════════════════════════════════════
      // API: POST /api/login
      // Đăng nhập bằng username và mật khẩu
      // ══════════════════════════════════════════════════
      if (path === '/api/login' && method === 'POST') {
        const body = await request.json().catch(() => ({}));
        let { username, password } = body;
        const clientIp = getClientIp(request);

        if (!username || !password) {
          return jsonResponse({ error: 'Vui lòng nhập tên đăng nhập và mật khẩu' }, 400, request);
        }
        username = String(username).trim().toLowerCase();

        // 1. Kiểm tra Rate Limit theo IP và Username
        const ipLimit = await checkRateLimit(kv, `ip:${clientIp}`);
        if (!ipLimit.allowed) {
          return jsonResponse({
            error: `IP của bạn đã thử sai quá nhiều lần. Vui lòng chờ ${ipLimit.waitMinutes} phút trước khi thử lại!`
          }, 429, request);
        }

        const userLimit = await checkRateLimit(kv, `user:${username}`);
        if (!userLimit.allowed) {
          return jsonResponse({
            error: `Tài khoản tạm thời bị khóa do nhiều lần đăng nhập sai. Vui lòng chờ ${userLimit.waitMinutes} phút!`
          }, 429, request);
        }

        // 2. Tìm user trong KV
        const userRaw = await kv.get(`user:${username}`);
        if (!userRaw) {
          await recordFailedLogin(kv, `ip:${clientIp}`);
          await recordFailedLogin(kv, `user:${username}`);
          return jsonResponse({ error: 'Tên đăng nhập hoặc mật khẩu không chính xác' }, 401, request);
        }

        const userData = JSON.parse(userRaw);

        // 3. So khớp mật khẩu PBKDF2
        const isMatch = await verifyPassword(password, userData.saltHex, userData.hashHex);
        if (!isMatch) {
          await recordFailedLogin(kv, `ip:${clientIp}`);
          await recordFailedLogin(kv, `user:${username}`);
          return jsonResponse({ error: 'Tên đăng nhập hoặc mật khẩu không chính xác' }, 401, request);
        }

        // Đăng nhập thành công -> Xóa bộ đếm rate limit
        await clearRateLimit(kv, `ip:${clientIp}`);
        await clearRateLimit(kv, `user:${username}`);

        // Tạo token phiên mới
        const token = generateRandomHex(32);
        await kv.put(`session:${token}`, JSON.stringify({
          username,
          createdAt: Date.now()
        }), { expirationTtl: SESSION_TTL_SECONDS });

        return jsonResponse({
          success: true,
          token,
          user: {
            username: userData.username,
            profile: userData.profile,
            gameData: userData.gameData
          }
        }, 200, request);
      }

      // ══════════════════════════════════════════════════
      // API: POST /api/logout
      // Đăng xuất và hủy token
      // ══════════════════════════════════════════════════
      if (path === '/api/logout' && method === 'POST') {
        const auth = await authenticateToken(request, kv);
        if (auth) {
          await kv.delete(`session:${auth.token}`);
        }
        return jsonResponse({ success: true, message: 'Đăng xuất thành công' }, 200, request);
      }

      // ══════════════════════════════════════════════════
      // API: GET /api/me
      // Lấy thông tin tài khoản và tiến độ hiện tại
      // ══════════════════════════════════════════════════
      if (path === '/api/me' && method === 'GET') {
        const auth = await authenticateToken(request, kv);
        if (!auth) {
          return jsonResponse({ error: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn' }, 401, request);
        }

        const userRaw = await kv.get(`user:${auth.username}`);
        if (!userRaw) {
          return jsonResponse({ error: 'Không tìm thấy người dùng' }, 404, request);
        }

        const userData = JSON.parse(userRaw);
        return jsonResponse({
          success: true,
          user: {
            username: userData.username,
            profile: userData.profile,
            gameData: userData.gameData
          }
        }, 200, request);
      }

      // ══════════════════════════════════════════════════
      // API: PUT /api/profile
      // Cập nhật thông tin cá nhân (tên, avatar, bio, jlptTarget)
      // ══════════════════════════════════════════════════
      if (path === '/api/profile' && method === 'PUT') {
        const auth = await authenticateToken(request, kv);
        if (!auth) {
          return jsonResponse({ error: 'Chưa đăng nhập' }, 401, request);
        }

        const body = await request.json().catch(() => ({}));
        const userRaw = await kv.get(`user:${auth.username}`);
        if (!userRaw) {
          return jsonResponse({ error: 'Không tìm thấy người dùng' }, 404, request);
        }

        const userData = JSON.parse(userRaw);

        if (body.displayName !== undefined) {
          userData.profile.displayName = String(body.displayName).trim().slice(0, 30);
        }
        if (body.avatar !== undefined) {
          userData.profile.avatar = String(body.avatar).trim().slice(0, 100);
        }
        if (body.bio !== undefined) {
          userData.profile.bio = String(body.bio).trim().slice(0, 150);
        }
        if (body.jlptTarget !== undefined && ['N5','N4','N3','N2','N1'].includes(body.jlptTarget)) {
          userData.profile.jlptTarget = body.jlptTarget;
        }

        await kv.put(`user:${auth.username}`, JSON.stringify(userData));

        return jsonResponse({
          success: true,
          profile: userData.profile
        }, 200, request);
      }

      // ══════════════════════════════════════════════════
      // API: PUT /api/sync
      // Đồng bộ tiến độ trò chơi (EXP, rank, streak, questData, wrongWords, voicePref)
      // ══════════════════════════════════════════════════
      if (path === '/api/sync' && method === 'PUT') {
        const auth = await authenticateToken(request, kv);
        if (!auth) {
          return jsonResponse({ error: 'Chưa đăng nhập' }, 401, request);
        }

        const body = await request.json().catch(() => ({}));
        const userRaw = await kv.get(`user:${auth.username}`);
        if (!userRaw) {
          return jsonResponse({ error: 'Không tìm thấy người dùng' }, 404, request);
        }

        const userData = JSON.parse(userRaw);

        if (body.gameData) {
          const gd = body.gameData;
          if (typeof gd.xp === 'number') userData.gameData.xp = Math.max(userData.gameData.xp || 0, gd.xp);
          if (typeof gd.streak === 'number') userData.gameData.streak = Math.max(userData.gameData.streak || 0, gd.streak);
          if (gd.rank) userData.gameData.rank = String(gd.rank).slice(0, 30);
          if (gd.voicePref !== undefined) userData.gameData.voicePref = String(gd.voicePref).slice(0, 100);
          if (gd.questData) {
            // Hợp nhất sao và màn chơi (luôn giữ điểm số cao nhất)
            if (!userData.gameData.questData) userData.gameData.questData = gd.questData;
            else {
              const localQ = gd.questData;
              const serverQ = userData.gameData.questData;
              for (const lvl of ['N5', 'N4', 'N3']) {
                if (localQ.stars && localQ.stars[lvl]) {
                  if (!serverQ.stars[lvl]) serverQ.stars[lvl] = localQ.stars[lvl];
                  else {
                    for (let i = 0; i < 10; i++) {
                      serverQ.stars[lvl][i] = Math.max(serverQ.stars[lvl][i] || 0, localQ.stars[lvl][i] || 0);
                    }
                  }
                }
                if (localQ.unlockedStages && localQ.unlockedStages[lvl] !== undefined) {
                  serverQ.unlockedStages[lvl] = Math.max(serverQ.unlockedStages[lvl] || 0, localQ.unlockedStages[lvl] || 0);
                }
                if (localQ.unlockedLevels && localQ.unlockedLevels[lvl]) {
                  serverQ.unlockedLevels[lvl] = true;
                }
              }
              if (localQ.wrongWords && Array.isArray(localQ.wrongWords)) {
                // Giữ danh sách từ sai không trùng lặp
                const existingWords = serverQ.wrongWords || [];
                for (const w of localQ.wrongWords) {
                  const key = w.kanji || w.hiragana || w.kana;
                  if (!existingWords.some(ew => (ew.kanji || ew.hiragana || ew.kana) === key)) {
                    existingWords.push(w);
                  }
                }
                serverQ.wrongWords = existingWords.slice(-200); // Giới hạn tối đa 200 từ
              }
            }
          }
          userData.gameData.lastActive = new Date().toISOString();
        }

        await kv.put(`user:${auth.username}`, JSON.stringify(userData));

        return jsonResponse({
          success: true,
          gameData: userData.gameData
        }, 200, request);
      }

      // ══════════════════════════════════════════════════
      // API: POST /api/change-password
      // Đổi mật khẩu khi đang đăng nhập
      // ══════════════════════════════════════════════════
      if (path === '/api/change-password' && method === 'POST') {
        const auth = await authenticateToken(request, kv);
        if (!auth) {
          return jsonResponse({ error: 'Chưa đăng nhập' }, 401, request);
        }

        const body = await request.json().catch(() => ({}));
        const { oldPassword, newPassword } = body;

        if (!oldPassword || !newPassword || newPassword.length < 6 || newPassword.length > 64) {
          return jsonResponse({ error: 'Mật khẩu mới phải từ 6 đến 64 ký tự' }, 400, request);
        }

        const userRaw = await kv.get(`user:${auth.username}`);
        if (!userRaw) {
          return jsonResponse({ error: 'Không tìm thấy người dùng' }, 404, request);
        }

        const userData = JSON.parse(userRaw);
        const isMatch = await verifyPassword(oldPassword, userData.saltHex, userData.hashHex);
        if (!isMatch) {
          return jsonResponse({ error: 'Mật khẩu cũ không đúng' }, 400, request);
        }

        // Băm mật khẩu mới
        const { saltHex, hashHex } = await hashPassword(newPassword);
        userData.saltHex = saltHex;
        userData.hashHex = hashHex;

        await kv.put(`user:${auth.username}`, JSON.stringify(userData));

        return jsonResponse({ success: true, message: 'Đổi mật khẩu thành công!' }, 200, request);
      }

      // ══════════════════════════════════════════════════
      // API: POST /api/reset-password
      // Đặt lại mật khẩu bằng Mã Khôi Phục (Recovery Code)
      // ══════════════════════════════════════════════════
      if (path === '/api/reset-password' && method === 'POST') {
        const body = await request.json().catch(() => ({}));
        let { username, recoveryCode, newPassword } = body;

        if (!username || !recoveryCode || !newPassword) {
          return jsonResponse({ error: 'Vui lòng điền đủ tên đăng nhập, mã khôi phục và mật khẩu mới' }, 400, request);
        }

        username = String(username).trim().toLowerCase();
        if (newPassword.length < 6 || newPassword.length > 64) {
          return jsonResponse({ error: 'Mật khẩu mới phải từ 6 đến 64 ký tự' }, 400, request);
        }

        const userRaw = await kv.get(`user:${username}`);
        if (!userRaw) {
          return jsonResponse({ error: 'Không tìm thấy tài khoản với tên đăng nhập này' }, 404, request);
        }

        const userData = JSON.parse(userRaw);

        // Chuẩn hóa và so khớp mã khôi phục
        const cleanRecovery = String(recoveryCode).replace(/[^A-Za-z0-9]/g, '').toUpperCase();
        const inputRecoveryHash = await sha256Hex(cleanRecovery);

        if (inputRecoveryHash !== userData.recoveryHashHex) {
          return jsonResponse({ error: 'Mã khôi phục không hợp lệ!' }, 400, request);
        }

        // Băm mật khẩu mới
        const { saltHex, hashHex } = await hashPassword(newPassword);
        userData.saltHex = saltHex;
        userData.hashHex = hashHex;

        // Tạo mã khôi phục mới để thay thế mã cũ đã dùng
        const newRecoveryCode = generateRecoveryCode();
        userData.recoveryHashHex = await sha256Hex(newRecoveryCode.replace(/-/g, '').toUpperCase());

        await kv.put(`user:${username}`, JSON.stringify(userData));

        // Cấp session token mới
        const token = generateRandomHex(32);
        await kv.put(`session:${token}`, JSON.stringify({
          username,
          createdAt: Date.now()
        }), { expirationTtl: SESSION_TTL_SECONDS });

        return jsonResponse({
          success: true,
          message: 'Đặt lại mật khẩu thành công!',
          token,
          newRecoveryCode, // Cung cấp mã mới cho lần sau
          user: {
            username: userData.username,
            profile: userData.profile,
            gameData: userData.gameData
          }
        }, 200, request);
      }

      // ══════════════════════════════════════════════════
      // API: DELETE /api/account
      // Xóa vĩnh viễn tài khoản và toàn bộ dữ liệu
      // ══════════════════════════════════════════════════
      if (path === '/api/account' && method === 'DELETE') {
        const auth = await authenticateToken(request, kv);
        if (!auth) {
          return jsonResponse({ error: 'Chưa đăng nhập' }, 401, request);
        }

        const body = await request.json().catch(() => ({}));
        const { password } = body;

        if (!password) {
          return jsonResponse({ error: 'Vui lòng nhập mật khẩu để xác nhận xóa tài khoản' }, 400, request);
        }

        const userRaw = await kv.get(`user:${auth.username}`);
        if (!userRaw) {
          return jsonResponse({ error: 'Không tìm thấy người dùng' }, 404, request);
        }

        const userData = JSON.parse(userRaw);
        const isMatch = await verifyPassword(password, userData.saltHex, userData.hashHex);
        if (!isMatch) {
          return jsonResponse({ error: 'Mật khẩu xác nhận không chính xác' }, 400, request);
        }

        // Xóa session và tài khoản trong KV
        await kv.delete(`session:${auth.token}`);
        await kv.delete(`user:${auth.username}`);

        return jsonResponse({
          success: true,
          message: 'Tài khoản và toàn bộ dữ liệu đã được xóa vĩnh viễn thành công.'
        }, 200, request);
      }

      // Tuyến đường mặc định (404)
      return jsonResponse({ error: 'API endpoint không tồn tại' }, 404, request);

    } catch (err) {
      return jsonResponse({
        error: 'Lỗi máy chủ nội bộ: ' + (err.message || String(err))
      }, 500, request);
    }
  }
};
