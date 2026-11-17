import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import {
  extractPrescriptionFields,
  resolveCanonicalConditionMeta,
} from '../rules/prescriptionAlertEngine.mjs';

const VISION_ENDPOINT = 'https://vision.googleapis.com/v1/images:annotate';
const MAX_PAGES = 6;
const MAX_IMAGE_EDGE = 2200;

export class PrescriptionServiceError extends Error {
  constructor(message, status = 500, code = 'PRESCRIPTION_EXTRACT_ERROR') {
    super(message);
    this.name = 'PrescriptionServiceError';
    this.status = status;
    this.code = code;
  }
}

function cleanEnvKey(val) {
  let s = String(val || '').trim();
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    s = s.slice(1, -1).trim();
  }
  if (!s || s === 'MY_GEMINI_API_KEY' || s === 'YOUR_API_KEY' || s === 'API_KEY') return '';
  return s;
}

function getVisionApiKey() {
  return cleanEnvKey(
    process.env.GOOGLE_CLOUD_VISION_API_KEY ||
      process.env.GOOGLE_VISION_API_KEY ||
      process.env.CLOUD_VISION_API_KEY ||
      process.env.VISION_API_KEY
  );
}

function getGeminiApiKey() {
  return cleanEnvKey(
    process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_GEMINI_API_KEY ||
      process.env.GOOGLE_GENAI_API_KEY ||
      process.env.GOOGLE_API_KEY
  );
}

export function getConfiguredOcrCapabilities() {
  return {
    geminiConfigured: Boolean(getGeminiApiKey()),
    visionConfigured: Boolean(getVisionApiKey()),
  };
}

function buildMissingKeysMessage(missingBoth = true) {
  const isVercel = Boolean(process.env.VERCEL);
  if (isVercel) {
    return missingBoth
      ? "Neither GOOGLE_CLOUD_VISION_API_KEY nor GEMINI_API_KEY is configured in your Vercel Environment Variables. Add GEMINI_API_KEY (and optionally GOOGLE_CLOUD_VISION_API_KEY) in Vercel Dashboard → Project Settings → Environment Variables, then Redeploy. You can also use 'Paste or Type Prescription Text' or 'Enter Manually' below."
      : "GEMINI_API_KEY is not configured in your Vercel Environment Variables. Add GEMINI_API_KEY in Vercel Dashboard → Project Settings → Environment Variables, then Redeploy.";
  }
  return missingBoth
    ? "Neither GOOGLE_CLOUD_VISION_API_KEY nor GEMINI_API_KEY is configured in backend environment variables. Configure at least GEMINI_API_KEY in Settings > Secrets (or .env locally), or use 'Paste or Type Prescription Text' / 'Enter Manually' below."
    : "GEMINI_API_KEY is not configured in backend environment variables. Configure it in Settings > Secrets (or .env locally) to interpret prescriptions.";
}

function createGeminiClient(apiKey) {
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      timeout: 12000,
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function parseDataUrl(dataUrl) {
  const raw = String(dataUrl || '').trim();
  const match = raw.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/s);
  if (!match) return null;
  return {
    mimeType: match[1].toLowerCase(),
    base64: match[2].replace(/\s+/g, ''),
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function analyzeAndPrepareImage(page, idx) {
  const parsed = parseDataUrl(page?.dataUrl || page?.imageDataUrl);
  if (!parsed) {
    throw new PrescriptionServiceError(
      `Page ${idx + 1} has an invalid image payload. Upload a valid JPG, PNG, or PDF document.`,
      400,
      'INVALID_IMAGE_PAYLOAD'
    );
  }

  const inputBuffer = Buffer.from(parsed.base64, 'base64');
  if (!inputBuffer.length) {
    throw new PrescriptionServiceError(
      `Page ${idx + 1} image is empty.`,
      400,
      'EMPTY_IMAGE'
    );
  }

  let sharpFn = null;
  try {
    const sharpMod = await import('sharp');
    sharpFn = sharpMod?.default || null;
  } catch {
    sharpFn = null;
  }

  if (!sharpFn) {
    return {
      pageNumber: Number(page?.pageNumber) || idx + 1,
      fileName: String(page?.fileName || `Page ${idx + 1}`).trim(),
      width: Number(page?.width) || 0,
      height: Number(page?.height) || 0,
      sharpnessScore: 55,
      isBlurry: false,
      isLowResolution: false,
      warnings: [],
      mimeType: parsed.mimeType,
      base64: parsed.base64,
    };
  }

  const baseImg = sharpFn(inputBuffer).rotate();
  const metadata = await baseImg.metadata();
  const width = metadata.width || 0;
  const height = metadata.height || 0;

  // Measure edge contrast / blur using Laplacian operator on a normalized grayscale sample
  let sharpnessScore = 50;
  let contrastStd = 40;
  try {
    const sampleBuf = await sharpFn(inputBuffer)
      .rotate()
      .resize({ width: 900, height: 900, fit: 'inside', withoutEnlargement: true })
      .grayscale()
      .toBuffer();

    const baseStats = await sharpFn(sampleBuf).stats();
    contrastStd = Number(baseStats?.channels?.[0]?.stdev || 0);

    const lapStats = await sharpFn(sampleBuf)
      .convolve({
        width: 3,
        height: 3,
        kernel: [0, 1, 0, 1, -4, 1, 0, 1, 0],
      })
      .stats();
    const lapStd = Number(lapStats?.channels?.[0]?.stdev || 0);
    sharpnessScore = Math.max(0, Math.min(100, Math.round((lapStd / 28) * 100)));
  } catch {
    // Keep neutral sharpness estimate if convolution fails on edge-case formats
  }

  const warnings = [];
  const isLowResolution = width > 0 && height > 0 && (width < 550 || height < 550);
  const isBlurry = sharpnessScore < 16 || contrastStd < 16;

  if (isLowResolution) {
    warnings.push(
      `Page ${idx + 1} has low resolution (${width}x${height}px); small handwritten doses may be harder to read.`
    );
  }
  if (isBlurry) {
    warnings.push(
      `Page ${idx + 1} appears blurry or low-contrast (sharpness ${sharpnessScore}/100); please double-check uncertain fields.`
    );
  }

  // Produce high-clarity normalized PNG buffer for Vision & Gemini
  const preparedBuffer = await sharpFn(inputBuffer)
    .rotate()
    .resize({
      width: MAX_IMAGE_EDGE,
      height: MAX_IMAGE_EDGE,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .png({ compressionLevel: 6 })
    .toBuffer();

  return {
    pageNumber: Number(page?.pageNumber) || idx + 1,
    fileName: String(page?.fileName || `Page ${idx + 1}`).trim(),
    width,
    height,
    sharpnessScore,
    isBlurry,
    isLowResolution,
    warnings,
    mimeType: 'image/png',
    base64: preparedBuffer.toString('base64'),
  };
}

function extractVisionConfidenceMetrics(fullTextAnnotation) {
  if (!fullTextAnnotation || !Array.isArray(fullTextAnnotation.pages)) {
    return { confidence: null, wordCount: 0, lowConfidenceWordCount: 0 };
  }
  let confSum = 0;
  let confCount = 0;
  let lowConfidenceWordCount = 0;

  for (const page of fullTextAnnotation.pages) {
    for (const block of page.blocks || []) {
      for (const paragraph of block.paragraphs || []) {
        for (const word of paragraph.words || []) {
          if (typeof word.confidence === 'number') {
            confSum += word.confidence;
            confCount += 1;
            if (word.confidence < 0.68) {
              lowConfidenceWordCount += 1;
            }
          }
        }
      }
    }
  }

  return {
    confidence: confCount > 0 ? Math.round((confSum / confCount) * 100) : null,
    wordCount: confCount,
    lowConfidenceWordCount,
  };
}

async function runCloudVisionDocumentOcr(preparedPages, visionApiKey) {
  const requests = preparedPages.map((p) => ({
    image: { content: p.base64 },
    features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
    imageContext: {
      languageHints: ['en'],
    },
  }));

  let lastError = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const res = await fetch(
        `${VISION_ENDPOINT}?key=${encodeURIComponent(visionApiKey)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ requests }),
          signal: AbortSignal.timeout(20000),
        }
      );

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const apiMessage =
          data?.error?.message || `Google Cloud Vision returned HTTP ${res.status}.`;
        if (res.status === 400 || res.status === 401 || res.status === 403) {
          throw new PrescriptionServiceError(
            `Google Cloud Vision authentication failed (${res.status}): ${apiMessage}. Check GOOGLE_CLOUD_VISION_API_KEY in backend environment variables.`,
            res.status,
            'VISION_AUTH_ERROR'
          );
        }
        if (res.status === 429 && attempt === 0) {
          await sleep(800);
          continue;
        }
        throw new PrescriptionServiceError(
          `Google Cloud Vision request failed (${res.status}): ${apiMessage}`,
          res.status,
          'VISION_UPSTREAM_ERROR'
        );
      }

      const responses = Array.isArray(data?.responses) ? data.responses : [];
      return preparedPages.map((page, idx) => {
        const item = responses[idx] || {};
        if (item.error) {
          return {
            pageNumber: page.pageNumber,
            fileName: page.fileName,
            rawText: '',
            confidence: null,
            wordCount: 0,
            lowConfidenceWordCount: 0,
            sharpnessScore: page.sharpnessScore,
            isBlurry: page.isBlurry,
            warnings: [
              ...page.warnings,
              `Cloud Vision error on page ${page.pageNumber}: ${item.error.message || 'Unreadable page'}`,
            ],
          };
        }

        const fullAnnotation = item.fullTextAnnotation || null;
        const textAnnotationFallback = item.textAnnotations?.[0]?.description || '';
        const rawText = String(fullAnnotation?.text ?? textAnnotationFallback ?? '');
        const metrics = extractVisionConfidenceMetrics(fullAnnotation);
        const pageWarnings = [...page.warnings];

        if (!rawText.trim()) {
          pageWarnings.push(
            `Page ${page.pageNumber} produced no readable text in Google Cloud Vision OCR.`
          );
        } else if (metrics.confidence !== null && metrics.confidence < 72) {
          pageWarnings.push(
            `Page ${page.pageNumber} had low OCR confidence (${metrics.confidence}%), likely due to handwriting or image clarity.`
          );
        }
        if (metrics.lowConfidenceWordCount >= 4) {
          pageWarnings.push(
            `Page ${page.pageNumber} contains ${metrics.lowConfidenceWordCount} low-confidence handwritten words requiring verification.`
          );
        }

        return {
          pageNumber: page.pageNumber,
          fileName: page.fileName,
          rawText,
          confidence: metrics.confidence,
          wordCount: metrics.wordCount,
          lowConfidenceWordCount: metrics.lowConfidenceWordCount,
          sharpnessScore: page.sharpnessScore,
          isBlurry: page.isBlurry,
          warnings: pageWarnings,
        };
      });
    } catch (err) {
      lastError = err;
      if (err instanceof PrescriptionServiceError && err.status < 500 && err.status !== 429) {
        throw err;
      }
      if (attempt === 0) {
        await sleep(600);
        continue;
      }
    }
  }

  throw (
    lastError ||
    new PrescriptionServiceError(
      'Unable to reach Google Cloud Vision API.',
      502,
      'VISION_NETWORK_ERROR'
    )
  );
}

const PRESCRIPTION_JSON_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    isReadablePrescription: {
      type: Type.BOOLEAN,
      description: 'True only if this document/text contains a readable medical prescription.',
    },
    transcribedText: {
      type: Type.STRING,
      description:
        'Exact verbatim text visible across the prescription pages (preserve spelling, numbers, abbreviations; mark unreadable handwritten words as [unclear]).',
    },
    handwritingQuality: {
      type: Type.STRING,
      enum: ['clear', 'partially_unclear', 'unreadable'],
      description: 'Assessment of legibility across handwritten and printed regions.',
    },
    overallConfidence: {
      type: Type.STRING,
      enum: ['high', 'medium', 'low'],
    },
    doctorVerificationRecommended: {
      type: Type.BOOLEAN,
      description:
        'True whenever any medicine name, dosage, frequency, or diagnosis is uncertain, blurry, or illegible.',
    },
    verificationPrompt: {
      type: Type.STRING,
      description:
        'Clear non-diagnostic guidance telling the user which items need manual or doctor verification.',
    },
    patientName: {
      type: Type.STRING,
      description: 'Patient full name if clearly readable; empty string if missing or illegible.',
    },
    patientNameConfidence: {
      type: Type.STRING,
      enum: ['high', 'medium', 'low'],
    },
    patientNameUncertain: {
      type: Type.BOOLEAN,
    },
    prescriptionDate: {
      type: Type.STRING,
      description: 'Prescription date formatted strictly as YYYY-MM-DD if clearly readable, otherwise empty string.',
    },
    prescriptionDateConfidence: {
      type: Type.STRING,
      enum: ['high', 'medium', 'low'],
    },
    prescriptionDateUncertain: {
      type: Type.BOOLEAN,
    },
    conditions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          category: { type: Type.STRING, enum: ['acute', 'chronic'] },
          validDays: { type: Type.INTEGER },
          confidence: { type: Type.STRING, enum: ['high', 'medium', 'low'] },
          needsVerification: { type: Type.BOOLEAN },
          uncertaintyReason: { type: Type.STRING },
          sourceSnippet: { type: Type.STRING },
        },
        required: ['name', 'category', 'validDays', 'confidence', 'needsVerification'],
      },
    },
    medicines: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          dosage: { type: Type.STRING },
          frequency: { type: Type.STRING },
          duration: { type: Type.STRING },
          confidence: { type: Type.STRING, enum: ['high', 'medium', 'low'] },
          needsVerification: { type: Type.BOOLEAN },
          uncertaintyReason: { type: Type.STRING },
          note: { type: Type.STRING },
        },
        required: ['name', 'dosage', 'frequency', 'confidence', 'needsVerification'],
      },
    },
    dietaryRestrictions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          text: { type: Type.STRING },
          confidence: { type: Type.STRING, enum: ['high', 'medium', 'low'] },
          needsVerification: { type: Type.BOOLEAN },
          uncertaintyReason: { type: Type.STRING },
        },
        required: ['text', 'confidence', 'needsVerification'],
      },
    },
  },
  required: [
    'isReadablePrescription',
    'transcribedText',
    'handwritingQuality',
    'overallConfidence',
    'doctorVerificationRecommended',
    'verificationPrompt',
    'patientName',
    'patientNameConfidence',
    'patientNameUncertain',
    'prescriptionDate',
    'prescriptionDateConfidence',
    'prescriptionDateUncertain',
    'conditions',
    'medicines',
    'dietaryRestrictions',
  ],
};

const SYSTEM_INSTRUCTION = `You are a careful clinical document extraction assistant for NutriCheck.
Your job is to interpret doctor prescriptions using the prescription image(s) (when provided) AND any Google Cloud Vision DOCUMENT_TEXT_DETECTION OCR transcript (when available).

CRITICAL SAFETY RULES — FOLLOW WITHOUT EXCEPTION:
1. NEVER guess, autocomplete, or invent unclear handwritten medicine names, dosages, frequencies, patient names, or diagnoses.
2. NEVER fabricate missing medical information. If a field is absent or illegible, return an empty string "" or omit the item.
3. Always populate "transcribedText" with an exact verbatim transcription of all readable text on the prescription page(s) (preserving line breaks, dates, Rx symbols, and marking unreadable words as "[unclear]"). If an OCR transcript was already provided, preserve it accurately.
4. If a medicine name or diagnosis is partially legible but ambiguous (e.g., handwritten letters look like multiple drugs or OCR text has garbled characters):
   - Preserve ONLY what is clearly readable (or write "[Unclear handwritten entry — verify with doctor]" if a visible Rx line cannot be deciphered safely).
   - Set confidence to "low", needsVerification to true, and give a specific uncertaintyReason.
   - Set doctorVerificationRecommended to true.
5. For medicines: extract exact name, dosage (e.g. "650 mg", "5 ml", "" if absent), frequency (e.g. "OD", "BD", "TDS", "1-0-1", "SOS", "Twice daily after food", "" if absent), and duration (e.g. "5 days", "" if absent).
6. For diagnosed conditions: extract ONLY conditions explicitly stated by the doctor in diagnosis/chief complaints/clinical notes. Do NOT infer unstated diseases solely from a generic drug unless clearly diagnosed. Choose validDays (typically 5-14 for acute conditions like fever/gastritis, 90-180 for chronic conditions).
7. For dietary restrictions: extract ONLY dietary advice or food/drink restrictions explicitly mentioned by the doctor (e.g., "Avoid cold drinks and ice cream", "Low salt diet", "Soft bland food").
8. If the handwriting across the page(s) is unreadable or the image is too blurry or not a medical prescription, set handwritingQuality="unreadable", overallConfidence="low", doctorVerificationRecommended=true, and instruct the user in verificationPrompt to verify the prescription directly with their doctor or pharmacist.`;

async function callGeminiStructuredInterpreter({
  geminiApiKey,
  preparedPages,
  ocrPages,
  combinedRawText,
  qualityWarnings,
  usedCloudVision,
}) {
  const ai = createGeminiClient(geminiApiKey);

  const pageMetaSummary =
    ocrPages.length > 0
      ? ocrPages
          .map(
            (p) =>
              `Page ${p.pageNumber} (${p.fileName}): OCR confidence=${p.confidence ?? 'Gemini Vision'}%, sharpness=${p.sharpnessScore}/100, blurry=${p.isBlurry}, lowConfWords=${p.lowConfidenceWordCount}`
          )
          .join('\n')
      : preparedPages.length > 0
      ? preparedPages
          .map(
            (p) =>
              `Page ${p.pageNumber} (${p.fileName}): sharpness=${p.sharpnessScore}/100, blurry=${p.isBlurry}`
          )
          .join('\n')
      : 'Source: Direct text input (no image attached).';

  const ocrTranscriptBlock = usedCloudVision
    ? `Exact Google Cloud Vision DOCUMENT_TEXT_DETECTION Transcript (preserve meaning, never invent missing facts):
"""
${combinedRawText || '[No OCR text extracted]'}
"""`
    : combinedRawText
    ? `Provided Prescription Text:
"""
${combinedRawText}
"""`
    : `No external OCR transcript was attached. Read the attached prescription image(s) directly: first transcribe every readable line verbatim into "transcribedText" (marking illegible handwriting as "[unclear]"), and extract the structured fields strictly from what is clearly visible.`;

  const promptText = `Analyze the attached prescription ${
    preparedPages.length > 0 ? 'image(s)' : 'text'
  }${usedCloudVision ? ' and Cloud Vision OCR transcript' : ''} and return structured JSON matching the schema.

Document Quality Summary:
${pageMetaSummary}
${qualityWarnings.length > 0 ? `Quality Warnings:\n- ${qualityWarnings.join('\n- ')}\n` : ''}
${ocrTranscriptBlock}

Return strict JSON with transcribedText, patientName, prescriptionDate (YYYY-MM-DD or ""), diagnosed conditions, medicines (with dosage & frequency), dietaryRestrictions, confidence levels ("high" | "medium" | "low"), needsVerification flags, and doctorVerificationRecommended.`;

  const parts = [];
  for (const page of preparedPages) {
    parts.push({
      inlineData: {
        mimeType: page.mimeType,
        data: page.base64,
      },
    });
  }
  parts.push({ text: promptText });

  const modelsToTry = ['gemini-4-hydrogen', 'gemini-3.1-flash-lite'];
  let lastError = null;

  for (const modelName of modelsToTry) {
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: { parts },
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseMimeType: 'application/json',
          responseSchema: PRESCRIPTION_JSON_SCHEMA,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      });

      const rawJson = String(response.text || '').trim();
      if (!rawJson) {
        throw new PrescriptionServiceError(
          'Gemini Vision returned an empty response while interpreting the prescription.',
          502,
          'GEMINI_EMPTY_RESPONSE'
        );
      }

      return JSON.parse(rawJson);
    } catch (err) {
      lastError = err;
      const status = Number(err?.status || err?.statusCode || 0);
      if (status === 400 || status === 401 || status === 403) {
        throw new PrescriptionServiceError(
          `Gemini API authentication/request error (${status}): ${err?.message || 'Check GEMINI_API_KEY in Settings > Secrets.'}`,
          status,
          'GEMINI_AUTH_ERROR'
        );
      }
      // Transient 429/503/timeout: try fallback model immediately
    }
  }

  if (lastError instanceof PrescriptionServiceError) throw lastError;
  const status = Number(lastError?.status || lastError?.statusCode || 0);
  throw new PrescriptionServiceError(
    `Gemini Vision interpretation failed: ${lastError instanceof Error ? lastError.message : 'Unknown error'}`,
    status >= 400 && status < 600 ? status : 502,
    'GEMINI_UPSTREAM_ERROR'
  );
}

function normalizeConfidence(val, fallback = 'medium') {
  const lower = String(val || '').toLowerCase();
  if (lower === 'high' || lower === 'medium' || lower === 'low') return lower;
  return fallback;
}

export async function analyzePrescriptionDocument({ pages = [], rawTextInput = '' } = {}) {
  const cleanedPages = Array.isArray(pages) ? pages.slice(0, MAX_PAGES) : [];
  const trimmedTextInput = String(rawTextInput || '').trim();

  if (cleanedPages.length === 0 && trimmedTextInput.length < 4) {
    throw new PrescriptionServiceError(
      'Please upload at least one prescription page (JPG, PNG, or PDF) or paste readable prescription text.',
      400,
      'NO_PRESCRIPTION_INPUT'
    );
  }

  const geminiApiKey = getGeminiApiKey();
  const hasValidGeminiKey = Boolean(geminiApiKey);
  const visionApiKey = getVisionApiKey();

  let preparedPages = [];
  let ocrPages = [];
  let combinedRawText = trimmedTextInput;
  const qualityWarnings = [];
  let usedCloudVision = false;

  if (cleanedPages.length > 0) {
    if (!visionApiKey && !hasValidGeminiKey) {
      throw new PrescriptionServiceError(
        buildMissingKeysMessage(true),
        503,
        'MISSING_VISION_AND_GEMINI_KEYS'
      );
    }

    preparedPages = await Promise.all(
      cleanedPages.map((page, idx) => analyzeAndPrepareImage(page, idx))
    );

    if (visionApiKey) {
      try {
        ocrPages = await runCloudVisionDocumentOcr(preparedPages, visionApiKey);
        usedCloudVision = true;

        for (const p of ocrPages) {
          for (const w of p.warnings || []) {
            if (!qualityWarnings.includes(w)) qualityWarnings.push(w);
          }
        }

        if (ocrPages.length === 1) {
          combinedRawText = ocrPages[0].rawText;
        } else {
          combinedRawText = ocrPages
            .map((p) => `--- Page ${p.pageNumber} (${p.fileName}) ---\n${p.rawText}`.trim())
            .join('\n\n');
        }
      } catch (visionErr) {
        if (!hasValidGeminiKey) {
          throw visionErr;
        }
        qualityWarnings.push(
          'Google Cloud Vision OCR was unavailable; Gemini Vision Multimodal OCR read the prescription image(s) directly. Please verify uncertain fields.'
        );
      }
    }

    if (!usedCloudVision) {
      ocrPages = preparedPages.map((page) => {
        for (const w of page.warnings || []) {
          if (!qualityWarnings.includes(w)) qualityWarnings.push(w);
        }
        return {
          pageNumber: page.pageNumber,
          fileName: page.fileName,
          rawText: '',
          confidence: null,
          wordCount: 0,
          lowConfidenceWordCount: 0,
          sharpnessScore: page.sharpnessScore,
          isBlurry: page.isBlurry,
          warnings: [...(page.warnings || [])],
        };
      });
    }
  }

  let geminiResult = null;
  let usedOcrFallback = false;

  if (hasValidGeminiKey) {
    try {
      geminiResult = await callGeminiStructuredInterpreter({
        geminiApiKey,
        preparedPages,
        ocrPages,
        combinedRawText,
        qualityWarnings,
        usedCloudVision,
      });

      if (!combinedRawText.trim() && String(geminiResult?.transcribedText || '').trim()) {
        combinedRawText = String(geminiResult.transcribedText).trim();
        if (ocrPages.length === 1) {
          ocrPages[0].rawText = combinedRawText;
        } else if (ocrPages.length > 1) {
          ocrPages[0].rawText = combinedRawText;
        }
      }
    } catch (err) {
      if (
        err instanceof PrescriptionServiceError &&
        (err.code === 'GEMINI_AUTH_ERROR' || !combinedRawText.trim())
      ) {
        throw err;
      }
      // Transient 503/429/timeout from Gemini: preserve extracted OCR transcript with manual review required
      usedOcrFallback = true;
      qualityWarnings.push(
        'Gemini Vision was temporarily busy; preliminary fields were parsed directly from the OCR transcript and require your manual verification.'
      );
    }
  } else if (combinedRawText.trim()) {
    usedOcrFallback = true;
    qualityWarnings.push(
      'GEMINI_API_KEY is not configured; preliminary fields were parsed from OCR text and require manual verification.'
    );
  } else {
    throw new PrescriptionServiceError(
      buildMissingKeysMessage(false),
      503,
      'MISSING_GEMINI_API_KEY'
    );
  }

  if (!geminiResult || usedOcrFallback) {
    const parsed = extractPrescriptionFields(combinedRawText);
    geminiResult = {
      isReadablePrescription: Boolean(combinedRawText.trim()),
      transcribedText: combinedRawText,
      handwritingQuality: 'partially_unclear',
      overallConfidence: 'low',
      doctorVerificationRecommended: true,
      verificationPrompt:
        'Automated AI interpretation was unavailable. Review the preserved OCR transcript and verify every condition, medicine, dosage, and date with your prescription or doctor before saving.',
      patientName: '',
      patientNameConfidence: 'low',
      patientNameUncertain: true,
      prescriptionDate: parsed.prescriptionDate || '',
      prescriptionDateConfidence: parsed.prescriptionDate ? 'medium' : 'low',
      prescriptionDateUncertain: !parsed.prescriptionDate,
      conditions: (parsed.conditions || []).map((c) => ({
        name: c.name,
        category: c.category,
        validDays: c.validDays,
        confidence: 'low',
        needsVerification: true,
        uncertaintyReason: 'Parsed from raw OCR text — verify against prescription.',
        sourceSnippet: c.sourceSnippet,
      })),
      medicines: (parsed.medicines || []).map((m) => ({
        name: m.name,
        dosage: m.dosage || '',
        frequency: '',
        duration: m.note || '',
        confidence: 'low',
        needsVerification: true,
        uncertaintyReason: 'Verify medicine name, dosage, and frequency manually.',
        note: m.note || '',
      })),
      dietaryRestrictions: (parsed.dietaryRestrictions || []).map((text) => ({
        text,
        confidence: 'low',
        needsVerification: true,
        uncertaintyReason: 'Verify dietary restriction against prescription.',
      })),
    };
  }

  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(String(geminiResult.prescriptionDate || '').trim())
    ? String(geminiResult.prescriptionDate).trim()
    : '';
  const fallbackDate = validDate || new Date().toISOString().slice(0, 10);
  const dateMs = new Date(`${fallbackDate}T00:00:00`).getTime() || Date.now();

  const normalizedConditions = (Array.isArray(geminiResult.conditions) ? geminiResult.conditions : [])
    .filter((c) => c && String(c.name || '').trim())
    .map((c, idx) => {
      const name = String(c.name).trim();
      const meta = resolveCanonicalConditionMeta(name);
      const category = c.category === 'chronic' ? 'chronic' : meta.category;
      const validDays = Math.min(
        365,
        Math.max(1, Number(c.validDays) || meta.defaultValidDays || (category === 'chronic' ? 180 : 7))
      );
      const expiresAt = new Date(dateMs + validDays * 24 * 60 * 60 * 1000).toISOString();
      const confidence = normalizeConfidence(c.confidence, 'medium');
      const needsVerification = Boolean(c.needsVerification) || confidence === 'low';
      return {
        id: `cond-${meta.canonicalKey}-${Date.now().toString(36).slice(-4)}-${idx}`,
        name,
        canonicalKey: meta.canonicalKey,
        category,
        validDays,
        prescribedDate: fallbackDate,
        expiresAt,
        status: Date.now() > new Date(expiresAt).getTime() ? 'expired' : 'active',
        confidence,
        needsVerification,
        uncertaintyReason: String(c.uncertaintyReason || '').trim(),
        sourceSnippet: String(c.sourceSnippet || 'Extracted by Cloud Vision + Gemini Vision').trim(),
      };
    });

  const normalizedMedicines = (Array.isArray(geminiResult.medicines) ? geminiResult.medicines : [])
    .filter((m) => m && String(m.name || '').trim())
    .map((m) => {
      const confidence = normalizeConfidence(m.confidence, 'medium');
      const needsVerification = Boolean(m.needsVerification) || confidence === 'low';
      return {
        name: String(m.name).trim(),
        dosage: String(m.dosage || '').trim(),
        frequency: String(m.frequency || '').trim(),
        duration: String(m.duration || '').trim(),
        confidence,
        needsVerification,
        uncertaintyReason: String(m.uncertaintyReason || '').trim(),
        note: String(m.note || m.duration || '').trim(),
      };
    });

  const normalizedDietItems = (
    Array.isArray(geminiResult.dietaryRestrictions) ? geminiResult.dietaryRestrictions : []
  )
    .filter((d) => d && String(d.text || '').trim())
    .map((d) => {
      const confidence = normalizeConfidence(d.confidence, 'medium');
      return {
        text: String(d.text).trim(),
        confidence,
        needsVerification: Boolean(d.needsVerification) || confidence === 'low',
        uncertaintyReason: String(d.uncertaintyReason || '').trim(),
      };
    });

  const anyBlurryOrLowOcr =
    ocrPages.some((p) => p.isBlurry || (p.confidence !== null && p.confidence < 72));
  const anyUncertainField =
    Boolean(geminiResult.patientNameUncertain) ||
    Boolean(geminiResult.prescriptionDateUncertain) ||
    normalizedConditions.some((c) => c.needsVerification) ||
    normalizedMedicines.some((m) => m.needsVerification) ||
    normalizedDietItems.some((d) => d.needsVerification);

  const handwritingQuality = ['clear', 'partially_unclear', 'unreadable'].includes(
    geminiResult.handwritingQuality
  )
    ? geminiResult.handwritingQuality
    : anyBlurryOrLowOcr
    ? 'partially_unclear'
    : 'clear';

  const overallConfidence = normalizeConfidence(
    geminiResult.overallConfidence,
    handwritingQuality === 'unreadable'
      ? 'low'
      : anyUncertainField || anyBlurryOrLowOcr
      ? 'medium'
      : 'high'
  );

  const doctorVerificationRecommended =
    Boolean(geminiResult.doctorVerificationRecommended) ||
    !geminiResult.isReadablePrescription ||
    handwritingQuality === 'unreadable' ||
    anyUncertainField ||
    anyBlurryOrLowOcr;

  let verificationPrompt = String(geminiResult.verificationPrompt || '').trim();
  if (
    !geminiResult.isReadablePrescription ||
    handwritingQuality === 'unreadable' ||
    (!combinedRawText.trim() && cleanedPages.length > 0)
  ) {
    verificationPrompt =
      verificationPrompt ||
      'This prescription image or handwriting could not be reliably interpreted. Do not rely on automated output—please verify all medicines, dosages, and diagnoses directly with your doctor or pharmacist.';
  } else if (doctorVerificationRecommended && !verificationPrompt) {
    verificationPrompt =
      'Some handwritten fields or blurry sections have lower confidence and are highlighted for manual review. Please confirm uncertain medicine names, dosages, or diagnoses with your doctor before saving.';
  }

  const visionConfValues = ocrPages
    .map((p) => p.confidence)
    .filter((v) => typeof v === 'number');
  const avgVisionConfidence =
    visionConfValues.length > 0
      ? Math.round(visionConfValues.reduce((a, b) => a + b, 0) / visionConfValues.length)
      : null;

  return {
    rawText: combinedRawText,
    ocrProvider:
      cleanedPages.length > 0
        ? usedCloudVision
          ? 'google_cloud_vision_document_text + gemini_vision'
          : 'gemini_vision_ocr'
        : 'gemini_structured_text',
    ocrConfidence: avgVisionConfidence,
    pagesCount: Math.max(1, ocrPages.length),
    ocrPages: ocrPages.map((p) => ({
      pageNumber: p.pageNumber,
      fileName: p.fileName,
      rawText: p.rawText,
      confidence: p.confidence,
      lowConfidenceWordCount: p.lowConfidenceWordCount,
      sharpnessScore: p.sharpnessScore,
      isBlurry: p.isBlurry,
      warnings: p.warnings,
    })),
    qualityWarnings,
    isReadablePrescription: Boolean(geminiResult.isReadablePrescription),
    handwritingQuality,
    overallConfidence,
    doctorVerificationRecommended,
    verificationPrompt,
    patientName: String(geminiResult.patientName || '').trim(),
    patientNameConfidence: normalizeConfidence(geminiResult.patientNameConfidence, 'low'),
    patientNameUncertain:
      Boolean(geminiResult.patientNameUncertain) || !String(geminiResult.patientName || '').trim(),
    prescriptionDate: validDate,
    prescriptionDateConfidence: normalizeConfidence(
      geminiResult.prescriptionDateConfidence,
      validDate ? 'high' : 'low'
    ),
    prescriptionDateUncertain: Boolean(geminiResult.prescriptionDateUncertain) || !validDate,
    conditions: normalizedConditions,
    medicines: normalizedMedicines,
    dietaryRestrictions: normalizedDietItems.map((d) => d.text),
    dietaryRestrictionItems: normalizedDietItems,
  };
}
