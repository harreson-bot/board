/**
 * DM Rate Limiter for PatchHub
 * Platform-aware rate limiting with randomization
 * Prevents platform detection by randomizing message intervals
 */

const PLATFORM_LIMITS = {
  instagram: {
    msgsPerHour: { min: 4, max: 8 },
    dailyLimit: 120,
    delayBetweenMs: { min: 400, max: 900 }
  },
  facebook: {
    msgsPerHour: { min: 3, max: 6 },
    dailyLimit: 100,
    delayBetweenMs: { min: 500, max: 1200 }
  },
  tiktok: {
    msgsPerHour: { min: 5, max: 9 },
    dailyLimit: 150,
    delayBetweenMs: { min: 350, max: 800 }
  },
  linkedin: {
    msgsPerHour: { min: 3, max: 5 },
    dailyLimit: 80,
    delayBetweenMs: { min: 600, max: 1200 }
  }
};

// In-memory tracking (use Redis in production)
const rateLimitStore = {};

/**
 * Initialize rate limit tracking for a partner
 */
function initPartnerTracking(partnerId) {
  if (!rateLimitStore[partnerId]) {
    rateLimitStore[partnerId] = {
      today: new Date().toDateString(),
      platforms: {
        instagram: { sent: 0, lastSentTime: 0, hourly: {} },
        facebook: { sent: 0, lastSentTime: 0, hourly: {} },
        tiktok: { sent: 0, lastSentTime: 0, hourly: {} },
        linkedin: { sent: 0, lastSentTime: 0, hourly: {} }
      }
    };
  }

  // Reset daily counters if new day
  const today = new Date().toDateString();
  if (rateLimitStore[partnerId].today !== today) {
    rateLimitStore[partnerId].today = today;
    Object.keys(rateLimitStore[partnerId].platforms).forEach(platform => {
      rateLimitStore[partnerId].platforms[platform].sent = 0;
      rateLimitStore[partnerId].platforms[platform].hourly = {};
    });
  }
}

/**
 * Check if message can be sent on platform
 * Returns: { allowed: boolean, reason?: string, nextAllowedMs?: number }
 */
function canSend(partnerId, platform) {
  if (!PLATFORM_LIMITS[platform]) {
    return { allowed: false, reason: 'Unknown platform' };
  }

  initPartnerTracking(partnerId);

  const tracking = rateLimitStore[partnerId].platforms[platform];
  const limits = PLATFORM_LIMITS[platform];
  const now = Date.now();

  // Check daily limit
  if (tracking.sent >= limits.dailyLimit) {
    return {
      allowed: false,
      reason: `Daily limit (${limits.dailyLimit}) reached for ${platform}`
    };
  }

  // Check time since last message
  const timeSinceLastMs = now - tracking.lastSentTime;
  const minDelayMs = limits.delayBetweenMs.min;

  if (timeSinceLastMs < minDelayMs) {
    const nextAllowedMs = tracking.lastSentTime + minDelayMs;
    return {
      allowed: false,
      reason: `Rate limit: wait ${Math.ceil((nextAllowedMs - now) / 1000)}s`,
      nextAllowedMs
    };
  }

  // Check hourly limit
  const currentHour = Math.floor(now / 3600000);
  tracking.hourly[currentHour] = (tracking.hourly[currentHour] || 0) + 1;

  const hourlyMax = limits.msgsPerHour.max;
  if (tracking.hourly[currentHour] > hourlyMax) {
    return {
      allowed: false,
      reason: `Hourly limit (${hourlyMax}) exceeded for ${platform}`
    };
  }

  return { allowed: true };
}

/**
 * Record a message send
 */
function recordSend(partnerId, platform) {
  initPartnerTracking(partnerId);
  const tracking = rateLimitStore[partnerId].platforms[platform];
  tracking.sent++;
  tracking.lastSentTime = Date.now();
}

/**
 * Get random delay before sending next message
 * Randomizes to avoid detection patterns
 */
function getRandomDelay(platform) {
  const limits = PLATFORM_LIMITS[platform];
  const min = limits.delayBetweenMs.min;
  const max = limits.delayBetweenMs.max;
  return Math.random() * (max - min) + min;
}

/**
 * Randomize contact queue (shuffle)
 * Sends messages in random order, not sequential
 */
function randomizeContactQueue(contacts) {
  const shuffled = [...contacts];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Get platform-specific hourly limit with randomization
 */
function getRandomHourlyLimit(platform) {
  const limits = PLATFORM_LIMITS[platform].msgsPerHour;
  const min = limits.min;
  const max = limits.max;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Get compliance metrics for a partner
 */
function getMetrics(partnerId) {
  if (!rateLimitStore[partnerId]) {
    return null;
  }

  const tracking = rateLimitStore[partnerId];
  const metrics = {
    date: tracking.today,
    platforms: {}
  };

  Object.keys(tracking.platforms).forEach(platform => {
    const platformData = tracking.platforms[platform];
    metrics.platforms[platform] = {
      sent: platformData.sent,
      dailyLimit: PLATFORM_LIMITS[platform].dailyLimit,
      utilizationPercent: Math.round((platformData.sent / PLATFORM_LIMITS[platform].dailyLimit) * 100),
      hourlyStats: Object.entries(platformData.hourly).reduce((acc, [hour, count]) => {
        acc[hour] = count;
        return acc;
      }, {})
    };
  });

  return metrics;
}

/**
 * Express middleware for DM sending endpoints
 */
function dmRateLimitMiddleware(req, res, next) {
  req.dmLimiter = {
    canSend,
    recordSend,
    getRandomDelay,
    randomizeContactQueue,
    getRandomHourlyLimit,
    getMetrics
  };
  next();
}

module.exports = {
  dmRateLimitMiddleware,
  canSend,
  recordSend,
  getRandomDelay,
  randomizeContactQueue,
  getRandomHourlyLimit,
  getMetrics,
  PLATFORM_LIMITS
};
