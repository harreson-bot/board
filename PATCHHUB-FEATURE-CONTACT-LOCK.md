# PatchHub Feature Spec: Contact Lock/Block System

## Overview
Implement a contact lock/block feature for the PatchHub CRM to allow ambassadors to protect certain contacts from being contacted, matched, or engaged with through the platform.

## Use Cases
1. **Personal exclusions:** Contacts that are close friends/family and shouldn't be contacted for business
2. **Business restrictions:** Contacts currently working with another ambassador (exclusive territory)
3. **Opt-out protection:** People who've requested not to be contacted (TCPA compliance)
4. **Competitive restrictions:** Contacts represented by competing ambassadors
5. **Import screening:** Identify and exclude off-limit contacts during bulk imports

## Feature Requirements

### 1. Import-Time Screening
**Dialog during CSV/VCF import:**
```
"Before importing, review off-limit contacts.
 Do any of these people need to be blocked from outreach?"
```
- Show matching contacts already in the system
- Allow user to flag new off-limit contacts before import
- Option to skip or proceed with import

### 2. Contact Lock/Block Interface
Each contact card should have:
- **Lock icon** (🔒) to mark contact as "blocked"
- **Block reason dropdown:**
  - Personal (friend/family)
  - Exclusive territory
  - Opt-out request
  - Already working with competitor
  - Other (custom reason)
- **Unblock option** (restore to normal engagement)

### 3. Enforcement Rules
When a contact is locked:
- ❌ Cannot be matched to new products
- ❌ Won't appear in "suggested outreach" lists
- ❌ Can't be added to DM automation workflows
- ❌ Won't be included in bulk engagement campaigns
- ✅ Can still view existing conversations
- ✅ Can still log notes (for reference)

### 4. Dashboard Visibility
- Show count of locked vs. active contacts
- "Locked contacts" view with reason/date locked
- Quick-unlock button for accidental locks

### 5. Data Export/Sync
- Locked status should be preserved in contact exports
- When syncing with upstream systems, locked contacts flagged appropriately

## Technical Implementation

### Database Schema (PostgreSQL)
```sql
ALTER TABLE contacts ADD COLUMN (
  is_locked BOOLEAN DEFAULT FALSE,
  lock_reason VARCHAR(50), -- personal | exclusive | opt_out | competitor | other
  lock_custom_reason TEXT,
  locked_at TIMESTAMP,
  locked_by UUID REFERENCES users(id)
);

CREATE INDEX idx_contacts_locked ON contacts(customer_id, is_locked);
```

### API Endpoints
```
POST /api/contacts/:id/lock
  { reason: "string", customReason?: "string" }

POST /api/contacts/:id/unlock

GET /api/contacts/locked
  returns: { count, contacts: [] }

PUT /api/contacts/batch-lock
  { contactIds: [], reason: "string" }
```

### Frontend Components
1. **ContactCard.js** - Add lock button + badge
2. **ImportDialog.js** - Pre-import screening step
3. **LockedContactsView.js** - Dashboard page showing locked contacts
4. **LockReasonModal.js** - Dialog for selecting lock reason

## Workflow Example

```
Ambassador uploads CSV with 500 contacts
↓
System checks for matches with locked contacts
↓
Import dialog shows: "5 contacts match your locked list"
↓
User can: View them, add new blocks, or skip
↓
Import proceeds, respecting all locked status
↓
Automation engine filters locked contacts from workflows
```

## TCPA/Compliance Benefits
- Audit trail of who locked contacts and when
- Export locked contact list for compliance reports
- Prevents accidental TCPA violations by blocking flagged numbers

## Timeline
- **Week 2-3** (May 12-18): Database + API endpoints
- **Week 3-4** (May 19-25): Frontend components + import screening
- **Week 4-5** (May 26-Jun 1): Enforcement in automation engine, testing
- **By Jun 2:** Ready for SuperPatch deployment

## Success Metrics
- ✅ Zero locked contacts appearing in automated outreach
- ✅ <2 sec query time for 10K+ contacts (with index)
- ✅ 95%+ accuracy of pre-import screening
- ✅ Ambassador feedback: "Easy to manage blocked contacts"
