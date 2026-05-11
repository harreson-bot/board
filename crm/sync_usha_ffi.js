#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const https = require('https');

// Utility to fetch CSV with full content
async function fetchCSV(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { timeout: 10000 }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

// Parse CSV string
function parseCSV(csv) {
  const lines = csv.split('\n');
  if (lines.length < 2) return [];
  
  const headers = lines[0].split(',').map(h => h.trim());
  const records = [];
  
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    
    // Simple CSV parser (handles basic cases)
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let j = 0; j < lines[i].length; j++) {
      const char = lines[i][j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim().replace(/^"|"$/g, ''));
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim().replace(/^"|"$/g, ''));
    
    const record = {};
    headers.forEach((h, idx) => {
      record[h] = values[idx] || '';
    });
    records.push(record);
  }
  
  return records;
}

// Normalize phone number
function normalizePhone(phone) {
  if (!phone) return '';
  return phone.replace(/\D/g, '').slice(-10);
}

// Build contact object
function buildContact(row, tag) {
  const firstName = (row['First Name'] || row['First'] || '').trim();
  const lastName = (row['Last Name'] || row['Last'] || '').trim();
  const email = (row['Email'] || row['E-mail 1 - Value'] || row['email'] || '').trim();
  const phone = normalizePhone(row['Phone'] || row['Phone 1 - Value'] || row['phone'] || '');
  
  let status = 'lead';
  if (row['Approved'] && row['Approved'].includes('x')) status = 'approved';
  if (row['Declined'] && row['Declined'].includes('x')) status = 'declined';
  if (row['Withdrawn'] && row['Withdrawn'].includes('x')) status = 'withdrawn';
  
  const contact = {
    firstName,
    lastName,
    email,
    phone,
    zip: (row['Address 1 - Postal Code'] || row['Zip'] || '').trim(),
    state: (row['State'] || '').trim(),
    premium: parseFloat(row['Premium'] || row[' Premium '] || 0) || 0,
    status,
    tags: [tag],
    notes: '',
    lastContact: new Date().toISOString().split('T')[0],
    carrier: (row['Carrier'] || '').trim(),
    policyId: (row['POLICY ID'] || row['Policy ID'] || '').trim()
  };
  
  // Collect notes from various fields
  const noteFields = [];
  if (row['NOTES']) noteFields.push(row['NOTES']);
  if (row['Notes']) noteFields.push(row['Notes']);
  if (row['WHO']) noteFields.push(`Agent: ${row['WHO']}`);
  if (row['Lead Source']) noteFields.push(`Source: ${row['Lead Source']}`);
  if (row['Plan']) noteFields.push(`Plan: ${row['Plan']}`);
  contact.notes = noteFields.join(' | ');
  
  return contact;
}

// Deduplicate by key (firstName + lastName + phone) or email
function deduplicateContacts(contacts) {
  const seen = new Map();
  const deduped = [];
  
  contacts.forEach(contact => {
    const key = contact.phone ? 
      `${contact.firstName.toLowerCase()}|${contact.lastName.toLowerCase()}|${contact.phone}` :
      contact.email.toLowerCase();
    
    if (!key || !seen.has(key)) {
      seen.set(key, contact);
      deduped.push(contact);
    }
  });
  
  return deduped;
}

async function syncCRM() {
  console.log('Starting USHA/FFI CRM sync...');
  
  try {
    // Fetch CSV data
    console.log('Fetching USHA Clients sheet...');
    const ushaCsv = await fetchCSV('https://docs.google.com/spreadsheets/d/1YsmoqeggViCi_nym5lRrdIvvmrvwr5XMwFXivWYuig4/export?format=csv');
    
    console.log('Fetching FFI/CAYLEN tab...');
    const ffiCsv = await fetchCSV('https://docs.google.com/spreadsheets/d/1YsmoqeggViCi_nym5lRrdIvvmrvwr5XMwFXivWYuig4/export?format=csv&gid=370328598');
    
    console.log('Fetching phone contacts...');
    const phoneCsv = await fetchCSV('https://docs.google.com/spreadsheets/d/1M_d61pEzk4_bhoXOgPgki6STQfQwpFyb6-eBaXNUb0I/export?format=csv');
    
    // Parse CSVs
    const ushaRows = parseCSV(ushaCsv);
    const ffiRows = parseCSV(ffiCsv);
    const phoneRows = parseCSV(phoneCsv);
    
    console.log(`Parsed: ${ushaRows.length} USHA, ${ffiRows.length} FFI, ${phoneRows.length} phone contacts`);
    
    // Build contact objects
    const ushaContacts = ushaRows.map(row => buildContact(row, 'USHA'));
    const ffiContacts = ffiRows.map(row => buildContact(row, 'FFI'));
    const phoneContacts = phoneRows.map(row => buildContact(row, 'PHONE'));
    
    // Merge all
    let allContacts = [...ushaContacts, ...ffiContacts, ...phoneContacts];
    
    // Load existing clients if available
    let existing = [];
    const existingPath = path.join(__dirname, 'clients_v2.json');
    if (fs.existsSync(existingPath)) {
      const existingData = JSON.parse(fs.readFileSync(existingPath, 'utf8'));
      existing = Array.isArray(existingData) ? existingData : existingData.clients || [];
      console.log(`Loaded ${existing.length} existing clients`);
    }
    
    // Merge: preserve existing, add new
    const merged = new Map();
    
    // Add existing first
    existing.forEach(contact => {
      const key = contact.phone ? 
        `${contact.firstName.toLowerCase()}|${contact.lastName.toLowerCase()}|${contact.phone}` :
        contact.email.toLowerCase();
      if (key) merged.set(key, contact);
    });
    
    // Merge new data
    allContacts.forEach(contact => {
      const key = contact.phone ? 
        `${contact.firstName.toLowerCase()}|${contact.lastName.toLowerCase()}|${contact.phone}` :
        contact.email.toLowerCase();
      
      if (key) {
        if (merged.has(key)) {
          // Preserve existing, merge tags
          const existing = merged.get(key);
          existing.tags = [...new Set([...existing.tags, ...contact.tags])];
          if (contact.premium > existing.premium) {
            existing.premium = contact.premium;
          }
          if (contact.status === 'approved' && existing.status !== 'approved') {
            existing.status = contact.status;
          }
        } else {
          merged.set(key, contact);
        }
      }
    });
    
    const finalContacts = Array.from(merged.values());
    
    // Generate summary
    const summary = {
      timestamp: new Date().toISOString(),
      totalContacts: finalContacts.length,
      ushaCount: finalContacts.filter(c => c.tags.includes('USHA')).length,
      ffiCount: finalContacts.filter(c => c.tags.includes('FFI')).length,
      phoneCount: finalContacts.filter(c => c.tags.includes('PHONE')).length,
      approvedCount: finalContacts.filter(c => c.status === 'approved').length,
      declinedCount: finalContacts.filter(c => c.status === 'declined').length,
      leadCount: finalContacts.filter(c => c.status === 'lead').length,
      newThisWeek: allContacts.length,
      updated: finalContacts.length - existing.length
    };
    
    // Save
    const outputPath = path.join(__dirname, 'clients_v3_usha_ffi.json');
    fs.writeFileSync(outputPath, JSON.stringify({
      summary,
      contacts: finalContacts,
      count: finalContacts.length
    }, null, 2));
    
    console.log('\n=== SYNC COMPLETE ===');
    console.log(`Total contacts: ${summary.totalContacts}`);
    console.log(`  USHA: ${summary.ushaCount}`);
    console.log(`  FFI: ${summary.ffiCount}`);
    console.log(`  Phone: ${summary.phoneCount}`);
    console.log(`Approved: ${summary.approvedCount} | Declined: ${summary.declinedCount} | Leads: ${summary.leadCount}`);
    console.log(`New/Updated this week: ${allContacts.length}`);
    console.log(`Saved to: ${outputPath}`);
    
    process.exit(0);
  } catch (error) {
    console.error('ERROR:', error.message);
    process.exit(1);
  }
}

syncCRM();
