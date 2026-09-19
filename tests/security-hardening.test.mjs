import test from "node:test";
import assert from "node:assert/strict";
import { encryptToken, decryptToken, isEncrypted } from "../packages/database/src/CryptoHelper.js";
import { GitUpdateManager } from "../packages/core/src/GitUpdateManager.js";
import { authenticateDashboard, createRateLimiter, hashPassword, verifyPassword, generateSalt, createSessionToken, getSession, invalidateSession, checkBruteForceLock, recordFailedLogin, resetFailedLogins, createTemp2faToken, getTemp2faSession, invalidateTemp2faToken } from "../apps/dashboard-v2/src/middleware/auth.js";
import { SqliteModel } from "../packages/database/src/SqliteDriver.js";
import { SecurityHelper } from "../packages/core/src/SecurityHelper.js";
import { TotpHelper } from "../packages/core/src/TotpHelper.js";
import { WebhookLogger } from "../packages/core/src/WebhookLogger.js";
import { SecurityAuditLog } from "../packages/database/src/models/SecurityAuditLog.js";
import { createSecurityHeadersMiddleware, createCsrfProtectionMiddleware } from "../apps/dashboard-v2/src/middleware/securityHeaders.js";

test("Token encryption and decryption cycle works with AES-256-GCM", () => {
  const secretKey = "test_secret_key_1234567890123456";
  const rawToken = "MTEyMjMzNDQ1NQ.GgGgGg.SampleDiscordTokenValue123";

  const encrypted = encryptToken(rawToken, secretKey);
  assert.notEqual(encrypted, rawToken);
  assert.ok(isEncrypted(encrypted));
  assert.ok(encrypted.startsWith("enc:v1:"));

  const doubleEncrypted = encryptToken(encrypted, secretKey);
  assert.equal(doubleEncrypted, encrypted);

  const decrypted = decryptToken(encrypted, secretKey);
  assert.equal(decrypted, rawToken);

  const plainPassthrough = decryptToken("plain_token_without_prefix", secretKey);
  assert.equal(plainPassthrough, "plain_token_without_prefix");

  const tampered = "enc:v1:0123456789abcdef:0123456789abcdef:deadbeef";
  const tamperedResult = decryptToken(tampered, secretKey);
  assert.equal(tamperedResult, tampered);
});

test("GitUpdateManager validates branch names against shell injection", () => {
  assert.equal(GitUpdateManager.isValidBranch("main"), true);
  assert.equal(GitUpdateManager.isValidBranch("feature/dashboard-v2"), true);
  assert.equal(GitUpdateManager.isValidBranch("release_1.0.0"), true);
  assert.equal(GitUpdateManager.isValidBranch("hotfix-auth-2026.09"), true);

  assert.equal(GitUpdateManager.isValidBranch("main; rm -rf /"), false);
  assert.equal(GitUpdateManager.isValidBranch("main && echo hacked"), false);
  assert.equal(GitUpdateManager.isValidBranch("main | cat /etc/passwd"), false);
  assert.equal(GitUpdateManager.isValidBranch("`whoami`"), false);
  assert.equal(GitUpdateManager.isValidBranch("$(reboot)"), false);
  assert.equal(GitUpdateManager.isValidBranch(""), false);
  assert.equal(GitUpdateManager.isValidBranch(null), false);
});

test("GitUpdateManager validates backup names against path traversal", () => {
  assert.equal(GitUpdateManager.isValidBackupName("backup-2026-09-19-12-00-00"), true);
  assert.equal(GitUpdateManager.isValidBackupName("backup_initial_v2"), true);
  assert.equal(GitUpdateManager.isValidBackupName("daily.backup.1"), true);

  assert.equal(GitUpdateManager.isValidBackupName("../../../etc/passwd"), false);
  assert.equal(GitUpdateManager.isValidBackupName("..\\..\\windows\\system32"), false);
  assert.equal(GitUpdateManager.isValidBackupName("backup/folder"), false);
  assert.equal(GitUpdateManager.isValidBackupName("backup\\folder"), false);
  assert.equal(GitUpdateManager.isValidBackupName(""), false);
});

test("Dashboard Auth middleware permits public routes and blocks unauthorized access", () => {
  let publicNextCalled = false;
  const reqPublic = { path: "/api/health", headers: {} };
  const resPublic = {};
  authenticateDashboard(reqPublic, resPublic, () => {
    publicNextCalled = true;
  });
  assert.equal(publicNextCalled, true);

  let status401Received = 0;
  let jsonResponse = null;
  const mockRes = {
    status: (code) => {
      status401Received = code;
      return {
        json: (data) => {
          jsonResponse = data;
        }
      };
    }
  };

  const reqUnauthorized = {
    path: "/api/bot-fleet",
    headers: {}
  };
  authenticateDashboard(reqUnauthorized, mockRes, () => {
    assert.fail("Yetkisiz istekte next() çağrılmamalıdır");
  });
  assert.equal(status401Received, 401);
  assert.equal(jsonResponse?.success, false);

  const currentSecret = process.env.DASHBOARD_SECRET || "public-ecosystem-secret-key";
  let authorizedBearerCalled = false;
  const reqAuthorizedBearer = {
    path: "/api/bot-fleet",
    headers: { authorization: `Bearer ${currentSecret}` }
  };
  authenticateDashboard(reqAuthorizedBearer, mockRes, () => {
    authorizedBearerCalled = true;
  });
  assert.equal(authorizedBearerCalled, true);

  let authorizedHeaderCalled = false;
  const reqAuthorizedHeader = {
    path: "/api/bot-credentials",
    headers: { "x-dashboard-key": currentSecret }
  };
  authenticateDashboard(reqAuthorizedHeader, mockRes, () => {
    authorizedHeaderCalled = true;
  });
  assert.equal(authorizedHeaderCalled, true);
});

test("Rate limiter restricts excessive requests", () => {
  const limiter = createRateLimiter({ windowMs: 10000, maxRequests: 3, message: "Limit aşıldı" });
  const ip = "192.168.1.100";
  const req = { ip, headers: {}, socket: { remoteAddress: ip } };

  let statusCode = 200;
  const res = {
    setHeader: () => {},
    status: (code) => {
      statusCode = code;
      return { json: () => {} };
    }
  };

  let nextCalls = 0;
  const next = () => { nextCalls++; };

  limiter(req, res, next);
  limiter(req, res, next);
  limiter(req, res, next);
  assert.equal(nextCalls, 3);
  assert.equal(statusCode, 200);

  limiter(req, res, next);
  assert.equal(statusCode, 429);
  assert.equal(nextCalls, 3);
});

test("SqliteDriver sanitizes dynamic field names against SQL injection and prototype pollution", () => {
  const model = new SqliteModel("UserAccount", { db: null });
  const { whereSql, params } = model.buildWhereClause({
    "wallet; DROP TABLE guildconfigs; --": "injection",
    xp: 1500,
    __proto__: "polluted",
    constructor: "polluted"
  });

  assert.ok(!whereSql.includes("DROP TABLE"));
  assert.ok(!whereSql.includes("__proto__"));
  assert.ok(!whereSql.includes("constructor"));
  assert.ok(whereSql.includes("xp"));
  assert.ok(params.includes(1500));

  const orResult = model.buildWhereClause({
    $or: [
      { "malicious'key": "bad", points: 250 }
    ]
  });

  assert.ok(!orResult.whereSql.includes("malicious'key"));
  assert.ok(orResult.whereSql.includes("points"));
});

test("Password hashing with scrypt and salt produces secure non-invertible hashes", () => {
  const salt = generateSalt();
  const rawPass = "SuperSecretAdminPass123!";
  const hash = hashPassword(rawPass, salt);

  assert.ok(hash.length >= 64);
  assert.notEqual(hash, rawPass);
  assert.equal(verifyPassword(rawPass, salt, hash), true);
  assert.equal(verifyPassword("WrongPassword123!", salt, hash), false);
  assert.equal(verifyPassword(rawPass, generateSalt(), hash), false);
});

test("Session token lifecycle manages creation, retrieval, and invalidation", () => {
  const user = { username: "superadmin", role: "SUPERADMIN" };
  const { token, expiresAt } = createSessionToken(user, 10000);

  assert.ok(token.length >= 32);
  assert.ok(expiresAt > Date.now());

  const retrieved = getSession(token);
  assert.equal(retrieved?.username, "superadmin");
  assert.equal(retrieved?.role, "SUPERADMIN");

  invalidateSession(token);
  assert.equal(getSession(token), null);
});

test("Brute force defense locks out after 5 consecutive failed attempts", () => {
  const testIp = "10.99.88.77";
  resetFailedLogins(testIp);

  for (let i = 1; i <= 4; i++) {
    const res = recordFailedLogin(testIp, 5, 60000);
    assert.equal(res.locked, false);
    assert.equal(res.remainingAttempts, 5 - i);
  }

  const fifthRes = recordFailedLogin(testIp, 5, 60000);
  assert.equal(fifthRes.locked, true);

  const lockCheck = checkBruteForceLock(testIp);
  assert.equal(lockCheck.locked, true);
  assert.ok(lockCheck.remainingMs > 0);

  resetFailedLogins(testIp);
  assert.equal(checkBruteForceLock(testIp).locked, false);
});

test("SecurityHelper validates Discord webhook URLs and rejects SSRF targets", () => {
  assert.equal(
    SecurityHelper.isValidDiscordWebhookUrl("https://discord.com/api/webhooks/123456789/abcdefghijk"),
    true
  );
  assert.equal(
    SecurityHelper.isValidDiscordWebhookUrl("https://canary.discord.com/api/webhooks/987654321/xyz123"),
    true
  );

  assert.equal(SecurityHelper.isValidDiscordWebhookUrl("http://discord.com/api/webhooks/123/abc"), false);
  assert.equal(SecurityHelper.isValidDiscordWebhookUrl("https://evil-site.com/api/webhooks/123/abc"), false);
  assert.equal(SecurityHelper.isValidDiscordWebhookUrl("https://127.0.0.1/api/webhooks/123/abc"), false);
  assert.equal(SecurityHelper.isValidDiscordWebhookUrl("https://169.254.169.254/latest/meta-data"), false);
  assert.equal(SecurityHelper.isValidDiscordWebhookUrl("https://localhost/api/webhooks/123/abc"), false);
  assert.equal(SecurityHelper.isValidDiscordWebhookUrl("javascript:alert(1)"), false);
  assert.equal(SecurityHelper.isValidDiscordWebhookUrl(""), false);
  assert.equal(SecurityHelper.isValidDiscordWebhookUrl(null), false);
});

test("Security headers middleware attaches strict enterprise HTTP headers", () => {
  const middleware = createSecurityHeadersMiddleware();
  const headers = {};
  const mockReq = { secure: true, headers: {} };
  const mockRes = {
    setHeader: (k, v) => {
      headers[k] = v;
    }
  };

  let nextCalled = false;
  middleware(mockReq, mockRes, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(headers["X-Frame-Options"], "DENY");
  assert.equal(headers["X-Content-Type-Options"], "nosniff");
  assert.equal(headers["Referrer-Policy"], "strict-origin-when-cross-origin");
  assert.equal(headers["Strict-Transport-Security"], "max-age=31536000; includeSubDomains; preload");
  assert.ok(headers["Content-Security-Policy"].includes("default-src 'self'"));
});

test("SecurityHelper redacts sensitive tokens, passwords, and secrets from log strings", () => {
  const encSample = "Database token loaded: enc:v1:0123456789abcdef:0123456789abcdef:deadbeef1234";
  const redactedEnc = SecurityHelper.redactSensitiveData(encSample);
  assert.ok(!redactedEnc.includes("deadbeef1234"));
  assert.ok(redactedEnc.includes("***ENCRYPTED_TOKEN***"));

  const rawDiscordSample = "Connecting with Bot MTEyMjMzNDQ1NQ.GgGgGg.SampleDiscordTokenValue123 to gateway";
  const redactedDiscord = SecurityHelper.redactSensitiveData(rawDiscordSample);
  assert.ok(!redactedDiscord.includes("SampleDiscordTokenValue123"));
  assert.ok(redactedDiscord.includes("***DISCORD_TOKEN***"));

  const mongoSample = "Connecting to mongodb+srv://botadmin:SuperSecretDbPass999@cluster0.abcde.mongodb.net/test";
  const redactedMongo = SecurityHelper.redactSensitiveData(mongoSample);
  assert.ok(!redactedMongo.includes("SuperSecretDbPass999"));
  assert.ok(redactedMongo.includes("***REDACTED_PASSWORD***"));
});

test("SecurityHelper validates password complexity and blocks weak passwords", () => {
  const weakShort = SecurityHelper.validatePasswordComplexity("Ab1!");
  assert.equal(weakShort.valid, false);

  const weakNoNumber = SecurityHelper.validatePasswordComplexity("Abcdefghij");
  assert.equal(weakNoNumber.valid, false);

  const weakNoUpper = SecurityHelper.validatePasswordComplexity("abcdefgh123");
  assert.equal(weakNoUpper.valid, false);

  const weakCommon = SecurityHelper.validatePasswordComplexity("password123");
  assert.equal(weakCommon.valid, false);

  const strongPass = SecurityHelper.validatePasswordComplexity("GucluVeGecerli123!");
  assert.equal(strongPass.valid, true);
});

test("CSRF protection middleware blocks cross-origin state-changing requests", () => {
  const csrf = createCsrfProtectionMiddleware();

  let nextCalledGet = false;
  csrf({ method: "GET", headers: { origin: "http://attacker.com", host: "localhost:3001" } }, {}, () => {
    nextCalledGet = true;
  });
  assert.equal(nextCalledGet, true);

  let nextCalledSameOrigin = false;
  csrf({ method: "POST", headers: { origin: "http://localhost:3001", host: "localhost:3001" } }, {}, () => {
    nextCalledSameOrigin = true;
  });
  assert.equal(nextCalledSameOrigin, true);

  let statusReceived = 0;
  const mockRes = {
    status: (code) => {
      statusReceived = code;
      return { json: () => {} };
    }
  };
  csrf({ method: "POST", headers: { origin: "http://malicious-website.com", host: "localhost:3001" } }, mockRes, () => {
    assert.fail("Cross-origin POST engellenmeliydi");
  });
  assert.equal(statusReceived, 403);
});

test("WebhookLogger rejects SSRF and invalid webhook URLs safely", async () => {
  const badResult = await WebhookLogger.sendAlert("http://169.254.169.254/latest/meta-data", { title: "Test" });
  assert.equal(badResult, false);

  const nullResult = await WebhookLogger.sendAlert(null, { title: "Test" });
  assert.equal(nullResult, false);

  const localResult = await WebhookLogger.sendAlert("http://localhost:3000/webhook", { title: "Test" });
  assert.equal(localResult, false);
});

test("TotpHelper produces RFC 6238 compliant secrets and verifies codes accurately", () => {
  const secret = TotpHelper.generateSecret(16);
  assert.ok(typeof secret === "string");
  assert.ok(secret.length >= 16);
  assert.match(secret, /^[A-Z2-7]+$/);

  const code = TotpHelper.generateTotp(secret);
  assert.ok(typeof code === "string");
  assert.equal(code.length, 6);
  assert.match(code, /^[0-9]{6}$/);

  const isValid = TotpHelper.verifyTotp(secret, code);
  assert.equal(isValid, true);

  const isInvalid = TotpHelper.verifyTotp(secret, "999999");
  assert.equal(isInvalid, false);

  const otpUrl = TotpHelper.getOtpAuthUrl("admin", secret, "BotForEveryone");
  assert.ok(otpUrl.startsWith("otpauth://totp/"));
  assert.ok(otpUrl.includes("secret=" + secret));
});

test("SecurityHelper encryptAesGcm and decryptAesGcm works correctly", () => {
  const secretKey = "super_secure_enterprise_key_2026";
  const plainText = "CokGizliSistemKonfigurasyonu123!";

  const encrypted = SecurityHelper.encryptAesGcm(plainText, secretKey);
  assert.ok(Buffer.isBuffer(encrypted));
  assert.ok(encrypted.length > plainText.length);

  const decrypted = SecurityHelper.decryptAesGcm(encrypted, secretKey);
  assert.equal(decrypted.toString("utf8"), plainText);

  assert.throws(() => {
    SecurityHelper.decryptAesGcm(encrypted, "wrong_secret_key_wrong_secret_32");
  });
});

test("2FA temporary session lifecycle operates safely", () => {
  const tempToken = createTemp2faToken({ username: "superadmin", role: "SUPERADMIN" });
  assert.ok(typeof tempToken === "string");
  assert.ok(tempToken.length > 20);

  const session = getTemp2faSession(tempToken);
  assert.ok(session);
  assert.equal(session.username, "superadmin");
  assert.equal(session.role, "SUPERADMIN");

  invalidateTemp2faToken(tempToken);
  const deadSession = getTemp2faSession(tempToken);
  assert.equal(deadSession, null);
});

test("SecurityAuditLog model is properly declared and available", () => {
  assert.ok(SecurityAuditLog);
  assert.ok(typeof SecurityAuditLog.create === "function" || typeof SecurityAuditLog.find === "function");
});
