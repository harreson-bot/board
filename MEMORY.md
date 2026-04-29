# MEMORY.md - Long-Term Memory

_Curated memories and significant context. Updated on Tuesday, April 28th, 2026._

## Workspace Setup

- **First memory sync:** April 28, 2026
- **Workspace location:** `/home/harreson/.openclaw/workspace`
- **Active projects:** 
  - `calvennstarre-website` (static site, git-tracked) — STABLE
  - `engagement-crm` (Node.js CRM, 3 instances on DreamHost) — STABLE
  - **PatchHub** (NEW | SaaS platform for SuperPatch) — LAUNCHING MAY 5 🚀

## PatchHub — White-Label SaaS Platform (NEW | Apr 28, 2026) 🚀

**Objective:** Build SaaS platform for SuperPatch ambassadors (and other MLM companies) to automate contact matching, social engagement, and DM automation. Launch SuperPatch first, then resell to other companies.

**Status:** ARCHITECTURE FINALIZED. Development starts May 5, 2026 (6-week timeline to MVP).

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

**Why this stack?**
- Static HTML = AI-friendly for white-labeling, zero maintenance
- Node.js = API-driven, perfect for automation, scales easily
- Docker = new customer = new container (zero manual ops)
- Per-customer DB = security + GDPR compliance

### Tech Decisions

| Decision | Alternative Rejected | Why |
|----------|---------------------|-----|
| Static HTML (not WordPress) | WordPress | Easy to duplicate, no CMS complexity |
| Node.js/Express | Django, Rails | Full-stack JavaScript, good for APIs |
| Generect API ($0.01-0.02) | Snov.io ($0.039), Hunter ($0.03-0.05) | Cheapest + real-time, better margins |
| Docker containers | Manual deployments | Automate white-label customer setup |
| Per-customer database | Shared database | Security, GDPR, easier debugging |
| Setup fee + monthly | Commission-based (like Nowsite) | Own the business, recurring revenue |

### Infrastructure (Credentials in TOOLS.md)

**patchhub.solutions (Marketing):**
- Host: vps48233.dreamhostps.com
- SSH User: dh_edrxnc
- SSH Pass: #KingP@tch26#

**app.patchhub.solutions (Platform):**
- Host: vps48233.dreamhostps.com
- SSH User: patch_app
- SSH Pass: #KingP@tch26#

Both on shared DreamHost VPS, SSH enabled.

### Timeline (6 Weeks)

- **Week 1 (May 5-11):** Marketing site + CSV importer + contact matcher
- **Week 2 (May 12-18):** CRM dashboard + engagement logging
- **Week 3 (May 19-25):** DM automation framework + Meta cert in progress
- **Week 4 (May 26-Jun 1):** Analytics dashboard + Stripe integration
- **Week 5-6 (Jun 2-15):** Polish, white-label ready, testing
- **By Jun 16:** Live and ready for resale

### Pricing Model (FINAL)

| Tier | Setup | Monthly | Margin |
|------|-------|---------|--------|
| Individual | $99 | $19 | ~70% |
| Super Ambassador | $299 | $79 | ~75% |
| Agency/White-Label | $999 | $399 | ~80% |
| SuperPatch (B2B) | — | $15/amb OR $1,500 flat | TBD |

### Accountability Measures (Calvenn Requirement)

**"Audit everything before making changes. Maintain integrity. Don't lose progress."**

Implemented:
1. **Pre-change protocol:** Audit → Backup → Develop in branch → Review → Deploy → Log
2. **CHANGELOG.md:** Every change timestamped (what, why, commit hash, status)
3. **Git audit trail:** Complete history, always reversible via `git revert`
4. **Daily standup:** What's done, what's next, blockers
5. **Trello cards:** Kanban (To Do → In Progress → Testing → Done)
6. **Backup automation:** Pre-deploy snapshots, daily git pushes, weekly full exports

### Calvenn's Action Items (CRITICAL — Due Before May 5)

1. **Contact SuperPatch support** (support@superpatch.com)
   - Request bulk export of Resources (launch.superpatch.com)
   - Request Policies, Affiliate Agreement, Terms
   - Request third-party tool integration guidelines

2. **Hire compliance lawyer**
   - MLM/direct-selling specialization required
   - Budget: $2-5k for initial review
   - Review: SuperPatch agreement, FTC compliance, messaging rules

3. **Apply for Meta Business Partner cert**
   - https://business.facebook.com/partners (free, 2-4 weeks)
   - Required for DM automation

### Files Created (All Committed to GitHub)

- **patchhub-project-brief.md** — Full architecture, features, costs, governance (9.6 KB)
- **patchhub-CHANGELOG.md** — Change tracking template (6.3 KB)
- **PATCHHUB-SESSION-SUMMARY.md** — Quick reference of decisions + action items (8.9 KB)
- **memory/2026-04-28.md** — Detailed daily session notes (6.5 KB)
- **TOOLS.md** — Updated with PatchHub credentials

### Why PatchHub Wins vs. Nowsite

| Factor | Nowsite | PatchHub |
|--------|---------|----------|
| Contact matching | ❌ Missing | ✅ Core differentiator |
| Pricing model | Commission-based | ✅ Setup + monthly (own it) |
| White-label ready | ❌ Hard | ✅ Docker trivializes it |
| Transparency | Changes comp plan often | ✅ Fixed, clear pricing |
| API margins | High (Snov.io $0.039) | ✅ Low (Generect $0.01-0.02) |
| Trustpilot | 2.5/5 stars | ✅ Will be better |

### Cost Breakdown (First 6 Months)

- DreamHost VPS: $0 (shared)
- Generect API (6K contacts): $90-150 initial + $50-100/mo
- Domain: $40/yr
- Development: 6 weeks (DIY)
- **Total:** ~$1,500-2,000 (minimal, high margin)

### Key Learnings

1. **Static HTML for marketing ≠ WordPress** — Easier to automate, no maintenance headache
2. **Node.js containerization** — One Docker command = new customer instance (game-changer for resale)
3. **Generect API** — Cheapest contact enrichment; better margins than Snov.io/Hunter
4. **Facebook contact upload deprecated** — Build own matcher instead; more control, more defensible
5. **Accountability must be built-in** — Change protocol, changelog, git audit trail are non-negotiable

---

**Last Updated:** Tuesday, April 28, 2026 (8:18 PM EDT) — PatchHub architecture finalized, documentation created, Trello cards set, ready for May 5 kickoff
