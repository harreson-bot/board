#!/usr/bin/env node

const https = require('https');

const CLIENT_ID = '1042289182085-k4nki44g908fvbcmvhqrmlfo8rmp1u9t.apps.googleusercontent.com';
const CLIENT_SECRET = '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';
const REFRESH_TOKEN = '1//01v0GHShmqz5KCgYIARAAGAESNwF-L9IrHnB2fhytknLlisGvyIMWPAXB6_EhLMMBCQRSQhewW9C07C0wGLWO4ubSOfI1fLhr14U';

function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(body));
        } else {
          reject(new Error(`HTTP ${res.statusCode}`));
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function getAccessToken() {
  const response = await makeRequest({
    hostname: 'oauth2.googleapis.com',
    port: 443,
    path: '/token',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }, {
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    refresh_token: REFRESH_TOKEN,
    grant_type: 'refresh_token',
  });

  return response.access_token;
}

async function getAllMessages(accessToken) {
  const response = await makeRequest({
    hostname: 'www.googleapis.com',
    port: 443,
    path: `/gmail/v1/users/me/messages?maxResults=100`,
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  return response.messages || [];
}

async function getMessage(accessToken, messageId) {
  return await makeRequest({
    hostname: 'www.googleapis.com',
    port: 443,
    path: `/gmail/v1/users/me/messages/${messageId}?format=full`,
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

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
  console.log('📧 Reading ALL emails from caylenstarresfg@gmail.com\n');
  
  const accessToken = await getAccessToken();
  const messages = await getAllMessages(accessToken);
  
  console.log(`Total messages: ${messages.length}\n`);
  console.log('═'.repeat(100) + '\n');
  
  for (let i = 0; i < messages.length; i++) {
    const msg = await getMessage(accessToken, messages[i].id);
    const { subject, from, body } = extractMessageText(msg);
    
    // Skip empty subjects
    if (!subject || subject.trim() === '') continue;
    
    console.log(`[${i+1}] From: ${from}`);
    console.log(`    Subject: ${subject}`);
    console.log(`    Body preview: ${body.substring(0, 150).replace(/\n/g, ' ')}`);
    console.log();
  }
  
  console.log('═'.repeat(100));
  console.log('✅ Complete');
}

main().catch(console.error);
