require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse');
const mongoose = require('mongoose');
const Industry = require('../models/Industry');
const Position = require('../models/Position');
const NewPosition = require('../models/NewPosition');

const INPUT_PATH = process.argv[2] && !process.argv[2].startsWith('--')
  ? process.argv[2]
  : path.resolve(__dirname, '../seeds/job_posting_202510051046.csv');
const DRY = process.argv.includes('--dry');
const REPORT = process.argv.includes('--report');

function cleanTitle(titleRaw) {
  if (!titleRaw) return '';
  let t = String(titleRaw)
    .replace(/\s*[\/|()\[\]-].*$/u, '')
    .replace(/,\s*[^,]*$/u, '')
    .replace(/["'`]+/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
  t = t.replace(/\b(LLC|ХХК|ХК|Групп|Group|Holding|Holdings)\b.*$/iu, '').trim();
  return t;
}

function normalizeKey(str) {
  return String(str).toLowerCase().replace(/[^a-z0-9а-яөүёңъ\s]/gi, ' ').replace(/\s+/g, ' ').trim();
}

// Very light MN→EN hints (extendable)
function translateMnToEn(mn) {
  const map = [
    { re: /англи хэл.*багш/i, en: 'English Teacher' },
    { re: /багш/i, en: 'Teacher' },
    { re: /англи хэл/i, en: 'English' },
    { re: /программ?\s*хангамж(ийн)?\s*инженер/i, en: 'Software Engineer' },
    { re: /программ?\s*хангамж/i, en: 'Software' },
    { re: /инженер/i, en: 'Engineer' },
    { re: /ахлах/i, en: 'Senior' },
    { re: /дунд/i, en: 'Mid-level' },
    { re: /менежер/i, en: 'Manager' },
    { re: /шинжээч|аналист/i, en: 'Analyst' },
    { re: /өгөгдлийн?\s*сан/i, en: 'Database' },
    { re: /өгөгдөл/i, en: 'Data' },
    { re: /хөгжүүлэгч/i, en: 'Developer' },
    { re: /хүний\s*нөөц/i, en: 'Human Resources' },
    { re: /сургалтын?\s*мэргэжилтэн/i, en: 'Training Specialist' },
    { re: /борлуулалт/i, en: 'Sales' },
    { re: /маркетинг/i, en: 'Marketing' },
    { re: /логистик/i, en: 'Logistics' },
  ];
  let out = [];
  for (const { re, en } of map) {
    if (re.test(mn)) out.push(en);
  }
  return out.length ? out.join(' ') : mn; // fallback to MN if unknown
}

function buildIndustryResolver(industries) {
  const nameToIndustry = new Map();
  for (const ind of industries) {
    nameToIndustry.set(normalizeKey(ind.name_en), ind);
    nameToIndustry.set(normalizeKey(ind.name_mn), ind);
  }
  const synonymRules = [
    { re: /teacher|education|pedagogy|сургууль|багш|боловсрол/i, target: 'Teacher & Education' },
    { re: /sales|commerce|business development|худалдаа|борлуулалт/i, target: 'Sales & Commerce' },
    { re: /marketing|дижитал маркетинг/i, target: 'Marketing' },
    { re: /it|information technology|software|developer|web|mobile|network|мэдээлэл технолог|харилцаа холбоо/i, target: 'Information Technology' },
    { re: /security|safety|хамгаалалт|аюулгүй байдал/i, target: 'Security & Safety' },
    { re: /beauty|sports|гоо сайхан|спорт/i, target: 'Beauty & Sports' },
    { re: /logistics|transport|тээвэр|логистик/i, target: 'Transportation & Logistics' },
    { re: /manufacturing|production|үйлдвэрлэл|оператор/i, target: 'Manufacturing & Production' },
    { re: /engineering|electrical|инженер|цахилгаан/i, target: 'Engineering & Electrical' },
    { re: /veterinary|environment|мал эмнэлэг|байгаль/i, target: 'Veterinary & Environmental' },
    { re: /legal|law|compliance|эрх зүй|комплайнс|эрсдэл/i, target: 'Legal & Compliance' },
    { re: /chef|restaurant|food service|зочлох үйлчилгээ|ресторан|бариста|сүлжээ/i, target: 'Food Service & Hospitality' },
    { re: /customer service|call center|front\s*desk|front\s*office|харилцагч/i, target: 'Customer Service & Call Center' },
    { re: /medical|health|эмч|эрүүл мэнд|сувилагч/i, target: 'Medical & Healthcare' },
    { re: /accounting|finance|auditor|санхүү|нягтлан/i, target: 'Accounting & Finance' },
    { re: /human resources|hr|administration|менежмент|захиргаа|менежмент ба үйл ажиллагаа/i, target: 'Human Resources & Administration' },
    { re: /construction|civil|architect|барилга|архитектор/i, target: 'Construction & Engineering' },
    { re: /content|media|video|photo|producer|контент|медиа|кино/i, target: 'Content & Media Production' },
    { re: /mining|industrial|уул уурхай|аж үйлдвэрийн?/i, target: 'Mining & Industrial' },
    { re: /graphic design|дизайн/i, target: 'Graphic Design' },
    { re: /hotel|tourism|зочид буудал|аялал/i, target: 'Hotel & Tourism' },
    { re: /insurance|даатгал/i, target: 'Insurance' },
    { re: /retail|merchandising|дэлгүүр/i, target: 'Retail & Merchandising' },
    { re: /agriculture|horticulture|тариалан|мал аж ахуй/i, target: 'Agriculture & Horticulture' },
    { re: /social|community|нийгмийн?/i, target: 'Social & Community Services' },
    { re: /inventory|warehouse|supply chain|агуулах/i, target: 'Logistics & Inventory Management' },
    { re: /food production|processing|хүнсний үйлдвэрлэл/i, target: 'Food Production & Processing' },
    { re: /entertainment|music|энтертайнмент|хөгжим/i, target: 'Media, Entertainment & Music' },
  ];
  function resolve(indStr, jobCategoryStr) {
    const tried = [indStr, jobCategoryStr].filter(Boolean);
    for (const raw of tried) {
      const key = normalizeKey(raw);
      const byName = nameToIndustry.get(key);
      if (byName) return byName;
      for (const rule of synonymRules) {
        if (rule.re.test(raw)) {
          const target = Array.from(nameToIndustry.values()).find(i => i.name_en === rule.target);
          if (target) return target;
        }
      }
    }
    return undefined;
  }
  return resolve;
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

  const industries = await Industry.find({}).lean();
  const positions = await Position.find({}).lean();

  const resolveIndustry = buildIndustryResolver(industries);

  const existingByIndustry = new Map(); // key: indId -> Set(normalized name_en)
  for (const p of positions) {
    const key = String(p.industry_id);
    if (!existingByIndustry.has(key)) existingByIndustry.set(key, new Set());
    existingByIndustry.get(key).add(normalizeKey(p.name_en));
  }

  const created = [];
  const stats = { total: 0, created: 0, skipped: { missingTitle: 0, industryNotFound: 0, duplicateExisting: 0, duplicateNew: 0 }, unknownIndustries: new Map() };
  const parser = fs
    .createReadStream(INPUT_PATH)
    .pipe(parse({ bom: true, columns: true, delimiter: ['\t', ','], relax_column_count: true, skip_empty_lines: true, trim: true }));

  for await (const row of parser) {
    stats.total += 1;
    const rawTitle = row.title || row.major || '';
    const jobCategory = row.job_category || '';
    const csvIndustry = row.industry || '';

    if (!rawTitle) { stats.skipped.missingTitle += 1; continue; }

    const cleanedMn = cleanTitle(rawTitle);
    const maybeEn = translateMnToEn(cleanedMn);
    const cleanedEn = cleanTitle(maybeEn);

    // Resolve industry using names + synonyms
    const industry = resolveIndustry(csvIndustry, jobCategory);
    if (!industry) {
      const key = normalizeKey(csvIndustry || jobCategory);
      stats.skipped.industryNotFound += 1;
      if (key) stats.unknownIndustries.set(key, (stats.unknownIndustries.get(key) || 0) + 1);
      continue;
    }

    const indId = String(industry._id);
    if (!existingByIndustry.has(indId)) existingByIndustry.set(indId, new Set());
    const seen = existingByIndustry.get(indId);

    const keyEn = normalizeKey(cleanedEn);
    if (seen.has(keyEn)) { stats.skipped.duplicateExisting += 1; continue; }

    // Also check duplicates within this run vs NewPosition uniqueness
    try {
      const doc = {
        industry_id: industry._id,
        industry_sort_order: industry.sort_order,
        name_mn: cleanedMn,
        name_en: cleanedEn,
        sort_order: 999,
        is_active: true,
        source: 'csv_inference',
        raw_title: rawTitle,
      };
      if (!DRY) {
        const existingNew = await NewPosition.findOne({ industry_id: industry._id, name_en: cleanedEn }).lean();
        if (existingNew) { stats.skipped.duplicateNew += 1; continue; }
        const saved = await NewPosition.create(doc);
        created.push(saved);
      } else {
        created.push(doc);
      }
      seen.add(keyEn);
      stats.created += 1;
    } catch (e) {
      // likely unique index conflict; ignore silently
      stats.skipped.duplicateNew += 1;
    }
  }

  if (REPORT || DRY) {
    console.log('--- New Positions Report ---');
    console.log(`Total rows: ${stats.total}`);
    console.log(`Created: ${stats.created}`);
    console.log('Skipped:', stats.skipped);
    if (stats.unknownIndustries.size) {
      const arr = Array.from(stats.unknownIndustries.entries()).sort((a,b)=>b[1]-a[1]).slice(0,10);
      console.log('Top unknown industries:');
      arr.forEach(([k,v])=>console.log(`  ${v} × ${k}`));
    }
  }

  console.log(`New positions ${DRY ? '(dry-run) ' : ''}created: ${created.length}`);
  if (DRY) {
    console.log(created.slice(0, 10));
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


