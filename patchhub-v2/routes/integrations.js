/**
 * PatchHub v2 - Social Integrations Routes
 * Placeholder endpoints for Facebook, Instagram, TikTok, Twitter/X
 * OAuth flow stubs ready for real API credentials
 */
const express = require('express');
const router = express.Router();
const { verifyToken } = require('./auth');
const { get, all, run } = require('../database');

const SUPPORTED_PLATFORMS = ['instagram', 'facebook', 'tiktok', 'twitter'];

const PLATFORM_INFO = {
  instagram: {
    name: 'Instagram',
    icon: '📷',
    auth_type: 'oauth2',
    scopes: ['instagram_basic', 'instagram_manage_messages', 'pages_manage_metadata'],
    docs: 'https://developers.facebook.com/docs/instagram-api',
    status: 'available', // ready for OAuth when credentials provided
  },
  facebook: {
    name: 'Facebook',
    icon: '👤',
    auth_type: 'oauth2',
    scopes: ['pages_messaging', 'pages_manage_metadata', 'pages_read_engagement'],
    docs: 'https://developers.facebook.com/docs/messenger-platform',
    status: 'available',
  },
  tiktok: {
    name: 'TikTok',
    icon: '🎵',
    auth_type: 'oauth2',
    scopes: ['user.info.basic', 'message.send'],
    docs: 'https://developers.tiktok.com/doc/login-kit-web',
    status: 'coming_soon',
  },
  twitter: {
    name: 'Twitter / X',
    icon: '🐦',
    auth_type: 'oauth2',
    scopes: ['dm.read', 'dm.write', 'tweet.read', 'users.read'],
    docs: 'https://developer.twitter.com/en/docs/twitter-api/direct-messages',
    status: 'available',
  },
};

// ─── Routes ───────────────────────────────────────────────────────────────────

/**
 * GET /api/integrations
 * List all platforms + connection status for this partner
 */
router.get('/', verifyToken, async (req, res) => {
  try {
    const connected = await all(
      'SELECT platform, platform_username, status, connected_at, token_expires_at FROM social_integrations WHERE partner_id = $1',
      [req.partnerId]
    );

    const connectedMap = {};
    for (const c of connected) connectedMap[c.platform] = c;

    const platforms = SUPPORTED_PLATFORMS.map(p => ({
      platform: p,
      ...PLATFORM_INFO[p],
      connected: !!connectedMap[p],
      connection: connectedMap[p] || null,
    }));

    res.json(platforms);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch integrations' });
  }
});

/**
 * GET /api/integrations/:platform
 * Get details for one platform
 */
router.get('/:platform', verifyToken, async (req, res) => {
  const { platform } = req.params;
  if (!SUPPORTED_PLATFORMS.includes(platform)) {
    return res.status(404).json({ error: `Platform ${platform} not supported` });
  }

  const info = PLATFORM_INFO[platform];

  const connection = await get(
    'SELECT * FROM social_integrations WHERE partner_id = $1 AND platform = $2',
    [req.partnerId, platform]
  );

  res.json({
    platform,
    ...info,
    connected: !!connection,
    connection: connection ? {
      platform_username: connection.platform_username,
      status: connection.status,
      connected_at: connection.connected_at,
      token_expires_at: connection.token_expires_at,
      scopes: connection.scopes,
    } : null,
  });
});

/**
 * GET /api/integrations/:platform/oauth/start
 * Start OAuth flow — returns authorization URL
 * (Placeholder: real OAuth URLs require app credentials in .env)
 */
router.get('/:platform/oauth/start', verifyToken, async (req, res) => {
  const { platform } = req.params;
  if (!SUPPORTED_PLATFORMS.includes(platform)) {
    return res.status(404).json({ error: 'Platform not supported' });
  }

  const info = PLATFORM_INFO[platform];
  if (info.status === 'coming_soon') {
    return res.status(503).json({
      error: `${info.name} integration is coming soon`,
      status: 'coming_soon'
    });
  }

  // OAuth URL builders — requires env vars set per platform
  const baseRedirect = process.env.OAUTH_REDIRECT_BASE || 'https://app.patchhub.solutions';

  let authUrl;
  const state = Buffer.from(JSON.stringify({ partnerId: req.partnerId, platform })).toString('base64');

  switch (platform) {
    case 'instagram':
    case 'facebook':
      const fbAppId = process.env.FACEBOOK_APP_ID;
      if (!fbAppId) {
        return res.json({
          status: 'not_configured',
          message: 'FACEBOOK_APP_ID not set in .env — contact admin to enable',
          docs: 'https://developers.facebook.com/apps'
        });
      }
      authUrl = `https://www.facebook.com/v18.0/dialog/oauth?`
        + `client_id=${fbAppId}`
        + `&redirect_uri=${encodeURIComponent(`${baseRedirect}/api/integrations/${platform}/oauth/callback`)}`
        + `&scope=${encodeURIComponent(info.scopes.join(','))}`
        + `&state=${encodeURIComponent(state)}`;
      break;

    case 'twitter':
      const twClientId = process.env.TWITTER_CLIENT_ID;
      if (!twClientId) {
        return res.json({
          status: 'not_configured',
          message: 'TWITTER_CLIENT_ID not set in .env — contact admin to enable',
          docs: 'https://developer.twitter.com/en/portal/dashboard'
        });
      }
      authUrl = `https://twitter.com/i/oauth2/authorize?`
        + `response_type=code`
        + `&client_id=${twClientId}`
        + `&redirect_uri=${encodeURIComponent(`${baseRedirect}/api/integrations/twitter/oauth/callback`)}`
        + `&scope=${encodeURIComponent(info.scopes.join(' '))}`
        + `&state=${encodeURIComponent(state)}`
        + `&code_challenge=challenge&code_challenge_method=plain`;
      break;

    default:
      return res.status(501).json({ error: 'OAuth not yet implemented for this platform' });
  }

  res.json({ auth_url: authUrl, platform, state });
});

/**
 * GET /api/integrations/:platform/oauth/callback
 * OAuth callback handler — exchanges code for token
 */
router.get('/:platform/oauth/callback', async (req, res) => {
  const { platform } = req.params;
  const { code, state, error } = req.query;

  if (error) {
    return res.redirect(`/dashboard?integration_error=${encodeURIComponent(error)}&platform=${platform}`);
  }

  try {
    const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
    const { partnerId } = stateData;

    // TODO: Exchange code for access token (platform-specific)
    // This is the real OAuth token exchange — needs client_secret from .env
    // For now, store a placeholder record

    await run(
      `INSERT INTO social_integrations (partner_id, platform, status, metadata)
       VALUES ($1, $2, 'active', $3)
       ON CONFLICT (partner_id, platform) DO UPDATE SET status = 'active', updated_at = NOW()`,
      [partnerId, platform, JSON.stringify({ code_received: true, callback_at: new Date().toISOString() })]
    );

    res.redirect(`/dashboard?integration_success=true&platform=${platform}`);
  } catch (err) {
    console.error('OAuth callback error:', err);
    res.redirect(`/dashboard?integration_error=callback_failed&platform=${platform}`);
  }
});

/**
 * POST /api/integrations/:platform/connect
 * Manual token connection (for testing / direct API key entry)
 */
router.post('/:platform/connect', verifyToken, async (req, res) => {
  const { platform } = req.params;
  if (!SUPPORTED_PLATFORMS.includes(platform)) {
    return res.status(404).json({ error: 'Platform not supported' });
  }

  const { access_token, refresh_token, platform_username, platform_user_id, scopes } = req.body;

  if (!access_token) {
    return res.status(400).json({ error: 'access_token required' });
  }

  await run(
    `INSERT INTO social_integrations
       (partner_id, platform, access_token, refresh_token, platform_username, platform_user_id, scopes, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')
     ON CONFLICT (partner_id, platform) DO UPDATE SET
       access_token = EXCLUDED.access_token,
       refresh_token = EXCLUDED.refresh_token,
       platform_username = EXCLUDED.platform_username,
       platform_user_id = EXCLUDED.platform_user_id,
       scopes = EXCLUDED.scopes,
       status = 'active',
       updated_at = NOW()`,
    [req.partnerId, platform, access_token, refresh_token || null,
     platform_username || null, platform_user_id || null, scopes || []]
  );

  res.json({ success: true, platform, message: `${platform} connected` });
});

/**
 * DELETE /api/integrations/:platform/disconnect
 */
router.delete('/:platform/disconnect', verifyToken, async (req, res) => {
  const { platform } = req.params;

  await run(
    `UPDATE social_integrations SET status = 'disconnected', access_token = NULL, refresh_token = NULL
     WHERE partner_id = $1 AND platform = $2`,
    [req.partnerId, platform]
  );

  res.json({ success: true, platform, message: `${platform} disconnected` });
});

/**
 * POST /api/integrations/:platform/send-dm
 * Send a single DM via platform (stub — real sending requires live OAuth token)
 */
router.post('/:platform/send-dm', verifyToken, async (req, res) => {
  const { platform } = req.params;
  const { recipient_id, message } = req.body;

  if (!recipient_id || !message) {
    return res.status(400).json({ error: 'recipient_id and message required' });
  }

  const integration = await get(
    'SELECT * FROM social_integrations WHERE partner_id = $1 AND platform = $2 AND status = $3',
    [req.partnerId, platform, 'active']
  );

  if (!integration) {
    return res.status(400).json({ error: `${platform} not connected. Connect first via /api/integrations/${platform}/oauth/start` });
  }

  // Stub: real API call per platform
  // Instagram: POST /v18.0/{ig-user-id}/messages
  // Facebook: POST /v18.0/me/messages
  // Twitter: POST /2/dm_conversations/with/:participant_id/messages
  // TikTok: POST /v2/dm/send/

  console.log(`[STUB] Would send DM via ${platform} to ${recipient_id}: ${message.substring(0, 50)}`);

  // Log the send attempt
  await run(
    `INSERT INTO engagement_logs (partner_id, event_type, platform, direction, body, metadata)
     VALUES ($1, 'dm_sent', $2, 'outbound', $3, $4)`,
    [req.partnerId, platform, message, JSON.stringify({ recipient_id, stub: true })]
  );

  res.json({
    success: true,
    platform,
    recipient_id,
    status: 'stub_sent',
    message: `DM would be sent via ${platform} in production (stub mode)`
  });
});

/**
 * GET /api/integrations/stats/all
 */
router.get('/stats/all', verifyToken, async (req, res) => {
  try {
    const connected = await all(
      `SELECT platform, platform_username, status, connected_at
       FROM social_integrations WHERE partner_id = $1`,
      [req.partnerId]
    );

    const dmStats = await all(
      `SELECT platform, COUNT(*) as total_sent
       FROM engagement_logs WHERE partner_id = $1 AND event_type = 'dm_sent'
       GROUP BY platform`,
      [req.partnerId]
    );

    res.json({ connected_platforms: connected, dm_stats: dmStats });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get integration stats' });
  }
});

module.exports = router;
