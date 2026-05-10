# Coinbase API Authentication Diagnosis

## Current Status: 🔴 **401 Unauthorized**

The JWT is being generated correctly, but Coinbase is rejecting the request.

---

## Possible Causes (Ranked by Likelihood)

### 1. **❌ API Key Format is Wrong** (MOST LIKELY)
The API key you provided:
```
organizations/9151445c-8783-4360-97ae-04de279030d9/apiKeys/39eadc3d-af6f-4261-9770-05fb848398b8
```

This looks like a **full resource name** (CDP v3 format), but Coinbase Advanced expects just the **key ID**. 

**Action:** Go to Coinbase Advanced → Settings → API → your key
- Copy just the **Key ID** (the part after `/apiKeys/`)
- It should be something like: `39eadc3d-af6f-4261-9770-05fb848398b8`

### 2. **❌ Private Key Doesn't Match API Key**
The EC private key you're using might not be paired with the API key you provided.

**Action:**
- In Coinbase console, download a NEW private key for your API key
- The key should be labeled "Private Key" (not "API Secret")
- Replace both COINBASE_API_KEY and COINBASE_PRIVATE_KEY in .env

### 3. **❌ API Key Permissions Missing**
The key might not have "View" or "Trade" permissions enabled.

**Action:**
- Go to Coinbase Advanced → Settings → API → your key
- Check permissions: ✅ **View** (minimum required to read data)
- Check permissions: ✅ **Trade** (required to place orders)

### 4. **❌ IP Whitelist Blocking** (But you removed this)
You removed all IPs for testing, so this shouldn't be it. But verify whitelist is actually empty.

---

## What You Need to Do

### **Step 1:** Verify API Credentials

Go to **https://advanced.coinbase.com/settings/api** and:

1. Find your API key in the list
2. Click the **Eye icon** or **Edit** to view details
3. **Copy the Key ID** (just the UUID part, not the full `organizations/...` path)
4. **Regenerate/download the Private Key** if you don't have it saved
5. Update your `.env` file:
```bash
COINBASE_API_KEY=<KEY_ID_ONLY>
COINBASE_PRIVATE_KEY=<ACTUAL_PRIVATE_KEY_PEM>
```

### **Step 2:** Verify Permissions

In the API key settings, confirm:
- ✅ **View** permission enabled
- ✅ **Trade** permission enabled (for placing orders)
- IP whitelist is **EMPTY** (for testing)

### **Step 3:** Test Again

Once updated, run:
```bash
node test-coinbase-jwt.js
```

---

## Debug Info

**Current setup:**
- API Key format: `organizations/...` (full resource name)
- Private Key type: EC (correct for ES256)
- JWT generation: ✅ Working
- API response: 🔴 401 Unauthorized

**Most likely fix:** Use API Key **ID only** instead of full resource name.

---

## Helpful Links

- Coinbase Advanced Settings: https://advanced.coinbase.com/settings/api
- CDP API Documentation: https://docs.cdp.coinbase.com/coinbase-app/advanced-trade-apis/overview/
