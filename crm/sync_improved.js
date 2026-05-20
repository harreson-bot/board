#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const csv = require('csv-parse/sync');

// Parse CSV file
function parseCSVFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  try {
    return csv(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_quotes: true
    });
  } catch (error) {
    console.warn(`Error parsing ${filePath}:`, error.message);
    return [];
  }
}

// Normalize phone number
function normalizePhone(phone) {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  return digits.slice(-10);
}

// Extract premium amount
function extractPremium(premiumStr) {
  if (!premiumStr) return 0;
  const match = premiumStr.toString().match(/[\d.]+/);
  return match ? parseFloat(match[0]) : 0;
}

// Build contact from row
function buildContact(row, tag) {
  // Get names
  const firstName = (row['First Name'] || row['First'] || '').trim();
  const lastName = (row['Last Name'] || row['Last'] || '').trim();
  
  if (!firstName || !lastName) return null;
  
  // Get contact info
  const email = (row['Email'] || row['E-mail 1 - Value'] || row['email'] || '').trim();
  const phone = normalizePhone(row['Phone'] || row['Phone 1 - Value'] || row['phone'] || '');
  
  if (!email && !phone) return null;
  
  // Determine status
  let status = 'lead';
  if (row['Approved'] === 'x' || (row['Approved'] && row['Approved'].includes('x'))) status = 'approved';
  if (row['Declined'] === 'x' || (row['Declined'] && row['Declined'].includes('x'))) status = 'declined';
  if (row['Withdrawn'] === 'x' || (row['Withdrawn'] && row['Withdrawn'].includes('x'))) status = 'withdrawn';
  
  // Extract premium
  const premium = extractPremium(row[' Premium '] || row['Premium'] || row[' Price ']);
  
  // Get state/zip
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
  
  // Collect notes
  const noteFields = [];
  if (row['NOTES']) noteFields.push(`Notes: ${row['NOTES']}`);
  if (row['WHO']) noteFields.push(`Agent: ${row['WHO']}`);
  if (row['Lead Source'] || row['lead_source']) noteFields.push(`Source: ${row['Lead Source'] || row['lead_source']}`);
  if (row['Plan']) noteFields.push(`Plan: ${row['Plan']}`);
  contact.notes = noteFields.join(' | ');
  
  return contact;
}

// Create dedup key
function createKey(contact) {
  if (contact.phone) {
    return `${contact.firstName.toLowerCase().trim()}|${contact.lastName.toLowerCase().trim()}|${contact.phone}`;
  } else if (contact.email) {
    return `${contact.email.toLowerCase().trim()}`;
  }
  return null;
}

// Merge contacts, preserving existing data
function mergeContacts(existing, newContacts) {
  const merged = new Map();
  
  // Add existing contacts first
  existing.forEach(contact => {
    const key = createKey(contact);
    if (key) merged.set(key, JSON.parse(JSON.stringify(contact)));
  });
  
  // Merge new contacts
  newContacts.forEach(contact => {
    const key = createKey(contact);
    if (!key) return;
    
    if (merged.has(key)) {
      // Update existing contact
      const existing = merged.get(key);
      // Merge tags
      existing.tags = Array.from(new Set([...existing.tags, ...contact.tags]));
      // Update premium if higher
      if (contact.premium > existing.premium) {
        existing.premium = contact.premium;
      }
      // Upgrade status if better
      if (contact.status === 'approved' && existing.status !== 'approved') {
        existing.status = 'approved';
      }
      // Append notes if new ones exist
      if (contact.notes && !existing.notes.includes(contact.notes)) {
        existing.notes += ' | ' + contact.notes;
      }
    } else {
      // Add new contact
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
    const ushaRows = parseCSVFile(path.join(crm_dir, 'usha_raw.csv'));
    
    console.log('Parsing FFI/CAYLEN...');
    const ffiRows = parseCSVFile(path.join(crm_dir, 'ffi_raw.csv'));
    
    console.log('Parsing phone contacts...');
    const phoneRows = parseCSVFile(path.join(crm_dir, 'phone_raw.csv'));
    
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
    
    console.log(`Built: ${ushaContacts.length} USHA, ${ffiContacts.length} FFI, ${phoneContacts.length} phone`);
    
    // Load existing
    let existing = [];
    const existingPath = path.join(crm_dir, 'clients_v2.json');
    if (fs.existsSync(existingPath)) {
      const existingData = JSON.parse(fs.readFileSync(existingPath, 'utf8'));
      existing = Array.isArray(existingData) ? existingData : existingData.contacts || [];
      console.log(`Loaded ${existing.length} existing contacts`);
    }
    
    // Merge all new data
    const allNew = [...ushaContacts, ...ffiContacts, ...phoneContacts];
    const finalContacts = mergeContacts(existing, allNew);
    
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
      newThisWeek: allNew.length,
      mergedCount: finalContacts.length - existing.length
    };
    
    // Save
    const outputPath = path.join(crm_dir, 'clients_v3_usha_ffi.json');
    fs.writeFileSync(outputPath, JSON.stringify({
      summary,
      contacts: finalContacts,
      count: finalContacts.length
    }, null, 2));
    
    console.log('\n=== SYNC COMPLETE ===');
    console.log(`Total contacts: ${summary.totalContacts}`);
    console.log(`  USHA: ${summary.ushaCount}`);
    console.log(`  FFI: ${summary.ffiCount}`);
    console.log(`  PHONE: ${summary.phoneCount}`);
    console.log(`Status breakdown:`);
    console.log(`  Approved: ${summary.approvedCount}`);
    console.log(`  Declined: ${summary.declinedCount}`);
    console.log(`  Leads: ${summary.leadCount}`);
    console.log(`\nNew data processed: ${summary.newThisWeek}`);
    console.log(`Net new/updated: ${summary.mergedCount}`);
    console.log(`Saved to: ${outputPath}`);
    
  } catch (error) {
    console.error('ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

syncCRM();
