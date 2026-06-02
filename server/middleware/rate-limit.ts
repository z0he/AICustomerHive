import rateLimit from "express-rate-limit";

/**
 * Rate limiting middleware.
 *
 * Protects the API against abuse and runaway cost. The two things this guards
 * against on a single-instance deployment are (a) brute-force / credential
 * stuffing against auth, and (b) automated mass-registration to farm the free
 * welcome credits (which translate directly into paid OpenAI voice minutes).
 *
 * Keying is by client IP. In production `trust proxy` is set to 1 (see
 * setupAuth), so `req.ip` resolves to the real client behind Replit's proxy.
 * In development trust proxy is off and `req.ip` is the direct socket address,
 * which is also correct.
 *
 * NOTE: the default store is in-memory, so on a multi-instance (autoscale)
 * deployment each instance keeps its own counter and the effective limit is
 * (instances x max). That is an acceptable first line of defence; move to a
 * shared store (e.g. Redis) if we ever scale horizontally.
 */

const tooMany = (message: string) => ({
  standardHeaders: true as const, // emit RateLimit-* headers (incl. Retry-After)
  legacyHeaders: false as const,
  message: { message },
});

/**
 * General limiter for every /api route. Generous enough to never touch a real
 * dashboard's burst of requests on page load, tight enough to stop a runaway
 * client loop or a scraper.
 */
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 200,
  ...tooMany("Too many requests. Please slow down and try again shortly."),
});

/**
 * Strict limiter for login / Google sign-in. Forgiving of a few mistyped
 * passwords, but blocks credential-stuffing and brute force.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  ...tooMany("Too many sign-in attempts. Please wait a few minutes and try again."),
});

/**
 * Very strict limiter for registration. Legitimate signups from a single IP
 * are rare; this closes the free-credit-farming vector (each new org is granted
 * welcome credits that can be spent on AI/voice).
 */
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  ...tooMany("Too many accounts created from this network. Please try again later."),
});
