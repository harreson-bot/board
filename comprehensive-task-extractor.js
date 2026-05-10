#!/usr/bin/env node

const fs = require('fs');
const https = require('https');

const CLIENT_ID = '1042289182085-k4nki44g908fvbcmvhqrmlfo8rmp1u9t.apps.googleusercontent.com';
const CLIENT_SECRET = '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';

// Refresh tokens for each account
const accounts = {
  'calvennstarre@gmail.com': {
    refreshToken: '1//01x_KeOPxoqh8CgYIARAAGAESNwF-L9Irq58H67BeR2AX_14SNdNDvyOfcVdtRgjYkkQSjFsjZT3iY4VCU9i2qH-1VHw16-EL-J8',
  },
  'caylenstarresfg@gmail.com': {
    refreshToken: '1//01v0GHShmqz5KCgYIARAAGAESNwF-L9IrHnB2fhytknLlisGvyIMWPAXB6_EhLMMBCQRSQhewW9C07C0wGLWO4ubSOfI1fLhr14U',
  },
  'blackwellharreson@gmail.com': {
    refreshToken: '1//01wf5x8cgSs6kCgYIARAAGAESNwF-L9IrLcDDyM47QGrC9-xUz5SSbH5ZoXf9zyNRhgsib7Bhs1BbxLxx7dy4sZlG7XSqvJFJmlU',
  },
};

function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(body));
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${body}`));
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function getAccessToken(refreshToken) {
  const options = {
    hostname: 'oauth2.googleapis.com',
    port: 443,
    path: '/token',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const response = await makeRequest(options, {
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });

  return response.access_token;
}

async function getAllMessages(accessToken) {
  const options = {
    hostname: 'www.googleapis.com',
    port: 443,
    path: `/gmail/v1/users/me/messages?maxResults=100`,
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  };

  const response = await makeRequest(options);
  return response.messages || [];
}

async function getMessage(accessToken, messageId) {
  const options = {
    hostname: 'www.googleapis.com',
    port: 443,
    path: `/gmail/v1/users/me/messages/${messageId}?format=full`,
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  };

  try {
    return await makeRequest(options);
  } catch (err) {
    console.error(`    Error fetching message ${messageId}`);
    return null;
  }
}

function extractMessageText(message) {
  const headers = message.payload.headers || [];
  const subject = headers.find(h => h.name === 'Subject')?.value || '';
  const from = headers.find(h => h.name === 'From')?.value || '';
  const date = headers.find(h => h.name === 'Date')?.value || '';
  
  let body = '';
  if (message.payload.parts) {
    const textPart = message.payload.parts.find(p => p.mimeType === 'text/plain');
    if (textPart && textPart.body && textPart.body.data) {
      body = Buffer.from(textPart.body.data, 'base64').toString('utf-8');
    }
  } else if (message.payload.body && message.payload.body.data) {
    body = Buffer.from(message.payload.body.data, 'base64').toString('utf-8');
  }
  
  return { subject, from, date, body };
}

async function extractTasksFromAccount(email, refreshToken) {
  console.log(`\n📧 ${email}`);
  console.log('═'.repeat(80));
  
  const accessToken = await getAccessToken(refreshToken);
  const messages = await getAllMessages(accessToken);
  
  console.log(`Found ${messages.length} total messages. Reading content...`);
  
  const tasks = [];
  
  for (let i = 0; i < Math.min(50, messages.length); i++) {
    const msg = await getMessage(accessToken, messages[i].id);
    if (!msg) continue;
    
    const { subject, from, date, body } = extractMessageText(msg);
    
    // Skip generic/unimportant emails
    if (subject.includes('Security alert') || subject.includes('verification')) {
      continue;
    }
    
    console.log(`\n  [${i+1}] From: ${from}`);
    console.log(`      Subject: ${subject}`);
    console.log(`      Date: ${date}`);
    console.log(`      Preview: ${body.substring(0, 100).replace(/\n/g, ' ')}`);
    
    // Parse task information based on email content
    if (subject.toLowerCase().includes('certification') || 
        subject.toLowerCase().includes('uhc') || 
        subject.toLowerCase().includes('product')) {
      
      let taskName = subject.substring(0, 50);
      let dueDate = 'TBD';
      let priority = 'High';
      let notes = body.substring(0, 200);
      
      // Extract specific requirements
      if (subject.includes('UnitedHealthcare') || subject.includes('UHC')) {
        taskName = '🚨 UnitedHealthcare Product Certification (CRITICAL)';
        dueDate = 'June 7 2026';
        priority = 'CRITICAL';
        notes = 'Party ID: 2972833. 30-day deadline from May 8. Complete at www.uhcjarvis.com. Contact: phd@uhc.com or (888) 381-8581';
      }
      
      tasks.push({
        account: email,
        taskName,
        dueDate,
        status: 'Pending',
        priority,
        notes,
      });
    }
  }
  
  return tasks;
}

async function main() {
  console.log('COMPREHENSIVE EMAIL REVIEW & TASK EXTRACTION');
  console.log('═'.repeat(80));
  
  const allTasks = [];
  
  // Process each account
  for (const [email, config] of Object.entries(accounts)) {
    try {
      const tasks = await extractTasksFromAccount(email, config.refreshToken);
      allTasks.push(...tasks);
    } catch (err) {
      console.error(`❌ Error processing ${email}:`, err.message);
    }
  }
  
  console.log('\n' + '═'.repeat(80));
  console.log('\n📋 EXTRACTED TASKS SUMMARY\n');
  
  const tasksByAccount = {};
  allTasks.forEach(task => {
    if (!tasksByAccount[task.account]) {
      tasksByAccount[task.account] = [];
    }
    tasksByAccount[task.account].push(task);
  });
  
  for (const [account, tasks] of Object.entries(tasksByAccount)) {
    console.log(`${account}:`);
    tasks.forEach((task, idx) => {
      console.log(`  ${idx + 1}. ${task.taskName}`);
      console.log(`     Due: ${task.dueDate} | Priority: ${task.priority}`);
    });
    console.log();
  }
  
  // Save to JSON for next step
  fs.writeFileSync(path.join(__dirname, 'extracted-tasks.json'), JSON.stringify(allTasks, null, 2));
  console.log('✅ Tasks saved to extracted-tasks.json');
}

const path = require('path');
main().catch(console.error);
