require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Industry = require('../models/Industry');

const INPUT = process.argv[2] && !process.argv[2].startsWith('--')
  ? process.argv[2]
  : path.resolve(__dirname, '../seeds/major.with_ids.json');
const OUTPUT = process.argv[3] && !process.argv[3].startsWith('--')
  ? process.argv[3]
  : path.resolve(__dirname, '../seeds/major.with_ids.extended.json');

function normalizeKey(str) {
  return String(str || '')
    .toLowerCase()
    .replace(/[^a-z0-9а-яөүёңъ\s&]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function mainExtras() {
  return new Map([
    ['Agriculture & Horticulture', [
      { name_en: 'Agronomist', name_mn: 'Агрономич' },
      { name_en: 'Livestock Specialist', name_mn: 'Малын мэргэжилтэн' },
      { name_en: 'Greenhouse Technician', name_mn: 'Хүлэмжийн техникч' },
      { name_en: 'Irrigation Technician', name_mn: 'Усалгааны техникч' },
      { name_en: 'Farm Manager', name_mn: 'Фермийн менежер' },
    ]],
    ['Social & Community Services', [
      { name_en: 'Social Worker', name_mn: 'Нийгмийн ажилтан' },
      { name_en: 'Community Outreach Coordinator', name_mn: 'Нийтийн ажил зохицуулагч' },
      { name_en: 'NGO Program Officer', name_mn: 'ТББ-ын хөтөлбөрийн ажилтан' },
      { name_en: 'Volunteer Coordinator', name_mn: 'Сайн дурынхны зохицуулагч' },
      { name_en: 'Case Manager', name_mn: 'Хэрэг хариуцсан ажилтан' },
    ]],
    ['Logistics & Inventory Management', [
      { name_en: 'Inventory Analyst', name_mn: 'Нөөцийн шинжээч' },
      { name_en: 'Warehouse Manager', name_mn: 'Агуулахын менежер' },
      { name_en: 'Supply Planner', name_mn: 'Нийлүүлэлтийн төлөвлөгч' },
      { name_en: 'Procurement Specialist', name_mn: 'Худалдан авалтын мэргэжилтэн' },
      { name_en: 'Demand Planner', name_mn: 'Эрэлтийн төлөвлөгч' },
    ]],
    ['Food Production & Processing', [
      { name_en: 'Food Technologist', name_mn: 'Хүнсний технологич' },
      { name_en: 'Quality Assurance Technician', name_mn: 'Чанарын баталгааны техникч' },
      { name_en: 'Production Line Operator', name_mn: 'Үйлдвэрийн шугамын оператор' },
      { name_en: 'Packaging Technologist', name_mn: 'Сав баглаа боодлын технологич' },
      { name_en: 'HACCP Coordinator', name_mn: 'HACCP зохицуулагч' },
    ]],
    ['Media, Entertainment & Music', [
      { name_en: 'Video Editor', name_mn: 'Видео найруулагч' },
      { name_en: 'Sound Engineer', name_mn: 'Дууны инженер' },
      { name_en: 'Music Producer', name_mn: 'Хөгжмийн продюсер' },
      { name_en: 'Content Producer', name_mn: 'Контент продюсер' },
      { name_en: 'Event Producer', name_mn: 'Арга хэмжээний продюсер' },
    ]],
  ]);
}

async function main() {
  console.log(`Reading: ${INPUT}`);
  if (!fs.existsSync(INPUT)) {
    console.error('Input file not found');
    process.exit(1);
  }
  const input = JSON.parse(fs.readFileSync(INPUT, 'utf8'));
  const groups = Array.isArray(input.majors) ? input.majors : [];

  await mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  console.log('MongoDB Connected');

  const industries = await Industry.find({}).lean();
  const idToIndustry = new Map(industries.map(i => [String(i._id), i]));
  const nameToIndustry = new Map();
  for (const i of industries) {
    nameToIndustry.set(normalizeKey(i.name_en), i);
    nameToIndustry.set(normalizeKey(i.name_mn), i);
  }

  const presentIds = new Set(groups.map(g => String(g.industry_id || g._id)));
  const missing = industries.filter(i => !presentIds.has(String(i._id)));
  console.log(`Missing industries: ${missing.length}`);

  const extras = mainExtras();
  let addedGroups = 0;
  for (const ind of missing) {
    const extra = extras.get(ind.name_en) || [];
    groups.push({
      industry_id: ind._id,
      industry_en: ind.name_en,
      industry_mn: ind.name_mn,
      majors: extra,
    });
    addedGroups += 1;
  }

  fs.writeFileSync(OUTPUT, JSON.stringify({ majors: groups }, null, 2), 'utf8');
  console.log(`Wrote: ${OUTPUT}`);
  console.log(`Added groups: ${addedGroups}`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


