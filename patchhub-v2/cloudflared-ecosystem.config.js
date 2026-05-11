/**
 * PM2 Ecosystem config for Cloudflare Tunnel (patchhub-v2)
 * Usage: pm2 start cloudflared-ecosystem.config.js
 */
module.exports = {
  apps: [
    {
      name: 'cloudflared-patchhub',
      script: './start-cloudflared.sh',
      cwd: '/home/patch_app/app.patchhub.solutions',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '256M',
      env: {
        NODE_ENV: 'production'
      },
      error_file: '/home/patch_app/.pm2/logs/cloudflared-patchhub-error.log',
      out_file: '/home/patch_app/.pm2/logs/cloudflared-patchhub-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss'
    }
  ]
};
