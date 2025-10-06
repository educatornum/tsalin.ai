require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Industry = require('../models/Industry');
const Major = require('../models/Major');

const INPUT_PATH = process.argv[2] && !process.argv[2].startsWith('--')
  ? process.argv[2]
  : path.resolve(__dirname, '../seeds/majors.json');
const CLEAR = process.argv.includes('--clear');
const REPORT = process.argv.includes('--report');

function normalizeKey(str) {
  return String(str).toLowerCase().replace(/[^a-z0-9а-яөүёңъ\s]/gi, ' ').replace(/\s+/g, ' ').trim();
}

async function main() {
  console.log(`Reading majors JSON from: ${INPUT_PATH}`);
  if (!fs.existsSync(INPUT_PATH)) {
    console.error('majors.json not found.');
    process.exit(1);
  }
  const raw = JSON.parse(fs.readFileSync(INPUT_PATH, 'utf8'));
  const items = Array.isArray(raw.majors) ? raw.majors : (Array.isArray(raw) ? raw : (raw.items || raw.data || []));

  await mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  console.log('MongoDB Connected');

  if (CLEAR) {
    await Major.deleteMany({});
    console.log('Cleared majors collection');
  }

  const industries = await Industry.find({}).lean();
  const nameToIndustry = new Map();
  for (const ind of industries) {
    nameToIndustry.set(normalizeKey(ind.name_en), ind);
    nameToIndustry.set(normalizeKey(ind.name_mn), ind);
  }

  let created = 0, skipped = 0;
  const skippedReasons = { industryNotFound: 0, missingNames: 0, duplicate: 0 };
  const unknownIndustries = new Map();
  for (const m of items) {
    try {
      const { industry_id, industry_name_en, industry_name_mn, industry_en, industry_mn, industry, industryName } = m;
      let foundIndustry = null;
      if (industry_id) {
        foundIndustry = industries.find(i => String(i._id) === String(industry_id));
      }
      const candidates = [industry_name_en, industry_name_mn, industry_en, industry_mn, industry, industryName].filter(Boolean);
      if (!foundIndustry && candidates.length) {
        for (const c of candidates) {
          const key = normalizeKey(c);
          const byExact = nameToIndustry.get(key);
          if (byExact) { foundIndustry = byExact; break; }
        }
      }
      if (!foundIndustry && candidates.length) {
        const q = normalizeKey(candidates[0]);
        if (q) {
          foundIndustry = industries.find(i => normalizeKey(i.name_en).includes(q) || normalizeKey(i.name_mn).includes(q));
        }
      }
      if (!foundIndustry) {
        skipped += 1; skippedReasons.industryNotFound += 1;
        const key = normalizeKey((candidates[0] || ''));
        if (key) unknownIndustries.set(key, (unknownIndustries.get(key) || 0) + 1);
        continue;
      }

      // Accept various name fields
      const nameEn = m.name_en || m.major_en || m.en || m.name || m.title_en || m.title || '';
      const nameMn = m.name_mn || m.major_mn || m.mn || m.title_mn || m.major || '';
      if (!nameEn && !nameMn) { skipped += 1; skippedReasons.missingNames += 1; continue; }
      // Accept synonyms arrays under different keys
      const synonyms = Array.isArray(m.synonyms) ? m.synonyms : (Array.isArray(m.aliases) ? m.aliases : []);
      const sort_order = typeof m.sort_order === 'number' ? m.sort_order : 999;
      const is_active = typeof m.is_active === 'boolean' ? m.is_active : true;

      const doc = {
        industry_id: foundIndustry._id,
        name_en: nameEn || nameMn,
        name_mn: nameMn || nameEn,
        synonyms,
        sort_order,
        is_active,
        source: 'seed',
      };

      const res = await Major.updateOne(
        { industry_id: doc.industry_id, name_en: doc.name_en },
        { $setOnInsert: doc },
        { upsert: true }
      );
      if (res.upsertedCount === 1) {
        created += 1;
      } else {
        skipped += 1; skippedReasons.duplicate += 1;
      }
    } catch (e) {
      skipped += 1; skippedReasons.other = (skippedReasons.other || 0) + 1;
    }
  }

  if (REPORT) {
    console.log('--- Majors Seed Report ---');
    console.log(`Total in file: ${items.length}`);
    console.log(`Inserted: ${created}`);
    console.log('Skipped reasons:', skippedReasons);
    if (unknownIndustries.size) {
      const arr = Array.from(unknownIndustries.entries()).sort((a,b)=>b[1]-a[1]).slice(0,10);
      console.log('Top unknown industry labels:');
      arr.forEach(([k,v])=>console.log(`  ${v} × ${k}`));
    }
  }
  console.log(`Majors inserted/ensured: ${created}, skipped: ${skipped}`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


