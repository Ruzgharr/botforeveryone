export function createSecurityHeadersMiddleware() {
  return (req, res, next) => {
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    res.setHeader("Permissions-Policy", "geolocation=(), microphone=(), camera=(), payment=()");
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: https: blob:; connect-src 'self' ws: wss:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
    );

    if (req.secure || req.headers["x-forwarded-proto"] === "https") {
      res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
    }

    next();
  };
}

export function configureSocketTimeouts(server) {
  if (!server) return;
  server.headersTimeout = 20000;
  server.requestTimeout = 30000;
  server.keepAliveTimeout = 5000;
}

export function createCsrfProtectionMiddleware() {
  const safeMethods = new Set(["GET", "HEAD", "OPTIONS"]);

  return (req, res, next) => {
    if (safeMethods.has(req.method)) {
      return next();
    }

    const origin = req.headers["origin"];
    const referer = req.headers["referer"];
    const host = req.headers["host"];

    if (!origin && !referer) {
      return next();
    }

    const checkUrl = origin || referer;
    try {
      const parsed = new URL(checkUrl);
      if (host && parsed.host === host) {
        return next();
      }

      const allowed = (process.env.ALLOWED_ORIGINS || "")
        .split(",")
        .map((o) => o.trim())
        .filter(Boolean);

      if (allowed.includes("*") || allowed.includes(parsed.origin) || allowed.length === 0) {
        return next();
      }
    } catch {
      return res.status(403).json({
        success: false,
        error: "CSRF doğrulaması başarısız: Geçersiz kaynak adresi."
      });
    }

    return res.status(403).json({
      success: false,
      error: "CSRF erişim engeli: Bu işlem harici bir kaynaktan tetiklenemez."
    });
  };
}

export function createForceHttpsMiddleware() {
  return (req, res, next) => {
    if (process.env.NODE_ENV === "production") {
      const isHttps = req.secure || req.headers["x-forwarded-proto"] === "https";
      if (!isHttps && req.headers.host) {
        return res.redirect(301, "https://" + req.headers.host + req.url);
      }
    }
    next();
  };
}
