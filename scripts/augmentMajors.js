const fs = require('fs');
const path = require('path');

const INPUT = process.argv[2] && !process.argv[2].startsWith('--')
  ? process.argv[2]
  : path.resolve(__dirname, '../seeds/major.with_ids.json');
const OUTPUT = process.argv[3] && !process.argv[3].startsWith('--')
  ? process.argv[3]
  : path.resolve(__dirname, '../seeds/major.with_ids.extended.json');

function addIfMissing(list, item) {
  const exists = list.some(m => (m.name_en || '').toLowerCase() === (item.name_en || '').toLowerCase());
  if (!exists) list.push(item);
}

function main() {
  console.log(`Reading: ${INPUT}`);
  if (!fs.existsSync(INPUT)) {
    console.error('Input file not found');
    process.exit(1);
  }
  const data = JSON.parse(fs.readFileSync(INPUT, 'utf8'));
  const groups = Array.isArray(data.majors) ? data.majors : [];

  // Extra majors per industry_en (add as many as reasonable to increase coverage)
  const extras = new Map([
    ['Information Technology', [
      { name_en: 'Site Reliability Engineer', name_mn: 'Итгэлцэлийн инженер' },
      { name_en: 'Security Engineer', name_mn: 'Аюулгүй байдлын инженер' },
      { name_en: 'Data Engineer', name_mn: 'Өгөгдлийн инженер' },
      { name_en: 'Platform Engineer', name_mn: 'Платформын инженер' },
      { name_en: 'Product Manager', name_mn: 'Бүтээгдэхүүний менежер' },
      { name_en: 'Technical Writer', name_mn: 'Техникийн бичээч' },
      { name_en: 'Solutions Architect', name_mn: 'Шийдлийн архитектор' },
      { name_en: 'Business Analyst', name_mn: 'Бизнес шинжээч' },
      { name_en: 'MLOps Engineer', name_mn: 'ML ажиллагааны инженер' },
      { name_en: 'Embedded Systems Engineer', name_mn: 'Суурь системийн инженер' },
    ]],
    ['Sales & Commerce', [
      { name_en: 'Account Executive', name_mn: 'Борлуулалтын гүйцэтгэгч' },
      { name_en: 'Sales Operations Specialist', name_mn: 'Борлуулалтын үйл ажиллагааны мэргэжилтэн' },
      { name_en: 'Pre-Sales Engineer', name_mn: 'Урьдчилсан борлуулалтын инженер' },
      { name_en: 'Channel Partner Manager', name_mn: 'Суваг түншийн менежер' },
      { name_en: 'Customer Success Specialist', name_mn: 'Харилцагчийн амжилтын мэргэжилтэн' },
    ]],
    ['Marketing', [
      { name_en: 'Marketing Operations Specialist', name_mn: 'Маркетингийн үйл ажиллагааны мэргэжилтэн' },
      { name_en: 'Community Manager', name_mn: 'Нийгэмлэгийн менежер' },
      { name_en: 'Partnerships Manager', name_mn: 'Түншлэлийн менежер' },
      { name_en: 'Product Marketing Manager', name_mn: 'Бүтээгдэхүүний маркетингийн менежер' },
    ]],
    ['Human Resources & Administration', [
      { name_en: 'HR Generalist', name_mn: 'Хүний нөөцийн ерөнхий мэргэжилтэн' },
      { name_en: 'Compensation & Benefits Specialist', name_mn: 'Цалин, урамшууллын мэргэжилтэн' },
      { name_en: 'HR Operations Manager', name_mn: 'Хүний нөөцийн үйл ажиллагааны менежер' },
      { name_en: 'Learning & Development Manager', name_mn: 'Сургалт хөгжлийн менежер' },
    ]],
    ['Construction & Engineering', [
      { name_en: 'SCADA Engineer', name_mn: 'SCADA инженер' },
      { name_en: 'BIM Engineer', name_mn: 'BIM инженер' },
      { name_en: 'HSE Engineer', name_mn: 'ХАБ-ын инженер' },
      { name_en: 'Cost Engineer', name_mn: 'Өртгийн инженер' },
    ]],
    ['Manufacturing & Production', [
      { name_en: 'Production Scheduler', name_mn: 'Үйлдвэрлэлийн хуваарь зохиогч' },
      { name_en: 'Quality Assurance Manager', name_mn: 'Чанарын баталгааны менежер' },
      { name_en: 'Industrial Hygienist', name_mn: 'Аж үйлдвэрийн эрүүл ахуйч' },
      { name_en: 'Maintenance Planner', name_mn: 'Засвар төлөвлөгч' },
    ]],
    ['Legal & Compliance', [
      { name_en: 'Contracts Manager', name_mn: 'Гэрээний менежер' },
      { name_en: 'Legal Operations Manager', name_mn: 'Хуулийн үйл ажиллагааны менежер' },
    ]],
    ['Customer Service & Call Center', [
      { name_en: 'KYC Specialist', name_mn: 'KYC мэргэжилтэн' },
      { name_en: 'Collections Agent', name_mn: 'Өр барагдуулагч' },
      { name_en: 'Workforce Management Analyst', name_mn: 'Ажиллах хүчний төлөвлөлтийн шинжээч' },
    ]],
    ['Hotel & Tourism', [
      { name_en: 'Housekeeping Manager', name_mn: 'Өрөө үйлчилгээний менежер' },
      { name_en: 'Revenue Manager', name_mn: 'Орлогын менежер' },
    ]],
    ['Retail & Merchandising', [
      { name_en: 'Category Manager', name_mn: 'Ангиллын менежер' },
      { name_en: 'Store Operations Manager', name_mn: 'Дэлгүүрийн үйл ажиллагааны менежер' },
    ]],
    ['Mining & Industrial', [
      { name_en: 'Mine Safety Engineer', name_mn: 'Уурхайн аюулгүй байдлын инженер' },
      { name_en: 'Exploration Geologist', name_mn: 'Хайгуулын геологич' },
    ]],
    ['Teacher & Education', [
      { name_en: 'Instructional Designer', name_mn: 'Сургалтын хөтөлбөр зохиогч' },
      { name_en: 'Education Program Manager', name_mn: 'Боловсролын хөтөлбөрийн менежер' },
    ]],
    ['Medical & Healthcare', [
      { name_en: 'Medical Records Specialist', name_mn: 'Эмнэлгийн бүртгэлийн мэргэжилтэн' },
      { name_en: 'Clinical Research Coordinator', name_mn: 'Клиникийн судалгааны зохицуулагч' },
    ]],
  ]);

  let added = 0;
  for (const g of groups) {
    const industryName = g.industry_en;
    const extra = extras.get(industryName);
    if (!extra) continue;
    if (!Array.isArray(g.majors)) g.majors = [];
    const before = g.majors.length;
    for (const m of extra) addIfMissing(g.majors, m);
    added += (g.majors.length - before);
  }

  fs.writeFileSync(OUTPUT, JSON.stringify({ majors: groups }, null, 2), 'utf8');
  console.log(`Wrote: ${OUTPUT}`);
  console.log(`Added majors: ${added}`);
}

main();


