#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');

// Client credentials from Google Cloud Console
const CLIENT_ID = '1042289182085-k4nki44g908fvbcmvhqrmlfo8rmp1u9t.apps.googleusercontent.com';
const CLIENT_SECRET = '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';

// Refresh tokens for each account (from TOOLS.md)
const accounts = {
  'yourbesthealthquote@gmail.com': {
    refreshToken: null, // This account was authenticated but token not stored - will skip for now
  },
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

// Helper: Make HTTPS request
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

// Get new access token from refresh token
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

// Get Gmail messages for an account
async function getGmailMessages(email, accessToken) {
  const options = {
    hostname: 'www.googleapis.com',
    port: 443,
    path: '/gmail/v1/users/me/messages?maxResults=50&q=is:unread',
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  };

  try {
    const response = await makeRequest(options);
    return response.messages || [];
  } catch (err) {
    console.error(`Error fetching messages for ${email}:`, err.message);
    return [];
  }
}

// Get full message content
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
    console.error(`Error fetching message ${messageId}:`, err.message);
    return null;
  }
}

// Extract text from message
function extractMessageText(message) {
  const headers = message.payload.headers || [];
  const subject = headers.find(h => h.name === 'Subject')?.value || '';
  const from = headers.find(h => h.name === 'From')?.value || '';
  
  let body = '';
  if (message.payload.parts) {
    const textPart = message.payload.parts.find(p => p.mimeType === 'text/plain');
    if (textPart && textPart.body && textPart.body.data) {
      body = Buffer.from(textPart.body.data, 'base64').toString('utf-8');
    }
  } else if (message.payload.body && message.payload.body.data) {
    body = Buffer.from(message.payload.body.data, 'base64').toString('utf-8');
  }
  
  return { subject, from, body };
}

async function main() {
  console.log('Reading all Gmail accounts...\n');
  
  for (const [email, config] of Object.entries(accounts)) {
    if (!config.refreshToken) {
      console.log(`⏭️  ${email} - No refresh token stored (skip)`);
      continue;
    }

    console.log(`\n📧 ${email}`);
    console.log('='.repeat(60));

    try {
      // Get access token
      console.log('  Authenticating...');
      const accessToken = await getAccessToken(config.refreshToken);
      console.log('  ✅ Authenticated');

      // Get messages
      console.log('  Fetching unread messages...');
      const messages = await getGmailMessages(email, accessToken);
      console.log(`  Found ${messages.length} unread messages`);

      if (messages.length > 0) {
        console.log('\n  📨 Unread Emails:');
        for (let i = 0; i < Math.min(5, messages.length); i++) {
          const msg = await getMessage(accessToken, messages[i].id);
          if (msg) {
            const { subject, from } = extractMessageText(msg);
            console.log(`     ${i + 1}. "${subject}" from ${from}`);
          }
        }
      }

    } catch (err) {
      console.error(`  ❌ Error: ${err.message}`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ Account scanning complete');
}

main().catch(console.error);
