#!/usr/bin/env node
/**
 * Simple test - just list accounts to verify JWT auth
 */

import "dotenv/config";
import jwt from "jsonwebtoken";
import crypto from "crypto";

const API_KEY = process.env.COINBASE_API_KEY;
const PRIVATE_KEY = (process.env.COINBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n').trim();

console.log("🧪 COINBASE JWT TEST - /accounts endpoint\n");

function buildJWT(method, path) {
  const uri = `${method} api.coinbase.com${path}`;
  const nonce = crypto.randomBytes(16).toString('hex');
  
  const payload = {
    iss: 'cdp',
    sub: API_KEY,
    nbf: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 120,
    uri: uri,
  };

  const token = jwt.sign(payload, PRIVATE_KEY, {
    algorithm: 'ES256',
    header: {
      alg: 'ES256',
      kid: API_KEY,
      nonce: nonce,
      typ: 'JWT',
    },
  });
  
  return token;
}

async function test() {
  try {
    console.log(`📝 Testing: GET /api/v3/brokerage/accounts`);
    
    const path = `/api/v3/brokerage/accounts`;
    const jwtToken = buildJWT('GET', path);
    
    console.log(`✅ JWT generated`);
    
    const response = await fetch(`https://api.coinbase.com${path}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${jwtToken}`,
        'Content-Type': 'application/json',
      },
    });

    console.log(`📡 Response: ${response.status} ${response.statusText}`);
    
    const text = await response.text();
    console.log(`\n📄 Response body:\n${text.substring(0, 500)}`);
    
    if (response.ok) {
      console.log(`\n✅ SUCCESS! API is working.`);
    } else {
      console.log(`\n❌ Failed with ${response.status}`);
    }
  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
  }
}

test();
