# PatchHub v2 — Deployment Guide

## Architecture

```
app.patchhub.solutions
  └── Cloudflare Tunnel → DreamHost VPS → Node.js (port 3001)
                                         → PostgreSQL (local)
```

## Prerequisites

- Node.js 18+
- PostgreSQL 14+
- PM2 (`npm install -g pm2`)
- Cloudflare tunnel configured for app.patchhub.solutions

## Step 1: Deploy Code

```bash
# SSH into DreamHost VPS (patch_app user)
ssh patch_app@vps48233.dreamhostps.com

# Create app directory
mkdir -p ~/patchhub-v2 && cd ~/patchhub-v2

# Upload files (from local machine):
# scp -r /path/to/patchhub-v2/* patch_app@vps48233.dreamhostps.com:~/patchhub-v2/

# Install dependencies
npm install --production
```

## Step 2: Configure PostgreSQL

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database and user
CREATE USER patchhub WITH PASSWORD 'your-strong-password-here';
CREATE DATABASE patchhub_v2 OWNER patchhub;
GRANT ALL PRIVILEGES ON DATABASE patchhub_v2 TO patchhub;
\q
```

## Step 3: Configure Environment

```bash
cd ~/patchhub-v2
cp .env.example .env
nano .env
```

Fill in:
```env
DATABASE_URL=postgresql://patchhub:your-strong-password@localhost:5432/patchhub_v2
JWT_SECRET=generate-with-openssl-rand-base64-64
PORT=3001
NODE_ENV=production
CORS_ORIGINS=https://app.patchhub.solutions
```

## Step 4: Initialize Database

```bash
node scripts/init-db.js
# Should print: ✅ Database initialized successfully!
```

## Step 5: Build Frontend

```bash
cd ~/patchhub-v2/frontend
npm install
npm run build
cd ..
# Built output is at frontend/dist/ — served by Express in production
```

## Step 6: Start with PM2

```bash
# Start app
pm2 start ecosystem.config.js

# Save PM2 config (survive reboots)
pm2 save
pm2 startup  # follow the instructions it prints

# Check status
pm2 status
pm2 logs patchhub-v2
```

## Step 7: Cloudflare Tunnel

Update your Cloudflare tunnel to route app.patchhub.solutions → localhost:3001

```bash
# In cloudflared config, add ingress rule:
# hostname: app.patchhub.solutions
# service: http://localhost:3001
```

## Step 8: Test

```bash
curl https://app.patchhub.solutions/health
# Should return: {"status":"ok","version":"2.0.0",...}

curl -X POST https://app.patchhub.solutions/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"password123"}'
# Returns JWT + auto-seeds 50 demo leads
```

## Optional: Social Integrations

Add to .env to enable OAuth flows:
```env
FACEBOOK_APP_ID=your_facebook_app_id
FACEBOOK_APP_SECRET=your_facebook_app_secret
TWITTER_CLIENT_ID=your_twitter_client_id
TWITTER_CLIENT_SECRET=your_twitter_client_secret
OAUTH_REDIRECT_BASE=https://app.patchhub.solutions
```

## Database Backup

```bash
# Daily backup cron (add to crontab):
# 0 2 * * * pg_dump postgresql://patchhub:password@localhost/patchhub_v2 > ~/backups/patchhub-$(date +%Y%m%d).sql

pg_dump $DATABASE_URL > ~/backups/patchhub-$(date +%Y%m%d).sql
```

## PM2 Commands

```bash
pm2 status                    # View all processes
pm2 logs patchhub-v2         # Tail logs
pm2 restart patchhub-v2      # Restart app
pm2 stop patchhub-v2         # Stop app
pm2 delete patchhub-v2       # Remove from PM2
```

## Troubleshooting

**DB connection refused:** Check PostgreSQL is running: `sudo systemctl status postgresql`

**Port already in use:** `lsof -i :3001` to find conflicting process

**CORS errors:** Verify `CORS_ORIGINS` in .env matches exact frontend URL

**Schema errors on startup:** Run `node scripts/init-db.js` to re-initialize

## File Structure

```
patchhub-v2/
├── server.js              # Express app entry point
├── database.js            # PostgreSQL pool + schema init
├── ecosystem.config.js    # PM2 config
├── routes/
│   ├── auth.js            # Signup, login, JWT middleware
│   ├── contacts.js        # CSV/VCF import, CRUD, search, tags
│   ├── dms.js             # DM drafts, preview, queue, manage
│   ├── integrations.js    # Social platform OAuth + status
│   └── engagement.js      # Engagement logs + analytics
├── scripts/
│   ├── init-db.js         # Database initialization
│   └── seed.js            # 50 sample leads auto-seeder
├── frontend/
│   ├── src/
│   │   ├── App.jsx        # Root + auth context + routing
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Signup.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Contacts.jsx      # Import, search, bulk actions
│   │   │   ├── DmDrafts.jsx      # Create, preview, queue DMs
│   │   │   ├── Integrations.jsx  # Social platform connections
│   │   │   └── Engagement.jsx    # Activity feed + analytics
│   └── dist/              # Built frontend (after npm run build)
├── uploads/               # Temp file storage (auto-created)
└── .env                   # Your environment config
```
