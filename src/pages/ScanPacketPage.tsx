import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Camera,
  Loader2,
  RefreshCw,
  ScanLine,
  ShieldAlert,
  SlidersHorizontal,
  ThumbsUp,
  Upload,
  X,
} from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { BreakdownPieChart } from '../components/BreakdownPieChart';
import { NutritionGauge } from '../components/NutritionGauge';
import { useAuth } from '../context/AuthContext';
import {
  HEALTH_CONDITION_OPTIONS,
  evaluateProfileAlertsForValues,
  getAgeGroupLabel,
} from '../utils/healthProfileEngine';
import {
  parseNutritionTextClient,
  scanPacketLocally,
  validateFoodLabelText,
} from '../utils/localNutritionEngine';
import { extractIngredientsSegment, runPacketImageOcr } from '../utils/packetOcr';
import type { PacketScanResult } from '../types';

export interface ScanPacketPageProps {
  onSavePacketToStoreConnect?: (
    eventId: string,
    payload: {
      product_title: string;
      ingredients_text?: string;
      nutrition_text?: string;
      calories?: number;
      sugars?: number;
      fat?: number;
      protein?: number;
      sodium_mg?: number;
    }
  ) => Promise<void>;
}

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

export function ScanPacketPage({ onSavePacketToStoreConnect }: ScanPacketPageProps) {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const linkedEventId = searchParams.get('eventId');
  const [productName, setProductName] = useState(() => searchParams.get('item') || '');
  const [rawText, setRawText] = useState('');
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [ocrProgress, setOcrProgress] = useState<number | null>(null);
  const [ocrStatusText, setOcrStatusText] = useState<string | null>(null);
  const [scanAccuracyPct, setScanAccuracyPct] = useState<number | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isSavingToStore, setIsSavingToStore] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<PacketScanResult | null>(null);

  const [cameraOpen, setCameraOpen] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
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

  async function analyzeText(
    nameToUse: string,
    textToUse: string,
    ocrConfidence?: number
  ) {
    setErrorMessage(null);
    setResult(null);

    const cleanName = nameToUse.trim() || 'Scanned Food Packet';
    const validation = validateFoodLabelText(textToUse, ocrConfidence);
    if (!validation.valid) {
      setErrorMessage(
        validation.reason ||
          'No readable food ingredients or nutrition label detected.'
      );
      return;
    }

    setIsScanning(true);
    const cleanText = validation.cleanText;
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
        throw new Error(
          errBody?.detail || 'No readable food ingredients or nutrition label detected.'
        );
      }
      const localResult = scanPacketLocally(cleanName, cleanText);
      setResult(localResult);
    } catch (err) {
      if (
        err instanceof TypeError ||
        (err instanceof Error && /failed to fetch|network/i.test(err.message))
      ) {
        setResult(scanPacketLocally(cleanName, cleanText));
      } else {
        setResult(null);
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
    setResult(null);
    setScanAccuracyPct(null);
    setOcrProgress(0);
    setOcrStatusText('Enhancing & reading packet label...');
    try {
      const { extractedText: extracted, confidence } = await runPacketImageOcr(source, {
        onProgress: (pct) => setOcrProgress(pct),
        onStatus: (status) => setOcrStatusText(status),
      });

      if (typeof confidence === 'number') {
        setScanAccuracyPct(Math.round(confidence));
      }

      const validation = validateFoodLabelText(extracted, confidence);
      if (!validation.valid) {
        setRawText('');
        setResult(null);
        setErrorMessage(
          validation.reason ||
            'Could not read clear ingredients from that image. Aim directly at the printed Ingredients or Nutrition Facts box.'
        );
        return;
      }

      setRawText(extracted);
      const inferredName = productName.trim() || labelName;
      if (!productName.trim()) {
        setProductName(inferredName);
      }
      await analyzeText(inferredName, extracted, confidence);
    } catch (err) {
      setResult(null);
      setErrorMessage(
        err instanceof Error ? `OCR failed: ${err.message}` : 'Failed to scan image text.'
      );
    } finally {
      setOcrProgress(null);
      setOcrStatusText(null);
    }
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setResult(null);
    setErrorMessage(null);
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    setImagePreviewUrl(URL.createObjectURL(file));
    const cleanFileName = file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ');
    void runOcrOnImageSource(file, cleanFileName || 'Scanned Food Packet');
    event.target.value = '';
  }

  async function openCameraStream(mode: 'environment' | 'user') {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
    } catch {
      stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });
    }
    streamRef.current = stream;
    setCameraOpen(true);
    requestAnimationFrame(() => {
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    });
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
      await openCameraStream(facingMode);
    } catch {
      setErrorMessage(
        'Camera permission was denied or unavailable. Use Upload Packet Photo instead.'
      );
    }
  }

  async function handleFlipCamera() {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    if (cameraOpen) {
      try {
        await openCameraStream(nextMode);
      } catch {
        // ignore if device only has one camera
      }
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
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
        setImagePreviewUrl(URL.createObjectURL(blob));
        handleStopCamera();
        void runOcrOnImageSource(blob, 'Camera Packet Capture');
      },
      'image/jpeg',
      0.92
    );
  }

  function handleClearPhoto() {
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    setImagePreviewUrl(null);
    setScanAccuracyPct(null);
  }

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!rawText.trim()) {
      setResult(null);
      setErrorMessage('Upload a packet photo or enter/paste ingredients text first.');
      return;
    }
    void analyzeText(productName || 'Scanned Food Packet', rawText);
  }

  function handleSampleClick(sample: (typeof SAMPLE_PACKETS)[number]) {
    setProductName(sample.name);
    setRawText(sample.text);
    setScanAccuracyPct(null);
    handleClearPhoto();
    void analyzeText(sample.name, sample.text);
  }

  async function handleSaveToStoreConnect() {
    if (!linkedEventId || !result || !onSavePacketToStoreConnect) return;
    setIsSavingToStore(true);
    try {
      const nut = result.nutrition_analysis?.nutrition || parseNutritionTextClient(rawText);
      const cleanIng =
        extractIngredientsSegment(rawText) ||
        (result.parsed_ingredients.length > 0 ? result.parsed_ingredients.join(', ') : rawText);

      await onSavePacketToStoreConnect(linkedEventId, {
        product_title: result.product_name,
        ingredients_text: cleanIng,
        nutrition_text: rawText,
        calories: nut?.calories,
        sugars: nut?.sugars,
        fat: nut?.fat,
        protein: nut?.protein,
        sodium_mg: nut?.sodium_mg,
      });
      navigate('/amazon');
    } finally {
      setIsSavingToStore(false);
    }
  }

  const gaugeTone = !result
    ? 'moderate'
    : result.verdict === 'Good'
    ? 'good'
    : result.verdict === 'Moderate'
    ? 'moderate'
    : 'bad';

  const activeConditionLabels = currentUser
    ? [
        ...HEALTH_CONDITION_OPTIONS.filter((opt) =>
          currentUser.conditions.includes(opt.key)
        ).map((opt) => opt.label),
        ...(currentUser.otherConditions || []),
      ]
    : [];

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <h1 className="page-title">Scan Packet Ingredients</h1>
          <p className="page-subtitle">
            Upload a photo of any food packet&apos;s back label, snap with your rear camera,
            or paste the ingredients list to see how it fits your saved health profile.
          </p>
        </div>
      </div>

      {currentUser && (
        <div className="active-profile-bar" role="region" aria-label="Active health profile">
          <div className="active-profile-bar-copy">
            <strong>Personalized screening for {currentUser.fullName}</strong>
            <span>
              {' '}
              · {getAgeGroupLabel(currentUser.age)} ({currentUser.age} yrs)
              {activeConditionLabels.length > 0
                ? ` · Conditions: ${activeConditionLabels.join(', ')}`
                : ' · General health thresholds'}
              {currentUser.allergies.length > 0
                ? ` · Allergies: ${currentUser.allergies.join(', ')}`
                : ''}
            </span>
          </div>
          <Link to="/profile" className="text-action-link" style={{ flexShrink: 0 }}>
            <SlidersHorizontal size={14} />
            <span>Edit health profile</span>
          </Link>
        </div>
      )}

      <div className="analyzer-grid">
        <section className="card" aria-labelledby="scan-input-heading">
          <div className="card-header">
            <div>
              <h2 id="scan-input-heading" className="card-title">
                Packet Photo &amp; Label Reader
              </h2>
              <p className="card-subtitle">
                Extracts ingredients &amp; nutrition text cleanly. Non-food photos or blurry shots are rejected automatically.
              </p>
            </div>
          </div>

          <div className="scan-upload-actions">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="sr-only"
              aria-label="Upload packet ingredients photo from device"
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
              <div className="camera-frame-wrap">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="camera-preview"
                />
                <div className="camera-guide-hint" aria-hidden="true">
                  Align the printed Ingredients or Nutrition Facts box inside frame
                </div>
              </div>
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
                  onClick={handleFlipCamera}
                >
                  <RefreshCw size={15} />
                  <span>Switch Camera</span>
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
              <div className="scan-preview-toolbar">
                <span className="scan-preview-meta">
                  {scanAccuracyPct !== null
                    ? `OCR accuracy: ${scanAccuracyPct}%`
                    : 'Packet image preview'}
                </span>
                <button
                  type="button"
                  className="cart-remove-btn"
                  onClick={handleClearPhoto}
                  aria-label="Remove uploaded image preview"
                >
                  <X size={14} />
                  <span>Clear photo</span>
                </button>
              </div>
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
                placeholder="Upload a clear back-label photo above or paste text here (e.g., Ingredients: Wholegrain Oats, Sugar, Palm Oil...)"
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
                sugar, fat, protein, and sodium numbers. Non-food photos (faces, dark shots)
                are blocked so you never get false ingredient results.
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
                  {linkedEventId && onSavePacketToStoreConnect && (
                    <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="btn-primary"
                        style={{ flex: 'none', padding: '9px 14px', fontSize: '13.5px' }}
                        disabled={isSavingToStore}
                        onClick={() => void handleSaveToStoreConnect()}
                      >
                        {isSavingToStore
                          ? 'Saving Verified Label...'
                          : 'Save Exact Label to Store Connect'}
                      </button>
                      <Link
                        to="/amazon"
                        className="btn-secondary"
                        style={{ padding: '9px 14px', fontSize: '13.5px', textDecoration: 'none' }}
                      >
                        Back to Store Connect
                      </Link>
                    </div>
                  )}
                </div>

                {(() => {
                  const profileAlert = evaluateProfileAlertsForValues(
                    {
                      productName: result.product_name,
                      calories: nut?.nutrition.calories ?? 0,
                      sugars: nut?.nutrition.sugars ?? 0,
                      sodium_mg: nut?.nutrition.sodium_mg ?? 0,
                      fat: nut?.nutrition.fat ?? 0,
                      ingredientsText: `${result.parsed_ingredients.join(', ')} ${rawText}`,
                      baseScore: result.score,
                    },
                    currentUser
                  );
                  if (!profileAlert) return null;
                  const boxClass =
                    profileAlert.level === 'good'
                      ? 'profile-alert-box is-good'
                      : profileAlert.level === 'warning'
                      ? 'profile-alert-box is-warning'
                      : 'profile-alert-box is-danger';
                  const riskBadgeCls =
                    profileAlert.riskLevel === 'LOW RISK'
                      ? 'is-low'
                      : profileAlert.riskLevel === 'MODERATE RISK'
                      ? 'is-moderate'
                      : 'is-high';
                  return (
                    <div className={boxClass} role="status">
                      <div className="profile-alert-head-row">
                        <span className="profile-alert-head">{profileAlert.headline}</span>
                        <span className={`risk-tag ${riskBadgeCls}`}>
                          {profileAlert.riskLevel}
                        </span>
                      </div>
                      <ul className="detail-bullet-list" style={{ margin: '8px 0 0' }}>
                        {profileAlert.alerts.map((msg, i) => (
                          <li key={i}>{msg}</li>
                        ))}
                      </ul>
                      {profileAlert.suggestions.length > 0 && (
                        <div className="profile-suggestions-sub">
                          <strong>Suggestions for your health:</strong>{' '}
                          {profileAlert.suggestions.join(' ')}
                        </div>
                      )}
                    </div>
                  );
                })()}

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
