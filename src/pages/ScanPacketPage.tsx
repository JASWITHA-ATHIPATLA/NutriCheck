import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Camera,
  Loader2,
  ScanLine,
  ShieldAlert,
  ThumbsUp,
  Upload,
  X,
} from 'lucide-react';
import Tesseract from 'tesseract.js';
import { BreakdownPieChart } from '../components/BreakdownPieChart';
import { NutritionGauge } from '../components/NutritionGauge';
import { scanPacketLocally } from '../utils/localNutritionEngine';
import type { PacketScanResult } from '../types';

const SAMPLE_PACKETS = [
  {
    name: 'Wholegrain Rolled Oats',
    text:
      'Ingredients: 100% Wholegrain Rolled Oats.\n' +
      'Nutrition Facts (per 100g): Calories 375 kcal, Total Fat 7g, Sugars 1g, Protein 13g, Sodium 5mg',
  },
  {
    name: 'Masala Instant Noodles',
    text:
      'Ingredients: Refined Wheat Flour (Maida), Palm Oil, Iodized Salt, Sugar, Maltodextrin, MSG (E621), TBHQ.\n' +
      'Nutrition Facts (per 100g): Energy 427 kcal, Fat 15.7g, Sugars 1.2g, Protein 8g, Salt 2.9g',
  },
  {
    name: 'Cola Soft Drink',
    text:
      'Ingredients: Carbonated Water, High Fructose Corn Syrup, Caramel Color, Phosphoric Acid, Caffeine, Sodium Benzoate.\n' +
      'Nutrition Facts: Calories 140 kcal, Sugars 39g, Total Fat 0g, Protein 0g, Sodium 45mg',
  },
];

export function ScanPacketPage() {
  const [productName, setProductName] = useState('');
  const [rawText, setRawText] = useState('');
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [ocrProgress, setOcrProgress] = useState<number | null>(null);
  const [ocrStatusText, setOcrStatusText] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<PacketScanResult | null>(null);

  const [cameraOpen, setCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
    };
  }, [imagePreviewUrl]);

  async function analyzeText(nameToUse: string, textToUse: string) {
    setIsScanning(true);
    setErrorMessage(null);
    const cleanName = nameToUse.trim() || 'Scanned Food Packet';
    const cleanText = textToUse.trim();
    try {
      const res = await fetch('/api/scan-packet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_name: cleanName,
          raw_text: cleanText,
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as PacketScanResult;
        setResult(data);
        return;
      }
      if (res.status === 422) {
        const errBody = await res.json().catch(() => null);
        throw new Error(errBody?.detail || 'Please provide clearer ingredients or nutrition label text.');
      }
      // Static deployments (e.g. Vercel without Python API) fall back to local analyzer
      const localResult = scanPacketLocally(cleanName, cleanText);
      setResult(localResult);
    } catch (err) {
      if (err instanceof TypeError || (err instanceof Error && /failed to fetch|network/i.test(err.message))) {
        setResult(scanPacketLocally(cleanName, cleanText));
      } else {
        setErrorMessage(
          err instanceof Error ? err.message : 'Unable to analyze packet text.'
        );
      }
    } finally {
      setIsScanning(false);
    }
  }

  async function runOcrOnImageSource(source: File | Blob, labelName: string) {
    setErrorMessage(null);
    setOcrProgress(0);
    setOcrStatusText('Reading text from packet image...');
    try {
      const workerResult = await Tesseract.recognize(source, 'eng', {
        logger: (m) => {
          if (m.status === 'recognizing text' && typeof m.progress === 'number') {
            setOcrProgress(Math.round(m.progress * 100));
          }
        },
      });
      const extracted = (workerResult?.data?.text || '').trim();
      if (!extracted || extracted.length < 4) {
        setErrorMessage(
          'Could not read clear text from that photo. Try a sharper, well-lit photo of the Ingredients box or paste the text below.'
        );
        return;
      }
      setRawText(extracted);
      const inferredName = productName.trim() || labelName;
      if (!productName.trim()) {
        setProductName(inferredName);
      }
      await analyzeText(inferredName, extracted);
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? `OCR failed: ${err.message}`
          : 'Failed to scan image text.'
      );
    } finally {
      setOcrProgress(null);
      setOcrStatusText(null);
    }
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    setImagePreviewUrl(URL.createObjectURL(file));
    const cleanFileName = file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ');
    void runOcrOnImageSource(file, cleanFileName || 'Scanned Food Packet');
    event.target.value = '';
  }

  async function handleStartCamera() {
    setErrorMessage(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setErrorMessage(
        'Live camera access is unavailable in this browser. Use Upload Packet Photo instead.'
      );
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      setCameraOpen(true);
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      });
    } catch {
      setErrorMessage(
        'Camera permission was denied or unavailable. Use Upload Packet Photo instead.'
      );
    }
  }

  function handleStopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraOpen(false);
  }

  function handleCaptureSnapshot() {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) return;
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
      setImagePreviewUrl(URL.createObjectURL(blob));
      handleStopCamera();
      void runOcrOnImageSource(blob, 'Camera Packet Capture');
    }, 'image/jpeg', 0.92);
  }

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!rawText.trim()) {
      setErrorMessage('Upload a packet photo or enter/paste ingredients text first.');
      return;
    }
    void analyzeText(productName || 'Scanned Food Packet', rawText);
  }

  function handleSampleClick(sample: (typeof SAMPLE_PACKETS)[number]) {
    setProductName(sample.name);
    setRawText(sample.text);
    setImagePreviewUrl(null);
    void analyzeText(sample.name, sample.text);
  }

  const gaugeTone = !result
    ? 'moderate'
    : result.verdict === 'Good'
    ? 'good'
    : result.verdict === 'Moderate'
    ? 'moderate'
    : 'bad';

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <h1 className="page-title">Scan Packet Ingredients</h1>
          <p className="page-subtitle">
            Upload a photo of any food packet&apos;s back label, snap with your camera,
            or paste the ingredients list to see if it is Good, Moderate, or Not Good.
          </p>
        </div>
      </div>

      <div className="analyzer-grid">
        <section className="card" aria-labelledby="scan-input-heading">
          <div className="card-header">
            <div>
              <h2 id="scan-input-heading" className="card-title">
                Packet Photo &amp; Label Reader
              </h2>
              <p className="card-subtitle">
                Extracts ingredients and nutrition values directly in your browser.
              </p>
            </div>
          </div>

          <div className="scan-upload-actions">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="sr-only"
              aria-label="Upload packet ingredients photo"
            />
            <button
              type="button"
              className="btn-primary"
              onClick={() => fileInputRef.current?.click()}
              disabled={ocrProgress !== null}
            >
              <Upload size={16} />
              <span>Upload Packet Photo</span>
            </button>

            <button
              type="button"
              className="btn-secondary"
              onClick={cameraOpen ? handleStopCamera : handleStartCamera}
              disabled={ocrProgress !== null}
            >
              <Camera size={16} />
              <span>{cameraOpen ? 'Close Camera' : 'Use Camera'}</span>
            </button>
          </div>

          {cameraOpen && (
            <div className="camera-box">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="camera-preview"
              />
              <div className="camera-actions">
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleCaptureSnapshot}
                >
                  <ScanLine size={16} />
                  <span>Capture &amp; Scan Packet</span>
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleStopCamera}
                >
                  <X size={16} />
                  <span>Cancel</span>
                </button>
              </div>
            </div>
          )}

          {ocrProgress !== null && (
            <div className="ocr-progress-box" role="status" aria-live="polite">
              <Loader2 size={16} className="spin-icon" />
              <span>
                {ocrStatusText} ({ocrProgress}%)
              </span>
            </div>
          )}

          {imagePreviewUrl && (
            <div className="scan-preview-frame">
              <img
                src={imagePreviewUrl}
                alt="Uploaded food packet label preview"
                className="scan-preview-img"
              />
            </div>
          )}

          <div className="sample-box" style={{ marginTop: '16px' }}>
            <span className="sample-label">Try a Sample Packet Label</span>
            <div className="quick-presets">
              {SAMPLE_PACKETS.map((sample) => (
                <button
                  key={sample.name}
                  type="button"
                  className="preset-btn"
                  onClick={() => handleSampleClick(sample)}
                >
                  {sample.name}
                </button>
              ))}
            </div>
          </div>

          <form className="form-stack" onSubmit={handleFormSubmit}>
            <div className="field">
              <label htmlFor="scan-product-name" className="field-label">
                <span>Product Name</span>
                <span className="field-unit">Optional</span>
              </label>
              <input
                id="scan-product-name"
                type="text"
                className="field-input"
                placeholder="e.g., Wholegrain Oats or Masala Noodles"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
              />
            </div>

            <div className="field">
              <label htmlFor="scan-raw-text" className="field-label">
                <span>Scanned Ingredients &amp; Nutrition Text</span>
                <span className="field-unit">Editable</span>
              </label>
              <textarea
                id="scan-raw-text"
                className="field-input field-textarea"
                style={{ minHeight: '132px' }}
                placeholder="Upload a packet photo above or paste text here (e.g., Ingredients: Wholegrain Oats, Sugar, Palm Oil...)"
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
              />
            </div>

            {errorMessage && (
              <div className="error-banner" role="alert">
                <AlertTriangle size={16} />
                <span>{errorMessage}</span>
              </div>
            )}

            <button
              type="submit"
              className="btn-primary"
              disabled={isScanning || ocrProgress !== null}
            >
              <ScanLine size={16} />
              <span>{isScanning ? 'Analyzing Packet...' : 'Analyze Ingredients'}</span>
            </button>
          </form>
        </section>

        <div className="result-column">
          {!result && !isScanning ? (
            <section className="card empty-state">
              <div className="empty-icon" aria-hidden="true">
                <ScanLine size={22} />
              </div>
              <h2 className="empty-title">Upload or Scan a Packet Label</h2>
              <p className="empty-desc">
                NutriCheck inspects every listed ingredient and any detected calories,
                sugar, fat, protein, and sodium numbers to give you a clear Good,
                Moderate, or Not Good verdict.
              </p>
            </section>
          ) : isScanning && !result ? (
            <section className="card empty-state" aria-busy="true">
              <h2 className="empty-title">Analyzing Packet Ingredients...</h2>
              <p className="empty-desc">
                Checking ingredient quality and running nutrient profiling rules.
              </p>
            </section>
          ) : result ? (() => {
            const goodCount = result.ingredient_findings.filter((f) => f.rating === 'good').length;
            const modCount = result.ingredient_findings.filter((f) => f.rating === 'moderate').length;
            const badCount = result.ingredient_findings.filter((f) => f.rating === 'high').length;
            const flaggedTotal = goodCount + modCount + badCount;
            const neutralCount = Math.max(0, result.ingredients_count - flaggedTotal);

            const ingredientSlices = [
              { label: 'Good Ingredients', value: goodCount, color: '#16a34a', displayValue: `${goodCount}` },
              { label: 'Moderate / Caution', value: modCount, color: '#d97706', displayValue: `${modCount}` },
              { label: 'Bad Ingredients', value: badCount, color: '#dc2626', displayValue: `${badCount}` },
              { label: 'Base / Neutral', value: neutralCount, color: '#94a3b8', displayValue: `${neutralCount}` },
            ];

            const nut = result.nutrition_analysis;
            const flagMap = new Map((nut?.nutrient_flags || []).map((f) => [f.nutrient, f]));
            const nutRows = nut
              ? [
                  { name: 'Calories', value: `${nut.nutrition.calories} kcal`, share: 'Per serving / 100g', status: undefined },
                  { name: 'Sugars', value: `${nut.nutrition.sugars} g`, share: `${nut.nutrition.sugar_kcal_pct}% of kcal`, status: flagMap.get('Sugar')?.status },
                  { name: 'Total Fat', value: `${nut.nutrition.fat} g`, share: `${nut.nutrition.fat_kcal_pct}% of kcal`, status: flagMap.get('Total Fat')?.status },
                  { name: 'Protein', value: `${nut.nutrition.protein} g`, share: `${nut.nutrition.protein_kcal_pct}% of kcal`, status: flagMap.get('Protein')?.status },
                  { name: 'Sodium', value: `${Math.round(nut.nutrition.sodium_mg)} mg`, share: `${Math.round(nut.nutrition.sodium_per_100kcal)} mg / 100 kcal`, status: flagMap.get('Sodium')?.status },
                ]
              : [];

            return (
              <section className="card" aria-labelledby="scan-result-heading">
                <div className="result-hero">
                  <div>
                    <h2 id="scan-result-heading" className="result-food-name">
                      {result.product_name}
                    </h2>
                    <p className="result-meta-line">
                      {result.ingredients_count} ingredients parsed ·{' '}
                      {result.nutrition_found
                        ? 'Nutrition table + ML model included'
                        : 'Ingredient profile analysis'}
                    </p>
                  </div>

                  <div
                    className={`status-badge ${
                      result.verdict === 'Good'
                        ? 'is-healthy'
                        : result.verdict === 'Moderate'
                        ? 'is-moderate'
                        : 'is-unhealthy'
                    }`}
                  >
                    {result.verdict === 'Good' ? (
                      <ThumbsUp size={17} />
                    ) : result.verdict === 'Moderate' ? (
                      <AlertTriangle size={17} />
                    ) : (
                      <ShieldAlert size={17} />
                    )}
                    <span>{result.verdict}</span>
                  </div>
                </div>

                <div className="explanation-box" style={{ marginBottom: 4 }}>
                  <div className="explanation-heading">Plain-English Verdict</div>
                  <p className="explanation-text">{result.summary}</p>
                </div>

                <div className="score-visual-grid">
                  <div className="gauge-panel">
                    <NutritionGauge
                      score={result.score}
                      label={result.verdict}
                      tone={gaugeTone}
                      title="Nutrition score"
                    />
                  </div>

                  <BreakdownPieChart
                    title="Good vs. Bad Ingredients"
                    subtitle="Share of whole-food vs refined & additive ingredients"
                    slices={ingredientSlices}
                    centerValue={`${flaggedTotal || result.ingredients_count}`}
                    centerLabel={flaggedTotal ? 'flagged' : 'items'}
                    emptyMessage="Paste an ingredients list to view good vs bad ingredient shares."
                  />
                </div>

                {nutRows.length > 0 && (
                  <div className="table-section">
                    <div className="table-section-title">Detected Nutrition Facts Table</div>
                    <div className="data-table-wrap">
                      <table className="data-table nutrition-table">
                        <thead>
                          <tr>
                            <th>Nutrient</th>
                            <th className="num">Quantity</th>
                            <th className="num">Energy / Ratio</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {nutRows.map((row) => (
                            <tr key={row.name}>
                              <td><strong>{row.name}</strong></td>
                              <td className="num">{row.value}</td>
                              <td className="num">{row.share}</td>
                              <td>
                                <span className={`eval-pill ${row.status ? `is-${row.status}` : 'is-neutral'}`}>
                                  {row.status === 'good'
                                    ? 'Good'
                                    : row.status === 'moderate'
                                    ? 'Caution'
                                    : row.status === 'high'
                                    ? 'High'
                                    : 'Measured'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {result.ingredient_findings.length > 0 ? (
                  <div className="table-section">
                    <div className="table-section-title">What&apos;s Good vs. What to Watch</div>
                    <div className="data-table-wrap">
                      <table className="data-table nutrition-table">
                        <thead>
                          <tr>
                            <th>Ingredient</th>
                            <th>Rating</th>
                            <th>Why It Matters</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[...result.ingredient_findings]
                            .sort((a, b) => {
                              const ord = result.verdict === 'Good'
                                ? { good: 0, moderate: 1, high: 2 }
                                : { high: 0, moderate: 1, good: 2 };
                              return ord[a.rating] - ord[b.rating];
                            })
                            .map((f, idx) => (
                              <tr key={`${f.ingredient}-${idx}`}>
                                <td><strong>{f.ingredient}</strong></td>
                                <td>
                                  <span className={`eval-pill is-${f.rating}`}>
                                    {f.rating === 'good' ? 'Good' : f.rating === 'moderate' ? 'Caution' : 'Bad'}
                                  </span>
                                </td>
                                <td className="table-note-cell">{f.reason}</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="scan-reasons-list">
                    {result.reasons.map((r, idx) => (
                      <div key={idx} className="scan-reason-row">
                        <span className={`reason-icon is-${r.type}`} aria-hidden="true">
                          {r.type === 'good' ? (
                            <ThumbsUp size={15} />
                          ) : r.type === 'warning' ? (
                            <AlertTriangle size={15} />
                          ) : (
                            <ShieldAlert size={15} />
                          )}
                        </span>
                        <span className="reason-text">{r.text}</span>
                      </div>
                    ))}
                  </div>
                )}

                {result.ingredient_findings.length === 0 && result.parsed_ingredients.length > 0 && (
                  <div className="parsed-ingredients-box">
                    <div className="explanation-heading">Detected Packet Ingredients</div>
                    <p className="card-subtitle" style={{ color: '#44403c', marginTop: '4px' }}>
                      {result.parsed_ingredients.join(' · ')}
                    </p>
                  </div>
                )}
              </section>
            );
          })() : null}
        </div>
      </div>
    </div>
  );
}
