#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// Simple CSV parser
function parseCSV(content) {
  const lines = content.split(/\r?\n/);
  if (lines.length < 2) return [];
  
  const headerLine = lines[0];
  const headers = parseCSVLine(headerLine);
  
  const records = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const values = parseCSVLine(line);
    const record = {};
    
    headers.forEach((h, idx) => {
      record[h] = values[idx] || '';
    });
    
    records.push(record);
  }
  
  return records;
}

// Parse a single CSV line
function parseCSVLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++; // Skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  values.push(current.trim());
  return values.map(v => v.replace(/^"|"$/g, ''));
}

// Normalize phone
function normalizePhone(phone) {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  return digits.slice(-10);
}

// Extract premium
function extractPremium(str) {
  if (!str) return 0;
  const match = str.toString().match(/[\d.]+/);
  return match ? parseFloat(match[0]) : 0;
}

// Build contact
function buildContact(row, tag) {
  const firstName = (row['First Name'] || row['First'] || '').trim();
  const lastName = (row['Last Name'] || row['Last'] || '').trim();
  
  if (!firstName || !lastName) return null;
  
  const email = (row['Email'] || row['E-mail 1 - Value'] || row['email'] || '').trim();
  const phone = normalizePhone(row['Phone'] || row['Phone 1 - Value'] || row['phone'] || '');
  
  if (!email && !phone) return null;
  
  let status = 'lead';
  const approved = row['Approved'] ? row['Approved'].toString().trim() : '';
  const declined = row['Declined'] ? row['Declined'].toString().trim() : '';
  const withdrawn = row['Withdrawn'] ? row['Withdrawn'].toString().trim() : '';
  
  if (approved === 'x' || approved.includes('x')) status = 'approved';
  if (declined === 'x' || declined.includes('x')) status = 'declined';
  if (withdrawn === 'x' || withdrawn.includes('x')) status = 'withdrawn';
  
  const premium = extractPremium(row[' Premium '] || row['Premium'] || row[' Price ']);
  
  let state = (row['State'] || '').trim();
  if (state.length > 2) state = state.substring(0, 2).toUpperCase();
  
  const contact = {
    firstName,
    lastName,
    email,
    phone,
    zip: (row['Address 1 - Postal Code'] || row['Zip'] || '').trim(),
    state,
    premium,
    status,
    tags: [tag],
    notes: '',
    lastContact: new Date().toISOString().split('T')[0],
    carrier: (row['Carrier'] || '').trim(),
    policyId: (row['POLICY ID'] || row['Policy ID'] || '').trim()
  };
  
  const notes = [];
  if (row['NOTES'] && row['NOTES'].trim()) notes.push(`Notes: ${row['NOTES'].trim()}`);
  if (row['WHO'] && row['WHO'].trim()) notes.push(`Agent: ${row['WHO'].trim()}`);
  if (row['Lead Source'] && row['Lead Source'].trim()) notes.push(`Source: ${row['Lead Source'].trim()}`);
  if (row['Plan'] && row['Plan'].trim()) notes.push(`Plan: ${row['Plan'].trim()}`);
  
  contact.notes = notes.join(' | ');
  
  return contact;
}

function createKey(contact) {
  if (contact.phone) {
    return `${contact.firstName.toLowerCase().trim()}|${contact.lastName.toLowerCase().trim()}|${contact.phone}`;
  } else if (contact.email) {
    return contact.email.toLowerCase().trim();
  }
  return null;
}

function mergeContacts(existing, newContacts) {
  const merged = new Map();
  
  existing.forEach(contact => {
    const key = createKey(contact);
    if (key) merged.set(key, JSON.parse(JSON.stringify(contact)));
  });
  
  newContacts.forEach(contact => {
    const key = createKey(contact);
    if (!key) return;
    
    if (merged.has(key)) {
      const existing = merged.get(key);
      existing.tags = Array.from(new Set([...existing.tags, ...contact.tags]));
      if (contact.premium > existing.premium) {
        existing.premium = contact.premium;
      }
      if (contact.status === 'approved' && existing.status !== 'approved') {
        existing.status = 'approved';
      }
      if (contact.notes && !existing.notes.includes(contact.notes.substring(0, 30))) {
        existing.notes += ' | ' + contact.notes;
      }
    } else {
      merged.set(key, contact);
    }
  });
  
  return Array.from(merged.values());
}

async function syncCRM() {
  console.log('Starting USHA/FFI CRM sync...');
  const crm_dir = __dirname;
  
  try {
    // Parse CSV files
    console.log('Parsing USHA Clients...');
    const ushaCsv = fs.readFileSync(path.join(crm_dir, 'usha_raw.csv'), 'utf8');
    const ushaRows = parseCSV(ushaCsv);
    
    console.log('Parsing FFI/CAYLEN...');
    const ffiCsv = fs.readFileSync(path.join(crm_dir, 'ffi_raw.csv'), 'utf8');
    const ffiRows = parseCSV(ffiCsv);
    
    console.log('Parsing phone contacts...');
    const phoneCsv = fs.readFileSync(path.join(crm_dir, 'phone_raw.csv'), 'utf8');
    const phoneRows = parseCSV(phoneCsv);
    
    console.log(`Raw rows: ${ushaRows.length} USHA, ${ffiRows.length} FFI, ${phoneRows.length} phone`);
    
    // Build contacts
    const ushaContacts = ushaRows
      .map(row => buildContact(row, 'USHA'))
      .filter(c => c !== null);
    
    const ffiContacts = ffiRows
      .map(row => buildContact(row, 'FFI'))
      .filter(c => c !== null);
    
    const phoneContacts = phoneRows
      .map(row => buildContact(row, 'PHONE'))
      .filter(c => c !== null);
    
    console.log(`Built contacts: ${ushaContacts.length} USHA, ${ffiContacts.length} FFI, ${phoneContacts.length} phone`);
    
    // Load existing
    let existing = [];
    const existingPath = path.join(crm_dir, 'clients_v2.json');
    if (fs.existsSync(existingPath)) {
      try {
        const existingData = JSON.parse(fs.readFileSync(existingPath, 'utf8'));
        existing = Array.isArray(existingData) ? existingData : existingData.contacts || [];
        console.log(`Loaded ${existing.length} existing contacts`);
      } catch (e) {
        console.log('No valid existing contacts file');
      }
    }
    
    // Merge
    const allNew = [...ushaContacts, ...ffiContacts, ...phoneContacts];
    const finalContacts = mergeContacts(existing, allNew);
    
    // Summary
    const summary = {
      timestamp: new Date().toISOString(),
      totalContacts: finalContacts.length,
      ushaCount: finalContacts.filter(c => c.tags.includes('USHA')).length,
      ffiCount: finalContacts.filter(c => c.tags.includes('FFI')).length,
      phoneCount: finalContacts.filter(c => c.tags.includes('PHONE')).length,
      approvedCount: finalContacts.filter(c => c.status === 'approved').length,
      declinedCount: finalContacts.filter(c => c.status === 'declined').length,
      leadCount: finalContacts.filter(c => c.status === 'lead').length,
      newDataProcessed: allNew.length,
      netNewUpdated: finalContacts.length - existing.length
    };
    
    // Save
    const outputPath = path.join(crm_dir, 'clients_v3_usha_ffi.json');
    fs.writeFileSync(outputPath, JSON.stringify({
      summary,
      contacts: finalContacts,
      count: finalContacts.length
    }, null, 2));
    
    console.log('\n=== USHA/FFI CRM SYNC COMPLETE ===');
    console.log(`Total contacts: ${summary.totalContacts}`);
    console.log(`  USHA: ${summary.ushaCount}`);
    console.log(`  FFI: ${summary.ffiCount}`);
    console.log(`  PHONE: ${summary.phoneCount}`);
    console.log(`\nStatus breakdown:`);
    console.log(`  Approved: ${summary.approvedCount}`);
    console.log(`  Declined: ${summary.declinedCount}`);
    console.log(`  Leads: ${summary.leadCount}`);
    console.log(`\nData processed this week: ${summary.newDataProcessed} new records`);
    console.log(`Net change: ${summary.netNewUpdated} (${summary.netNewUpdated > 0 ? '+' : ''}${summary.netNewUpdated})`);
    console.log(`\nSaved: ${outputPath}`);
    
  } catch (error) {
    console.error('ERROR:', error.message);
    process.exit(1);
  }
}

syncCRM();
