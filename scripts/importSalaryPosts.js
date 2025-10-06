require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse');
const mongoose = require('mongoose');
const Industry = require('../models/Industry');
const Position = require('../models/Position');
const ProLevel = require('../models/ProLevel');
const SalaryPost = require('../models/SalaryPost');

const INPUT_PATH = process.argv[2] && !process.argv[2].startsWith('--')
  ? process.argv[2]
  : path.resolve(__dirname, '../seeds/job_posting_202510051046.csv');
const REPORT_ONLY = process.argv.includes('--report');

function toNumberSafe(value) {
  if (value === undefined || value === null || value === '') return undefined;
  const n = Number(String(value).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? n : undefined;
}

function normalizeLevel(levelStr) {
  if (!levelStr) return undefined;
  const s = String(levelStr).trim().toLowerCase();
  // Common mappings
  if (/(intern|junior|entry)/.test(s)) return 1;
  if (/mid/.test(s)) return 4; // Map MID-LEVEL to Specialist
  if (/(senior|sr)/.test(s)) return 5;
  if (/(lead|manager)/.test(s)) return 6;
  if (/(head|director)/.test(s)) return 8;
  if (/(executive|cxo|vp)/.test(s)) return 10;
  // Fallback: try numeric
  const n = toNumberSafe(s);
  if (n && n >= 1 && n <= 10) return n;
  return undefined;
}

function experienceYearsFromLevel(levelNum) {
  // Mapping based on common expectations:
  // 1 Intern:0, 2 Employee:1, 3 Senior Employee:2, 4 Specialist (MID):3,
  // 5 Senior Specialist (SENIOR):4, 6 Manager:5, 7 Senior Manager:7,
  // 8 Department Head:8, 9 Division Director:10, 10 Executive:12
  const map = {
    1: 0,
    2: 1,
    3: 2,
    4: 3,
    5: 4,
    6: 5,
    7: 7,
    8: 8,
    9: 10,
    10: 12,
  };
  return map[levelNum] ?? 0;
}

async function main() {
  console.log(`Reading CSV from: ${INPUT_PATH}`);
  if (!fs.existsSync(INPUT_PATH)) {
    console.error('Input CSV not found.');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  console.log('MongoDB Connected');

  // Cache industries, positions, and pro levels
  const industries = await Industry.find({}).sort({ sort_order: 1 }).lean();
  const positions = await Position.find({}).lean();
  const proLevels = await ProLevel.find({}).lean();

  // Build quick lookups
  const categoryToIndustry = new Map();
  industries.forEach((ind) => {
    // Use English name mapping from your CSV job_category if possible
    categoryToIndustry.set(ind.name_en.toLowerCase(), ind);
  });

  // Heuristic mapping from CSV job_category → our Industry.name_en
  const categorySynonyms = [
    { match: /education|pedagogy|teacher/i, target: 'Teacher & Education' },
    { match: /sales|commerce|business development/i, target: 'Sales & Commerce' },
    { match: /marketing/i, target: 'Marketing' },
    { match: /it|information technology|software|developer|web|mobile|networking/i, target: 'Information Technology' },
    { match: /security|safety/i, target: 'Security & Safety' },
    { match: /beauty|sports/i, target: 'Beauty & Sports' },
    { match: /logistics|transport/i, target: 'Transportation & Logistics' },
    { match: /manufacturing|production|operator/i, target: 'Manufacturing & Production' },
    { match: /engineering|electrical|hvac/i, target: 'Engineering & Electrical' },
    { match: /veterinary|environment/i, target: 'Veterinary & Environmental' },
    { match: /legal|law|compliance|risk/i, target: 'Legal & Compliance' },
    { match: /chef|restaurant|food|barista|waiter/i, target: 'Chef & Restaurant' },
    { match: /customer service|call center|callcentre|support|front\s*desk|front\s*office/i, target: 'Customer Service & Call Center' },
    { match: /teacher|education/i, target: 'Teacher & Education' },
    { match: /medical|health|doctor|nurse|dentist|pharmacist/i, target: 'Medical & Healthcare' },
    { match: /accounting|finance|auditor|analyst/i, target: 'Accounting & Finance' },
    { match: /human resources|hr|administration|management and operations|project\/?program management/i, target: 'Human Resources & Administration' },
    { match: /construction|civil|architect/i, target: 'Construction & Engineering' },
    { match: /content|media|video|photo|producer/i, target: 'Content & Media Production' },
    { match: /mining|industrial|geologist/i, target: 'Mining & Industrial' },
    { match: /graphic design|designer|ui|ux/i, target: 'Graphic Design' },
    { match: /hotel|tourism|concierge|reception/i, target: 'Hotel & Tourism' },
    { match: /insurance|actuary|underwriter/i, target: 'Insurance' },
    { match: /auto|mechanic|repair|parts/i, target: 'Auto Repair & Mechanics' },
    { match: /general service|assistant|cleaner/i, target: 'General Service' },
    { match: /retail|merchandising|store/i, target: 'Retail & Merchandising' },
    { match: /agriculture|horticulture|farming|livestock/i, target: 'Agriculture & Horticulture' },
    { match: /social|community/i, target: 'Social & Community Services' },
    { match: /inventory|warehouse|supply chain/i, target: 'Logistics & Inventory Management' },
    { match: /food production|processing/i, target: 'Food Production & Processing' },
    { match: /media|entertainment|music/i, target: 'Media, Entertainment & Music' },
    { match: /food service|hospitality/i, target: 'Food Service & Hospitality' },
    { match: /legal and compliance/i, target: 'Legal & Compliance' },
    { match: /risk and compliance/i, target: 'Legal & Compliance' },
    { match: /writing|translation|assistant/i, target: 'Other Professions' },
    { match: /other/i, target: 'Other Professions' },
  ];

  function resolveIndustry(jobCategoryRaw) {
    if (!jobCategoryRaw) return undefined;
    const jc = String(jobCategoryRaw).toLowerCase();
    // exact match by full name
    const exact = categoryToIndustry.get(jc);
    if (exact) return exact;
    // heuristic mapping
    for (const rule of categorySynonyms) {
      if (rule.match.test(jc)) {
        const found = industries.find((i) => i.name_en === rule.target);
        if (found) return found;
      }
    }
    // last resort: contains any industry name tokens
    for (const ind of industries) {
      const name = ind.name_en.toLowerCase();
      if (jc.includes(name)) return ind;
    }
    return undefined;
  }

  const industryIdToPositionsByName = new Map();
  positions.forEach((pos) => {
    const key = String(pos.industry_id);
    if (!industryIdToPositionsByName.has(key)) {
      industryIdToPositionsByName.set(key, new Map());
    }
    industryIdToPositionsByName.get(key).set(pos.name_en.toLowerCase(), pos);
    industryIdToPositionsByName.get(key).set(pos.name_mn.toLowerCase(), pos);
  });

  // Cache for positions created during this run to prevent duplicates
  const createdPositionsCache = new Map(); // key: `${industryId}:${posNameLower}` -> Position

  const levelNumberToNames = new Map();
  proLevels.forEach((pl) => {
    levelNumberToNames.set(pl.level, { mn: pl.name_mn, en: pl.name_en });
  });

  const records = [];
  const stats = {
    total: 0,
    valid: 0,
    skipped: {
      missingFields: 0,
      invalidLevel: 0,
      industryNotFound: 0,
      salaryMissing: 0,
    },
    createdPositions: 0,
  };
  const unknownCategories = new Map(); // category -> count
  const unmatchedPositions = new Map(); // industry_en -> Map<titleLower, count>
  const parser = fs
    .createReadStream(INPUT_PATH)
    .pipe(
      parse({
        bom: true,
        columns: true,
        // Accept both tab-separated and comma-separated files
        delimiter: ['\t', ','],
        relax_column_count: true,
        skip_empty_lines: true,
        trim: true,
      })
    );

  for await (const row of parser) {
    stats.total += 1;
    // Expected headers: title, company, min_salary, max_salary, level, job_category, job_type, createdAt
    const jobCategory = (row.job_category || '').toString().trim();
    const title = (row.title || '').toString().trim();
    const minSalary = toNumberSafe(row.min_salary);
    const maxSalary = toNumberSafe(row.max_salary);
    const levelNum = normalizeLevel(row.level);
    const createdAt = row.createdAt ? new Date(row.createdAt) : undefined;

    if (!jobCategory || !title) {
      stats.skipped.missingFields += 1;
      continue;
    }
    if (!levelNum) {
      stats.skipped.invalidLevel += 1;
      continue;
    }

    // Map category to industry by English name
    const industry = resolveIndustry(jobCategory);
    if (!industry) {
      const key = jobCategory.toLowerCase();
      unknownCategories.set(key, (unknownCategories.get(key) || 0) + 1);
      stats.skipped.industryNotFound += 1;
      continue;
    }

    // Try to match position within industry by title (en or mn) using substring match
    const posName = title.toLowerCase()
      .replace(/[/|()-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const posMap = industryIdToPositionsByName.get(String(industry._id));
    let position = null;
    if (posMap) {
      // choose the longest position name that is contained in title
      let best = null;
      for (const [name, pos] of posMap.entries()) {
        const nm = name.toLowerCase();
        if (posName.includes(nm)) {
          if (!best || nm.length > best.name.length) {
            best = { name: nm, pos };
          }
        }
      }
      position = best ? best.pos : null;
    }

    // If no existing position matched, create one under this industry
    if (!position) {
      const cacheKey = `${industry._id}:${posName}`;
      if (createdPositionsCache.has(cacheKey)) {
        position = createdPositionsCache.get(cacheKey);
      } else {
        // As safety, check DB for a close match (case-insensitive) before creating
        position = await Position.findOne({
          industry_id: industry._id,
          $or: [
            { name_en: { $regex: new RegExp(`^${title}$`, 'i') } },
            { name_mn: { $regex: new RegExp(`^${title}$`, 'i') } },
          ],
        }).lean();

        if (!position) {
          const newPos = new Position({
            industry_id: industry._id,
            industry_sort_order: industry.sort_order,
            name_en: title,
            name_mn: title,
            sort_order: 999,
            is_active: true,
          });
          const saved = await newPos.save();
          stats.createdPositions += 1;
          position = saved.toObject();
          // Update caches
          const key = String(industry._id);
          if (!industryIdToPositionsByName.has(key)) {
            industryIdToPositionsByName.set(key, new Map());
          }
          industryIdToPositionsByName.get(key).set(position.name_en.toLowerCase(), position);
          industryIdToPositionsByName.get(key).set(position.name_mn.toLowerCase(), position);
        }

        createdPositionsCache.set(cacheKey, position);
      }
    }

    // Salary: prefer average of min/max if both provided; else whichever exists
    const salary =
      minSalary && maxSalary
        ? Math.round((minSalary + maxSalary) / 2)
        : minSalary || maxSalary || undefined;

    if (!salary) {
      stats.skipped.salaryMissing += 1;
      continue;
    }

    const levelNames = levelNumberToNames.get(levelNum) || {};
    const expYears = experienceYearsFromLevel(levelNum);

    const doc = {
      industry_id: industry._id,
      position_id: position._id,
      source: 'lambda',
      salary,
      level: levelNum,
      level_name_mn: levelNames.mn,
      level_name_en: levelNames.en,
      job_category: jobCategory || undefined,
      industry: industry.name_en,
      experience_years: expYears,
      is_verified: false,
      is_active: true,
      ...(createdAt ? { createdAt, updatedAt: createdAt } : {}),
    };

    records.push(doc);
    stats.valid += 1;
  }

  // Reporting
  const printTop = (map, top = 10) => {
    const arr = Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, top);
    arr.forEach(([k, v]) => console.log(`  ${v} × ${k}`));
  };

  if (REPORT_ONLY) {
    console.log('--- Import Report (dry-run) ---');
    console.log(`Total rows: ${stats.total}`);
    console.log(`Valid rows: ${stats.valid}`);
    console.log('Skipped:');
    Object.entries(stats.skipped).forEach(([k, v]) => console.log(`  ${k}: ${v}`));
    if (unknownCategories.size) {
      console.log('\nTop unknown job_category values:');
      printTop(unknownCategories, 20);
    }
    if (unmatchedPositions.size) {
      console.log('\nTop unmatched titles by industry (sample):');
      for (const [ind, map] of unmatchedPositions.entries()) {
        console.log(`- ${ind}`);
        printTop(map, 5);
      }
    }
    process.exit(0);
  }

  if (records.length === 0) {
    console.log('No valid records to import.');
    console.log('Skipped breakdown:', stats.skipped);
    process.exit(0);
  }

  const result = await SalaryPost.insertMany(records, { ordered: false });
  console.log(`Inserted ${result.length} salary posts.`);
  console.log(`Created ${stats.createdPositions} new positions during import.`);
  if (unknownCategories.size) {
    console.log('\nTop unknown job_category values:');
    printTop(unknownCategories, 10);
  }
  if (unmatchedPositions.size) {
    console.log('\nTop unmatched titles by industry (sample):');
    for (const [ind, map] of unmatchedPositions.entries()) {
      console.log(`- ${ind}`);
      printTop(map, 3);
    }
  }
  console.log('Skipped breakdown:', stats.skipped);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


