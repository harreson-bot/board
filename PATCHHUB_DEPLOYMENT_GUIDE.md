# PatchHub Deployment & Setup Guide

## What's Been Built

### ✅ Marketing Site (patchhub.solutions)
- **Live URL:** https://patchhub.solutions
- **Status:** Deployed and live
- **Contains:** Landing page, features, pricing, FAQ, video section, CTA
- **Customizations needed:** Colors, logo, custom copy

### 📦 Backend API (app.patchhub.solutions)
**Code Files Ready:**
- `patchhub-backend-server.js` - Express server
- `patchhub-backend-database.js` - SQLite schema
- `patchhub-backend-package.json` - Dependencies
- `patchhub-routes-auth.js` - User auth (register/login/JWT)
- `patchhub-routes-contacts.js` - CSV import + enrichment
- `patchhub-routes-campaigns.js` - DM automation + launching
- `patchhub-routes-analytics.js` - Performance dashboards
- `Dockerfile` - Container setup

### 💻 Frontend React App
**Code Files Ready:**
- `patchhub-frontend-app.jsx` - Main app component
- CSS/styling included

---

## Step 1: Deploy Backend to DreamHost

### Prerequisites
- SSH access to vps48233.dreamhostps.com (user: `patch_app`, pass: `#KingP@tch26#`)
- Node.js v18+ installed on server
- PM2 for process management

### Deployment Steps

1. **SSH into the server**
   ```bash
   ssh patch_app@vps48233.dreamhostps.com
   ```

2. **Clone or create project directory**
   ```bash
   mkdir -p /home/patch_app/patchhub
   cd /home/patch_app/patchhub
   ```

3. **Upload all backend code files**
   - Copy all `patchhub-backend-*.js` and `patchhub-routes-*.js` files
   - Copy `package.json` (the backend one)

4. **Install dependencies**
   ```bash
   npm install
   ```

5. **Create environment file**
   ```bash
   cat > .env << EOF
   NODE_ENV=production
   PORT=3000
   DB_PATH=/home/patch_app/patchhub/patchhub.db
   JWT_SECRET=your-secure-random-string-here
   EOF
   ```

6. **Initialize database**
   ```bash
   node -e "require('./database.js')"
   ```

7. **Start with PM2**
   ```bash
   npm install -g pm2
   pm2 start server.js --name "patchhub-api"
   pm2 save
   pm2 startup
   ```

8. **Set up Cloudflare tunnel** (already exists, verify it's routing to localhost:3000)
   - Tunnel: `engagement-crm` → app.patchhub.solutions
   - Route: localhost:3000

### Test Backend
```bash
curl https://app.patchhub.solutions/health
# Should return: { "status": "ok", "timestamp": "..." }
```

---

## Step 2: Build & Deploy React Frontend

### Prerequisites
- Node.js v18+ local
- npm or yarn

### Build Steps

1. **Create React app (local)**
   ```bash
   npx create-react-app patchhub-frontend
   cd patchhub-frontend
   ```

2. **Copy component code**
   - Replace `src/App.jsx` with `patchhub-frontend-app.jsx`
   - Create `src/pages/` directory with:
     - `Dashboard.jsx`
     - `Contacts.jsx`
     - `Campaigns.jsx`
     - `CampaignDetail.jsx`
     - `Analytics.jsx`
     - `Login.jsx`
     - `Register.jsx`

3. **Build production bundle**
   ```bash
   npm run build
   ```

4. **Upload to DreamHost**
   ```bash
   scp -r build/* patch_app@vps48233.dreamhostps.com:/home/patch_app/patchhub/public/
   ```

5. **Serve static files from Express**
   - Add this to `server.js`:
   ```javascript
   app.use(express.static(path.join(__dirname, 'public')));
   app.get('*', (req, res) => {
     res.sendFile(path.join(__dirname, 'public', 'index.html'));
   });
   ```

6. **Restart PM2**
   ```bash
   pm2 restart patchhub-api
   ```

### Test Frontend
- Visit: https://app.patchhub.solutions
- Should see login page

---

## Step 3: Quick Testing Checklist

### Register & Login
- [ ] Create account at https://app.patchhub.solutions
- [ ] Login with credentials
- [ ] See dashboard with 0 contacts/campaigns

### Upload Contacts
- [ ] Create sample CSV:
  ```csv
  First Name,Last Name,Email,Phone,Company
  John,Doe,john@example.com,555-1234,Acme Inc
  Jane,Smith,jane@example.com,555-5678,Tech Corp
  ```
- [ ] Upload CSV file
- [ ] Verify contacts enriched and displayed

### Create Campaign
- [ ] Create new campaign
- [ ] Add template: `"Hi [FirstName], interested in SuperPatch? Check it out: [link]"`
- [ ] Select recipients
- [ ] Launch campaign
- [ ] Verify DMs marked as "sent"

### View Analytics
- [ ] Go to Analytics page
- [ ] See dashboard metrics (contacts, campaigns, messages)
- [ ] View campaign performance (opens, clicks, replies)

---

## Step 4: Video Walkthrough

### Script: "PatchHub Demo" (3:30 minutes)

#### Scene 1 (0:00-0:30): Problem
**Voiceover:** "Building a SuperPatch business means finding customers, engaging them, and tracking sales. But doing it manually? That's a ton of work."

*Show: Ambassador manually scrolling through contacts, copy-pasting DMs, checking replies one by one*

#### Scene 2 (0:30-1:15): Solution
**Voiceover:** "Meet PatchHub. Your AI Agent automation platform for SuperPatch ambassadors."

*Show: Dashboard overview*

1. (0:40) Upload CSV with prospects
2. (0:50) AI enriches data + finds social profiles
3. (1:00) Create DM template with personalization
4. (1:10) Click 'Launch' — done!

#### Scene 3 (1:15-2:30): Live Demo
**Voiceover:** "Let me show you how it works."

*Screen recording of:**
1. (1:20) Login to app.patchhub.solutions
2. (1:30) Dashboard showing 500 contacts
3. (1:45) Click "Create Campaign"
4. (2:00) Fill in template: "Hi [FirstName], I've been using SuperPatch for [Benefit]. Thought you might be interested. DM me if curious!"
5. (2:15) Select recipients (all 500 shown)
6. (2:25) Click "Launch Campaign"
7. (2:30) See "500 DMs sent" confirmation

#### Scene 4 (2:30-3:15): Results & ROI
**Voiceover:** "Results? In one week:"
- 50+ qualified responses
- 10+ conversations started
- 5+ sales closed
- Time invested? Just 30 minutes.

*Show: Dashboard with metrics*
- Opens: 425 (85%)
- Replies: 50 (10%)
- Conversions: 5 (1%)

**Voiceover:** "Your AI agent works 24/7, warming up leads while you focus on closing sales. More time to close. More money in your pocket."

#### Scene 5 (3:15-3:30): CTA
**Voiceover:** "Ready to scale your SuperPatch business?"

*Show: Pricing cards*
- Individual: $99 setup + $19/month
- Super Ambassador: $299 setup + $79/month

*Button: "Start Your Free Trial"*

**Voiceover:** "Join other SuperPatch ambassadors automating their business growth with PatchHub."

---

## Video Generation Checklist

### Option A: Use AI Video Tools
- **Synthesia** (AI avatar) - $0.12/min
- **Runway** (screen recording + AI) - Easy editing
- **Loom** (simple screen recording + voiceover) - Free for basic

### Option B: Manual Recording
1. Record screen using OBS
2. Record voiceover using Audacity
3. Edit in DaVinci Resolve (free)

### Delivery
- [ ] Upload video to patchhub.solutions
- [ ] Embed in hero section (replace placeholder)
- [ ] Format: MP4, 1920x1080, ~50MB max

---

## Customization Checklist

### Marketing Site (patchhub.solutions)
- [ ] Update colors (change #6366f1 to your brand color)
- [ ] Update logo (replace "🚀 PatchHub" with custom logo)
- [ ] Update copy (replace generic text with your messaging)
- [ ] Add actual video (replace placeholder)
- [ ] Update social links (if applicable)

### Backend
- [ ] Generate new JWT_SECRET (don't use default)
- [ ] Set proper database path in .env
- [ ] Configure email service (optional, for notifications)
- [ ] Set up Generect API key for real contact enrichment

### Frontend
- [ ] Update color scheme
- [ ] Add your branding/logo
- [ ] Update API base URL if needed
- [ ] Add custom CSS

---

## Performance & Scaling

### Current Limits
- Single Node.js process (upgrade to cluster for scaling)
- SQLite database (upgrade to PostgreSQL for multi-user)
- 10MB file upload limit

### Future Upgrades (Per Requirements)
1. **Multi-user:** PostgreSQL with per-customer database
2. **White-label:** Docker containerized (one container per customer)
3. **API access:** REST API + webhooks for integrations
4. **DM delivery:** Real Meta API integration (pending certification)

---

## Support & Troubleshooting

### Can't upload CSV?
- Check file size < 10MB
- Ensure columns: First Name, Last Name, Email
- Verify CSV is UTF-8 encoded

### DMs not sending?
- Check campaign status (should be "draft" before launch)
- Verify contacts are enriched (check contact detail)
- Check server logs: `pm2 logs patchhub-api`

### Database issues?
- Check database file exists: `ls -la /home/patch_app/patchhub/patchhub.db`
- Verify permissions: `chmod 644 patchhub.db`
- Rebuild schema: `node -e "require('./database.js')"`

### Port already in use?
```bash
pm2 stop patchhub-api
lsof -i :3000
kill -9 [PID]
pm2 start server.js
```

---

## Next Steps (After May 5 Launch)

1. **Generect API Integration**
   - Get API key from Generect
   - Replace mock enrichment with real API calls
   - Test with 1000+ contacts

2. **Meta API Certification**
   - Apply for Meta Business Partner program
   - Test DM webhook deliveries
   - Go live with real social DM sending

3. **White-Label Customizations**
   - Duplicate app for different customers
   - Docker setup for quick deployments
   - Custom branding per customer

4. **Scaling**
   - Move to PostgreSQL (vs SQLite)
   - Implement caching layer
   - Set up monitoring/alerting

---

## Key Credentials (Keep Secure!)

- **DreamHost SSH:** `patch_app` / `#KingP@tch26#`
- **Database:** `/home/patch_app/patchhub/patchhub.db` (SQLite)
- **JWT Secret:** (set in `.env`, keep private)
- **Generect API Key:** (to be added)
- **Meta API Credentials:** (after certification)

---

**Status:** All code ready for deployment. You're ready to test end-to-end on May 5!

