import sharp from 'sharp';
import { createWorker, PSM } from 'tesseract.js';
import { extractIngredientsFromOcrText, parseNutritionText } from './nutritionParser.mjs';

let sharedWorkerPromise = null;
let ocrQueue = Promise.resolve();

async function getOcrWorker() {
  if (!sharedWorkerPromise) {
    sharedWorkerPromise = createWorker('eng').catch((err) => {
      sharedWorkerPromise = null;
      throw err;
    });
  }
  return sharedWorkerPromise;
}

function enqueueOcrTask(fn) {
  const run = ocrQueue.then(fn, fn);
  ocrQueue = run.catch(() => {});
  return run;
}

export async function preprocessImageBufferForOcr(imgBuffer) {
  const meta = await sharp(imgBuffer).metadata();
  const w = meta.width || 0;
  const h = meta.height || 0;
  if (w < 100 || h < 100) {
    return null;
  }

  const targetWidth = Math.max(1200, Math.min(2000, w < 950 ? w * 2 : w));
  return sharp(imgBuffer)
    .flatten({ background: '#ffffff' })
    .grayscale()
    .normalize()
    .resize({ width: targetWidth, kernel: 'lanczos3' })
    .extend({ top: 32, bottom: 32, left: 32, right: 32, background: '#ffffff' })
    .withMetadata({ density: 300 })
    .png()
    .toBuffer();
}

export async function ocrPacketBuffer(imgBuffer) {
  const pngBuffer = await preprocessImageBufferForOcr(imgBuffer);
  if (!pngBuffer) {
    return { text: '', nutrition: null, ingredientsText: '', confidence: 0 };
  }

  return enqueueOcrTask(async () => {
    const worker = await getOcrWorker();
    await worker.setParameters({ tessedit_pageseg_mode: PSM.AUTO });
    const res = await worker.recognize(pngBuffer);
    let rawText = (res?.data?.text || '').trim();
    let confidence = typeof res?.data?.confidence === 'number' ? res.data.confidence : 0;

    let nutrition = parseNutritionText(rawText);
    let ingredientsText = extractIngredientsFromOcrText(rawText);

    if (
      !nutrition &&
      /\b(?:nutrition(?:al)?|energy|calories|protein|carbohydrate|sugars?|sodium|per\s*100\s*g)\b/i.test(
        rawText
      )
    ) {
      await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_COLUMN });
      const colRes = await worker.recognize(pngBuffer);
      const colText = (colRes?.data?.text || '').trim();
      const combined = [rawText, colText].filter(Boolean).join('\n');
      const colNutrition = parseNutritionText(colText) || parseNutritionText(combined);
      if (colNutrition) {
        nutrition = colNutrition;
        rawText = combined;
        if (typeof colRes?.data?.confidence === 'number' && colRes.data.confidence > confidence) {
          confidence = colRes.data.confidence;
        }
      }
      if (!ingredientsText) {
        ingredientsText = extractIngredientsFromOcrText(combined);
      }
    }

    return {
      text: rawText,
      nutrition,
      ingredientsText,
      confidence,
    };
  });
}

async function fetchImageBuffer(imageUrl, timeoutMs = 4500) {
  if (!imageUrl || !/^https?:\/\//i.test(imageUrl)) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(imageUrl, {
      signal: ctrl.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        Accept: 'image/avif,image/webp,image/png,image/jpeg,image/*;q=0.8',
      },
    });
    if (!res.ok) return null;
    const contentType = (res.headers.get('content-type') || '').toLowerCase();
    if (contentType && !contentType.includes('image') && !contentType.includes('octet-stream')) {
      return null;
    }
    const ab = await res.arrayBuffer();
    if (!ab || ab.byteLength < 1200 || ab.byteLength > 7 * 1024 * 1024) {
      return null;
    }
    return Buffer.from(ab);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function scanGalleryImagesForPacket(
  galleryUrls,
  { maxImages = 5, existingIngredients = '' } = {}
) {
  if (!Array.isArray(galleryUrls) || galleryUrls.length === 0) return null;

  const cleanedUrls = [];
  const seen = new Set();
  for (const raw of galleryUrls) {
    const u = String(raw || '').trim();
    if (!u || !/^https?:\/\//i.test(u)) continue;
    if (/\.svg(?:\?|$)|\.gif(?:\?|$)|sprite|spinner|1x1|play[-_]?button|video/i.test(u)) continue;
    if (seen.has(u)) continue;
    seen.add(u);
    cleanedUrls.push(u);
    if (cleanedUrls.length >= maxImages) break;
  }

  let bestIngredients = String(existingIngredients || '').trim();

  for (const url of cleanedUrls) {
    const imgBuf = await fetchImageBuffer(url);
    if (!imgBuf) continue;

    try {
      const result = await ocrPacketBuffer(imgBuf);
      if (!bestIngredients && result.ingredientsText) {
        bestIngredients = result.ingredientsText;
      }
      if (result.nutrition) {
        return {
          nutrition: result.nutrition,
          ingredientsText: bestIngredients || result.ingredientsText || '',
          matchedImageUrl: url,
          confidence: result.confidence,
        };
      }
    } catch {
      // Skip malformed or undecodable candidate image
    }
  }

  if (bestIngredients && bestIngredients !== String(existingIngredients || '').trim()) {
    return {
      nutrition: null,
      ingredientsText: bestIngredients,
      matchedImageUrl: cleanedUrls[0] || '',
      confidence: 0,
    };
  }

  return null;
}
