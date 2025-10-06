const express = require('express');
const router = express.Router();
const Industry = require('../models/Industry');
const Position = require('../models/Position');
const SalaryPost = require('../models/SalaryPost');

// Map provided external industry IDs to our industry English names
const externalIndustryIdToNameEn = new Map([
  ['68e0fe1de0d6e4b78381c10c', 'Auto Repair & Mechanics'],
  ['68e0fe1de0d6e4b78381c10d', 'General Service'],
  ['68e0fe1de0d6e4b78381c10e', 'Security & Safety'],
  ['68e0fe1de0d6e4b78381c10f', 'Beauty & Sports'],
  ['68e0fe1de0d6e4b78381c110', 'Transportation & Logistics'],
  ['68e0fe1de0d6e4b78381c111', 'Manufacturing & Production'],
  ['68e0fe1de0d6e4b78381c112', 'Engineering & Electrical'],
  ['68e0fe1de0d6e4b78381c113', 'Veterinary & Environmental'],
  ['68e0fe1de0d6e4b78381c114', 'Legal & Compliance'],
  ['68e0fe1de0d6e4b78381c115', 'Chef & Restaurant'],
  ['68e0fe1de0d6e4b78381c116', 'Customer Service & Call Center'],
  ['68e0fe1de0d6e4b78381c117', 'Teacher & Education'],
  ['68e0fe1de0d6e4b78381c118', 'Medical & Healthcare'],
  ['68e0fe1de0d6e4b78381c119', 'Accounting & Finance'],
  ['68e0fe1de0d6e4b78381c11a', 'Human Resources & Administration'],
  ['68e0fe1de0d6e4b78381c11b', 'Construction & Engineering'],
  ['68e0fe1de0d6e4b78381c11c', 'Content & Media Production'],
  ['68e0fe1de0d6e4b78381c11d', 'Marketing'],
  ['68e0fe1de0d6e4b78381c11e', 'Sales & Commerce'],
  ['68e0fe1de0d6e4b78381c11f', 'Information Technology'],
  ['68e0fe1de0d6e4b78381c120', 'Mining & Industrial'],
  ['68e0fe1de0d6e4b78381c121', 'Graphic Design'],
  ['68e0fe1de0d6e4b78381c122', 'Hotel & Tourism'],
  ['68e0fe1de0d6e4b78381c123', 'Insurance'],
  ['68e0fe1de0d6e4b78381c124', 'Other Professions'],
]);

function yearsToLevel(years) {
  const y = Number(years) || 0;
  if (y <= 0) return 1; // Intern
  if (y === 1) return 2; // Employee
  if (y === 2) return 3; // Senior Employee
  if (y === 3) return 4; // Specialist (MID)
  if (y <= 5) return 5; // Senior Specialist
  if (y <= 7) return 6; // Manager
  if (y <= 9) return 7; // Senior Manager
  if (y <= 11) return 8; // Department Head
  if (y <= 14) return 9; // Division Director
  return 10; // Executive
}

router.post('/claude/analyze-resume', async (req, res) => {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    const { resumeText, resumeUrl, model = 'claude-3-5-sonnet-latest' } = req.body || {};

    async function fetchResumeFromUrl(url) {
      const doFetch = typeof globalThis.fetch === 'function' ? globalThis.fetch : (await import('node-fetch')).default;
      const resp = await doFetch(url);
      if (!resp.ok) throw new Error(`Failed to fetch resume from URL: ${resp.status}`);
      const ctype = String(resp.headers.get('content-type') || '').toLowerCase();

      // Get raw bytes
      const arrayBuf = await resp.arrayBuffer();
      const buf = Buffer.from(arrayBuf);

      const startsWithPDF = buf.slice(0, 4).toString() === '%PDF';
      const looksLikeDocx = buf.slice(0, 2).toString('utf8') === 'PK' || url.toLowerCase().endsWith('.docx') || ctype.includes('officedocument.wordprocessingml.document');

      if (startsWithPDF || ctype.includes('application/pdf') || url.toLowerCase().endsWith('.pdf')) {
        try {
          const pdfParse = require('pdf-parse');
          const parsed = await pdfParse(buf);
          return String(parsed.text || '').trim();
        } catch (e) {
          throw new Error(`PDF parse failed: ${e?.message || e}`);
        }
      }

      if (looksLikeDocx) {
        try {
          const mammoth = require('mammoth');
          const result = await mammoth.extractRawText({ buffer: buf });
          return String(result.value || '').trim();
        } catch (e) {
          throw new Error(`DOCX parse failed: ${e?.message || e}`);
        }
      }

      // Fallback: treat as text/HTML
      const text = buf.toString('utf8');
      if (ctype.includes('text/html') || /<html[\s\S]*>/i.test(text)) {
        return text
          .replace(/<script[\s\S]*?<\/script>/gi, '')
          .replace(/<style[\s\S]*?<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
      }
      return String(text || '').trim();
    }

    let finalResumeText = String(resumeText || '').trim();
    if (!finalResumeText && resumeUrl) {
      try {
        finalResumeText = await fetchResumeFromUrl(resumeUrl);
      } catch (e) {
        return res.status(400).json({ success: false, message: 'Failed to fetch or parse resumeUrl', error: e?.message });
      }
    }

    if (!finalResumeText || finalResumeText.length < 20) {
      return res.status(400).json({ success: false, message: 'Provide resumeText (>=20 chars) or a valid resumeUrl' });
    }

    const systemPrompt = `
Based on the resume below, Generate realistic monthly salaries in Mongolia for up to 5 potential current and future positions for the candidate. 

Monthly salaries should be estimated for this specific candidate per month. How much would the candidate earn per month based on his profession, education, experience, projects, skills, professional achievements, and seniority. Put emphasis on the work experience and past projects if candidate worked at an organization longer than 2 years. Do not speculate and be realistic.

Each role must be an object with these fields:
- role_en: job title (string) in English 
- role_mn: job title (string) in Mongolian
- salary: average monthly salary in MNT (integer) + add  12.5%  on top of it
- experience: minimum years of relevant experience (integer)
- industry: industry ID from the list below (string)

Assign industries using these IDs:
68e0fe1de0d6e4b78381c10c=Auto Repair & Mechanics
68e0fe1de0d6e4b78381c10d=General Service
68e0fe1de0d6e4b78381c10e=Security & Safety
68e0fe1de0d6e4b78381c10f=Beauty & Sports
68e0fe1de0d6e4b78381c110=Transportation & Logistics
68e0fe1de0d6e4b78381c111=Manufacturing & Production
68e0fe1de0d6e4b78381c112=Engineering & Electrical
68e0fe1de0d6e4b78381c113=Veterinary & Environmental
68e0fe1de0d6e4b78381c114=Legal & Compliance
68e0fe1de0d6e4b78381c115=Chef & Restaurant
68e0fe1de0d6e4b78381c116=Customer Service & Call Center
68e0fe1de0d6e4b78381c117=Teacher & Education
68e0fe1de0d6e4b78381c118=Medical & Healthcare
68e0fe1de0d6e4b78381c119=Accounting & Finance
68e0fe1de0d6e4b78381c11a=Human Resources & Administration
68e0fe1de0d6e4b78381c11b=Construction & Engineering
68e0fe1de0d6e4b78381c11c=Content & Media Production
68e0fe1de0d6e4b78381c11d=Marketing
68e0fe1de0d6e4b78381c11e=Sales & Commerce
68e0fe1de0d6e4b78381c11f=Information Technology
68e0fe1de0d6e4b78381c120=Mining & Industrial
68e0fe1de0d6e4b78381c121=Graphic Design
68e0fe1de0d6e4b78381c122=Hotel & Tourism
68e0fe1de0d6e4b78381c123=Insurance
68e0fe1de0d6e4b78381c124=Other Professions

Rules:
- Deduct 20% from salary if the candidate worked and studied at the same time.
- Base everything only on evidence from the resume.
- Output only a JSON array, no explanations, no extra text.

Here is the resume:
---
{resumeText}
`;

    const messages = [
      {
        role: 'user',
        content: `Resume:\n${finalResumeText}`,
      },
    ];

    // Allow dev bypass with debugText
    const { debugText } = req.body || {};
    let data = null;
    let text = '';
    const isDev = process.env.NODE_ENV !== 'production';
    if (isDev && typeof debugText === 'string' && debugText.trim().length > 0) {
      text = debugText.trim();
    } else {
      if (!apiKey) {
        return res.status(500).json({ success: false, message: 'Missing ANTHROPIC_API_KEY' });
      }
      const doFetch = typeof globalThis.fetch === 'function' ? globalThis.fetch : (await import('node-fetch')).default;
      const response = await doFetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model,
          max_tokens: 2000,
          temperature: 0.2,
          system: systemPrompt,
          messages,
        }),
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        return res.status(response.status).json({ success: false, message: 'Claude API error', details: errText });
      }

      data = await response.json();
      if (Array.isArray(data?.content)) {
        text = data.content.map((c) => (c?.type === 'text' ? c.text : '')).join('\n');
      } else if (data?.completion?.content) {
        const cc = data.completion.content;
        text = Array.isArray(cc) ? cc.map((c) => (c.type === 'text' ? c.text : '')).join('\n') : String(cc);
      }
    }

    // Parse JSON array result
    let jsonResult = [];
    const cleaned = String(text || '').trim().replace(/^```json\s*|\s*```$/g, '');
    try {
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed)) jsonResult = parsed; else throw new Error('not array');
    } catch (_) {
      return res.status(500).json({ success: false, message: 'Claude response was not valid JSON array', rawText: text });
    }

    // Normalize and cap
    jsonResult = (jsonResult || [])
      .map((it) => ({
        role_en: String(it.role_en || '').trim(),
        role_mn: String(it.role_mn || '').trim(),
        salary: Number(it.salary) || 0,
        experience: Number(it.experience) || 0,
        industryExtId: String(it.industry || '').trim(),
      }))
      .filter((it) => it.role_en && it.role_mn && it.salary > 0 && it.experience >= 0 && it.industryExtId);
    jsonResult = jsonResult.slice(0, 5);

    if (!jsonResult.length) {
      return res.status(400).json({ success: false, message: 'No valid items found in Claude response', rawText: text });
    }

    // Load industries and positions for mapping
    const allIndustries = await Industry.find({}).lean();
    const nameEnToIndustry = new Map(allIndustries.map((i) => [i.name_en, i]));
    const positionsByIndustryId = new Map();
    const allPositions = await Position.find({}).lean();
    for (const p of allPositions) {
      const key = String(p.industry_id);
      if (!positionsByIndustryId.has(key)) positionsByIndustryId.set(key, []);
      positionsByIndustryId.get(key).push(p);
    }

    const docsToInsert = [];
    for (const item of jsonResult) {
      const nameEn = externalIndustryIdToNameEn.get(item.industryExtId);
      if (!nameEn) continue;
      const industry = nameEnToIndustry.get(nameEn);
      if (!industry) continue;

      // Find or create position within industry by role_en/role_mn
      const roleEnLower = item.role_en.toLowerCase();
      const roleMnLower = item.role_mn.toLowerCase();
      const posList = positionsByIndustryId.get(String(industry._id)) || [];
      let position = posList.find((p) => p.name_en.toLowerCase() === roleEnLower || p.name_mn.toLowerCase() === roleMnLower);
      if (!position) {
        // create new position
        const PositionModel = Position; // use model to create
        const newPos = await PositionModel.create({
          industry_id: industry._id,
          industry_sort_order: industry.sort_order,
          name_mn: item.role_mn,
          name_en: item.role_en,
          sort_order: (posList.length || 0) + 1,
          is_active: true,
        });
        position = newPos.toObject();
        posList.push(position);
        positionsByIndustryId.set(String(industry._id), posList);
      }

      const level = yearsToLevel(item.experience);

      docsToInsert.push({
        industry_id: industry._id,
        position_id: position._id,
        source: 'cv_upload',
        salary: item.salary,
        level,
        experience_years: item.experience,
        is_verified: true,
        is_active: true,
      });
    }

    if (!docsToInsert.length) {
      return res.status(200).json({ success: true, saved: 0, result: [] });
    }

    const saved = await SalaryPost.insertMany(docsToInsert, { ordered: false });

    // Populate industry and position names in response
    const ids = saved.map((d) => d._id);
    const populated = await SalaryPost.find({ _id: { $in: ids } })
      .populate('industry_id', 'name_mn name_en')
      .populate('position_id', 'name_mn name_en')
      .lean();

    const result = populated.map((p) => ({
      ...p,
      industry_name_mn: p.industry_id && p.industry_id.name_mn,
      industry_name_en: p.industry_id && p.industry_id.name_en,
      position_name_mn: p.position_id && p.position_id.name_mn,
      position_name_en: p.position_id && p.position_id.name_en,
    }));

    return res.json({ success: true, saved: saved.length, result });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error', error: err?.message });
  }
});

module.exports = router;


