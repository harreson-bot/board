#!/usr/bin/env node

const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

// Service account credentials
const keyFile = path.join(__dirname, 'tidal-horizon-493821-i6-f3e32cca3b96.json');
const credentials = JSON.parse(fs.readFileSync(keyFile, 'utf8'));

// Google Sheet ID (from your URL)
const spreadsheetId = '1sOcmJG9g2NezJztlsxIjyjGrYPI4n9rseZFCkfQJEPg';

// Certification tasks
const tasks = [
  {
    taskName: 'Kristen Godfrey - FCRA Report Await',
    dueDate: 'TBD',
    status: 'In Progress',
    priority: 'High',
    notes: 'Milliman IntelliScript Consumer Report expected next week - waiting on full medical records from her office'
  },
  {
    taskName: 'Kent Dobey - Schedule Call',
    dueDate: 'May 10-11 2026',
    status: 'Pending',
    priority: 'High',
    notes: "Health plans discussion - he's doing number crunching, needs to confirm his schedule for call"
  },
  {
    taskName: 'Cigna 2027 ACA Market Exit',
    dueDate: '2027',
    status: 'Planning',
    priority: 'High',
    notes: 'Cigna exiting ACA market - impacts ~369k policyholders. Start client transition planning for affected accounts'
  },
  {
    taskName: 'BCBS NC Contracting Review',
    dueDate: 'TBD',
    status: 'New',
    priority: 'Medium',
    notes: 'BCBS North Carolina contracting is now open - review opportunities and requirements'
  },
  {
    taskName: 'Bethany Health Quote Follow-up',
    dueDate: 'May 12 2026',
    status: 'Pending',
    priority: 'Medium',
    notes: "Health quote inquiry - follow-up needed on application status with Adam for life insurance ($1M 20-yr term @ $54.59/mo)"
  },
  {
    taskName: 'Medicare & Life Opportunities',
    dueDate: 'TBD',
    status: 'Research',
    priority: 'Medium',
    notes: 'Purple Solutions Insurance - Evelyn Diaz opportunities for Medicare and Life policies'
  },
  {
    taskName: 'CoStar Insurance - Life Insurance',
    dueDate: 'TBD',
    status: 'Research',
    priority: 'Low',
    notes: 'Marc Cohen launched CoStar Insurance with new life insurance offerings - review partnership opportunities'
  }
];

async function main() {
  try {
    // Create JWT client
    const jwtClient = new google.auth.JWT(
      credentials.client_email,
      null,
      credentials.private_key,
      ['https://www.googleapis.com/auth/spreadsheets']
    );

    // Authorize
    await jwtClient.authorize();

    // Create sheets client
    const sheets = google.sheets({ version: 'v4', auth: jwtClient });

    // Step 1: Check if "Tasks" sheet exists, create if not
    let sheetId = null;
    const sheetMetadata = await sheets.spreadsheets.get({
      spreadsheetId
    });

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
      sheetId = addSheetResponse.data.replies[0].addSheet.properties.sheetId;
    } else {
      sheetId = tasksSheet.properties.sheetId;
      console.log('Tasks sheet already exists');
    }

    // Step 2: Add headers
    const headers = ['Task Name', 'Due Date', 'Status', 'Priority', 'Notes'];
    
    // Step 3: Prepare rows
    const rows = tasks.map(task => [
      task.taskName,
      task.dueDate,
      task.status,
      task.priority,
      task.notes
    ]);

    // Step 4: Clear existing data (optional)
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: 'Tasks!A1:Z1000'
    });

    // Step 5: Add headers and data
    const allData = [headers, ...rows];
    
    const updateResponse = await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Tasks!A1',
      valueInputOption: 'RAW',
      requestBody: {
        values: allData
      }
    });

    console.log(`✅ Successfully updated ${updateResponse.data.updatedRows} rows in Google Sheet`);
    console.log(`   Headers: ${headers.join(' | ')}`);
    console.log(`   Tasks added: ${tasks.length}`);

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
