#!/usr/bin/env node

const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const spreadsheetId = '1sOcmJG9g2NezJztlsxIjyjGrYPI4n9rseZFCkfQJEPg';

// Google Sheets service account credentials
const keyFile = path.join(__dirname, 'tidal-horizon-493821-i6-f3e32cca3b96.json');
const credentials = JSON.parse(fs.readFileSync(keyFile, 'utf8'));

// Gmail OAuth tokens for each account (from TOOLS.md)
const gmailAccounts = {
  'yourbesthealthquote@gmail.com': {
    accessToken: null, // Will be fetched from refresh token
    refreshToken: null, // Need to get this from stored session
  },
  'calvennstarre@gmail.com': {
    accessToken: 'ya29.a0AQvPyIPnyfR322_gtsvNVLCXU_uuK6tt99cTumnKgA5SvxwoN5lGxPPy49fwDHvXbbeKzaJ74PhgJZ8i5YW1amn0j5X9IHuT_t-T5eqGjLowKP_5k2hg3Eqe8-7iiqYuVdES5fMoLz2Wt01keR5rSB_xCuILk283LlI5ie_Gv5t6YzWLYd6izvagZL4yZpkRNtgQ_6waCgYKAWkSARUSFQHGX2MiHEO4BvLk3DDsgjnOOiGh5w0206',
    refreshToken: '1//01x_KeOPxoqh8CgYIARAAGAESNwF-L9Irq58H67BeR2AX_14SNdNDvyOfcVdtRgjYkkQSjFsjZT3iY4VCU9i2qH-1VHw16-EL-J8',
  },
  'caylenstarresfg@gmail.com': {
    accessToken: 'ya29.a0AQvPyIPkSTXhPJR4aq7rY3ZnmZT-4dxzgaXAQY9pRKlr6QSST4CfRX5ZtBu9NHjNQFhDyladvTwgLvJoWRVe95Jtd7FLMZVJpYcCqOTbfrPPRAANtFYhSI0Wu3etpWviHEq-Au4ylST5XC7rai1ujpQC-pRifxUWQKGzTnSeEoZMsZKo00z1KYT0AqWj_FJ6aydmoWEaCgYKAWsSARcSFQHGX2MijxmBbLM6KRblUtzOu-CMPQ0206',
    refreshToken: '1//01v0GHShmqz5KCgYIARAAGAESNwF-L9IrHnB2fhytknLlisGvyIMWPAXB6_EhLMMBCQRSQhewW9C07C0wGLWO4ubSOfI1fLhr14U',
  },
  'blackwellharreson@gmail.com': {
    accessToken: 'ya29.a0AQvPyIO0dYKIDc3lMjLEmue6mF_PQuAF282WVWaJ0Hbz36fJLfETrJCu5mgQgMG1Q4xLlY1IWt8sHZinUZn3NJYXJl2FHtjz8Oo2dRutf0EDODA_t4jACD6IEdwpfgVSEcPQ0T7x-jM0w3hrXC_LgwDdZ1jwCl1lLYYo5H6uRu_oTQbQY2wf2Wm08RQden14t9-AsaQaCgYKARwSARMSFQHGX2MiT0qtBR0xf8lBhl9CgAWHGQ0206',
    refreshToken: '1//01wf5x8cgSs6kCgYIARAAGAESNwF-L9IrLcDDyM47QGrC9-xUz5SSbH5ZoXf9zyNRhgsib7Bhs1BbxLxx7dy4sZlG7XSqvJFJmlU',
  },
};

// Task extraction rules by account
const taskRules = {
  'yourbesthealthquote@gmail.com': {
    keywords: ['certification', 'Medicare', 'supplement', 'Kristen', 'Kent', 'Bethany', 'Cigna', 'Claro'],
  },
  'calvennstarre@gmail.com': {
    keywords: ['task', 'todo', 'action', 'certification', 'Medicare'],
  },
  'caylenstarresfg@gmail.com': {
    keywords: ['certification', 'Medicare', 'Evelyn', 'BCBS', 'Cigna', 'commission'],
  },
  'blackwellharreson@gmail.com': {
    keywords: ['task', 'action', 'certification', 'Medicare'],
  },
};

// Pre-defined tasks extracted from emails (for this iteration)
const allTasks = [
  // yourbesthealthquote@gmail.com
  ['yourbesthealthquote@gmail.com', 'Claro - Late Payment Follow-up (Commissions)', 'Immediate', 'Pending', 'High', '$24.70 in commissions at risk - 1 policy in Late Payments. Log into ARC and review status'],
  ['yourbesthealthquote@gmail.com', 'Claro - Cigna 2027 ACA Market Exit Planning', '2027', 'Planning', 'High', '369k policyholders affected. Diversify portfolio: add Life, supplements, indemnity plans. Strengthen client relationships'],
  ['yourbesthealthquote@gmail.com', 'Claro - BCBS NC Contracting Application', 'TBD', 'New', 'High', 'Blue Cross/Blue Shield NC - Minimum 30 new enrolled members in 12 months. Must complete application personally. Performance-based contract'],
  ['yourbesthealthquote@gmail.com', 'Medicare Certification - Evelyn Diaz Lead (5 Medicare Cross-sells)', 'TBD', 'Research', 'High', 'Patrick Leberte (63, AL), MARYELLEN Tribby (63, FL), Patrice Miller (64, KS), Richard Miller (64, KS), Donna FRITZ (64, FL) - All on ACA with Medicare opportunity'],
  ['yourbesthealthquote@gmail.com', 'Life Insurance Certification - Evelyn Diaz Lead (2 Life Cross-sells)', 'TBD', 'Research', 'High', 'Hector Feliciano (41, FL), Darrell Stovall (51, OH) - ACA clients ready for Life insurance cross-sell'],
  ['yourbesthealthquote@gmail.com', 'Kristen Godfrey - FCRA Report Await', 'TBD', 'In Progress', 'High', 'Milliman IntelliScript Consumer Report expected next week - waiting on full medical records from her office'],
  ['yourbesthealthquote@gmail.com', 'Kent Dobey - Schedule Call', 'May 10-11 2026', 'Pending', 'High', "Health plans discussion - he's doing number crunching, needs to confirm his schedule for call"],
  ['yourbesthealthquote@gmail.com', 'Bethany Health Quote Follow-up', 'May 12 2026', 'Pending', 'Medium', "Health quote inquiry - follow-up needed on application status with Adam for life insurance ($1M 20-yr term @ $54.59/mo)"],
  
  // caylenstarresfg@gmail.com
  ['caylenstarresfg@gmail.com', '🚨 UnitedHealthcare Product Certification (CRITICAL)', 'June 7 2026', 'In Progress', 'CRITICAL', 'DEADLINE: 30 days from May 8. Party ID: 2972833. Create One Healthcare ID at www.uhcjarvis.com, complete at least 1 product certification to receive appointment. Contact: phd@uhc.com or (888) 381-8581'],
  ['caylenstarresfg@gmail.com', 'Medicare & Life Cross-Sell Opportunities (Evelyn Diaz)', 'TBD', 'Research', 'High', '7 ACA clients approaching Medicare eligibility (ages 63-65). Contact Evelyn Diaz: evelyn@purplesolutionsinsurance.com, 754-212-6162'],
  ['caylenstarresfg@gmail.com', 'BCBS NC Contracting Review', 'TBD', 'New', 'High', 'Blue Cross/Blue Shield NC - Minimum 30 new enrolled members in 12 months. Complete application at https://claroinsurance.activehosted.com/f/241'],
  ['caylenstarresfg@gmail.com', 'Cigna ACA Market Exit - Strategic Planning', '2027', 'Planning', 'High', 'Cigna exiting 2027. Opportunities to diversify into Medicare Supplement and Life Insurance'],
  ['caylenstarresfg@gmail.com', 'Claro Commission Recovery', 'Immediate', 'Pending', 'High', 'Check ARC system for late payments. Log in at https://arc.claroinsurance.com'],
  
  // calvennstarre@gmail.com
  ['calvennstarre@gmail.com', 'Email Account Setup', 'TBD', 'Pending', 'Medium', 'Review inbox for certification-related tasks and business requirements'],
  
  // blackwellharreson@gmail.com
  ['blackwellharreson@gmail.com', 'Email Account Setup', 'TBD', 'Pending', 'Medium', 'Review inbox for certification-related tasks and business requirements'],
];

const headers = ['Email Account', 'Task Name', 'Due Date', 'Status', 'Priority', 'Notes'];

async function main() {
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    const sheets = google.sheets({ version: 'v4', auth });

    console.log('Updating multi-account Tasks sheet in Google Sheets...');

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
    console.log(`   Rows updated: ${updateResponse.data.updatedRows}`);
    console.log(`   Tasks added: ${allTasks.length}`);
    console.log(`\n📧 Tasks by Email Account:`);
    
    const tasksByAccount = {};
    allTasks.forEach(task => {
      const account = task[0];
      tasksByAccount[account] = (tasksByAccount[account] || 0) + 1;
    });
    
    Object.entries(tasksByAccount).forEach(([account, count]) => {
      console.log(`   • ${account}: ${count} tasks`);
    });
    
    console.log(`\nSheet URL: https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=0`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
