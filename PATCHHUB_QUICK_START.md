# PatchHub Quick Start Guide

## What You Have

✅ **patchhub.solutions** - Marketing site live
🔄 **Backend API code** - Ready to deploy
💻 **React frontend code** - Ready to build
🎥 **AI video** - Generating now

---

## 48-Hour Quick Test Plan

### Day 1: Backend Deployment (2-3 hours)

#### Step 1: Deploy to DreamHost (30 min)
```bash
# SSH into server
ssh patch_app@vps48233.dreamhostps.com

# Create directory
mkdir -p ~/patchhub && cd ~/patchhub

# Upload backend files (from your local machine)
# Copy these files to the server:
# - patchhub-backend-package.json → package.json
# - patchhub-backend-server.js → server.js
# - patchhub-backend-database.js → database.js
# - patchhub-routes-auth.js → routes/auth.js
# - patchhub-routes-contacts.js → routes/contacts.js
# - patchhub-routes-campaigns.js → routes/campaigns.js
# - patchhub-routes-analytics.js → routes/analytics.js

mkdir -p routes

# Install dependencies
npm install

# Create .env file
cat > .env << 'EOF'
NODE_ENV=production
PORT=3000
DB_PATH=/home/patch_app/patchhub/patchhub.db
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
EOF

# Start with PM2
npm install -g pm2
pm2 start server.js --name "patchhub-api"
pm2 logs patchhub-api
```

#### Step 2: Verify Backend (10 min)
```bash
# Test health endpoint
curl https://app.patchhub.solutions/health

# Should return: {"status":"ok","timestamp":"..."}
```

#### Step 3: Register Test User (5 min)
```bash
curl -X POST https://app.patchhub.solutions/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!",
    "name": "Test User",
    "company": "Test Inc"
  }'

# Save the token from response
TOKEN="eyJhbG..."
```

#### Step 4: Upload Sample Contacts (10 min)
```bash
curl -X POST https://app.patchhub.solutions/api/contacts/upload-csv \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "filename": "sample-contacts.csv",
    "data": [
      {
        "first_name": "John",
        "last_name": "Doe",
        "email": "john@example.com",
        "phone": "555-1234",
        "company": "Acme Inc"
      },
      {
        "first_name": "Jane",
        "last_name": "Smith",
        "email": "jane@example.com",
        "phone": "555-5678",
        "company": "Tech Corp"
      },
      {
        "first_name": "Mike",
        "last_name": "Johnson",
        "email": "mike@example.com",
        "phone": "555-9999",
        "company": "Global Solutions"
      }
    ]
  }'

# Response: {"success":true,"importId":"...","totalCount":3,"matchedCount":3}
```

---

### Day 2: Frontend & Testing (2-3 hours)

#### Step 1: Build React Frontend (1 hour)
```bash
# Create React app locally
npx create-react-app patchhub-frontend
cd patchhub-frontend

# Copy the App.jsx code
# Create pages/ directory with components:
# - Dashboard.jsx
# - Contacts.jsx
# - Campaigns.jsx
# - Login.jsx
# - Register.jsx
# - Analytics.jsx

# Build production
npm run build
```

#### Step 2: Deploy Frontend (30 min)
```bash
# From your local machine
scp -r ./build/* patch_app@vps48233.dreamhostps.com:/home/patch_app/patchhub/public/

# Update server.js to serve static files
# Add before error handlers:
app.use(express.static(path.join(__dirname, 'public')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

# Restart
ssh patch_app@vps48233.dreamhostps.com
pm2 restart patchhub-api
```

#### Step 3: Full System Test (1 hour)
1. **Visit:** https://app.patchhub.solutions
2. **Register:** New account
3. **Login:** Use credentials
4. **Upload Contacts:** Use CSV from sample data
5. **Create Campaign:**
   - Template: "Hi [FirstName], checked out SuperPatch yet? It's game-changing. DM me if interested!"
   - Click Launch
6. **View Analytics:**
   - Should see contacts uploaded
   - Should see campaign launched
   - Should see simulated responses

---

## Sample Contact Data (CSV Format)

Save as `sample-contacts.csv`:

```csv
First Name,Last Name,Email,Phone,Company
John,Doe,john.doe@gmail.com,555-0101,Acme Inc
Jane,Smith,jane.smith@yahoo.com,555-0102,Tech Corp
Mike,Johnson,mike.j@outlook.com,555-0103,Global Solutions
Sarah,Williams,sarah.w@protonmail.com,555-0104,Innovation Labs
David,Brown,david.brown@gmail.com,555-0105,StartUp Ventures
Emily,Jones,emily.jones@yahoo.com,555-0106,Digital Dynamics
Robert,Garcia,robert.g@outlook.com,555-0107,Future Systems
Lisa,Martinez,lisa.m@protonmail.com,555-0108,Tech Pioneers
James,Rodriguez,james.r@gmail.com,555-0109,Cloud Solutions
Jennifer,Lee,jennifer.lee@yahoo.com,555-0110,Data Insights
```

---

## Sample DM Templates

### Template 1: Casual
```
Hey [FirstName]! 👋

I've been using SuperPatch and it's honestly changed the game for me. No side effects, works great. 

You interested in checking it out? I can send you a sample if you want to try before buying.

LMK!
```

### Template 2: Professional
```
Hi [FirstName],

Hope you're having a great day. I wanted to reach out because you seem like someone who cares about health and wellness.

I've found SuperPatch patches to be incredibly effective for [Benefit]. They're natural, drug-free, and actually work.

If you're interested in learning more or trying a sample, I'm happy to help. Just let me know!

Best,
[Your Name]
```

### Template 3: Short & Direct
```
[FirstName], quick question - you interested in natural pain relief that actually works?

SuperPatch changed my game. DM me if curious!
```

---

## Troubleshooting

### Backend won't start
```bash
# Check logs
pm2 logs patchhub-api

# Common issues:
# - Port 3000 already in use: pm2 stop patchhub-api; lsof -i :3000; kill -9 [PID]
# - Node not found: which node (should be /usr/bin/node or similar)
# - npm not installed: npm --version

# Restart
pm2 restart patchhub-api
```

### Can't connect to API
```bash
# Test directly
curl https://app.patchhub.solutions/health

# Check Cloudflare tunnel
# Login to https://one.dash.cloudflare.com → Tunnels → Check route is active
```

### Frontend shows blank page
```bash
# Check browser console (F12 → Console)
# Common issues:
# - API URL wrong (check fetch calls match your domain)
# - CORS error: Add your domain to CORS allowed origins

# In server.js:
const cors = require('cors');
app.use(cors({
  origin: ['https://app.patchhub.solutions', 'http://localhost:3000']
}));
```

### CSV upload fails
- File size > 10MB? Reduce or increase limit in multer config
- Missing required columns? Check: First Name, Last Name, Email
- Encoding issue? Save as UTF-8 in Excel

---

## Success Metrics

After 48 hours, you should have:

✅ Backend running on app.patchhub.solutions
✅ Frontend live at same URL
✅ Can register new user
✅ Can upload CSV with 10+ contacts
✅ Can create campaign
✅ Can launch campaign (simulates DM sending)
✅ Can view analytics dashboard
✅ Can see mock responses coming in

---

## Next: Customization (May 5+)

### Before Launch
- [ ] Update marketing site copy (make it personal)
- [ ] Add your branding/colors
- [ ] Finalize DM templates
- [ ] Embed video on marketing site
- [ ] Set real Generect API key (when ready)
- [ ] Test with 50+ real contacts

### Go-Live Checklist
- [ ] Domain DNS pointing to Cloudflare
- [ ] SSL certificate valid (Cloudflare auto)
- [ ] Email notifications setup (optional)
- [ ] Backup database daily
- [ ] Monitor logs for errors
- [ ] Have support plan ready

---

**Total Time:** ~4-5 hours to full working system
**Cost:** $0 (using DreamHost you already have)
**Time to customize:** 2-3 hours (copy, branding, testing)

You're on track! 🚀

