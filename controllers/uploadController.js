const path = require('path');
const { S3Client, GetBucketLocationCommand } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');

exports.uploadCv = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'file is required (multipart form-data, field name "file")' });
    }

    const bucket = process.env.AWS_S3_BUCKET || 'tsalin.ai';
    let region = process.env.AWS_REGION;
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    if (!accessKeyId || !secretAccessKey) {
      return res.status(500).json({ success: false, message: 'Missing AWS credentials' });
    }

    const original = req.file.originalname || 'cv.pdf';
    const safeName = original.replace(/[^a-zA-Z0-9._-]+/g, '_');
    const key = `resumes/${Date.now()}_${safeName}`;

    // Detect bucket region to avoid endpoint mismatch
    try {
      const probe = new S3Client({ region: region || 'us-east-1', credentials: { accessKeyId, secretAccessKey } });
      const loc = await probe.send(new GetBucketLocationCommand({ Bucket: bucket }));
      const locConstraint = loc.LocationConstraint || null;
      if (!locConstraint) region = 'us-east-1';
      else if (locConstraint === 'EU') region = 'eu-west-1';
      else region = locConstraint;
    } catch (e) {
      return res.status(500).json({ success: false, message: 'Failed to detect bucket region', error: e.message });
    }

    const s3 = new S3Client({ region, forcePathStyle: true, credentials: { accessKeyId, secretAccessKey } });
    const upload = new Upload({
      client: s3,
      params: {
        Bucket: bucket,
        Key: key,
        Body: req.file.buffer,
        ContentType: req.file.mimetype || 'application/octet-stream',
      },
    });
    await upload.done();

    const url = `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
    return res.json({ success: true, bucket, key, url, size: req.file.size, contentType: req.file.mimetype });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Upload failed', error: err.message });
  }
};


