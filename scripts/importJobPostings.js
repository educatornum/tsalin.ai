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
  
  // Map common level strings to our ProLevel numbers (1-10)
  if (/(intern|junior|entry)/.test(s)) return 1; // Intern, Student
  if (/mid/.test(s)) return 4; // MID-LEVEL -> Specialist (4)
  if (/(senior|sr)/.test(s)) return 5; // SENIOR -> Senior Specialist (5)
  if (/(lead|manager)/.test(s)) return 6; // Manager
  if (/(senior manager)/.test(s)) return 7; // Senior Manager
  if (/(head|director)/.test(s)) return 8; // Department Head
  if (/(division director)/.test(s)) return 9; // Division Director
  if (/(executive|cxo|vp|leadership)/.test(s)) return 10; // Executive Management
  
  // Try numeric conversion
  const n = toNumberSafe(s);
  if (n && n >= 1 && n <= 10) return n;
  
  return undefined;
}

function experienceYearsFromLevel(levelNum) {
  // Map ProLevel number to realistic experience years for Mongolian job market
  const map = {
    1: 0,   // Intern, Student - 0 years
    2: 1,   // Employee - 1 year
    3: 2,   // Senior Employee - 2 years
    4: 3,   // Specialist (MID-LEVEL) - 3-4 years
    5: 5,   // Senior Specialist (SENIOR) - 5-6 years
    6: 7,   // Manager - 7-8 years
    7: 9,   // Senior Manager - 9-10 years
    8: 12,  // Department Head - 12-15 years
    9: 15,  // Division Director - 15-18 years
    10: 20, // Executive Management - 20+ years
  };
  return map[levelNum] ?? 0;
}

function cleanTitle(title) {
  if (!title) return '';
  
  let cleaned = String(title);
  
  // Remove content in parentheses or slashes (e.g., "/НОМИН Моторс/" or " /company/")
  cleaned = cleaned.replace(/\/.*?\//g, '');
  cleaned = cleaned.replace(/\(.*?\)/g, '');
  
  // Remove emoji and special characters but keep letters, numbers, spaces, and Mongolian characters
  cleaned = cleaned.replace(/[\u{1F300}-\u{1F9FF}]/gu, '');
  
  // Clean up multiple spaces
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  // Convert to title case: first letter uppercase, rest lowercase
  if (cleaned.length === 0) return '';
  
  const words = cleaned.split(' ');
  const titleCased = words.map(word => {
    if (word.length === 0) return '';
    // Handle Mongolian Cyrillic (U+0400-U+04FF) and Latin
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  });
  
  return titleCased.join(' ');
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
  const industryByName = new Map();
  industries.forEach((ind) => {
    industryByName.set(ind.name_en.toLowerCase(), ind);
    industryByName.set(ind.name_mn.toLowerCase(), ind);
  });

  // Heuristic mapping from CSV job_category → Industry name_en
  const categoryMapping = [
    { match: /accounting|finance|consulting/i, target: 'Accounting & Finance' },
    { match: /agriculture|horticulture/i, target: 'Agriculture & Horticulture' },
    { match: /construction|architecture|engineering/i, target: 'Construction & Engineering' },
    { match: /customer service|frontdesk|front office/i, target: 'Customer Service & Call Center' },
    { match: /data science|analytics/i, target: 'Other Professions' }, // No direct match
    { match: /design|video|creative|ux\/ui/i, target: 'Graphic Design' },
    { match: /education|pedagogy/i, target: 'Teacher & Education' },
    { match: /food production|processing/i, target: 'Food Production & Processing' },
    { match: /food service|culinary|hospitality/i, target: 'Food Service & Hospitality' },
    { match: /food and hospitality/i, target: 'Chef & Restaurant' },
    { match: /health & safety|health and safety/i, target: 'Security & Safety' },
    { match: /healthcare|medical|health & safety/i, target: 'Medical & Healthcare' },
    { match: /human resources|hr/i, target: 'Human Resources & Administration' },
    { match: /it|networking/i, target: 'Information Technology' },
    { match: /legal|law|compliance|public safety/i, target: 'Legal & Compliance' },
    { match: /logistics|inventory|transportation/i, target: 'Transportation & Logistics' },
    { match: /management|operations|project|program management|product management/i, target: 'Other Professions' }, // No direct match
    { match: /manufacturing|production/i, target: 'Manufacturing & Production' },
    { match: /media|entertainment|music/i, target: 'Media, Entertainment & Music' },
    { match: /mining|machinery|equipment/i, target: 'Mining & Industrial' },
    { match: /retail|merchandising/i, target: 'Retail & Merchandising' },
    { match: /sales|marketing|business development/i, target: 'Sales & Commerce' },
    { match: /security|protection/i, target: 'Security & Safety' },
    { match: /social|community/i, target: 'Social & Community Services' },
    { match: /tourism|hospitality/i, target: 'Hotel & Tourism' },
    { match: /web|mobile|software|development/i, target: 'Information Technology' },
    { match: /writing|translation|assistant/i, target: 'Other Professions' },
  ];

  function findIndustry(jobCategory) {
    if (!jobCategory) return undefined;
    
    const jc = String(jobCategory).toLowerCase().trim();
    
    // Exact match
    if (industryByName.has(jc)) {
      return industryByName.get(jc);
    }
    
    // Heuristic mapping
    for (const rule of categoryMapping) {
      if (rule.match.test(jc)) {
        const found = industries.find((i) => i.name_en === rule.target);
        if (found) return found;
      }
    }
    
    // Partial match
    for (const ind of industries) {
      const name = ind.name_en.toLowerCase();
      if (jc.includes(name) || name.includes(jc)) {
        return ind;
      }
    }
    
    return undefined;
  }

  const positionCache = new Map(); // cache key: `${industryId}:${positionName}` -> Position
  const levelNumberToNames = new Map();
  
  proLevels.forEach((pl) => {
    levelNumberToNames.set(pl.level, { mn: pl.name_mn, en: pl.name_en });
  });

  // Build position lookup by industry
  const industryPositions = new Map();
  positions.forEach((pos) => {
    const key = String(pos.industry_id);
    if (!industryPositions.has(key)) {
      industryPositions.set(key, []);
    }
    industryPositions.get(key).push(pos);
  });

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
  
  const unknownCategories = new Map();
  const records = [];
  
  const parser = fs
    .createReadStream(INPUT_PATH)
    .pipe(
      parse({
        bom: true,
        columns: true,
        delimiter: ',',
        relax_column_count: true,
        skip_empty_lines: true,
        trim: true,
      })
    );

  for await (const row of parser) {
    stats.total += 1;
    
    // Limit to first 10 rows for testing
    if (stats.total > 10) {
      console.log(`Processing limited to first 10 rows (found ${stats.total} total rows)`);
      break;
    }
    
    // CSV columns: major, company, industry, min_salary, max_salary, level, job_category, job_type, createdAt
    const rawTitle = (row.major || '').toString().trim();
    const jobCategory = (row.job_category || '').toString().trim();
    const maxSalary = toNumberSafe(row.max_salary);
    const levelNum = normalizeLevel(row.level);
    const createdAt = row.createdAt ? new Date(row.createdAt) : undefined;

    // Validate required fields
    if (!rawTitle || !jobCategory) {
      stats.skipped.missingFields += 1;
      continue;
    }
    
    if (!levelNum) {
      stats.skipped.invalidLevel += 1;
      continue;
    }

    // Find industry from job_category
    const industry = findIndustry(jobCategory);
    if (!industry) {
      const key = jobCategory.toLowerCase();
      unknownCategories.set(key, (unknownCategories.get(key) || 0) + 1);
      stats.skipped.industryNotFound += 1;
      continue;
    }

    // Clean title
    const cleanPositionName = cleanTitle(rawTitle);

    // Try to find existing position
    let position = null;
    const cacheKey = `${industry._id}:${cleanPositionName.toLowerCase()}`;
    
    if (positionCache.has(cacheKey)) {
      position = positionCache.get(cacheKey);
    } else {
      // Search in DB
      const industryPos = industryPositions.get(String(industry._id)) || [];
      position = industryPos.find((p) => 
        p.name_mn.toLowerCase() === cleanPositionName.toLowerCase() ||
        p.name_en.toLowerCase() === cleanPositionName.toLowerCase()
      );

      // If not found, create new position
      if (!position) {
        const newPos = new Position({
          industry_id: industry._id,
          industry_sort_order: industry.sort_order,
          industry_name_mn: industry.name_mn,
          industry_name_en: industry.name_en,
          name_en: cleanPositionName,
          name_mn: cleanPositionName,
          sort_order: 999,
          is_active: true,
        });
        
        try {
          const saved = await newPos.save();
          position = saved.toObject();
          stats.createdPositions += 1;
          
          // Update cache
          const key = String(industry._id);
          if (!industryPositions.has(key)) {
            industryPositions.set(key, []);
          }
          industryPositions.get(key).push(position);
        } catch (err) {
          console.error(`Error creating position: ${cleanPositionName}`, err.message);
          continue;
        }
      }
      
      positionCache.set(cacheKey, position);
    }

    // Validate salary
    if (!maxSalary) {
      stats.skipped.salaryMissing += 1;
      continue;
    }

    const levelNames = levelNumberToNames.get(levelNum) || {};
    const expYears = experienceYearsFromLevel(levelNum);

    const doc = {
      industry_id: industry._id,
      position_id: position._id,
      source: 'lambda',
      salary: maxSalary,
      level: levelNum,
      level_name_mn: levelNames.mn,
      level_name_en: levelNames.en,
      experience_years: expYears,
      is_verified: true,  // As per requirements
      is_active: true,    // As per requirements
      ...(createdAt ? { createdAt, updatedAt: createdAt } : {}),
    };

    records.push(doc);
    stats.valid += 1;
  }

  // Reporting
  if (REPORT_ONLY) {
    console.log('--- Import Report (dry-run) ---');
    console.log(`Total rows: ${stats.total}`);
    console.log(`Valid rows: ${stats.valid}`);
    console.log('Skipped:');
    Object.entries(stats.skipped).forEach(([k, v]) => console.log(`  ${k}: ${v}`));
    
    if (unknownCategories.size) {
      console.log('\nTop unknown job_category values:');
      const arr = Array.from(unknownCategories.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20);
      arr.forEach(([k, v]) => console.log(`  ${v} × ${k}`));
    }
    
    process.exit(0);
  }

  if (records.length === 0) {
    console.log('No valid records to import.');
    console.log('Skipped breakdown:', stats.skipped);
    process.exit(0);
  }

  console.log(`Inserting ${records.length} salary posts...`);
  
  try {
    const result = await SalaryPost.insertMany(records, { ordered: false });
    console.log(`✓ Successfully inserted ${result.length} salary posts.`);
  } catch (err) {
    console.error('Error inserting records:', err.message);
    if (err.writeErrors) {
      console.error(`Failed to insert ${err.writeErrors.length} records`);
    }
  }
  
  console.log(`Created ${stats.createdPositions} new positions during import.`);
  
  if (unknownCategories.size) {
    console.log('\nTop unknown job_category values:');
    const arr = Array.from(unknownCategories.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    arr.forEach(([k, v]) => console.log(`  ${v} × ${k}`));
  }
  
  console.log('Skipped breakdown:', stats.skipped);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
