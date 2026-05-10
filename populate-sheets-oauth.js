#!/usr/bin/env node

const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

// Use yourbesthealthquote@gmail.com OAuth - it's the sheet owner
// For now, we'll use a simpler approach with direct API call

const spreadsheetId = '1sOcmJG9g2NezJztlsxIjyjGrYPI4n9rseZFCkfQJEPg';

// Certification tasks
const tasks = [
  ['Kristen Godfrey - FCRA Report Await', 'TBD', 'In Progress', 'High', 'Milliman IntelliScript Consumer Report expected next week - waiting on full medical records from her office'],
  ['Kent Dobey - Schedule Call', 'May 10-11 2026', 'Pending', 'High', "Health plans discussion - he's doing number crunching, needs to confirm his schedule for call"],
  ['Cigna 2027 ACA Market Exit', '2027', 'Planning', 'High', 'Cigna exiting ACA market - impacts ~369k policyholders. Start client transition planning for affected accounts'],
  ['BCBS NC Contracting Review', 'TBD', 'New', 'Medium', 'BCBS North Carolina contracting is now open - review opportunities and requirements'],
  ['Bethany Health Quote Follow-up', 'May 12 2026', 'Pending', 'Medium', "Health quote inquiry - follow-up needed on application status with Adam for life insurance ($1M 20-yr term @ $54.59/mo)"],
  ['Medicare & Life Opportunities', 'TBD', 'Research', 'Medium', 'Purple Solutions Insurance - Evelyn Diaz opportunities for Medicare and Life policies'],
  ['CoStar Insurance - Life Insurance', 'TBD', 'Research', 'Low', 'Marc Cohen launched CoStar Insurance with new life insurance offerings - review partnership opportunities']
];

const headers = ['Task Name', 'Due Date', 'Status', 'Priority', 'Notes'];

async function main() {
  try {
    // Use service account with direct credentials
    const keyFile = path.join(__dirname, 'tidal-horizon-493821-i6-f3e32cca3b96.json');
    const credentials = JSON.parse(fs.readFileSync(keyFile, 'utf8'));

    // Create auth using fromJSON which handles the key properly
    const auth = new google.auth.GoogleAuth({
      credentials: credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    const sheets = google.sheets({ version: 'v4', auth });

    console.log('Connecting to Google Sheets API...');

    // Try to get sheet metadata
    const sheetMetadata = await sheets.spreadsheets.get({
      spreadsheetId
    });

    console.log('✅ Connected to spreadsheet');

    // Check if Tasks sheet exists
    const existingSheets = sheetMetadata.data.sheets || [];
    const tasksSheet = existingSheets.find(s => s.properties.title === 'Tasks');

    if (!tasksSheet) {
      console.log('Creating "Tasks" sheet...');
      const addSheetResponse = await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: 'Tasks'
                }
              }
            }
          ]
        }
      });
      console.log('✅ Tasks sheet created');
    } else {
      console.log('Tasks sheet already exists');
    }

    // Clear any existing data
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: 'Tasks!A1:Z1000'
    });

    // Prepare all data (headers + tasks)
    const allData = [headers, ...tasks];

    // Write to sheet
    const updateResponse = await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Tasks!A1',
      valueInputOption: 'RAW',
      requestBody: {
        values: allData
      }
    });

    console.log(`✅ Successfully populated Google Sheet`);
    console.log(`   Rows updated: ${updateResponse.data.updatedRows}`);
    console.log(`   Headers: ${headers.join(' | ')}`);
    console.log(`   Tasks added: ${tasks.length}`);
    console.log(`\nSheet URL: https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=0`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.errors) {
      console.error('Details:', error.errors);
    }
    process.exit(1);
  }
}

main();
