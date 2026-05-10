#!/usr/bin/env node
/**
 * Quick test of Coinbase JWT authentication
 * Tests: ETH-USD 30-day range calculation
 */

import "dotenv/config";
import jwt from "jsonwebtoken";
import crypto from "crypto";

const API_KEY = process.env.COINBASE_API_KEY;
const PRIVATE_KEY = (process.env.COINBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n').trim();

console.log("🧪 COINBASE JWT AUTHENTICATION TEST\n");
console.log(`API Key: ${API_KEY.substring(0, 30)}...`);
console.log(`Private Key (first 50 chars): ${PRIVATE_KEY.substring(0, 50)}...`);

// Build JWT
function buildJWT(method, path) {
  const uri = `${method} api.coinbase.com${path}`;
  const nonce = crypto.randomBytes(16).toString('hex');
  
  console.log(`\n📝 Building JWT for: ${method} ${path}`);
  
  const payload = {
    iss: 'cdp',
    sub: API_KEY,
    nbf: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 120,
    uri: uri,
  };

  try {
    const token = jwt.sign(payload, PRIVATE_KEY, {
      algorithm: 'ES256',
      header: {
        alg: 'ES256',
        kid: API_KEY,
        nonce: nonce,
        typ: 'JWT',
      },
    });
    
    console.log(`✅ JWT generated successfully (${token.length} chars)`);
    return token;
  } catch (error) {
    console.error(`❌ JWT generation failed: ${error.message}`);
    throw error;
  }
}

// Test API call
async function testAPICall() {
  try {
    console.log(`\n✅ Private key loaded correctly`);
    console.log(`   First line: ${PRIVATE_KEY.split('\n')[0]}`);
    console.log(`   Last line: ${PRIVATE_KEY.split('\n').pop()}`);
    console.log(`\n🌐 Testing API call: GET /api/v3/brokerage/products/ETH-USD/candles`);
    
    const path = `/api/v3/brokerage/products/ETH-USD/candles?start=${Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60)}&end=${Math.floor(Date.now() / 1000)}&granularity=3600`;
    const jwtToken = buildJWT('GET', path);
    
    const response = await fetch(`https://api.coinbase.com${path}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${jwtToken}`,
        'Content-Type': 'application/json',
      },
    });

    console.log(`\n📡 Response Status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ API Error (${response.status}): ${errorText}`);
      console.log(`\n🔍 DEBUG: JWT Token: ${jwtToken.substring(0, 50)}...${jwtToken.substring(jwtToken.length - 50)}`);
      return null;
    }

    const data = await response.json();
    
    if (!Array.isArray(data) || data.length === 0) {
      console.error(`❌ No candles returned`);
      return null;
    }

    console.log(`✅ Successfully fetched ${data.length} candles`);
    
    // Parse candles
    const candles = data.map(([timestamp, low, high, open, close, volume]) => ({
      time: timestamp * 1000,
      open: parseFloat(open),
      high: parseFloat(high),
      low: parseFloat(low),
      close: parseFloat(close),
      volume: parseFloat(volume),
    }));

    // Calculate range
    const lows = candles.map(c => c.low);
    const highs = candles.map(c => c.high);
    const min30day = Math.min(...lows);
    const max30day = Math.max(...highs);
    const range = max30day - min30day;

    console.log(`\n📊 ETH 30-DAY RANGE ANALYSIS:`);
    console.log(`   Min (30-day): $${min30day.toFixed(2)}`);
    console.log(`   Max (30-day): $${max30day.toFixed(2)}`);
    console.log(`   Range: $${range.toFixed(2)}`);
    console.log(`   Buy Zone (lower 30%): $${min30day.toFixed(2)} - $${(min30day + range * 0.30).toFixed(2)}`);
    console.log(`   Sell Zone (upper 70%): $${(min30day + range * 0.70).toFixed(2)} - $${max30day.toFixed(2)}`);
    
    return candles;
  } catch (error) {
    console.error(`❌ Test failed: ${error.message}`);
    process.exit(1);
  }
}

(async () => {
  await testAPICall();
  console.log(`\n✅ TEST COMPLETE\n`);
})();
