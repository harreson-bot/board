/**
 * PM2 Ecosystem config for PatchHub v2
 * Usage: pm2 start ecosystem.config.js
 * Logs: pm2 logs patchhub-v2
 */
module.exports = {
  apps: [
    {
      name: 'patchhub-v2',
      script: 'server.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 8000,
      },
      error_file: '/home/patch_app/.pm2/logs/patchhub-v2-error.log',
      out_file: '/home/patch_app/.pm2/logs/patchhub-v2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss'
    }
  ]
};
