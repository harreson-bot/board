/**
 * PatchHub v2 - Seed Script
 * Auto-seeds new partner accounts with 50 realistic sample leads
 * Can also be run standalone: node scripts/seed.js <partnerId>
 */

const { run, all, get } = require('../database');

// ─── Sample Lead Data ─────────────────────────────────────────────────────────

const SAMPLE_LEADS = [
  { first_name: 'Marcus', last_name: 'Washington', email: 'marcus.washington@gmail.com', phone: '404-555-0101', company: 'Atlanta Realty Group', city: 'Atlanta', state: 'GA', tags: ['realtor', 'warm-lead'] },
  { first_name: 'Jennifer', last_name: 'Chen', email: 'jchen.biz@outlook.com', phone: '678-555-0102', company: 'Chen Financial Services', city: 'Alpharetta', state: 'GA', tags: ['financial', 'prospect'] },
  { first_name: 'David', last_name: 'Thompson', email: 'd.thompson@entrepreneur.com', phone: '770-555-0103', company: 'Thompson Tech LLC', city: 'Marietta', state: 'GA', tags: ['entrepreneur', 'tech'] },
  { first_name: 'Latoya', last_name: 'Brown', email: 'latoya.brown@yahoo.com', phone: '404-555-0104', company: 'Self-Employed', city: 'Decatur', state: 'GA', tags: ['self-employed', 'warm-lead'] },
  { first_name: 'Carlos', last_name: 'Martinez', email: 'carlos.m@freelance.io', phone: '678-555-0105', company: 'Martinez Consulting', city: 'Duluth', state: 'GA', tags: ['consultant', 'prospect'] },
  { first_name: 'Ashley', last_name: 'Kim', email: 'ashley.kim@startup.co', phone: '404-555-0106', company: 'Kim & Associates', city: 'Sandy Springs', state: 'GA', tags: ['startup', 'interested'] },
  { first_name: 'Robert', last_name: 'Johnson', email: 'rob.johnson@gmail.com', phone: '770-555-0107', company: 'Johnson Plumbing', city: 'Kennesaw', state: 'GA', tags: ['contractor', 'prospect'] },
  { first_name: 'Priya', last_name: 'Patel', email: 'priya.patel@medicineworks.com', phone: '404-555-0108', company: 'Patel Family Medicine', city: 'Smyrna', state: 'GA', tags: ['medical', 'warm-lead'] },
  { first_name: 'Tyler', last_name: 'Anderson', email: 'tyler@andersoncreative.com', phone: '678-555-0109', company: 'Anderson Creative', city: 'Tucker', state: 'GA', tags: ['creative', 'freelance'] },
  { first_name: 'Monica', last_name: 'Williams', email: 'monica.williams@netscape.net', phone: '404-555-0110', company: 'Williams Insurance Agency', city: 'Stockbridge', state: 'GA', tags: ['insurance', 'prospect'] },
  { first_name: 'James', last_name: 'Lee', email: 'james.lee@lawoffice.com', phone: '678-555-0111', company: 'Lee Law Group', city: 'Norcross', state: 'GA', tags: ['legal', 'high-value'] },
  { first_name: 'Samantha', last_name: 'Davis', email: 'sam.davis@hotmail.com', phone: '770-555-0112', company: 'Davis Photography', city: 'Roswell', state: 'GA', tags: ['creative', 'self-employed'] },
  { first_name: 'Kevin', last_name: 'Wilson', email: 'kwilson@constructionpros.net', phone: '404-555-0113', company: 'Wilson Construction', city: 'Lawrenceville', state: 'GA', tags: ['contractor', 'warm-lead'] },
  { first_name: 'Danielle', last_name: 'Moore', email: 'danielle.moore@amazon.com', phone: '678-555-0114', company: 'Moore Marketing', city: 'Peachtree City', state: 'GA', tags: ['marketing', 'prospect'] },
  { first_name: 'Anthony', last_name: 'Taylor', email: 'anthony.t@solarenergy.biz', phone: '404-555-0115', company: 'Taylor Solar Solutions', city: 'Cumming', state: 'GA', tags: ['solar', 'entrepreneur'] },
  { first_name: 'Nicole', last_name: 'Harris', email: 'nicole.h@salon.com', phone: '770-555-0116', company: 'Nicole\'s Hair Studio', city: 'Morrow', state: 'GA', tags: ['beauty', 'small-business'] },
  { first_name: 'Brandon', last_name: 'Clark', email: 'bclark@itservices.tech', phone: '678-555-0117', company: 'Clark IT Services', city: 'Woodstock', state: 'GA', tags: ['tech', 'consultant'] },
  { first_name: 'Christina', last_name: 'Lewis', email: 'christina.lewis@healthcoach.com', phone: '404-555-0118', company: 'Lewis Wellness', city: 'Canton', state: 'GA', tags: ['health', 'coach'] },
  { first_name: 'Michael', last_name: 'Walker', email: 'm.walker@trucking.com', phone: '770-555-0119', company: 'Walker Logistics', city: 'Conyers', state: 'GA', tags: ['logistics', 'prospect'] },
  { first_name: 'Rachel', last_name: 'Hall', email: 'rachel.hall@realestate.com', phone: '678-555-0120', company: 'Hall Homes', city: 'Buford', state: 'GA', tags: ['realtor', 'warm-lead'] },
  { first_name: 'Joshua', last_name: 'Young', email: 'josh.young@autorepair.net', phone: '404-555-0121', company: 'Young\'s Auto Repair', city: 'College Park', state: 'GA', tags: ['automotive', 'small-business'] },
  { first_name: 'Melissa', last_name: 'Scott', email: 'mscott@accountingfirm.com', phone: '770-555-0122', company: 'Scott & Associates CPA', city: 'McDonough', state: 'GA', tags: ['accounting', 'high-value'] },
  { first_name: 'Christopher', last_name: 'Green', email: 'chris.green@landscaping.biz', phone: '678-555-0123', company: 'Green Thumb Landscaping', city: 'Loganville', state: 'GA', tags: ['landscaping', 'prospect'] },
  { first_name: 'Amanda', last_name: 'Adams', email: 'amanda.adams@tutoring.com', phone: '404-555-0124', company: 'Adams Learning Center', city: 'Gainesville', state: 'GA', tags: ['education', 'small-business'] },
  { first_name: 'Daniel', last_name: 'Baker', email: 'dbaker@mortgagebroker.com', phone: '770-555-0125', company: 'Baker Mortgage Solutions', city: 'Rome', state: 'GA', tags: ['mortgage', 'financial'] },
  { first_name: 'Stephanie', last_name: 'Nelson', email: 'stephanie.n@yogastudio.com', phone: '678-555-0126', company: 'Nelson Yoga & Wellness', city: 'Cartersville', state: 'GA', tags: ['wellness', 'coach'] },
  { first_name: 'Ryan', last_name: 'Carter', email: 'ryan.c@photography.pro', phone: '404-555-0127', company: 'Carter Photography', city: 'Dalton', state: 'GA', tags: ['creative', 'freelance'] },
  { first_name: 'Laura', last_name: 'Mitchell', email: 'laura.mitchell@dentist.com', phone: '770-555-0128', company: 'Mitchell Dental Associates', city: 'Valdosta', state: 'GA', tags: ['dental', 'medical'] },
  { first_name: 'Jason', last_name: 'Perez', email: 'jperez@restaurant.biz', phone: '678-555-0129', company: 'Perez Family Restaurant', city: 'Savannah', state: 'GA', tags: ['restaurant', 'small-business'] },
  { first_name: 'Heather', last_name: 'Roberts', email: 'h.roberts@eventplanning.com', phone: '404-555-0130', company: 'Roberts Events', city: 'Augusta', state: 'GA', tags: ['events', 'entrepreneur'] },
  { first_name: 'Eric', last_name: 'Turner', email: 'eric.t@securityfirm.com', phone: '770-555-0131', company: 'Turner Security Services', city: 'Columbus', state: 'GA', tags: ['security', 'prospect'] },
  { first_name: 'Kimberly', last_name: 'Phillips', email: 'kphillips@childcare.org', phone: '678-555-0132', company: 'Phillips Childcare Center', city: 'Macon', state: 'GA', tags: ['childcare', 'small-business'] },
  { first_name: 'Steven', last_name: 'Campbell', email: 'steven.c@personaltrainer.fit', phone: '404-555-0133', company: 'Campbell Fitness', city: 'Athens', state: 'GA', tags: ['fitness', 'coach'] },
  { first_name: 'Angela', last_name: 'Parker', email: 'angela.p@consulting.io', phone: '770-555-0134', company: 'Parker Business Consulting', city: 'Warner Robins', state: 'GA', tags: ['consultant', 'high-value'] },
  { first_name: 'Timothy', last_name: 'Evans', email: 'tim.evans@plumbingco.com', phone: '678-555-0135', company: 'Evans Plumbing Co.', city: 'Hinesville', state: 'GA', tags: ['contractor', 'warm-lead'] },
  { first_name: 'Brittany', last_name: 'Edwards', email: 'b.edwards@boutique.shop', phone: '404-555-0136', company: 'Edwards Boutique', city: 'Statesboro', state: 'GA', tags: ['retail', 'small-business'] },
  { first_name: 'Gregory', last_name: 'Collins', email: 'g.collins@electrician.net', phone: '770-555-0137', company: 'Collins Electric', city: 'Brunswick', state: 'GA', tags: ['contractor', 'prospect'] },
  { first_name: 'Katherine', last_name: 'Stewart', email: 'k.stewart@virtualassist.pro', phone: '678-555-0138', company: 'Stewart VA Services', city: 'Douglasville', state: 'GA', tags: ['virtual-assistant', 'freelance'] },
  { first_name: 'Patrick', last_name: 'Sanchez', email: 'p.sanchez@courier.com', phone: '404-555-0139', company: 'Sanchez Courier', city: 'Newnan', state: 'GA', tags: ['logistics', 'entrepreneur'] },
  { first_name: 'Victoria', last_name: 'Morris', email: 'v.morris@therapist.com', phone: '770-555-0140', company: 'Morris Counseling Services', city: 'LaGrange', state: 'GA', tags: ['healthcare', 'warm-lead'] },
  { first_name: 'Derek', last_name: 'Rogers', email: 'd.rogers@taxprep.com', phone: '678-555-0141', company: 'Rogers Tax Solutions', city: 'Valdosta', state: 'GA', tags: ['accounting', 'prospect'] },
  { first_name: 'Natasha', last_name: 'Reed', email: 'n.reed@socialmedia.agency', phone: '404-555-0142', company: 'Reed Digital Agency', city: 'Kennesaw', state: 'GA', tags: ['marketing', 'agency'] },
  { first_name: 'Aaron', last_name: 'Cook', email: 'aaron.cook@homeservices.com', phone: '770-555-0143', company: 'Cook Home Services', city: 'Gainesville', state: 'GA', tags: ['home-services', 'small-business'] },
  { first_name: 'Tiffany', last_name: 'Morgan', email: 't.morgan@lifcoach.io', phone: '678-555-0144', company: 'Morgan Life Coaching', city: 'Cumming', state: 'GA', tags: ['coach', 'entrepreneur'] },
  { first_name: 'Shawn', last_name: 'Bell', email: 'shawn.bell@autodetail.com', phone: '404-555-0145', company: 'Bell Auto Detailing', city: 'Marietta', state: 'GA', tags: ['automotive', 'prospect'] },
  { first_name: 'Veronica', last_name: 'Murphy', email: 'v.murphy@travel.agency', phone: '770-555-0146', company: 'Murphy Travel Agency', city: 'Smyrna', state: 'GA', tags: ['travel', 'entrepreneur'] },
  { first_name: 'Sean', last_name: 'Bailey', email: 'sean.bailey@airbnbhost.com', phone: '678-555-0147', company: 'Bailey Properties', city: 'Roswell', state: 'GA', tags: ['realtor', 'warm-lead'] },
  { first_name: 'Courtney', last_name: 'Rivera', email: 'c.rivera@florist.com', phone: '404-555-0148', company: 'Rivera\'s Floral Design', city: 'Sandy Springs', state: 'GA', tags: ['retail', 'small-business'] },
  { first_name: 'Justin', last_name: 'Cooper', email: 'j.cooper@webdev.studio', phone: '770-555-0149', company: 'Cooper Web Studio', city: 'Alpharetta', state: 'GA', tags: ['tech', 'freelance'] },
  { first_name: 'Amber', last_name: 'Richardson', email: 'amber.r@mortgage.pro', phone: '678-555-0150', company: 'Richardson Mortgage Group', city: 'Decatur', state: 'GA', tags: ['mortgage', 'financial', 'warm-lead'] },
];

/**
 * Seed a new partner account with 50 demo leads
 * @param {string} partnerId
 * @param {string} partnerUsername
 */
async function seedTestAccount(partnerId, partnerUsername) {
  console.log(`🌱 Seeding test account for partner: ${partnerUsername} (${partnerId})`);

  let seeded = 0;
  const allTags = new Set();

  for (const lead of SAMPLE_LEADS) {
    try {
      const phoneNorm = lead.phone.replace(/\D/g, '');

      await run(
        `INSERT INTO contacts
           (partner_id, first_name, last_name, email, phone, phone_normalized,
            company, city, state, country, tags, source, notes)
         VALUES (?,?,?,?,?,?,?,?,?,'US',?0,'seed_demo',?1)
         ON CONFLICT DO NOTHING`,
        [
          partnerId,
          lead.first_name, lead.last_name, lead.email,
          lead.phone, phoneNorm.length === 10 ? phoneNorm : phoneNorm.slice(-10),
          lead.company, lead.city, lead.state,
          lead.tags || [],
          `Demo lead — auto-seeded for ${partnerUsername}`
        ]
      );

      // Collect tags
      (lead.tags || []).forEach(t => allTags.add(t));

      // Seed engagement log
      const contact = await get(
        'SELECT id FROM contacts WHERE partner_id = ? AND email = ?',
        [partnerId, lead.email]
      );

      if (contact) {
        await run(
          `INSERT INTO engagement_logs (partner_id, contact_id, event_type, metadata)
           VALUES (?, ?, 'contact_created', ?)`,
          [partnerId, contact.id, JSON.stringify({ source: 'seed_demo', seeded_for: partnerUsername })]
        );
      }

      seeded++;
    } catch (err) {
      // Non-fatal — skip dupe or error
    }
  }

  // Upsert tag records
  for (const tagName of allTags) {
    try {
      const count = await get(
        `SELECT COUNT(*) as c FROM contacts WHERE partner_id = ? AND ? = ANY(tags)`,
        [partnerId, tagName]
      );
      await run(
        `INSERT INTO tags (partner_id, name, contact_count)
         VALUES (?, ?, ?)
         ON CONFLICT (partner_id, name) DO UPDATE SET contact_count = EXCLUDED.contact_count`,
        [partnerId, tagName, parseInt(count.c)]
      );
    } catch {}
  }

  // Create a sample DM draft
  try {
    await run(
      `INSERT INTO dm_drafts (partner_id, name, body, platform, tags, status)
       VALUES (?, ?, ?, 'instagram', ?, 'draft')`,
      [
        partnerId,
        'Welcome Intro Message',
        `Hey {{first_name}}! 👋 I saw your profile and wanted to reach out about some strategies that could really benefit {{company}}. Are you open to a quick 5-minute chat this week? No pitch — just want to share something valuable. 🙌`,
        ['sample', 'welcome']
      ]
    );
  } catch {}

  console.log(`✅ Seeded ${seeded}/50 demo leads for ${partnerUsername}`);
  return seeded;
}

// ─── Standalone execution ─────────────────────────────────────────────────────

if (require.main === module) {
  const partnerId = process.argv[2];
  const partnerUsername = process.argv[3] || 'test-partner';

  if (!partnerId) {
    console.error('Usage: node scripts/seed.js <partner_id> [username]');
    process.exit(1);
  }

  const { initializeSchema } = require('../database');
  initializeSchema()
    .then(() => seedTestAccount(partnerId, partnerUsername))
    .then(() => process.exit(0))
    .catch(err => { console.error(err); process.exit(1); });
}

module.exports = { seedTestAccount, SAMPLE_LEADS };
