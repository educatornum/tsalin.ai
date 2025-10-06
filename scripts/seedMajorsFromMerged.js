require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Major = require('../models/Major');

const INPUT_PATH = process.argv[2] && !process.argv[2].startsWith('--')
  ? process.argv[2]
  : path.resolve(__dirname, '../seeds/major.with_ids.json');
const CLEAR = process.argv.includes('--clear');
const REPORT = process.argv.includes('--report');

async function main() {
  console.log(`Reading majors-with-ids JSON from: ${INPUT_PATH}`);
  if (!fs.existsSync(INPUT_PATH)) {
    console.error('major.with_ids.json not found.');
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(INPUT_PATH, 'utf8'));
  const groups = Array.isArray(raw.majors) ? raw.majors : (Array.isArray(raw) ? raw : []);

  await mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  console.log('MongoDB Connected');

  if (CLEAR) {
    await Major.deleteMany({});
    console.log('Cleared majors collection');
  }

  let inserted = 0, skipped = 0;
  const skippedReasons = { missingIndustryId: 0, missingMajors: 0, missingNames: 0, duplicate: 0 };

  for (const g of groups) {
    const industryId = g.industry_id || g._id;
    if (!industryId) { skipped += 1; skippedReasons.missingIndustryId += 1; continue; }
    if (!Array.isArray(g.majors) || g.majors.length === 0) { skipped += 1; skippedReasons.missingMajors += 1; continue; }

    for (const m of g.majors) {
      const name_en = m.name_en || m.en || '';
      const name_mn = m.name_mn || m.mn || '';
      if (!name_en && !name_mn) { skipped += 1; skippedReasons.missingNames += 1; continue; }

      const doc = {
        industry_id: industryId,
        name_en: name_en || name_mn,
        name_mn: name_mn || name_en,
        synonyms: Array.isArray(m.synonyms) ? m.synonyms : [],
        sort_order: typeof m.sort_order === 'number' ? m.sort_order : 999,
        is_active: typeof m.is_active === 'boolean' ? m.is_active : true,
        source: 'seed_with_ids',
      };

      const res = await Major.updateOne(
        { industry_id: doc.industry_id, name_en: doc.name_en },
        { $setOnInsert: doc },
        { upsert: true }
      );
      if (res.upsertedCount === 1) inserted += 1; else { skipped += 1; skippedReasons.duplicate += 1; }
    }
  }

  if (REPORT) {
    console.log('--- Seed Majors (with_ids) Report ---');
    console.log(`Groups: ${groups.length}`);
    console.log(`Inserted: ${inserted}`);
    console.log('Skipped reasons:', skippedReasons);
  }
  console.log(`Majors inserted: ${inserted}, skipped: ${skipped}`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


