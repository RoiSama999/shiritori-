/**
 * worker-auth.js - Cloudflare Worker cho Hệ thống Tài khoản Không cần Email
 * 
 * Tính năng bảo mật cốt lõi:
 * 1. Băm mật khẩu bằng PBKDF2 qua Web Crypto API (SHA-256, 100,000 iterations, 16-byte random salt).
 *    Tuyệt đối không lưu mật khẩu nguyên văn.
 * 2. Mã khôi phục (Recovery Code) 16 ký tự phân cụm, lưu dạng băm SHA-256, hiển thị duy nhất 1 lần khi đăng ký.
 * 3. Quản lý phiên bằng Session Token ngẫu nhiên (32 bytes crypto hex), có sessionVersion vô hiệu hóa mọi phiên cũ khi đổi mật khẩu/reset.
 * 4. Rate Limiting:
 *    - Đăng ký: tối đa 3 tài khoản mỗi IP mỗi giờ.
 *    - Reset mật khẩu: tối đa 5 lần mỗi 15 phút theo IP và Username.
 *    - Đăng nhập: khóa tạm 15 phút nếu sai quá 5 lần theo IP và Username.
 *    - Không ghi nhận rate limit cho username sai định dạng regex.
 * 5. CORS whitelist nghiêm ngặt: Chỉ chấp nhận https://www.emi.io.vn và localhost.
 * 6. Từ chối mọi request body lớn hơn 20KB (HTTP 413).
 * 7. Validate nghiêm ngặt questData và wrongWords (tối đa 200 từ, tối đa 60 ký tự mỗi trường).
 * 8. Giới hạn EXP và Streak hợp lý.
 * 9. Không trả err.message ra ngoài nhằm ngăn chặn rò rỉ thông tin máy chủ.
 * 10. Bảng xếp hạng tuần /api/leaderboard dùng MỘT khóa KV duy nhất lưu top 50, tự reset khi sang tuần mới.
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

const MAX_REGISTER_PER_HOUR = 3;
const REGISTER_WINDOW_SECONDS = 3600; // 1 giờ
const MAX_RESET_ATTEMPTS = 5;
const RESET_WINDOW_SECONDS = 15 * 60; // 15 phút
const MAX_BODY_BYTES = 20480; // 20KB
const USERNAME_REGEX = /^[a-z0-9_]{3,20}$/;

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
 * Đọc và kiểm tra kích thước Body JSON an toàn (tối đa 20KB)
 */
async function readJsonBody(request) {
  const contentLength = parseInt(request.headers.get('content-length') || '0', 10);
  if (contentLength > MAX_BODY_BYTES) {
    return { error: 'Dung lượng request vượt quá giới hạn 20KB cho phép', status: 413 };
  }
  const text = await request.text().catch(() => '');
  if (text.length > MAX_BODY_BYTES) {
    return { error: 'Dung lượng request vượt quá giới hạn 20KB cho phép', status: 413 };
  }
  if (!text.trim()) return { data: {} };
  try {
    return { data: JSON.parse(text) };
  } catch (e) {
    return { error: 'Định dạng dữ liệu JSON không hợp lệ', status: 400 };
  }
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
 * Kiểm tra và ghi nhận Rate Limiting linh hoạt
 */
async function checkRateLimit(kv, key, maxAttempts = MAX_LOGIN_ATTEMPTS) {
  const raw = await kv.get(`rate:${key}`);
  if (!raw) return { allowed: true, attempts: 0 };
  const data = JSON.parse(raw);
  const now = Math.floor(Date.now() / 1000);
  if (data.attempts >= maxAttempts) {
    if (now < data.lockedUntil) {
      const waitMinutes = Math.max(1, Math.ceil((data.lockedUntil - now) / 60));
      return { allowed: false, waitMinutes };
    }
  }
  return { allowed: true, attempts: data.attempts };
}

async function recordRateLimit(kv, key, maxAttempts = MAX_LOGIN_ATTEMPTS, lockoutSeconds = RATE_LIMIT_LOCKOUT_SECONDS) {
  const raw = await kv.get(`rate:${key}`);
  const now = Math.floor(Date.now() / 1000);
  let attempts = 1;
  let lockedUntil = now + lockoutSeconds;
  if (raw) {
    const data = JSON.parse(raw);
    attempts = (data.attempts || 0) + 1;
    if (data.lockedUntil && now < data.lockedUntil) {
      lockedUntil = data.lockedUntil;
    }
  }
  await kv.put(`rate:${key}`, JSON.stringify({ attempts, lockedUntil }), {
    expirationTtl: lockoutSeconds + 60
  });
}

async function recordFailedLogin(kv, key) {
  return recordRateLimit(kv, key, MAX_LOGIN_ATTEMPTS, RATE_LIMIT_LOCKOUT_SECONDS);
}

async function clearRateLimit(kv, key) {
  await kv.delete(`rate:${key}`);
}

/**
 * Lọc và chuẩn hóa danh sách từ sai (tối đa 200 từ, tối đa 60 ký tự mỗi trường)
 */
function sanitizeWrongWords(words) {
  if (!Array.isArray(words)) return [];
  const sanitized = [];
  const seen = new Set();
  for (const w of words) {
    if (!w || typeof w !== 'object') continue;
    const kanji = typeof w.kanji === 'string' ? w.kanji.slice(0, 60).trim() : '';
    const hiragana = typeof w.hiragana === 'string' ? w.hiragana.slice(0, 60).trim() : (typeof w.kana === 'string' ? w.kana.slice(0, 60).trim() : '');
    const romaji = typeof w.romaji === 'string' ? w.romaji.slice(0, 60).trim() : (typeof w.r === 'string' ? w.r.slice(0, 60).trim() : '');
    const meaning = typeof w.meaning === 'string' ? w.meaning.slice(0, 60).trim() : (typeof w.vi === 'string' ? w.vi.slice(0, 60).trim() : (typeof w.m === 'string' ? w.m.slice(0, 60).trim() : ''));
    
    const key = kanji || hiragana || romaji;
    if (!key || seen.has(key)) continue;
    seen.add(key);

    const box = (typeof w.box === 'number' && w.box >= 1 && w.box <= 5) ? Math.floor(w.box) : 1;
    const nextReview = typeof w.nextReview === 'string' ? w.nextReview.slice(0, 30) : '';

    sanitized.push({
      kanji,
      hiragana,
      romaji,
      meaning,
      box,
      nextReview
    });

    if (sanitized.length >= 200) break;
  }
  return sanitized;
}

/**
 * Tính khóa tuần hiện tại cho Bảng Xếp Hạng tuần
 */
function getWeeklyLeaderboardKey() {
  const now = new Date();
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `leaderboard:${d.getUTCFullYear()}_W${String(weekNo).padStart(2, '0')}`;
}

/**
 * Xác thực Bearer Token và kiểm tra sessionVersion
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
    const userRaw = await kv.get(`user:${session.username}`);
    if (!userRaw) return null;
    const userData = JSON.parse(userRaw);

    // Kiểm tra sessionVersion: nếu tài khoản đã đổi/reset mật khẩu thì hủy phiên cũ
    if (session.sessionVersion !== undefined && userData.sessionVersion !== undefined) {
      if (session.sessionVersion !== userData.sessionVersion) {
        return null; // Phiên cũ đã bị vô hiệu hóa
      }
    }

    return { token, username: session.username, userData };
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
    const clientIp = getClientIp(request);

    try {
      // ══════════════════════════════════════════════════
      // API: POST /api/register
      // Đăng ký tài khoản mới không cần email (giới hạn 3 tài khoản/IP/giờ)
      // ══════════════════════════════════════════════════
      if (path === '/api/register' && method === 'POST') {
        const parsed = await readJsonBody(request);
        if (parsed.error) return jsonResponse({ error: parsed.error }, parsed.status, request);
        const body = parsed.data;
        let { username, password, initialData } = body;

        // Giới hạn theo IP cho /api/register (3 tài khoản mỗi IP mỗi giờ)
        const regLimit = await checkRateLimit(kv, `register:ip:${clientIp}`, MAX_REGISTER_PER_HOUR);
        if (!regLimit.allowed) {
          return jsonResponse({
            error: `IP của bạn đã đăng ký quá số tài khoản cho phép (${MAX_REGISTER_PER_HOUR} tài khoản/giờ). Vui lòng chờ ${regLimit.waitMinutes} phút!`
          }, 429, request);
        }

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

        const initialWrongWords = (initialData && initialData.questData && Array.isArray(initialData.questData.wrongWords))
          ? sanitizeWrongWords(initialData.questData.wrongWords)
          : [];

        const gameData = {
          xp: (initialData && typeof initialData.xp === 'number' && initialData.xp >= 0 && initialData.xp <= 10000000) ? Math.floor(initialData.xp) : 0,
          rank: (initialData && initialData.rank) ? String(initialData.rank).slice(0, 30) : 'Tập Sự',
          streak: (initialData && typeof initialData.streak === 'number' && initialData.streak >= 0 && initialData.streak <= 3650) ? Math.floor(initialData.streak) : 0,
          lastActive: new Date().toISOString(),
          voicePref: (initialData && initialData.voicePref) ? String(initialData.voicePref).slice(0, 100) : '',
          collectibles: (initialData && Array.isArray(initialData.collectibles)) ? initialData.collectibles.slice(0, 100) : [],
          equippedFrame: (initialData && initialData.equippedFrame) ? String(initialData.equippedFrame).slice(0, 50) : '',
          mysteryBoxClaimed: (initialData && initialData.mysteryBoxClaimed) ? String(initialData.mysteryBoxClaimed).slice(0, 20) : '',
          questData: (initialData && initialData.questData) ? {
            stars: (initialData.questData.stars && typeof initialData.questData.stars === 'object') ? initialData.questData.stars : { N5: [0,0,0,0,0,0,0,0,0,0], N4: [0,0,0,0,0,0,0,0,0,0], N3: [0,0,0,0,0,0,0,0,0,0] },
            unlockedStages: (initialData.questData.unlockedStages && typeof initialData.questData.unlockedStages === 'object') ? initialData.questData.unlockedStages : { N5: 0, N4: 0, N3: 0 },
            unlockedLevels: (initialData.questData.unlockedLevels && typeof initialData.questData.unlockedLevels === 'object') ? initialData.questData.unlockedLevels : { N5: true, N4: false, N3: false },
            wrongWords: initialWrongWords
          } : {
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
          sessionVersion: 1,
          createdAt: Date.now(),
          profile,
          gameData
        };

        // Lưu vào KV
        await kv.put(`user:${username}`, JSON.stringify(userData));

        // Ghi nhận rate limit đăng ký cho IP này
        await recordRateLimit(kv, `register:ip:${clientIp}`, MAX_REGISTER_PER_HOUR, REGISTER_WINDOW_SECONDS);

        // Tạo session token với sessionVersion ban đầu
        const token = generateRandomHex(32);
        await kv.put(`session:${token}`, JSON.stringify({
          username,
          sessionVersion: 1,
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
        const parsed = await readJsonBody(request);
        if (parsed.error) return jsonResponse({ error: parsed.error }, parsed.status, request);
        const body = parsed.data;
        let { username, password } = body;

        if (!username || !password) {
          return jsonResponse({ error: 'Vui lòng nhập tên đăng nhập và mật khẩu' }, 400, request);
        }
        username = String(username).trim().toLowerCase();

        // Kiểm tra định dạng username bằng regex trước. KHÔNG ghi rate limit cho username sai định dạng!
        if (!/^[a-z0-9_]{3,20}$/.test(username)) {
          return jsonResponse({
            error: 'Tên đăng nhập phải từ 3 đến 20 ký tự, chỉ gồm chữ cái thường, số và dấu gạch dưới'
          }, 400, request);
        }

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

        // Tạo token phiên mới gán kèm sessionVersion
        const token = generateRandomHex(32);
        const currentVersion = userData.sessionVersion || 1;
        await kv.put(`session:${token}`, JSON.stringify({
          username,
          sessionVersion: currentVersion,
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

        const parsed = await readJsonBody(request);
        if (parsed.error) return jsonResponse({ error: parsed.error }, parsed.status, request);
        const body = parsed.data;

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

        const parsed = await readJsonBody(request);
        if (parsed.error) return jsonResponse({ error: parsed.error }, parsed.status, request);
        const body = parsed.data;

        const userRaw = await kv.get(`user:${auth.username}`);
        if (!userRaw) {
          return jsonResponse({ error: 'Không tìm thấy người dùng' }, 404, request);
        }

        const userData = JSON.parse(userRaw);

        if (body.gameData && typeof body.gameData === 'object') {
          const gd = body.gameData;
          // Kiểm tra giới hạn xp và streak hợp lý
          if (typeof gd.xp === 'number' && Number.isFinite(gd.xp) && gd.xp >= 0 && gd.xp <= 10000000) {
            userData.gameData.xp = Math.max(userData.gameData.xp || 0, Math.floor(gd.xp));
          }
          if (typeof gd.streak === 'number' && Number.isFinite(gd.streak) && gd.streak >= 0 && gd.streak <= 3650) {
            userData.gameData.streak = Math.max(userData.gameData.streak || 0, Math.floor(gd.streak));
          }
          if (typeof gd.rank === 'string') {
            userData.gameData.rank = gd.rank.slice(0, 30);
          }
          if (typeof gd.voicePref === 'string') {
            userData.gameData.voicePref = gd.voicePref.slice(0, 100);
          }
          if (Array.isArray(gd.collectibles)) {
            const curColl = new Set(Array.isArray(userData.gameData.collectibles) ? userData.gameData.collectibles : []);
            for (const item of gd.collectibles) {
              if (typeof item === 'string' && item.length <= 50) {
                curColl.add(item);
              }
            }
            userData.gameData.collectibles = Array.from(curColl);
          }
          if (typeof gd.equippedFrame === 'string') {
            userData.gameData.equippedFrame = gd.equippedFrame.slice(0, 50);
          }
          if (typeof gd.mysteryBoxClaimed === 'string') {
            userData.gameData.mysteryBoxClaimed = gd.mysteryBoxClaimed.slice(0, 20);
          }

          // Validate questData và wrongWords nghiêm ngặt
          if (gd.questData && typeof gd.questData === 'object') {
            const localQ = gd.questData;
            if (!userData.gameData.questData || typeof userData.gameData.questData !== 'object') {
              userData.gameData.questData = {
                stars: { N5: [0,0,0,0,0,0,0,0,0,0], N4: [0,0,0,0,0,0,0,0,0,0], N3: [0,0,0,0,0,0,0,0,0,0] },
                unlockedStages: { N5: 0, N4: 0, N3: 0 },
                unlockedLevels: { N5: true, N4: false, N3: false },
                wrongWords: []
              };
            }
            const serverQ = userData.gameData.questData;
            if (!serverQ.stars) serverQ.stars = { N5: [0,0,0,0,0,0,0,0,0,0], N4: [0,0,0,0,0,0,0,0,0,0], N3: [0,0,0,0,0,0,0,0,0,0] };

            for (const lvl of ['N5', 'N4', 'N3']) {
              if (localQ.stars && Array.isArray(localQ.stars[lvl])) {
                if (!Array.isArray(serverQ.stars[lvl])) serverQ.stars[lvl] = [0,0,0,0,0,0,0,0,0,0];
                for (let i = 0; i < 10; i++) {
                  const rawStar = localQ.stars[lvl][i];
                  const star = (typeof rawStar === 'number' && rawStar >= 0 && rawStar <= 3) ? Math.floor(rawStar) : 0;
                  serverQ.stars[lvl][i] = Math.max(serverQ.stars[lvl][i] || 0, star);
                }
              }
              if (localQ.unlockedStages && typeof localQ.unlockedStages[lvl] === 'number') {
                const st = Math.max(0, Math.min(10, Math.floor(localQ.unlockedStages[lvl])));
                serverQ.unlockedStages[lvl] = Math.max(serverQ.unlockedStages[lvl] || 0, st);
              }
              if (localQ.unlockedLevels && localQ.unlockedLevels[lvl] === true) {
                serverQ.unlockedLevels[lvl] = true;
              }
            }

            if (localQ.wrongWords && Array.isArray(localQ.wrongWords)) {
              serverQ.wrongWords = sanitizeWrongWords([...(serverQ.wrongWords || []), ...localQ.wrongWords]);
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
      // Đổi mật khẩu: Vô hiệu hóa mọi phiên cũ bằng sessionVersion
      // ══════════════════════════════════════════════════
      if (path === '/api/change-password' && method === 'POST') {
        const auth = await authenticateToken(request, kv);
        if (!auth) {
          return jsonResponse({ error: 'Chưa đăng nhập' }, 401, request);
        }

        const parsed = await readJsonBody(request);
        if (parsed.error) return jsonResponse({ error: parsed.error }, parsed.status, request);
        const { oldPassword, newPassword } = parsed.data;

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

        // Tăng sessionVersion để vô hiệu hóa tất cả session token cũ
        userData.sessionVersion = (userData.sessionVersion || 1) + 1;
        await kv.put(`user:${auth.username}`, JSON.stringify(userData));

        // Cấp session token mới cho phiên hiện tại
        const newToken = generateRandomHex(32);
        await kv.put(`session:${newToken}`, JSON.stringify({
          username: auth.username,
          sessionVersion: userData.sessionVersion,
          createdAt: Date.now()
        }), { expirationTtl: SESSION_TTL_SECONDS });

        // Xóa token cũ
        await kv.delete(`session:${auth.token}`);

        return jsonResponse({
          success: true,
          message: 'Đổi mật khẩu thành công! Tất cả phiên đăng nhập cũ đã được vô hiệu hóa.',
          token: newToken
        }, 200, request);
      }

      // ══════════════════════════════════════════════════
      // API: POST /api/reset-password
      // Đặt lại mật khẩu bằng Mã Khôi Phục (Recovery Code)
      // 5 lần mỗi 15 phút theo IP và theo username, vô hiệu hóa session cũ
      // ══════════════════════════════════════════════════
      if (path === '/api/reset-password' && method === 'POST') {
        const parsed = await readJsonBody(request);
        if (parsed.error) return jsonResponse({ error: parsed.error }, parsed.status, request);
        const body = parsed.data;
        let { username, recoveryCode, newPassword } = body;

        if (!username || !recoveryCode || !newPassword) {
          return jsonResponse({ error: 'Vui lòng điền đủ tên đăng nhập, mã khôi phục và mật khẩu mới' }, 400, request);
        }

        username = String(username).trim().toLowerCase();

        // Kiểm tra định dạng username bằng regex trước. KHÔNG ghi rate limit cho username sai định dạng!
        if (!/^[a-z0-9_]{3,20}$/.test(username)) {
          return jsonResponse({
            error: 'Tên đăng nhập phải từ 3 đến 20 ký tự, chỉ gồm chữ cái thường, số và dấu gạch dưới'
          }, 400, request);
        }

        // Kiểm tra rate limit theo IP
        const ipResetLimit = await checkRateLimit(kv, `reset:ip:${clientIp}`, MAX_RESET_ATTEMPTS);
        if (!ipResetLimit.allowed) {
          return jsonResponse({
            error: `IP của bạn đã thử khôi phục mật khẩu quá nhiều lần. Vui lòng chờ ${ipResetLimit.waitMinutes} phút!`
          }, 429, request);
        }

        // Kiểm tra rate limit theo username
        const userResetLimit = await checkRateLimit(kv, `reset:user:${username}`, MAX_RESET_ATTEMPTS);
        if (!userResetLimit.allowed) {
          return jsonResponse({
            error: `Tài khoản tạm thời bị khóa do nhiều lần thử đặt lại mật khẩu sai. Vui lòng chờ ${userResetLimit.waitMinutes} phút!`
          }, 429, request);
        }

        if (newPassword.length < 6 || newPassword.length > 64) {
          return jsonResponse({ error: 'Mật khẩu mới phải từ 6 đến 64 ký tự' }, 400, request);
        }

        const userRaw = await kv.get(`user:${username}`);
        if (!userRaw) {
          await recordRateLimit(kv, `reset:ip:${clientIp}`, MAX_RESET_ATTEMPTS, RESET_WINDOW_SECONDS);
          await recordRateLimit(kv, `reset:user:${username}`, MAX_RESET_ATTEMPTS, RESET_WINDOW_SECONDS);
          return jsonResponse({ error: 'Không tìm thấy tài khoản với tên đăng nhập này' }, 404, request);
        }

        const userData = JSON.parse(userRaw);

        // Chuẩn hóa và so khớp mã khôi phục
        const cleanRecovery = String(recoveryCode).replace(/[^A-Za-z0-9]/g, '').toUpperCase();
        const inputRecoveryHash = await sha256Hex(cleanRecovery);

        if (inputRecoveryHash !== userData.recoveryHashHex) {
          await recordRateLimit(kv, `reset:ip:${clientIp}`, MAX_RESET_ATTEMPTS, RESET_WINDOW_SECONDS);
          await recordRateLimit(kv, `reset:user:${username}`, MAX_RESET_ATTEMPTS, RESET_WINDOW_SECONDS);
          return jsonResponse({ error: 'Mã khôi phục không hợp lệ!' }, 400, request);
        }

        // Thành công -> Xóa bộ đếm rate limit
        await clearRateLimit(kv, `reset:ip:${clientIp}`);
        await clearRateLimit(kv, `reset:user:${username}`);

        // Băm mật khẩu mới
        const { saltHex, hashHex } = await hashPassword(newPassword);
        userData.saltHex = saltHex;
        userData.hashHex = hashHex;

        // Tạo mã khôi phục mới để thay thế mã cũ đã dùng
        const newRecoveryCode = generateRecoveryCode();
        userData.recoveryHashHex = await sha256Hex(newRecoveryCode.replace(/-/g, '').toUpperCase());

        // Tăng sessionVersion để vô hiệu hóa toàn bộ session cũ
        userData.sessionVersion = (userData.sessionVersion || 1) + 1;
        await kv.put(`user:${username}`, JSON.stringify(userData));

        // Cấp session token mới với sessionVersion mới
        const token = generateRandomHex(32);
        await kv.put(`session:${token}`, JSON.stringify({
          username,
          sessionVersion: userData.sessionVersion,
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

        const parsed = await readJsonBody(request);
        if (parsed.error) return jsonResponse({ error: parsed.error }, parsed.status, request);
        const { password } = parsed.data;

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

      // ══════════════════════════════════════════════════
      // API: GET /api/leaderboard
      // Lấy Bảng Xếp Hạng tuần hiện tại (Top 50)
      // ══════════════════════════════════════════════════
      if (path === '/api/leaderboard' && method === 'GET') {
        const key = getWeeklyLeaderboardKey();
        const raw = await kv.get(key);
        let leaderboard = [];
        if (raw) {
          try { leaderboard = JSON.parse(raw); } catch (e) {}
        }
        return jsonResponse({
          success: true,
          weekKey: key.replace('leaderboard:', ''),
          leaderboard
        }, 200, request);
      }

      // ══════════════════════════════════════════════════
      // API: POST /api/leaderboard hoặc POST /api/leaderboard/submit
      // Ghi nhận điểm EXP vào Bảng Xếp Hạng tuần (tối đa 1 lần/60s/người)
      // ══════════════════════════════════════════════════
      if ((path === '/api/leaderboard' || path === '/api/leaderboard/submit') && method === 'POST') {
        const auth = await authenticateToken(request, kv);
        if (!auth) {
          return jsonResponse({ error: 'Chưa đăng nhập' }, 401, request);
        }

        // Giới hạn ghi tối đa mỗi 60 giây mỗi người
        const submitLimit = await checkRateLimit(kv, `lb_submit:${auth.username}`, 1);
        if (!submitLimit.allowed) {
          return jsonResponse({
            error: 'Vui lòng chờ ít nhất 60 giây trước khi cập nhật điểm xếp hạng tiếp theo!'
          }, 429, request);
        }

        const parsed = await readJsonBody(request);
        if (parsed.error) return jsonResponse({ error: parsed.error }, parsed.status, request);
        const rawPoints = (parsed.data.xp !== undefined) ? parsed.data.xp : parsed.data.score;

        if (typeof rawPoints !== 'number' || !Number.isFinite(rawPoints) || rawPoints < 0 || rawPoints > 10000000) {
          return jsonResponse({ error: 'Điểm EXP không hợp lệ' }, 400, request);
        }

        const key = getWeeklyLeaderboardKey();
        const raw = await kv.get(key);
        let list = [];
        if (raw) {
          try { list = JSON.parse(raw); } catch (e) {}
        }
        if (!Array.isArray(list)) list = [];

        const existingIdx = list.findIndex(item => item.username === auth.username);
        const userEntry = {
          username: auth.username,
          displayName: String(auth.userData.profile.displayName || auth.username).slice(0, 30),
          avatar: String(auth.userData.profile.avatar || '🦊').slice(0, 100),
          xp: Math.floor(rawPoints),
          updatedAt: Date.now()
        };

        if (existingIdx >= 0) {
          list[existingIdx].xp = Math.max(list[existingIdx].xp, userEntry.xp);
          list[existingIdx].displayName = userEntry.displayName;
          list[existingIdx].avatar = userEntry.avatar;
          list[existingIdx].updatedAt = userEntry.updatedAt;
        } else {
          list.push(userEntry);
        }

        // Sắp xếp giảm dần theo EXP và lấy top 50
        list.sort((a, b) => b.xp - a.xp);
        list = list.slice(0, 50);
        let userRank = null;
        list.forEach((item, idx) => {
          item.rank = idx + 1;
          if (item.username === auth.username) userRank = item.rank;
        });

        // Lưu vào MỘT khóa KV duy nhất của tuần
        await kv.put(key, JSON.stringify(list), { expirationTtl: 14 * 24 * 3600 });
        await recordRateLimit(kv, `lb_submit:${auth.username}`, 1, 60);

        return jsonResponse({
          success: true,
          myRank: userRank,
          leaderboard: list
        }, 200, request);
      }

      // Tuyến đường mặc định (404)
      return jsonResponse({ error: 'API endpoint không tồn tại' }, 404, request);

    } catch (err) {
      // Tuyệt đối không trả err.message ra ngoài
      return jsonResponse({
        error: 'Đã xảy ra lỗi máy chủ nội bộ. Vui lòng thử lại sau!'
      }, 500, request);
    }
  }
};
