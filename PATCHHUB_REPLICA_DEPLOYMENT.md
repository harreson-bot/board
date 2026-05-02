# PatchHub Replica Site Deployment Guide

## Overview

**PatchHub now has 3 interconnected sites:**

1. **patchhub.solutions** — Main CRM marketing + platform benefits
2. **app.patchhub.solutions** — Backend API + Ambassador dashboard (COMING SOON)
3. **patchhub.solutions/{USERNAME}** — Replica product site + AI pitch (READY NOW)

The 3rd site is where each ambassador gets their own branded landing page that:
- Sells SuperPatch products (or whatever company's patches they represent)
- Pitches the PatchHub AI CRM platform (with "coming soon" messaging)
- Stands alone as a product showcase + recruitment funnel
- Will auto-connect to platform registration once `app.patchhub.solutions` launches

---

## Current Implementation (Phase 1)

Since `app.patchhub.solutions` is still "Coming Soon", replica sites are currently **static HTML pages** that can be:
- Deployed manually
- Updated via simple script
- Shared on social media immediately
- Auto-generated later when platform launches

---

## Deployment Options

### Option A: Manual Deployment (Quickest)

For each ambassador, create their folder and customize:

```bash
# Create folder
mkdir -p /home/patch_app/patchhub/public/john_smith/

# Copy template
cp patchhub-replica-site-enroll.html /home/patch_app/patchhub/public/john_smith/index.html

# Replace variables (bash)
sed -i 's/{USERNAME}/john_smith/g' /home/patch_app/patchhub/public/john_smith/index.html
sed -i 's/{AMBASSADOR_NAME}/John Smith/g' /home/patch_app/patchhub/public/john_smith/index.html
sed -i 's/{AMBASSADOR_EMAIL}/john@example.com/g' /home/patch_app/patchhub/public/john_smith/index.html

# Done! Site is now live at patchhub.solutions/john_smith
```

### Option B: Batch Creation Script

Create `/home/patch_app/patchhub/scripts/create-replica.sh`:

```bash
#!/bin/bash
# Usage: ./create-replica.sh username "Full Name" email@example.com

USERNAME=$1
NAME=$2
EMAIL=$3

if [ -z "$USERNAME" ] || [ -z "$NAME" ] || [ -z "$EMAIL" ]; then
  echo "Usage: $0 <username> <name> <email>"
  exit 1
fi

# Validate username (alphanumeric + underscore only)
if ! [[ "$USERNAME" =~ ^[a-z0-9_]+$ ]]; then
  echo "❌ Invalid username. Use only lowercase letters, numbers, and underscores."
  exit 1
fi

# Create folder
mkdir -p /home/patch_app/patchhub/public/$USERNAME/

# Copy template
cp /home/patch_app/patchhub/templates/replica-template.html /home/patch_app/patchhub/public/$USERNAME/index.html

# Replace variables
sed -i "s/{USERNAME}/$USERNAME/g" /home/patch_app/patchhub/public/$USERNAME/index.html
sed -i "s/{AMBASSADOR_NAME}/$NAME/g" /home/patch_app/patchhub/public/$USERNAME/index.html
sed -i "s/{AMBASSADOR_EMAIL}/$EMAIL/g" /home/patch_app/patchhub/public/$USERNAME/index.html

# Success
echo "✅ Replica site created!"
echo "📍 Live at: https://patchhub.solutions/$USERNAME/"
echo "🔗 Share this link: https://patchhub.solutions/$USERNAME/"
```

**Make it executable:**
```bash
chmod +x /home/patch_app/patchhub/scripts/create-replica.sh
```

**Use it:**
```bash
./scripts/create-replica.sh john_smith "John Smith" john@example.com
./scripts/create-replica.sh sarah_m "Sarah Martinez" sarah@example.com
./scripts/create-replica.sh mike_j "Mike Johnson" mike@example.com
```

### Option C: Express Route (For Later, When Platform Launches)

When `app.patchhub.solutions` goes live and you want auto-generation on signup:

```javascript
// In server.js, add this route AFTER other specific routes

const path = require('path');
const fs = require('fs');

// Serve replica ambassador sites from root /{username}/
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

---

## Setup Instructions (Phase 1)

### Step 1: Save Template File

```bash
# Copy template to templates folder
cp patchhub-replica-site-enroll.html /home/patch_app/patchhub/templates/replica-template.html
chmod 644 /home/patch_app/patchhub/templates/replica-template.html
```

- [ ] Template file saved
- [ ] Permissions correct

### Step 2: Create Scripts Folder

```bash
mkdir -p /home/patch_app/patchhub/scripts
```

### Step 3: Deploy Sample Replica Sites

```bash
# Create a few test sites
./scripts/create-replica.sh test_ambassador_001 "Test Ambassador" test@example.com
./scripts/create-replica.sh john_smith "John Smith" john@example.com
./scripts/create-replica.sh sarah_martinez "Sarah Martinez" sarah@example.com
```

- [ ] Script executable and working
- [ ] Test sites created
- [ ] Folders visible in `/home/patch_app/patchhub/public/`

### Step 4: Test in Browser

- [ ] Visit `https://patchhub.solutions/test_ambassador_001` — Site loads
- [ ] Verify name, email are correct
- [ ] Test CTAs (products, AI pitch, links to main site)
- [ ] Mobile responsive
- [ ] Social share meta tags work

### Step 5: Add to Main Site Navigation

Update `patchhub.solutions` to include ambassador finder:

```html
<!-- Add to main marketing site -->
<section class="ambassador-finder">
  <h2>Already an Ambassador?</h2>
  <p>Find your personal replica site:</p>
  <div style="display: flex; gap: 0.5rem; margin: 1rem 0;">
    <input 
      type="text" 
      id="usernameSearch" 
      placeholder="Enter your username"
      style="flex: 1; padding: 0.75rem; border: 2px solid #ddd; border-radius: 6px;"
    >
    <button 
      onclick="findAmbassadorSite()"
      style="padding: 0.75rem 1rem; background: #4ade80; color: #1a1a1a; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;"
    >
      Find My Site
    </button>
  </div>
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
  window.location.href = `https://patchhub.solutions/${username}`;
}

// Allow Enter key
document.getElementById('usernameSearch')?.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    findAmbassadorSite();
  }
});
</script>
```

---

## Customization & White-Labeling

### Per-Ambassador Customization

Create a `config.json` file alongside `index.html`:

```json
{
  "username": "john_smith",
  "name": "John Smith",
  "email": "john@example.com",
  "company": "superpatch",
  "products": [
    {
      "id": 1,
      "name": "Classic Patch",
      "price": 19.99,
      "emoji": "🩹"
    }
  ],
  "colors": {
    "primary": "#4ade80",
    "dark": "#1a1a1a"
  },
  "createdAt": "2026-05-02T12:00:00Z",
  "affiliateCode": "AFFJON"
}
```

Later, when platform launches, this can be used for:
- Analytics dashboards
- Referral tracking
- Custom branding per ambassador
- API metadata

### Per-Company Customization (Future)

When you want to white-label for different companies:

```bash
# Create SuperPatch template
cp replica-template.html templates/superpatch-template.html

# Create HealthBoost template (different product)
cp replica-template.html templates/healthboost-template.html

# Update colors/products in templates, then use:
cp templates/healthboost-template.html public/john_smith_healthboost/index.html
```

---

## Folder Structure

```
/home/patch_app/patchhub/
├── public/
│   ├── index.html                          # Main site
│   ├── john_smith/
│   │   ├── index.html                      # Replica site (auto-generated)
│   │   └── config.json                     # Metadata
│   ├── sarah_martinez/
│   │   ├── index.html
│   │   └── config.json
│   ├── css/
│   ├── js/
│   └── images/
├── templates/
│   └── replica-template.html                # Master template
├── scripts/
│   └── create-replica.sh                    # Creation script
├── server.js
├── package.json
└── patchhub.db
```

---

## Phase 2: Auto-Generation (After Platform Launch)

When `app.patchhub.solutions` has a working registration:

```javascript
// In patchhub-routes-auth.js

async function createAmbassadorReplicaSite(username, name, email) {
  try {
    const fs = require('fs');
    const path = require('path');
    
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
    };
  } catch (error) {
    console.error('Error creating replica site:', error);
    return { success: false, error: error.message };
  }
}

// Call in registration route (after user saved to database):
// await createAmbassadorReplicaSite(username, fullName, email);
```

---

## Security Notes

1. **Folder permissions:** Public folder readable by web server
2. **Username validation:** Only alphanumeric + underscore (prevents path traversal)
3. **Reserved routes:** Protect `api`, `admin`, `dashboard`, `login`, `register`, `health`
4. **Rate limiting:** If auto-generating, limit creation to 1/user (prevent spam)

---

## Analytics & Tracking (Future)

Once platform launches, add Google Analytics:

```html
<!-- In replica-template.html -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  gtag('config', 'GA_ID', {
    'user_id': '{USERNAME}'
  });
</script>
```

Dashboard will show:
- Replica site views
- Click-through rates to products
- Referral signups
- Revenue metrics

---

## Current Status

**Phase 1 (Now):**
- ✅ HTML template ready
- ✅ Manual deployment working
- ✅ Script for batch creation ready
- ✅ Static sites shareable immediately
- ⏳ Waiting for platform launch

**Phase 2 (When `app.patchhub.solutions` launches):**
- Auto-generation on signup
- Registration flow connects to live platform
- Referral tracking
- Dashboard analytics

---

**Total time to Phase 1 go-live:** ~30 minutes (copy template + run script 3 times)

**Bottleneck:** None. Ready now.
