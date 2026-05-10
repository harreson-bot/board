#!/usr/bin/env node

const https = require('https');

const CLIENT_ID = '1042289182085-k4nki44g908fvbcmvhqrmlfo8rmp1u9t.apps.googleusercontent.com';
const CLIENT_SECRET = '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';
const REFRESH_TOKEN = '1//01x_KeOPxoqh8CgYIARAAGAESNwF-L9Irq58H67BeR2AX_14SNdNDvyOfcVdtRgjYkkQSjFsjZT3iY4VCU9i2qH-1VHw16-EL-J8';

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

async function searchMessages(accessToken, query) {
  const response = await makeRequest({
    hostname: 'www.googleapis.com',
    port: 443,
    path: `/gmail/v1/users/me/messages?maxResults=10&q=${encodeURIComponent(query)}`,
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

async function main() {
  console.log('📧 Searching for FlowZoneTrader email in calvennstarre@gmail.com\n');
  
  const accessToken = await getAccessToken();
  const messages = await searchMessages(accessToken, 'from:FlowZoneTrader');
  
  if (messages.length === 0) {
    console.log('❌ No FlowZoneTrader emails found');
    return;
  }
  
  console.log(`✅ Found ${messages.length} FlowZoneTrader email(s). Reading the most recent...\n`);
  
  const msg = await getMessage(accessToken, messages[0].id);
  const { subject, from, date, body } = extractMessageText(msg);
  
  console.log('═'.repeat(100));
  console.log(`📬 From: ${from}`);
  console.log(`📅 Date: ${date}`);
  console.log(`📋 Subject: ${subject}`);
  console.log('═'.repeat(100));
  console.log('\n📄 Full Email Content:\n');
  console.log(body);
  console.log('\n' + '═'.repeat(100));
}

main().catch(console.error);
