require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse');
const mongoose = require('mongoose');

// Create schema for raw job posts collection
const rawJobPostSchema = new mongoose.Schema({
  major: String,
  company: String,
  industry: String,
  min_salary: Number,
  max_salary: Number,
  level: String,
  job_category: String,
  job_type: String,
  created_at: Date,
}, {
  timestamps: true,
  collection: 'raw_job_posts',
});

const RawJobPost = mongoose.model('RawJobPost', rawJobPostSchema);

const INPUT_PATH = process.argv[2] && !process.argv[2].startsWith('--')
  ? process.argv[2]
  : path.resolve(__dirname, '../seeds/job_posting_202510051046.csv');

function toNumberSafe(value) {
  if (value === undefined || value === null || value === '') return undefined;
  const n = Number(String(value).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? n : undefined;
}

function toDateSafe(value) {
  if (!value) return undefined;
  try {
    return new Date(value);
  } catch (e) {
    return undefined;
  }
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

  // Clear existing raw job posts
  await RawJobPost.deleteMany({});
  console.log('Cleared existing raw job posts');

  const records = [];
  const stats = {
    total: 0,
    valid: 0,
    skipped: 0,
  };

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

    // Convert CSV columns to downcased field names
    const doc = {
      major: (row.major || '').toString().trim(),
      company: (row.company || '').toString().trim(),
      industry: (row.industry || '').toString().trim(),
      min_salary: toNumberSafe(row.min_salary),
      max_salary: toNumberSafe(row.max_salary),
      level: (row.level || '').toString().trim(),
      job_category: (row.job_category || '').toString().trim(),
      job_type: (row.job_type || '').toString().trim(),
      created_at: toDateSafe(row.createdAt),
    };

    // Skip if essential fields are missing
    if (!doc.major || !doc.job_category) {
      stats.skipped += 1;
      continue;
    }

    records.push(doc);
    stats.valid += 1;

    // Insert in batches of 10
    if (records.length >= 10) {
      try {
        await RawJobPost.insertMany(records, { ordered: false });
        console.log(`✓ Inserted batch of ${records.length} records (total: ${stats.valid}/${stats.total})`);
        records.length = 0; // Clear array
      } catch (err) {
        console.error('Error inserting batch:', err.message);
        records.length = 0; // Clear array and continue
      }
    }
  }

  // Insert remaining records
  if (records.length > 0) {
    try {
      await RawJobPost.insertMany(records, { ordered: false });
      console.log(`✓ Inserted final batch of ${records.length} records (total: ${stats.valid}/${stats.total})`);
    } catch (err) {
      console.error('Error inserting final batch:', err.message);
    }
  }

  console.log('\n--- Import Complete ---');
  console.log(`Total rows processed: ${stats.total}`);
  console.log(`Valid records inserted: ${stats.valid}`);
  console.log(`Skipped records: ${stats.skipped}`);

  // Show sample of inserted data
  const sample = await RawJobPost.find({}).limit(3).lean();
  console.log('\nSample records:');
  sample.forEach((record, idx) => {
    console.log(`${idx + 1}. ${record.major} | ${record.job_category} | ${record.max_salary}`);
  });

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
