#!/bin/bash
# Helper: Curl API call with JWT auth
# Usage: curl-api.sh <method> <path>

METHOD="$1"
PATH="$2"

# Generate JWT via Node
JWT=$(node - << 'NODEJS_EOF'
import jwt from "jsonwebtoken";
import crypto from "crypto";

const fs = require("fs");
const env = require("dotenv").config().parsed;

const api_key = process.env.COINBASE_API_KEY;
const private_key = (process.env.COINBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n").trim();

const uri = `${process.argv[1]} api.coinbase.com${process.argv[2]}`;

const payload = {
  iss: "cdp",
  sub: api_key,
  nbf: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 120,
  uri: uri,
};

const token = jwt.sign(payload, private_key, {
  algorithm: "ES256",
  header: {
    kid: api_key,
    nonce: crypto.randomBytes(16).toString("hex"),
    typ: "JWT",
    alg: "ES256",
  },
});

console.log(token);
NODEJS_EOF
)

# Make curl request
curl -s -H "Authorization: Bearer $JWT" "https://api.coinbase.com/api/v3/brokerage$PATH"
