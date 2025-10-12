#!/usr/bin/env node
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { S3Client, GetBucketLocationCommand } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');

async function main() {
  const filePath = process.argv[2];
  const key = process.argv[3] || path.basename(filePath || '');
  const bucket = process.argv[4] || process.env.AWS_S3_BUCKET || 'tsalin.ai';

  if (!filePath || !fs.existsSync(filePath)) {
    console.error('Usage: node scripts/s3Upload.js <localFilePath> [key] [bucket]');
    process.exit(1);
  }

  let region = process.env.AWS_REGION;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  if (!accessKeyId || !secretAccessKey) {
    console.error('Missing AWS credentials. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in env');
    process.exit(1);
  }

  // Always detect and use the bucket's actual region to avoid endpoint mismatches
  try {
    const probe = new S3Client({ region: region || 'us-east-1', credentials: { accessKeyId, secretAccessKey } });
    const loc = await probe.send(new GetBucketLocationCommand({ Bucket: bucket }));
    const locConstraint = loc.LocationConstraint || null;
    if (!locConstraint) region = 'us-east-1';
    else if (locConstraint === 'EU') region = 'eu-west-1';
    else region = locConstraint;
  } catch (e) {
    console.error('Failed to detect bucket region. Error:', e.message);
    process.exit(1);
  }

  // Use path-style addressing to support dots in bucket names (e.g., tsalin.ai) over TLS
  const s3 = new S3Client({ region, forcePathStyle: true, credentials: { accessKeyId, secretAccessKey } });
  const body = fs.createReadStream(filePath);

  try {
    const upload = new Upload({
      client: s3,
      params: {
        Bucket: bucket,
        Key: key,
        Body: body,
      },
      queueSize: 4,
      partSize: 8 * 1024 * 1024,
      leavePartsOnError: false,
    });

    upload.on('httpUploadProgress', (p) => {
      if (p.total) {
        const pct = ((p.loaded / p.total) * 100).toFixed(1);
        process.stdout.write(`\rUploading ${key}: ${pct}%`);
      }
    });

    const result = await upload.done();
    console.log(`\nUploaded to s3://${bucket}/${key}`);
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('Upload failed:', err.message);
    process.exit(1);
  }
}

main();


