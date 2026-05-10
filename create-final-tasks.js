#!/usr/bin/env node

const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const spreadsheetId = '1sOcmJG9g2NezJztlsxIjyjGrYPI4n9rseZFCkfQJEPg';
const keyFile = path.join(__dirname, 'tidal-horizon-493821-i6-f3e32cca3b96.json');
const credentials = JSON.parse(fs.readFileSync(keyFile, 'utf8'));

// All tasks extracted and properly attributed to correct email accounts
const allTasks = [
  // ===== yourbesthealthquote@gmail.com =====
  ['yourbesthealthquote@gmail.com', 'Claro - Recover Pending Commissions ($24.70)', 'Immediate', 'Pending', 'High', 'Log into ARC at https://arc.claroinsurance.com. Review My Business → Binder/Late Payments. 1 policy in late payment status'],
  ['yourbesthealthquote@gmail.com', 'Cigna 2027 ACA Market Exit - Client Planning', '2027', 'Planning', 'High', '369k policyholders affected across 11 states. Diversify portfolio: add Life, supplements, indemnity plans. Strengthen client relationships'],
  ['yourbesthealthquote@gmail.com', 'BCBS NC Contracting Application', 'TBD', 'New', 'High', 'Blue Cross/Blue Shield NC open for contracting. Minimum 30 enrolled members required in 12 months. Complete personally at https://claroinsurance.activehosted.com/f/241'],
  ['yourbesthealthquote@gmail.com', 'Kristen Godfrey - FCRA/Medical Records Follow-up', 'TBD', 'In Progress', 'High', 'Milliman IntelliScript Consumer Report awaiting. Medical records expected next week from her office. Schedule call to review before insurance company submission'],
  ['yourbesthealthquote@gmail.com', 'Kent Dobey - Schedule Health Plans Discussion Call', 'May 10-11 2026', 'Pending', 'High', 'He needs to confirm his schedule. Discuss health plan options and number crunching results'],
  ['yourbesthealthquote@gmail.com', 'Bethany - Health Quote Application Follow-up', 'May 12 2026', 'Pending', 'Medium', "Contact re: application status. Adam's life insurance: $1M 20-yr term @ $54.59/mo. Send brochure + application + state license"],
  ['yourbesthealthquote@gmail.com', 'Evelyn Diaz - Medicare/Life Cross-Sell Opportunities', 'TBD', 'Research', 'High', '7 ACA clients ready for Medicare/Life transitions. Ages 63-65. Contact: evelyn@purplesolutionsinsurance.com, 754-212-6162'],
  ['yourbesthealthquote@gmail.com', 'CoStar Insurance - Life Insurance Partnership', 'TBD', 'Research', 'Medium', 'Marc Cohen launched CoStar Insurance with life insurance offerings. Review partnership opportunities. Contact: marc@costarinsurance.com'],

  // ===== caylenstarresfg@gmail.com =====
  ['caylenstarresfg@gmail.com', '🚨 UnitedHealthcare Product Certification (CRITICAL)', 'June 7 2026', 'In Progress', 'CRITICAL', 'DEADLINE: 30 days from May 8. Party ID: 2972833. Create One Healthcare ID at www.uhcjarvis.com. Complete at least 1 product certification to receive appointment. Contact: phd@uhc.com or (888) 381-8581'],
  ['caylenstarresfg@gmail.com', '🚨 Aetna 2026 Medicare Certification (DUE)', 'May 31 2026', 'Pending', 'CRITICAL', '5th Request from PFS Support Health. Aetna Medicare certification must be completed. Access: Aetna broker portal. Contact: MedicareBrokerNews@comms.aetna.com'],
  ['caylenstarresfg@gmail.com', 'HealthSpring Supplemental Benefits - Products Available', 'TBD', 'Research', 'High', 'HealthSpring Medicare Supplement line now available. Training, wincentive rewards, and member support resources. Contact broker team for contracting'],
  ['caylenstarresfg@gmail.com', 'Wellcare - Medicare Supplement Product Closure Notice', 'June 1 2026', 'Action Required', 'High', 'As of June 1, 2026, Centene Corp closing Medicare Supplement products through Wellcare. Notify clients. Transition plans needed'],
  ['caylenstarresfg@gmail.com', 'NR License Expiration Alert', 'TBD', 'Pending', 'High', 'Centene notification: NR license expiration notice received. Check expiration date and renewal requirements'],
  ['caylenstarresfg@gmail.com', 'United American - Appointment Invitation', 'TBD', 'New', 'High', 'Agent appointment invitation received from United American. Review invitation and appointment requirements'],
  ['caylenstarresfg@gmail.com', 'Medicare/Cross-Selling Training - Evelyn Diaz', 'May 23 2026 11am EDT', 'Scheduled', 'Medium', 'Confirmed attendees: Zachery Cohen, Karisma, Bobbie Cohen. Training on Medicare and cross-selling opportunities'],
  ['caylenstarresfg@gmail.com', 'Mutual of Omaha - Hospital Indemnity Opportunities', 'TBD', 'Research', 'Medium', 'Hospital indemnity state information and sales opportunities. Multiple emails with tools, rates, and wincentive programs'],
  ['caylenstarresfg@gmail.com', 'Foresters - GIACT Validation and Text-to-Sign Updates', 'TBD', 'Research', 'Medium', 'Effective April 26: GIACT validation on in-force banking changes. Text-to-Sign feature reduces application steps'],
  ['caylenstarresfg@gmail.com', 'Ambetter Health - Terminated Policy Recoupment', 'TBD', 'Pending', 'High', 'Monthly review of bonus program payments. Recoupment on terminated policies. Review for any commissions due'],
  ['caylenstarresfg@gmail.com', 'Indeed Job Openings - Remote Sales & Customer Service', 'TBD', 'Reference', 'Low', 'Inbound Sales Representative, Customer Care Agent (SelectQuote), Detention Officer roles matched to background. Archive or delete as needed'],

  // ===== calvennstarre@gmail.com =====
  ['calvennstarre@gmail.com', 'Review Email Inbox for Business Tasks', 'TBD', 'Pending', 'Medium', 'Unread messages include trading, crypto, and business subscriptions. Review for any certification or business action items'],

  // ===== blackwellharreson@gmail.com =====
  ['blackwellharreson@gmail.com', 'Review Email Inbox for Business Tasks', 'TBD', 'Pending', 'Medium', 'New account setup. Review inbox for any certification or business action items'],
];

const headers = ['Email Account', 'Task Name', 'Due Date', 'Status', 'Priority', 'Notes'];

async function main() {
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    const sheets = google.sheets({ version: 'v4', auth });

    console.log('📋 Updating Tasks spreadsheet with comprehensive task list...\n');

    // Clear existing data
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: 'Tasks!A1:Z1000'
    });

    // Prepare data
    const allData = [headers, ...allTasks];

    // Update sheet
    const updateResponse = await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Tasks!A1',
      valueInputOption: 'RAW',
      requestBody: {
        values: allData
      }
    });

    console.log(`✅ Successfully updated Google Sheet`);
    console.log(`   Total rows updated: ${updateResponse.data.updatedRows}`);
    console.log(`   Total tasks: ${allTasks.length}\n`);
    
    const tasksByAccount = {};
    allTasks.forEach(task => {
      const account = task[0];
      tasksByAccount[account] = (tasksByAccount[account] || 0) + 1;
    });
    
    console.log('📧 Tasks by Email Account:');
    Object.entries(tasksByAccount).forEach(([account, count]) => {
      console.log(`   • ${account}: ${count} tasks`);
    });
    
    console.log(`\n🔗 View your updated sheet: https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=0`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
