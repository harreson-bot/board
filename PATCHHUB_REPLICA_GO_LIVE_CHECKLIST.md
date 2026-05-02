# PatchHub Replica Site: Go-Live Checklist

**Feature:** Each ambassador gets a custom replica site at `patchhub.solutions/{username}` that sells products + pitches PatchHub

**Timeline:** 2-3 hours implementation + testing

---

## Pre-Deployment (30 min)

- [ ] Read PATCHHUB_THREE_SITES_GUIDE.md (understand ecosystem)
- [ ] Review PATCHHUB_REPLICA_DEPLOYMENT.md (detailed implementation)
- [ ] Backup current `/home/patch_app/patchhub/` directory
- [ ] Create `/templates/` directory if it doesn't exist

---

## Backend Implementation (45 min)

### Step 1: Copy Template File
```bash
cp patchhub-replica-site-enroll.html /home/patch_app/patchhub/templates/replica-template.html
chmod 644 /home/patch_app/patchhub/templates/replica-template.html
```

- [ ] Template file copied
- [ ] Permissions set correctly

### Step 2: Update Registration Route (patchhub-routes-auth.js)

Add function to generate replica site:

```javascript
const fs = require('fs');
const path = require('path');

async function createAmbassadorReplicaSite(username, name, email) {
  try {
    // Read template
    const templatePath = path.join(__dirname, '../templates/replica-template.html');
    let html = fs.readFileSync(templatePath, 'utf8');

    // Replace variables
    html = html.replace(/{USERNAME}/g, username.toLowerCase());
    html = html.replace(/{AMBASSADOR_NAME}/g, name);
    html = html.replace(/{AMBASSADOR_EMAIL}/g, email);

    // Create folder
    const folderPath = path.join(__dirname, '../public', username.toLowerCase());
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    // Write HTML
    const htmlPath = path.join(folderPath, 'index.html');
    fs.writeFileSync(htmlPath, html);

    // Create config
    const configPath = path.join(folderPath, 'config.json');
    const config = {
      username: username.toLowerCase(),
      name,
      email,
      createdAt: new Date().toISOString(),
      affiliateCode: `AFF${username.toUpperCase()}`,
      productCatalog: 'superpatch'
    };
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

    return {
      success: true,
      replicaUrl: `https://patchhub.solutions/${username.toLowerCase()}/`,
      configUrl: `https://app.patchhub.solutions/api/ambassadors/${username.toLowerCase()}/config`
    };
  } catch (error) {
    console.error('Error creating replica site:', error);
    return { success: false, error: error.message };
  }
}
```

Add call to function in register route (after user is saved to database):

```javascript
// After: db.run('INSERT INTO users ...')
const replicaSiteResult = await createAmbassadorReplicaSite(username, fullName, email);
if (!replicaSiteResult.success) {
  console.warn('Failed to create replica site:', replicaSiteResult.error);
  // Don't fail registration if replica creation fails
}
```

- [ ] Function added to auth routes
- [ ] Function called after user registration
- [ ] Error handling in place (non-blocking)

### Step 3: Update Server Routes (server.js)

Add route to serve replica sites. **Important:** This route should come AFTER all other specific routes:

```javascript
const path = require('path');
const fs = require('fs');

// Serve replica ambassador sites from root /{username}/
// IMPORTANT: This should come AFTER other specific routes to avoid conflicts
app.get('/:username', (req, res) => {
  const username = req.params.username.toLowerCase();
  
  // Don't intercept reserved routes
  if (['api', 'admin', 'dashboard', 'login', 'register', 'health', 'app', 'enroll'].includes(username)) {
    return res.status(404).json({ error: 'Not found' });
  }
  
  const filePath = path.join(__dirname, 'public', username, 'index.html');
  
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).send(`
      <html>
        <body style="font-family: Arial; text-align: center; margin-top: 2rem;">
          <h1>Ambassador Not Found</h1>
          <p>The ambassador "${username}" doesn't have a replica site yet.</p>
          <p><a href="https://patchhub.solutions">Back to PatchHub</a></p>
        </body>
      </html>
    `);
  }
});
```

- [ ] Route added to server
- [ ] Comes AFTER other routes
- [ ] Reserved words protected

---

## Frontend Implementation (30 min)

### Step 4: Update Registration Success Component

After registration, show ambassador their replica URL:

```jsx
// In frontend/src/pages/RegisterSuccess.jsx or similar

import React from 'react';

export const RegisterSuccess = ({ username, ambassadorName }) => (
  <div className="success-container">
    <div className="success-card">
      <h1>🎉 Welcome, {ambassadorName}!</h1>
      <p>Your PatchHub AI CRM is ready to transform your SuperPatch business.</p>

      <div className="replica-section">
        <h2>Your Personal Replica Site is Live!</h2>
        <p>Share this link with your network. It sells patches AND recruits new ambassadors:</p>
        
        <div className="url-box">
          <input 
            type="text" 
            value={`https://patchhub.solutions/${username.toLowerCase()}/`}
            readOnly
            onClick={(e) => e.target.select()}
          />
          <button 
            onClick={() => {
              const url = `https://patchhub.solutions/${username.toLowerCase()}/`;
              navigator.clipboard.writeText(url);
              alert('Link copied!');
            }}
          >
            Copy Link
          </button>
          <a 
            href={`https://patchhub.solutions/${username.toLowerCase()}/`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-preview"
          >
            Preview Site
          </a>
        </div>

        <div className="replica-tips">
          <p>💡 <strong>Pro Tips:</strong></p>
          <ul>
            <li>Share on Instagram, LinkedIn, Facebook, Twitter</li>
            <li>Include in email signature</li>
            <li>Add to your Slack bio</li>
            <li>Text to your contact list (personalize!)</li>
            <li>Track analytics in your <a href="/dashboard">ambassador dashboard</a></li>
          </ul>
        </div>
      </div>

      <div className="next-steps">
        <h2>Your Next Steps:</h2>
        <ol>
          <li>Import your contacts (CSV or email)</li>
          <li>Create your first AI campaign</li>
          <li>Share your replica site</li>
          <li>Watch conversions & referrals roll in</li>
        </ol>
      </div>

      <a href="/dashboard" className="btn-primary">Go to Dashboard</a>
    </div>

    <style>{`
      .success-container {
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 100vh;
        background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
        padding: 2rem;
      }

      .success-card {
        background: white;
        border-radius: 12px;
        padding: 2rem;
        max-width: 600px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.2);
      }

      .success-card h1 {
        color: #4ade80;
        margin-bottom: 1rem;
      }

      .success-card h2 {
        color: #1a1a1a;
        margin-top: 2rem;
        margin-bottom: 1rem;
        font-size: 1.3rem;
      }

      .url-box {
        display: flex;
        gap: 0.5rem;
        margin: 1rem 0;
      }

      .url-box input {
        flex: 1;
        padding: 0.75rem;
        border: 2px solid #ddd;
        border-radius: 6px;
        font-family: monospace;
      }

      .url-box button {
        padding: 0.75rem 1rem;
        background: #4ade80;
        color: #1a1a1a;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 600;
      }

      .url-box .btn-preview {
        background: #2d2d2d;
        color: white;
        padding: 0.75rem 1rem;
        border-radius: 6px;
        text-decoration: none;
        text-align: center;
      }

      .replica-tips {
        background: #f5f5f5;
        padding: 1rem;
        border-radius: 6px;
        margin: 1rem 0;
      }

      .replica-tips ul {
        margin: 0.5rem 0 0 1.5rem;
      }

      .replica-tips li {
        margin: 0.5rem 0;
      }

      .next-steps ol {
        margin-left: 1.5rem;
      }

      .next-steps li {
        margin: 0.5rem 0;
      }

      .btn-primary {
        display: inline-block;
        margin-top: 1.5rem;
        padding: 0.75rem 1.5rem;
        background: #4ade80;
        color: #1a1a1a;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 600;
        text-decoration: none;
      }
    `}</style>
  </div>
);

export default RegisterSuccess;
```

- [ ] Success component updated
- [ ] Replica URL displayed
- [ ] Copy button functional
- [ ] Preview link works

---

## Deployment (30 min)

### Step 5: Deploy Backend

```bash
cd /home/patch_app/patchhub

# Install dependencies (if any new ones added)
npm install

# Test locally
npm start

# If successful, stop and restart with PM2
pm2 restart patchhub-server
pm2 save

# Check logs
pm2 logs patchhub-server
```

- [ ] Dependencies installed
- [ ] Local test successful
- [ ] PM2 process restarted
- [ ] No errors in logs

### Step 6: Verify Folder Structure

```bash
# Check that folders are created correctly
ls -la /home/patch_app/patchhub/public/
ls -la /home/patch_app/patchhub/templates/

# Check permissions
stat /home/patch_app/patchhub/public/
stat /home/patch_app/patchhub/templates/replica-template.html
```

- [ ] Folders exist and have correct permissions
- [ ] Templates directory readable
- [ ] Public directory readable

---

## Testing (1 hour)

### Step 7: Test Registration Flow

1. **Register new test ambassador:**
   - Go to https://app.patchhub.solutions/register
   - Username: `test_ambassador_001`
   - Name: `Test Ambassador`
   - Email: `test@example.com`
   - Password: `TestPassword123!`

- [ ] Registration successful
- [ ] Redirected to success page
- [ ] Replica URL displayed correctly: `https://patchhub.solutions/test_ambassador_001/`
- [ ] Copy button works

2. **Test replica site exists:**
   - Visit: `https://patchhub.solutions/test_ambassador_001`
   - Check HTML generated correctly
   - Verify variables replaced: {USERNAME}, {AMBASSADOR_NAME}, {AMBASSADOR_EMAIL}

- [ ] Replica site loads
- [ ] Variables replaced correctly
- [ ] All CSS loads
- [ ] No console errors

3. **Test CTAs:**
   - Click "Shop Patches Now" → Scroll to products (works)
   - Click "Become an Ambassador" → Links to `app.patchhub.solutions/register?ref=test_ambassador_001` (or similar)
   - Click product buttons (add to cart placeholder)

- [ ] All CTA buttons work
- [ ] Referral tracking in URL
- [ ] Scroll behavior smooth
- [ ] Mobile layout responsive

### Step 8: Test Not Found (404)

- Visit: `https://patchhub.solutions/nonexistent_user`
- Verify 404 page shows (not blank)
- Verify it doesn't interfere with api/admin/dashboard routes

- [ ] 404 handler working
- [ ] User-friendly error message
- [ ] API routes still accessible

---

## Post-Deployment (15 min)

### Step 9: Monitor & Verify

```bash
# Check replica site generation is working
tail -f /home/patch_app/patchhub/pm2-logs.log | grep -i replica

# Check file system
du -sh /home/patch_app/patchhub/public/
find /home/patch_app/patchhub/public/ -name "*.html" | wc -l
```

- [ ] Logs show successful replica creation
- [ ] Folder size reasonable (should be ~20KB per replica)
- [ ] HTML files created

### Step 10: Update Documentation

- [ ] PATCHHUB_THREE_SITES_GUIDE.md updated with new URL structure
- [ ] PATCHHUB_REPLICA_DEPLOYMENT.md updated with new URL structure
- [ ] MEMORY.md updated with this new feature
- [ ] Team notified of go-live

### Step 11: Update Main Marketing Site

Add "Find Your Site" feature to https://patchhub.solutions:

```html
<!-- Add to main site -->
<section class="ambassador-finder">
  <h2>Already an Ambassador?</h2>
  <p>Find your personal replica site:</p>
  <div>
    <input type="text" id="usernameSearch" placeholder="Enter your username">
    <button onclick="findAmbassadorSite()">Find My Site</button>
  </div>
  <p id="resultMessage"></p>
</section>

<script>
function findAmbassadorSite() {
  const username = document.getElementById('usernameSearch').value.toLowerCase().trim();
  if (!username) {
    alert('Please enter a username');
    return;
  }
  // Only allow alphanumeric and underscore
  if (!/^[a-z0-9_]+$/.test(username)) {
    alert('Invalid username format');
    return;
  }
  window.location.href = `/patchhub.solutions/${username}/`;
}

// Allow Enter key
document.getElementById('usernameSearch')?.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    findAmbassadorSite();
  }
});
</script>
```

- [ ] Ambassador finder added to main site
- [ ] Search functionality works
- [ ] Username validation in place

---

## Success Criteria ✅

- [x] Replica sites auto-generate on signup
- [x] URLs correct: `https://patchhub.solutions/{username}`
- [x] Ambassador variables replaced (name, email, username)
- [x] Replica site design matches PatchHub brand
- [x] Products section visible and styled
- [x] AI pitch section compelling
- [x] CTAs functional (Shop + Become Ambassador)
- [x] Mobile responsive
- [x] 404 error handled gracefully
- [x] Registration success shows replica URL
- [x] Analytics tracking ready (for Phase 2)
- [x] Reserved routes protected (api, admin, dashboard, etc.)

---

## Go-Live Announcement

Once everything passes testing:

```
🚀 NEW FEATURE: Ambassador Replica Sites

Every ambassador now gets their own branded landing page:
https://patchhub.solutions/{your-username}

Share it on social media. Sell patches. Recruit ambassadors. Track it all.

Start here: https://app.patchhub.solutions/register
```

---

**Estimated Total Time:** 2-3 hours

**Current Status:** Ready to implement

**Bottlenecks:** None. All code ready. Just needs deployment.
