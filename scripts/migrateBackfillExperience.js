require('dotenv').config();
const mongoose = require('mongoose');
const SalaryPost = require('../models/SalaryPost');

function experienceYearsFromLevel(levelNum) {
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
  await mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  console.log('MongoDB Connected');

  const cursor = SalaryPost.find({ $or: [ { experience_years: { $exists: false } }, { experience_years: null } ] }).cursor();
  let updated = 0;
  for await (const doc of cursor) {
    const exp = experienceYearsFromLevel(doc.level);
    doc.experience_years = exp;
    await doc.save();
    updated += 1;
    if (updated % 100 === 0) console.log(`Updated ${updated} documents...`);
  }

  console.log(`Done. Updated ${updated} documents.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


