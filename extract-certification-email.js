#!/usr/bin/env node

const fs = require('fs');
const https = require('https');

const CLIENT_ID = '1042289182085-k4nki44g908fvbcmvhqrmlfo8rmp1u9t.apps.googleusercontent.com';
const CLIENT_SECRET = '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';

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

async function getGmailMessages(accessToken, query) {
  const options = {
    hostname: 'www.googleapis.com',
    port: 443,
    path: `/gmail/v1/users/me/messages?maxResults=10&q=${encodeURIComponent(query)}`,
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

  return await makeRequest(options);
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
  const refreshToken = '1//01v0GHShmqz5KCgYIARAAGAESNwF-L9IrHnB2fhytknLlisGvyIMWPAXB6_EhLMMBCQRSQhewW9C07C0wGLWO4ubSOfI1fLhr14U';
  
  try {
    console.log('📧 Reading UnitedHealthcare certification email from caylenstarresfg@gmail.com\n');
    
    const accessToken = await getAccessToken(refreshToken);
    const messages = await getGmailMessages(accessToken, 'from:UHC_Contracting@sircon.com');
    
    if (messages.length === 0) {
      console.log('No emails found from UHC_Contracting');
      return;
    }
    
    const msg = await getMessage(accessToken, messages[0].id);
    const { subject, from, date, body } = extractMessageText(msg);
    
    console.log('═'.repeat(80));
    console.log(`📬 From: ${from}`);
    console.log(`📅 Date: ${date}`);
    console.log(`📋 Subject: ${subject}`);
    console.log('═'.repeat(80));
    console.log('\n📄 Full Email Content:\n');
    console.log(body);
    console.log('\n' + '═'.repeat(80));
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

main();
