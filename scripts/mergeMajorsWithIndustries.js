require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Industry = require('../models/Industry');

const INPUT_PATH = process.argv[2] && !process.argv[2].startsWith('--')
  ? process.argv[2]
  : path.resolve(__dirname, '../seeds/major.json');
const OUT_MAJOR_WITH_IDS = process.argv[3] && !process.argv[3].startsWith('--')
  ? process.argv[3]
  : path.resolve(__dirname, '../seeds/major.with_ids.json');
const OUT_INDUSTRIES_WITH_MAJORS = process.argv[4] && !process.argv[4].startsWith('--')
  ? process.argv[4]
  : path.resolve(__dirname, '../seeds/industries.with_majors.json');

function normalizeKey(str) {
  return String(str || '')
    .toLowerCase()
    .replace(/[^a-z0-9а-яөүёңъ\s&]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function splitEnMnFromString(s) {
  // Format: "English — Монгол"
  const parts = String(s).split(/—|-/).map(p => String(p).trim());
  if (parts.length >= 2) {
    const en = parts[0];
    const mn = parts.slice(1).join(' - ');
    return { en, mn };
  }
  return { en: s, mn: s };
}

function readJsonFlexible(filePath) {
  const rawText = fs.readFileSync(filePath, 'utf8');
  // Try strict JSON parse first
  try {
    return JSON.parse(rawText);
  } catch (_) {
    // Attempt to repair common trailing array duplicates by taking first top-level array
    const firstArrayStart = rawText.indexOf('[');
    const firstArrayEnd = rawText.lastIndexOf(']');
    if (firstArrayStart >= 0 && firstArrayEnd > firstArrayStart) {
      const slice = rawText.slice(firstArrayStart, firstArrayEnd + 1);
      return JSON.parse(slice);
    }
    throw _;
  }
}

async function main() {
  console.log(`Reading majors JSON from: ${INPUT_PATH}`);
  if (!fs.existsSync(INPUT_PATH)) {
    console.error('major.json not found.');
    process.exit(1);
  }

  const raw = readJsonFlexible(INPUT_PATH);
  const collected = [];

  function collect(node) {
    if (!node) return;
    if (Array.isArray(node)) {
      for (const el of node) collect(el);
      return;
    }
    if (typeof node === 'object') {
      // Accept objects that look like group definitions
      if ((node.industry_en || node.industry_mn || node.industry) && Array.isArray(node.majors)) {
        collected.push(node);
      }
      // Also inspect nested fields in case they are wrapped
      for (const v of Object.values(node)) collect(v);
    }
  }

  collect(raw);
  const topItems = collected;

  await mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  console.log('MongoDB Connected');

  const industries = await Industry.find({}).lean();
  const nameToIndustry = new Map();
  for (const ind of industries) {
    nameToIndustry.set(normalizeKey(ind.name_en), ind);
    nameToIndustry.set(normalizeKey(ind.name_mn), ind);
  }

  // Load original industries.json to merge majors onto each entry (optional)
  let industriesSeed = [];
  const industriesSeedPath = path.resolve(__dirname, '../seeds/industries.json');
  if (fs.existsSync(industriesSeedPath)) {
    try {
      const seedObj = JSON.parse(fs.readFileSync(industriesSeedPath, 'utf8'));
      industriesSeed = Array.isArray(seedObj.industries) ? seedObj.industries : [];
    } catch (_) {
      industriesSeed = [];
    }
  }

  const majorWithIds = [];
  const industriesMajorsMap = new Map(); // industry_id -> [{name_en,name_mn}]

  for (const item of topItems) {
    // Case A: { industry_en, industry_mn, majors: [{en,mn}, ...] }
    if ((item.industry_en || item.industry_mn) && Array.isArray(item.majors)) {
      const keyA = normalizeKey(item.industry_en || item.industry_mn);
      const ind = nameToIndustry.get(keyA);
      if (!ind) continue;

      const majors = item.majors
        .map(m => ({ name_en: m.en || m.name_en || m.name || '', name_mn: m.mn || m.name_mn || '' }))
        .filter(m => (m.name_en || m.name_mn));

      majorWithIds.push({ industry_id: ind._id, industry_en: ind.name_en, industry_mn: ind.name_mn, majors });

      const arr = industriesMajorsMap.get(String(ind._id)) || [];
      arr.push(...majors);
      industriesMajorsMap.set(String(ind._id), arr);
      continue;
    }

    // Case B: { industry: 'Name', majors: ['English — Монгол', ...] }
    if (item.industry && Array.isArray(item.majors)) {
      const keyB = normalizeKey(item.industry);
      const ind = nameToIndustry.get(keyB);
      if (!ind) continue;
      const majors = item.majors.map(s => splitEnMnFromString(s)).map(({ en, mn }) => ({ name_en: en, name_mn: mn }));
      majorWithIds.push({ industry_id: ind._id, industry_en: ind.name_en, industry_mn: ind.name_mn, majors });
      const arr = industriesMajorsMap.get(String(ind._id)) || [];
      arr.push(...majors);
      industriesMajorsMap.set(String(ind._id), arr);
      continue;
    }
  }

  // Write majors with ids
  fs.writeFileSync(OUT_MAJOR_WITH_IDS, JSON.stringify({ majors: majorWithIds }, null, 2), 'utf8');
  console.log(`Wrote: ${OUT_MAJOR_WITH_IDS}`);

  // Build industries.with_majors.json by matching industriesSeed to DB industry names and attaching majors
  const idToIndustry = new Map(industries.map(i => [String(i._id), i]));

  const industriesOut = industries.map(ind => {
    const majors = industriesMajorsMap.get(String(ind._id)) || [];
    return {
      _id: ind._id, // include for convenience
      name_mn: ind.name_mn,
      name_en: ind.name_en,
      description: ind.description || '',
      average_salary: ind.average_salary || '',
      sort_order: ind.sort_order,
      is_active: ind.is_active,
      majors,
    };
  });

  fs.writeFileSync(OUT_INDUSTRIES_WITH_MAJORS, JSON.stringify({ industries: industriesOut }, null, 2), 'utf8');
  console.log(`Wrote: ${OUT_INDUSTRIES_WITH_MAJORS}`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


