#!/usr/bin/env node

const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const spreadsheetId = '1sOcmJG9g2NezJztlsxIjyjGrYPI4n9rseZFCkfQJEPg';

// Expanded certification tasks including Medicare, Supplements, Life Insurance requirements
const tasks = [
  // Claro Insurance Business Requirements
  ['Claro - Late Payment Follow-up (Commissions)', 'Immediate', 'Pending', 'High', '$24.70 in commissions at risk - 1 policy in Late Payments. Log into ARC and review status'],
  ['Claro - Cigna 2027 ACA Market Exit Planning', '2027', 'Planning', 'High', '369k policyholders affected. Diversify portfolio: add Life, supplements, indemnity plans. Strengthen client relationships'],
  ['Claro - BCBS NC Contracting Application', 'TBD', 'New', 'High', 'Blue Cross/Blue Shield NC - Minimum 30 new enrolled members in 12 months. Must complete application personally. Performance-based contract'],
  
  // Purple Solutions Insurance - Medicare & Life Opportunities
  ['Medicare Certification - Evelyn Diaz Lead (4 Medicare Cross-sells)', 'TBD', 'Research', 'High', 'Patrick Leberte (63, AL), MARYELLEN Tribby (63, FL), Patrice Miller (64, KS), Richard Miller (64, KS), Donna FRITZ (64, FL) - All on ACA with Medicare opportunity'],
  ['Life Insurance Certification - Evelyn Diaz Lead (2 Life Cross-sells)', 'TBD', 'Research', 'High', 'Hector Feliciano (41, FL), Darrell Stovall (51, OH) - ACA clients ready for Life insurance cross-sell'],
  
  // Customer-Specific Certification Tasks
  ['Kristen Godfrey - FCRA Report Await', 'TBD', 'In Progress', 'High', 'Milliman IntelliScript Consumer Report expected next week - waiting on full medical records from her office'],
  ['Kent Dobey - Schedule Call', 'May 10-11 2026', 'Pending', 'High', 'Health plans discussion - he\'s doing number crunching, needs to confirm his schedule for call'],
  ['Bethany Health Quote Follow-up', 'May 12 2026', 'Pending', 'Medium', 'Health quote inquiry - follow-up needed on application status with Adam for life insurance ($1M 20-yr term @ $54.59/mo)'],
];

const headers = ['Task Name', 'Due Date', 'Status', 'Priority', 'Notes'];

async function main() {
  try {
    const keyFile = path.join(__dirname, 'tidal-horizon-493821-i6-f3e32cca3b96.json');
    const credentials = JSON.parse(fs.readFileSync(keyFile, 'utf8'));

    const auth = new google.auth.GoogleAuth({
      credentials: credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    const sheets = google.sheets({ version: 'v4', auth });

    console.log('Updating certification tasks in Google Sheet...');

    // Clear and update sheet
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: 'Tasks!A1:Z1000'
    });

    const allData = [headers, ...tasks];

    const updateResponse = await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Tasks!A1',
      valueInputOption: 'RAW',
      requestBody: {
        values: allData
      }
    });

    console.log(`✅ Successfully updated Google Sheet`);
    console.log(`   Rows updated: ${updateResponse.data.updatedRows}`);
    console.log(`   Tasks added: ${tasks.length}`);
    console.log(`\n📋 Tasks Include:`);
    console.log(`   • Claro Insurance business requirements (3 items)`);
    console.log(`   • Medicare certification opportunities (4 clients)`);
    console.log(`   • Life insurance certification opportunities (2 clients)`);
    console.log(`   • Customer follow-ups (3 items)`);
    console.log(`\nSheet URL: https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=0`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
