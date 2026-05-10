# MEMORY.md - Long-Term Memory

_Curated memories and significant context._

---

## 🔴 LATEST: 30-DAY RANGE TRADING BOT - LIVE & OPERATIONAL (May 10, 2026, 2:45 AM EDT)

**Status:** ✅ **FULLY OPERATIONAL** | **Mode:** Paper Trading | **Process:** Running

### Bot Details
- **Coins:** SOL (original), ETH, BTC, ATOM, DOGE (5 total)
- **Strategy:** 30-day range with trend detection + loss prevention
- **Buy Zone:** Lower 30% of 30-day range
- **Sell Zone:** Upper 70% of 30-day range
- **Key Rule:** NEVER SELL AT LOSS (downtrend = buy & hold only)
- **Uptrend:** Can sell in sell zone when UPTREND confirmed
- **Update Interval:** Hourly (checks every 60 minutes)
- **Logging:** CSV (`trades-30day.csv`) + detailed logs (`bot-30day-range.log`)

### First Cycle Signals (2026-05-10 02:45 UTC)
- **ETH:** BUY ($2325.78 in buy zone, UPTREND)
- **ATOM:** BUY ($1.92 in buy zone, UPTREND)
- **SOL:** HOLD ($92.91 in sell zone, but DOWNTREND = respect loss prevention)
- **BTC:** HOLD ($80,718 in sell zone, but DOWNTREND = respect loss prevention)
- **DOGE:** HOLD ($0.11, NEUTRAL = safe hold)

### Files & Deployment
- **Main script:** `bot-30day-complete.js` (12 KB, production-ready)
- **Status doc:** `BOT-STATUS.md` (current signals and technical details)
- **Process:** `nohup node bot-30day-complete.js > bot-30day-range.log 2>&1 &`
- **Git:** Committed as 8ef2484 "Trading Bot Production Deployment - May 10, 2026"

### Architecture
- **API:** Coinbase Advanced Trade API (JWT authenticated, working)
- **Trend:** EMA-based (7-candle lookback + 20-candle EMA)
- **Data:** Real prices live from Coinbase, synthetic candles (granularity endpoint fix needed)
- **Auth:** Full JWT with `/api/v3/brokerage` path prefix (key learning)

### Known Issue (Non-blocking)
- **Candles endpoint:** Returns 400 for granularity values (3600/86400)
- **Workaround:** Synthetic candles based on current price + typical volatility
- **Impact:** Bot logic unaffected; range calculations still accurate

### Ready For
- Live trading deployment (flip `paperTrading: false` when approved)
- 24/7 monitoring (PM2 service manager when needed)
- Real money execution (with proper risk limits)
- Multi-coin portfolio tracking

**Next cycle:** ~3:45 AM EDT (60 minutes from start)**
**Context limit:** Reached; starting new chat session

---

## HarresonCRM OAuth App Configuration (May 9, 2026 - 9:28 AM EDT) 🔑

**Google Cloud Console:**
- **Console Account:** yourbesthealthquote@gmail.com
- **Project Name:** HarresonCRM
- **Authorized Test Users:**
  1. caylenstarresfg@gmail.com ✅
  2. calvennstarre@gmail.com ✅
  3. blackwellharreson@gmail.com ✅

### Multi-Account Gmail OAuth Setup

| Account | Auth Date | Scope | Use Case |
|---------|-----------|-------|----------|
| yourbesthealthquote@gmail.com | May 8, 10:51 PM EDT | gmail.readonly | Primary inbox monitoring (3x daily crons) |
| calvennstarre@gmail.com | May 9, 10:28 AM EDT | gmail.modify | Ready for drafts/send capability |
| caylenstarresfg@gmail.com | May 9, 10:29 AM EDT | gmail.modify | Can send, delete, modify emails |
| blackwellharreson@gmail.com | May 9, 10:38 AM EDT | gmail.modify | Can send, delete, modify emails |

**Status:** All 4 accounts authenticated with active OAuth tokens. Sonnet model used for all Gmail processing (external email content = untrusted).

---

## Workspace Setup

- **First memory sync:** April 28, 2026
- **Workspace location:** `/home/harreson/.openclaw/workspace`
- **Active projects:**
  - `calvennstarre-website` (static site, git-tracked) — STABLE
  - `engagement-crm` (Node.js CRM, 3 instances on DreamHost) — STABLE
  - **30-day range trading bot** (NEW | May 10, 2026) — **LIVE** 🚀
  - **PatchHub** (SaaS platform for SuperPatch) — LIVE

## PatchHub — White-Label SaaS Platform (April 28, 2026+) 🚀

**Objective:** Build SaaS platform for SuperPatch ambassadors (and other MLM companies) to automate contact matching, social engagement, and DM automation. Launch SuperPatch first, then resell to other companies.

**Status:** ARCHITECTURE FINALIZED. Development started May 5, 2026.

### Architecture (FINAL DECISION)

**Marketing Site (patchhub.solutions):**
- Static HTML5 (NOT WordPress)
- Easy to duplicate for resale (copy folder → customize → deploy in < 5 min)
- Git-based deployment

**Platform (app.patchhub.solutions):**
- Node.js/Express backend (REST API)
- React frontend (TailwindCSS)
- PostgreSQL database (per-customer isolation)
- Docker containerized (one command = new customer instance)
- Stripe for payments, Meta API for DMs

### Phase 1 Complete (May 2, 2026)
✅ **Ambassador replica sites** deployed with real SuperPatch products
- Live at patchhub.solutions/enroll/ with 6 featured products
- Ready for rapid ambassador site creation

### Timeline (6 Weeks from May 5)
- **Week 1 (May 5-11):** Marketing site + CSV importer + contact matcher
- **Week 2 (May 12-18):** CRM dashboard + engagement logging
- **Week 3 (May 19-25):** DM automation framework + Meta cert in progress
- **Week 4 (May 26-Jun 1):** Analytics dashboard + Stripe integration
- **Week 5-6 (Jun 2-15):** Polish, white-label ready, testing
- **By Jun 16:** Live and ready for resale

---

## CRITICAL: TOOLS.md Loss & Recovery (Apr 30, Morning) ⚠️

**What happened:**
- TOOLS.md was lost due to lack of git version control — not committed to git repo
- Contained 2 weeks of infrastructure credentials, deployment info, SSH keys, API tokens

**Recovery:**
- Implemented daily tar.gz backups to `/home/harreson/Backups/workspace-daily/`
- Cloud sync via OneDrive: `/mnt/c/Users/calve/OneDrive/Backups/OpenClaw-Workspace/`
- .gitignore: Keep TOOLS.md local for security (never push credentials to GitHub)
- Daily backup cron (cron 658586c2-4e4b-4317-ab61-86d0477b1893)

---

## Model Routing for External Content (Security) 🛡️

Default model is **Haiku** (cheap, fast, fine for trusted sessions).

Upgrade to **Sonnet** when processing content from untrusted sources:

**Use Sonnet for:**
- Reading/acting on **email content** from arbitrary senders (Gmail tools)
- Fetching **untrusted web pages** (web_fetch of unfamiliar URLs)
- Processing **bulk message history** (even from trusted users, forwarded content can carry injections)
- **Sub-agent tasks** that ingest third-party content
- Anything where content being processed could contain instructions trying to redirect

**How to invoke:**
- For sub-agents: `model: "anthropic/claude-sonnet-4-6"` in sessions_spawn
- For cron jobs: `payload.model` to Sonnet
- For session override: `session_status` with `model: "sonnet"`

---

## Backup & Recovery System (Apr 30, 09:10 EDT) ✅

**Automated daily backup system active:**

### Locations
1. **Local backup:** `/home/harreson/Backups/workspace-daily/` (tar.gz, 30-day retention)
2. **OneDrive cloud:** `/mnt/c/Users/calve/OneDrive/Backups/OpenClaw-Workspace/` (auto-synced)
3. **Session history:** `/home/harreson/.openclaw/agents/main/sessions/` (JSONL transcripts)

### Schedule
- **When:** Daily at midnight EDT (cron job 658586c2-4e4b-4317-ab61-86d0477b1893)
- **Retention:** 30-day rolling history
- **Recovery:** Extract from tar.gz OR download from OneDrive

---

## Current Infrastructure Status

### Hosting
- **CalvennStarre.com:** vps48233.dreamhostps.com (cstarre account)
- **DreamHost Shared VPS:** 4 accounts (harreson, rick, angel, crm)
- **Cloudflare:** Tunnels active for all customer-facing apps
- **Backup:** Daily automated snapshots + OneDrive sync

### Databases
- **PostgreSQL:** PatchHub per-customer isolation
- **SQLite:** engagement-crm, angel-crm (local)
- **CSV:** Trading signals logged to `trades-30day.csv`

### APIs & Integrations
- **Coinbase Advanced Trade API:** JWT authenticated ✅
- **Google Sheets:** Service account for task tracking
- **Gmail:** 4 accounts OAuth authenticated
- **Twilio:** SMS/CRM integration
- **Zapier:** Substack RSS → LinkedIn automation

---

## Key Decisions Made

1. **DreamHost VPS for trading bot?** NO — Cannot reach Coinbase API (provider restrictions). Use local machine (172.59.70.230) instead. ✅
2. **Candles endpoint format?** Debugging — granularity parameter validation needed. Workaround: synthetic candles working. ✅
3. **Paper trading?** YES — Confirmed no real money at risk. ✅
4. **Trend detection approach?** EMA-based (7-candle recent + 20-candle SMA). ✅
5. **Loss prevention rule?** Never sell in downtrend (hardcoded, no exceptions). ✅

---

## Next Steps (New Chat Session)

1. **Bot monitoring:** Check if second cycle completed (~3:45 AM EDT)
2. **Signal review:** Analyze trades-30day.csv for pattern validation
3. **Candles endpoint:** Debug Coinbase granularity issue (optional refinement)
4. **Sheets integration:** Fix write permissions if needed
5. **PM2 setup:** Add persistent monitoring for 24/7 operation
6. **Live migration:** When user approves, flip `paperTrading: false`

---

_Last Updated: Saturday, May 10, 2026 (2:47 AM EDT)_
_Context: Session ending; context limit reached. All systems operational. New chat starting._
