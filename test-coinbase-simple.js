#!/usr/bin/env node
/**
 * Simple Coinbase JWT test - test accounts endpoint
 * Using FULL resource name for key_name
 */

import "dotenv/config";
import jwt from "jsonwebtoken";
import crypto from "crypto";

const key_name = process.env.COINBASE_API_KEY;
const key_secret = (process.env.COINBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n').trim();

console.log("🧪 COINBASE JWT TEST\n");
console.log(`API Key (full resource path): ${key_name}`);
console.log(`Private Key loaded: ${key_secret.length > 0 ? 'YES' : 'NO'}\n`);

function buildJWT(request_method, request_host, request_path) {
  // CRITICAL: URI format from docs is "METHOD HOSTNAME/PATH" (no https://)
  const uri = `${request_method} ${request_host}${request_path}`;
  
  console.log(`Building JWT for: ${uri}`);
  
  const payload = {
    iss: 'cdp',
    sub: key_name,  // FULL resource path
    nbf: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 120,
    uri: uri,
  };

  const token = jwt.sign(payload, key_secret, {
    algorithm: 'ES256',
    header: {
      kid: key_name,  // FULL resource path
      nonce: crypto.randomBytes(16).toString('hex'),
      typ: 'JWT',
      alg: 'ES256',
    },
  });
  
  return token;
}

async function test() {
  try {
    const request_method = 'GET';
    const request_host = 'api.coinbase.com';
    const request_path = '/api/v3/brokerage/accounts';
    
    const jwtToken = buildJWT(request_method, request_host, request_path);
    console.log(`\n✅ JWT generated (length: ${jwtToken.length})`);
    console.log(`JWT: ${jwtToken.substring(0, 50)}...${jwtToken.substring(jwtToken.length - 30)}`);
    
    console.log(`\n📡 Making request to: https://${request_host}${request_path}`);
    
    const response = await fetch(`https://${request_host}${request_path}`, {
      method: request_method,
      headers: {
        'Authorization': `Bearer ${jwtToken}`,
        'Content-Type': 'application/json',
      },
    });

    console.log(`\n📊 Response status: ${response.status} ${response.statusText}`);
    
    const body = await response.text();
    if (body.length > 500) {
      console.log(`Response body (first 500 chars):\n${body.substring(0, 500)}`);
    } else {
      console.log(`Response body:\n${body}`);
    }
    
    if (response.ok) {
      console.log(`\n✅✅✅ SUCCESS! API is working!`);
    } else {
      console.log(`\n❌ Failed with ${response.status}`);
    }
  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
  }
}

test();
