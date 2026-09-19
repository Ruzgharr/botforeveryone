import crypto from "node:crypto";

function safeCompare(a, b) {
  if (typeof a !== "string" || typeof b !== "string") {
    return false;
  }
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) {
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

export function getExpectedSecret() {
  return process.env.DASHBOARD_SECRET || "public-ecosystem-secret-key";
}

export function hashPassword(password, salt) {
  if (!password || !salt) throw new Error("Parola ve tuz parametresi zorunludur.");
  return crypto.scryptSync(String(password), String(salt), 64).toString("hex");
}

export function verifyPassword(password, salt, expectedHash) {
  if (!password || !salt || !expectedHash) return false;
  const computed = hashPassword(password, salt);
  return safeCompare(computed, expectedHash);
}

export function generateSalt() {
  return crypto.randomBytes(16).toString("hex");
}

const sessions = new Map();

export function createSessionToken(userData, ttlMs = 86400000) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = Date.now() + ttlMs;
  sessions.set(token, { user: userData, expiresAt });
  return { token, expiresAt };
}

export function getSession(token) {
  if (!token || typeof token !== "string") return null;
  const session = sessions.get(token);
  if (!session) return null;
  if (Date.now() > session.expiresAt) {
    sessions.delete(token);
    return null;
  }
  return session.user;
}

export function invalidateSession(token) {
  if (token && typeof token === "string") {
    sessions.delete(token);
  }
}

const temp2faSessions = new Map();

export function createTemp2faToken(userData, ttlMs = 300000) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = Date.now() + ttlMs;
  temp2faSessions.set(token, { user: userData, expiresAt });
  return token;
}

export function getTemp2faSession(token) {
  if (!token || typeof token !== "string") return null;
  const session = temp2faSessions.get(token);
  if (!session) return null;
  if (Date.now() > session.expiresAt) {
    temp2faSessions.delete(token);
    return null;
  }
  return session.user;
}

export function invalidateTemp2faToken(token) {
  if (token && typeof token === "string") {
    temp2faSessions.delete(token);
  }
}

const bruteForceMap = new Map();

export function checkBruteForceLock(ip) {
  const key = String(ip || "127.0.0.1");
  const record = bruteForceMap.get(key);
  if (!record) return { locked: false };
  if (record.lockUntil && Date.now() < record.lockUntil) {
    const remainingMs = record.lockUntil - Date.now();
    return { locked: true, remainingMs };
  }
  if (record.lockUntil && Date.now() >= record.lockUntil) {
    bruteForceMap.delete(key);
    return { locked: false };
  }
  return { locked: false };
}

export function recordFailedLogin(ip, maxAttempts = 5, lockDurationMs = 900000) {
  const key = String(ip || "127.0.0.1");
  let record = bruteForceMap.get(key);
  if (!record) {
    record = { count: 0, lockUntil: null };
    bruteForceMap.set(key, record);
  }
  record.count++;
  if (record.count >= maxAttempts) {
    record.lockUntil = Date.now() + lockDurationMs;
    return { locked: true, remainingMs: lockDurationMs };
  }
  return { locked: false, remainingAttempts: maxAttempts - record.count };
}

export function resetFailedLogins(ip) {
  const key = String(ip || "127.0.0.1");
  bruteForceMap.delete(key);
}

export function authenticateDashboard(req, res, next) {
  const publicPaths = [
    "/api/health",
    "/api/auth/status",
    "/api/auth/setup-status",
    "/api/auth/setup",
    "/api/auth/login",
    "/api/auth/verify",
    "/api/auth/2fa/verify"
  ];

  if (publicPaths.includes(req.path)) {
    return next();
  }

  const expectedKey = getExpectedSecret();
  let providedToken = "";

  const authHeader = req.headers["authorization"];
  if (authHeader && typeof authHeader === "string") {
    if (authHeader.startsWith("Bearer ")) {
      providedToken = authHeader.slice(7).trim();
    } else {
      providedToken = authHeader.trim();
    }
  }

  if (!providedToken && req.headers["x-dashboard-key"]) {
    providedToken = String(req.headers["x-dashboard-key"]).trim();
  }

  if (!providedToken && req.headers["x-session-token"]) {
    providedToken = String(req.headers["x-session-token"]).trim();
  }

  if (!providedToken && req.query && (req.query.key || req.query.token)) {
    providedToken = String(req.query.key || req.query.token).trim();
  }

  if (providedToken) {
    const sessionUser = getSession(providedToken);
    if (sessionUser) {
      req.authenticated = true;
      req.sessionUser = sessionUser;
      return next();
    }

    if (safeCompare(providedToken, expectedKey)) {
      req.authenticated = true;
      req.isMasterKey = true;
      return next();
    }
  }

  return res.status(401).json({
    success: false,
    error: "Yetkisiz istek: Geçerli oturum belirteci veya anahtar bulunamadı."
  });
}

export function createRateLimiter({ windowMs = 60000, maxRequests = 100, message = "Çok fazla istek gönderildi. Lütfen bir süre sonra tekrar deneyin." } = {}) {
  const tracker = new Map();

  const cleanup = () => {
    const now = Date.now();
    for (const [ip, data] of tracker.entries()) {
      if (now > data.resetAt) {
        tracker.delete(ip);
      }
    }
  };

  const timer = setInterval(cleanup, windowMs);
  if (timer.unref) {
    timer.unref();
  }

  return (req, res, next) => {
    const ip = req.ip || req.socket.remoteAddress || "127.0.0.1";
    const now = Date.now();

    let record = tracker.get(ip);
    if (!record || now > record.resetAt) {
      record = { count: 1, resetAt: now + windowMs };
      tracker.set(ip, record);
    } else {
      record.count++;
    }

    const remaining = Math.max(0, maxRequests - record.count);
    res.setHeader("X-RateLimit-Limit", maxRequests);
    res.setHeader("X-RateLimit-Remaining", remaining);
    res.setHeader("X-RateLimit-Reset", Math.ceil(record.resetAt / 1000));

    if (record.count > maxRequests) {
      return res.status(429).json({
        success: false,
        error: message,
        retryAfterMs: Math.max(0, record.resetAt - now)
      });
    }

    next();
  };
}
