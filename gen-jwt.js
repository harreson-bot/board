import "dotenv/config";
import jwt from "jsonwebtoken";
import crypto from "crypto";

const key_name = process.env.COINBASE_API_KEY;
const key_secret = (process.env.COINBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n').trim();

const request_method = 'GET';
const request_host = 'api.coinbase.com';
const request_path = '/api/v3/brokerage/accounts';

const uri = `${request_method} ${request_host}${request_path}`;

const payload = {
  iss: 'cdp',
  sub: key_name,
  nbf: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 120,
  uri: uri,
};

const token = jwt.sign(payload, key_secret, {
  algorithm: 'ES256',
  header: {
    kid: key_name,
    nonce: crypto.randomBytes(16).toString('hex'),
    typ: 'JWT',
    alg: 'ES256',
  },
});

console.log(token);
