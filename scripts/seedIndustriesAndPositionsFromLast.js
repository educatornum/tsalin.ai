require('dotenv').config();
const path = require('path');
const mongoose = require('mongoose');
const Industry = require('../models/Industry');
const Position = require('../models/Position');

function loadSource() {
  // Primary source (note: file name is intentionally misspelled in repo: industies-last.json)
  const candidates = [
    path.join(__dirname, '../seeds/industies-last.json'),
    path.join(__dirname, '../seeds/industries-last.json'),
  ];
  for (const p of candidates) {
    try {
      // eslint-disable-next-line import/no-dynamic-require, global-require
      const data = require(p);
      if (Array.isArray(data)) {
        console.log(`Using seed file: ${path.basename(p)} (items=${data.length})`);
        return data;
      }
      if (Array.isArray(data.industries)) {
        console.log(`Using seed file: ${path.basename(p)} (items=${data.industries.length})`);
        return data.industries;
      }
    } catch (_) {
      // try next
    }
  }
  throw new Error('Could not load industies-last.json from seeds/');
}

function toMillions(mnt, withCurrency = false) {
  if (typeof mnt !== 'number' || !isFinite(mnt)) return null;
  const millions = mnt / 1_000_000;
  const base = `${millions.toFixed(1)}М`;
  return withCurrency ? `${base}₮` : base;
}

function formatAverageSalary(avgSalaryMntObj) {
  if (!avgSalaryMntObj) return 'N/A';
  const jr = toMillions(avgSalaryMntObj.junior, false);
  const sr = toMillions(avgSalaryMntObj.senior, true);
  if (jr && sr) return `${jr} - ${sr}`;
  if (typeof avgSalaryMntObj.average === 'number') {
    const a = toMillions(avgSalaryMntObj.average, true);
    if (a) return a;
  }
  return 'N/A';
}

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error('Missing MONGODB_URI in environment');
    process.exit(1);
    return;
  }

  await mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  console.log('MongoDB Connected');

  const source = loadSource();
  if (!Array.isArray(source) || source.length === 0) {
    console.error('Seed data is empty');
    process.exit(1);
  }

  // Wipe existing
  await Position.deleteMany({});
  await Industry.deleteMany({});
  console.log('Cleared existing industries and positions');

  // Prepare industries
  const industryDocs = source.map((item, idx) => {
    const sortOrder = typeof item.sort_order === 'number' ? item.sort_order : idx + 1;
    const avg = item.avg_salary_mnt || {};
    return {
      name_mn: String(item.industry_mn || item.name_mn || '').trim() || `Industry ${idx + 1}`,
      name_en: String(item.industry_en || item.name_en || '').trim() || `Industry ${idx + 1}`,
      description: '',
      average_salary: formatAverageSalary(item.avg_salary_mnt),
      avg_salary_mnt: {
        average: typeof avg.average === 'number' ? avg.average : undefined,
        junior: typeof avg.junior === 'number' ? avg.junior : undefined,
        mid: typeof avg.mid === 'number' ? avg.mid : undefined,
        senior: typeof avg.senior === 'number' ? avg.senior : undefined,
      },
      avg_salary_min_mnt: typeof avg.junior === 'number' ? avg.junior : undefined,
      avg_salary_max_mnt: typeof avg.senior === 'number' ? avg.senior : undefined,
      sort_order: sortOrder,
      is_active: true,
    };
  });

  const insertedIndustries = await Industry.insertMany(industryDocs);
  console.log(`Inserted ${insertedIndustries.length} industries`);

  // Build positions for each industry
  const positionDocs = [];
  insertedIndustries.forEach((ind, idx) => {
    const src = source[idx] || {};
    const majors = Array.isArray(src.majors) ? src.majors : [];
    let sortOrder = 1;
    for (const m of majors) {
      const nameMn = String(m.mn || m.name_mn || '').trim();
      const nameEn = String(m.en || m.name_en || '').trim();
      if (!nameMn && !nameEn) continue;
      positionDocs.push({
        industry_id: ind._id,
        industry_sort_order: ind.sort_order,
        industry_name_mn: ind.name_mn,
        industry_name_en: ind.name_en,
        name_mn: nameMn || nameEn || `Position ${sortOrder}`,
        name_en: nameEn || nameMn || `Position ${sortOrder}`,
        sort_order: sortOrder++,
        is_active: true,
      });
    }
  });

  if (positionDocs.length > 0) {
    const insertedPositions = await Position.insertMany(positionDocs);
    console.log(`Inserted ${insertedPositions.length} positions`);
  } else {
    console.log('No positions to insert');
  }

  console.log('Seeding complete');
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('Seeding failed:', err?.message || err);
  process.exit(1);
});


