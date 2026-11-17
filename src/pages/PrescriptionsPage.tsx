import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Clock,
  FileText,
  Info,
  Loader2,
  Pill,
  Plus,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type {
  ActivePrescriptionSummary,
  ConditionCategory,
  ExtractionConfidence,
  PrescriptionAlertResult,
  PrescriptionCondition,
  PrescriptionDietaryRestrictionItem,
  PrescriptionExtractResponse,
  PrescriptionMedicine,
  PrescriptionOcrPageSummary,
  PrescriptionRecord,
} from '../types';
import {
  type PreparedPrescriptionPage,
  preparePrescriptionFilesForVision,
} from '../utils/pdfAndImageOcr';
import {
  PRESCRIPTION_DISCLAIMER,
  evaluateProductAgainstActiveProfileClient,
} from '../utils/prescriptionUtils';
import {
  buildNonJsonErrorMessage,
  readJsonResponse,
} from '../utils/safeFetchJson';

interface DraftCondition {
  id: string;
  name: string;
  canonicalKey: string;
  category: ConditionCategory;
  validDays: number;
  prescribedDate: string;
  confidence?: ExtractionConfidence;
  needsVerification?: boolean;
  uncertaintyReason?: string;
  sourceSnippet?: string;
}

interface DraftDietItem {
  text: string;
  confidence?: ExtractionConfidence;
  needsVerification?: boolean;
  uncertaintyReason?: string;
}

const SAMPLE_PRESCRIPTION_TEXT = `Dr. A. Mehta Clinic · General Medicine
Date: ${new Date().toISOString().slice(0, 10)}
Diagnosis: Viral Fever with Sore Throat
Rx:
1. Tab. Paracetamol 650mg SOS for 5 days
2. Tab. Cetirizine 10mg OD for 5 days
Dietary Advice: Avoid ice cream, chilled cold drinks, and deep fried spicy food. Prefer warm oats, steamed idli, khichdi, and room-temperature fluids.`;

const QUICK_TEST_FOODS = [
  {
    title: 'Vanilla Ice Cream Cup',
    ingredients: 'Milk Solids, Sugar, Liquid Glucose, Emulsifiers, Vanilla Flavour',
    nutrition: { calories: 207, sugars: 21, fat: 11, protein: 3.5, sodium_mg: 80 },
  },
  {
    title: 'Cola Soft Drink 330ml',
    ingredients: 'Carbonated Water, Sugar, Caramel Colour, Phosphoric Acid, Caffeine',
    nutrition: { calories: 139, sugars: 35, fat: 0, protein: 0, sodium_mg: 15 },
  },
  {
    title: 'Spicy Masala Potato Chips',
    ingredients: 'Potatoes, Refined Palmolein Oil, Chilli Powder, Spices, Iodized Salt',
    nutrition: { calories: 536, sugars: 1.5, fat: 34, protein: 6.8, sodium_mg: 620 },
  },
  {
    title: 'Warm Rolled Oats & Steamed Idli',
    ingredients: 'Wholegrain Rolled Oats, Steamed Rice & Urad Dal Fermented Batter',
    nutrition: { calories: 195, sugars: 1.0, fat: 2.5, protein: 7.2, sodium_mg: 110 },
  },
];

export function PrescriptionsPage({
  onProfileSynced,
}: {
  onProfileSynced?: (summary: ActivePrescriptionSummary) => void;
}) {
  const { currentUser } = useAuth();
  const userId = currentUser?.id || '';

  const [prescriptions, setPrescriptions] = useState<PrescriptionRecord[]>([]);
  const [activeProfile, setActiveProfile] = useState<ActivePrescriptionSummary>({
    activeConditions: [],
    expiredConditions: [],
    medicines: [],
    dietaryRestrictions: [],
    disclaimer: PRESCRIPTION_DISCLAIMER,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Upload & OCR state
  const [isDragging, setIsDragging] = useState(false);
  const [ocrPct, setOcrPct] = useState<number | null>(null);
  const [ocrStatus, setOcrStatus] = useState<string | null>(null);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [showRawTextInput, setShowRawTextInput] = useState(false);
  const [manualTextInput, setManualTextInput] = useState('');

  // Extracted draft review state
  const [draftOpen, setDraftOpen] = useState(false);
  const [draftFileName, setDraftFileName] = useState('Doctor Prescription');
  const [draftFileType, setDraftFileType] = useState<'pdf' | 'jpg' | 'png' | 'manual'>('jpg');
  const [draftPatientName, setDraftPatientName] = useState('');
  const [draftPatientNameConf, setDraftPatientNameConf] = useState<ExtractionConfidence>('medium');
  const [draftPatientNameUncertain, setDraftPatientNameUncertain] = useState(false);
  const [draftDate, setDraftDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [draftDateConf, setDraftDateConf] = useState<ExtractionConfidence>('medium');
  const [draftDateUncertain, setDraftDateUncertain] = useState(false);
  const [draftRawOcr, setDraftRawOcr] = useState('');
  const [draftOcrProvider, setDraftOcrProvider] = useState('google_cloud_vision_document_text + gemini_vision');
  const [draftOcrConfidence, setDraftOcrConfidence] = useState<number | null>(null);
  const [draftOcrPages, setDraftOcrPages] = useState<PrescriptionOcrPageSummary[]>([]);
  const [draftPreviewPages, setDraftPreviewPages] = useState<PreparedPrescriptionPage[]>([]);
  const [draftHandwritingQuality, setDraftHandwritingQuality] = useState<'clear' | 'partially_unclear' | 'unreadable'>('clear');
  const [draftOverallConfidence, setDraftOverallConfidence] = useState<ExtractionConfidence>('high');
  const [draftDoctorVerifyRecommended, setDraftDoctorVerifyRecommended] = useState(false);
  const [draftVerificationPrompt, setDraftVerificationPrompt] = useState('');
  const [draftQualityWarnings, setDraftQualityWarnings] = useState<string[]>([]);
  const [draftUserVerifiedAck, setDraftUserVerifiedAck] = useState(false);
  const [draftConditions, setDraftConditions] = useState<DraftCondition[]>([]);
  const [draftMedicines, setDraftMedicines] = useState<PrescriptionMedicine[]>([]);
  const [draftRestrictions, setDraftRestrictions] = useState<DraftDietItem[]>([]);
  const [draftNotes, setDraftNotes] = useState('');
  const [newConditionName, setNewConditionName] = useState('');
  const [newConditionDays, setNewConditionDays] = useState('7');
  const [newMedicineName, setNewMedicineName] = useState('');
  const [newMedicineDosage, setNewMedicineDosage] = useState('');
  const [newMedicineFrequency, setNewMedicineFrequency] = useState('');
  const [newRestrictionText, setNewRestrictionText] = useState('');
  const [isSavingRx, setIsSavingRx] = useState(false);

  // Interactive product suitability checker
  const [testFoodName, setTestFoodName] = useState('Vanilla Ice Cream Cup');
  const [testIngredients, setTestIngredients] = useState('Milk Solids, Sugar, Flavouring');
  const [testResult, setTestResult] = useState<PrescriptionAlertResult | null>(null);
  const [testDismissed, setTestDismissed] = useState(false);
  const [testContinued, setTestContinued] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const onProfileSyncedRef = useRef(onProfileSynced);
  const lastSyncedSummaryRef = useRef<string>('');
  useEffect(() => {
    onProfileSyncedRef.current = onProfileSynced;
  }, [onProfileSynced]);

  const pushExtensionSync = useCallback(
    (summary: ActivePrescriptionSummary) => {
      const serialized = JSON.stringify({ userId, summary });
      if (lastSyncedSummaryRef.current === serialized) return;
      lastSyncedSummaryRef.current = serialized;
      onProfileSyncedRef.current?.(summary);
      if (typeof window !== 'undefined') {
        window.postMessage(
          { type: 'NUTRICHECK_SYNC_PRESCRIPTIONS', userId, summary },
          window.location.origin
        );
      }
    },
    [userId]
  );

  const loadPrescriptions = useCallback(async () => {
    if (!userId) {
      setIsLoading(false);
      setHasLoadedOnce(true);
      return;
    }
    setIsLoading(true);
    setPageError(null);
    try {
      const res = await fetch(
        `/api/prescriptions?userId=${encodeURIComponent(userId)}`,
        { headers: { 'X-User-Id': userId } }
      );
      const { data } = await readJsonResponse<{
        prescriptions?: PrescriptionRecord[];
        activeProfile?: ActivePrescriptionSummary;
        error?: string;
      }>(res);
      if (!res.ok || !data) {
        throw new Error(
          data?.error || buildNonJsonErrorMessage(res, 'Unable to load prescriptions from server.')
        );
      }
      setPrescriptions(Array.isArray(data.prescriptions) ? data.prescriptions : []);
      if (data.activeProfile) {
        setActiveProfile(data.activeProfile);
        pushExtensionSync(data.activeProfile);
      }
    } catch (err) {
      setPageError(err instanceof Error ? err.message : 'Unable to load prescriptions.');
    } finally {
      setIsLoading(false);
      setHasLoadedOnce(true);
    }
  }, [pushExtensionSync, userId]);

  useEffect(() => {
    void loadPrescriptions();
  }, [loadPrescriptions]);

  async function extractAndOpenDraft(params: {
    pages?: PreparedPrescriptionPage[];
    rawText?: string;
    fileName: string;
    fileType: 'pdf' | 'jpg' | 'png' | 'manual';
    clientWarnings?: string[];
  }) {
    setOcrError(null);
    try {
      setOcrPct(55);
      setOcrStatus(
        params.pages && params.pages.length > 0
          ? `Extracting handwritten text & clinical fields across ${params.pages.length} page${params.pages.length > 1 ? 's' : ''}...`
          : 'Interpreting prescription text with Gemini...'
      );

      const res = await fetch('/api/prescriptions/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-Id': userId },
        body: JSON.stringify({
          pages: params.pages?.map((p) => ({
            pageNumber: p.pageNumber,
            fileName: p.fileName,
            dataUrl: p.dataUrl,
          })),
          rawText: params.rawText,
        }),
      });
      const { data } = await readJsonResponse<
        Partial<PrescriptionExtractResponse> & { error?: string }
      >(res);
      if (!data) {
        throw new Error(
          buildNonJsonErrorMessage(res, 'Could not extract prescription details.')
        );
      }
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Could not extract prescription details.');
      }

      const todayIso = new Date().toISOString().slice(0, 10);
      const pDate = data.prescriptionDate || todayIso;

      setDraftFileName(params.fileName);
      setDraftFileType(params.fileType);
      setDraftPatientName(data.patientName || '');
      setDraftPatientNameConf(data.patientNameConfidence || 'low');
      setDraftPatientNameUncertain(Boolean(data.patientNameUncertain));
      setDraftDate(pDate);
      setDraftDateConf(data.prescriptionDateConfidence || 'low');
      setDraftDateUncertain(Boolean(data.prescriptionDateUncertain) || !data.prescriptionDate);
      setDraftRawOcr(data.rawText ?? params.rawText ?? '');
      setDraftOcrProvider(data.ocrProvider || 'google_cloud_vision_document_text + gemini_vision');
      setDraftOcrConfidence(typeof data.ocrConfidence === 'number' ? data.ocrConfidence : null);
      setDraftOcrPages(Array.isArray(data.ocrPages) ? data.ocrPages : []);
      setDraftPreviewPages(params.pages || []);
      setDraftHandwritingQuality(data.handwritingQuality || 'clear');
      setDraftOverallConfidence(data.overallConfidence || 'medium');
      setDraftDoctorVerifyRecommended(Boolean(data.doctorVerificationRecommended));
      setDraftVerificationPrompt(data.verificationPrompt || '');
      setDraftQualityWarnings([
        ...(params.clientWarnings || []),
        ...(Array.isArray(data.qualityWarnings) ? data.qualityWarnings : []),
      ]);
      setDraftUserVerifiedAck(!data.doctorVerificationRecommended);

      setDraftConditions(
        Array.isArray(data.conditions)
          ? data.conditions.map((c: PrescriptionCondition) => ({
              id: c.id,
              name: c.name,
              canonicalKey: c.canonicalKey,
              category: c.category || 'acute',
              validDays: c.validDays || 7,
              prescribedDate: c.prescribedDate || pDate,
              confidence: c.confidence || 'medium',
              needsVerification: Boolean(c.needsVerification),
              uncertaintyReason: c.uncertaintyReason || '',
              sourceSnippet: c.sourceSnippet,
            }))
          : []
      );
      setDraftMedicines(
        Array.isArray(data.medicines)
          ? data.medicines.map((m: PrescriptionMedicine) => ({
              name: m.name || '',
              dosage: m.dosage || '',
              frequency: m.frequency || '',
              duration: m.duration || '',
              confidence: m.confidence || 'medium',
              needsVerification: Boolean(m.needsVerification),
              uncertaintyReason: m.uncertaintyReason || '',
              note: m.note || '',
            }))
          : []
      );

      const dietItems: DraftDietItem[] = Array.isArray(data.dietaryRestrictionItems)
        ? data.dietaryRestrictionItems.map((d: PrescriptionDietaryRestrictionItem) => ({
            text: d.text,
            confidence: d.confidence || 'medium',
            needsVerification: Boolean(d.needsVerification),
            uncertaintyReason: d.uncertaintyReason || '',
          }))
        : (Array.isArray(data.dietaryRestrictions) ? data.dietaryRestrictions : []).map(
            (text: string) => ({
              text,
              confidence: 'medium',
              needsVerification: false,
            })
          );
      setDraftRestrictions(dietItems);
      setDraftNotes('');
      setDraftOpen(true);
      setOcrPct(100);
    } catch (err) {
      setOcrError(
        err instanceof Error ? err.message : 'Could not extract prescription fields.'
      );
    }
  }

  async function handleFilesSelected(fileList: FileList | File[] | undefined | null) {
    const files = fileList ? Array.from(fileList) : [];
    if (files.length === 0) return;

    for (const file of files) {
      const lower = file.name.toLowerCase();
      const isPdf = file.type === 'application/pdf' || lower.endsWith('.pdf');
      const isImg =
        file.type.startsWith('image/') ||
        lower.endsWith('.jpg') ||
        lower.endsWith('.jpeg') ||
        lower.endsWith('.png');
      if (!isPdf && !isImg) {
        setOcrError(`Unsupported file "${file.name}". Upload PDF, JPG, or PNG prescriptions.`);
        return;
      }
    }

    setOcrError(null);
    setOcrPct(5);
    setOcrStatus('Preparing prescription files...');

    try {
      const prepared = await preparePrescriptionFilesForVision(files, {
        onProgress: (p) => setOcrPct(p),
        onStatus: (s) => setOcrStatus(s),
      });

      await extractAndOpenDraft({
        pages: prepared.pages,
        fileName: prepared.primaryFileName,
        fileType: prepared.fileType,
        clientWarnings: prepared.clientWarnings,
      });
    } catch (err) {
      setOcrError(
        err instanceof Error ? err.message : 'Unable to scan prescription file(s).'
      );
    } finally {
      setOcrPct(null);
      setOcrStatus(null);
    }
  }

  function handleAddDraftCondition() {
    const trimmed = newConditionName.trim();
    if (!trimmed) return;
    const days = Math.min(365, Math.max(1, parseInt(newConditionDays, 10) || 7));
    const lower = trimmed.toLowerCase();
    const normalizedKey = /\b(fever|feaver|fiver|feverish|pyrexia|febril|febrile|body\s+heat)\b/i.test(lower)
      ? 'fever'
      : /\b(cold|cough|throat|pharyngitis|tonsillitis|sinus)\b/i.test(lower)
      ? 'throat_cold'
      : lower.replace(/[^a-z0-9]+/g, '_');
    setDraftConditions((prev) => [
      ...prev,
      {
        id: `cond-custom-${Date.now().toString(36)}`,
        name: trimmed,
        canonicalKey: normalizedKey,
        category: days >= 60 ? 'chronic' : 'acute',
        validDays: days,
        prescribedDate: draftDate,
        confidence: 'high',
        needsVerification: false,
        sourceSnippet: 'Verified & added by user',
      },
    ]);
    setNewConditionName('');
  }

  function handleAddDraftMedicine() {
    const trimmed = newMedicineName.trim();
    if (!trimmed) return;
    setDraftMedicines((prev) => [
      ...prev,
      {
        name: trimmed,
        dosage: newMedicineDosage.trim(),
        frequency: newMedicineFrequency.trim(),
        confidence: 'high',
        needsVerification: false,
      },
    ]);
    setNewMedicineName('');
    setNewMedicineDosage('');
    setNewMedicineFrequency('');
  }

  function handleAddDraftRestriction() {
    const trimmed = newRestrictionText.trim();
    if (!trimmed) return;
    setDraftRestrictions((prev) =>
      prev.some((d) => d.text === trimmed)
        ? prev
        : [...prev, { text: trimmed, confidence: 'high', needsVerification: false }]
    );
    setNewRestrictionText('');
  }

  async function handleSavePrescription(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    if (
      draftConditions.length === 0 &&
      draftMedicines.length === 0 &&
      draftRestrictions.length === 0
    ) {
      setOcrError(
        'Please confirm or add at least one medical condition, medicine, or dietary restriction before saving (never save unverified empty records).'
      );
      return;
    }

    if (draftDoctorVerifyRecommended && !draftUserVerifiedAck) {
      setOcrError(
        'Please review the highlighted uncertain fields (or verify with your doctor) and check the confirmation box below before saving.'
      );
      return;
    }

    setIsSavingRx(true);
    setOcrError(null);
    try {
      const cleanedMedicines = draftMedicines
        .map((m) => ({
          ...m,
          name: m.name.trim(),
          dosage: (m.dosage || '').trim(),
          frequency: (m.frequency || '').trim(),
        }))
        .filter((m) => m.name);

      const cleanedRestrictions = draftRestrictions
        .map((d) => ({ ...d, text: d.text.trim() }))
        .filter((d) => d.text);

      const res = await fetch('/api/prescriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-Id': userId },
        body: JSON.stringify({
          userId,
          fileName: draftFileName,
          fileType: draftFileType,
          patientName: draftPatientName.trim(),
          patientNameConfidence: draftPatientNameConf,
          prescriptionDate: draftDate,
          prescriptionDateConfidence: draftDateConf,
          rawOcrText: draftRawOcr,
          ocrProvider: draftOcrProvider,
          ocrConfidence: draftOcrConfidence,
          pagesCount: Math.max(1, draftOcrPages.length || draftPreviewPages.length || 1),
          ocrPages: draftOcrPages,
          handwritingQuality: draftHandwritingQuality,
          overallConfidence: draftOverallConfidence,
          doctorVerificationRecommended: draftDoctorVerifyRecommended,
          verifiedByUser: true,
          imageQualityWarnings: draftQualityWarnings,
          conditions: draftConditions
            .filter((c) => c.name.trim())
            .map((c) => ({
              ...c,
              name: c.name.trim(),
              prescribedDate: draftDate,
            })),
          medicines: cleanedMedicines,
          dietaryRestrictions: cleanedRestrictions.map((d) => d.text),
          dietaryRestrictionItems: cleanedRestrictions,
          notes: draftNotes,
        }),
      });
      const { data } = await readJsonResponse<{ ok?: boolean; error?: string }>(res);
      if (!res.ok || !data?.ok) {
        throw new Error(
          data?.error || buildNonJsonErrorMessage(res, 'Failed to save prescription.')
        );
      }
      setDraftOpen(false);
      setToastMsg('Verified prescription saved securely to MongoDB & health alerts updated.');
      window.setTimeout(() => setToastMsg(null), 4500);
      await loadPrescriptions();
    } catch (err) {
      setOcrError(err instanceof Error ? err.message : 'Unable to save prescription.');
    } finally {
      setIsSavingRx(false);
    }
  }

  async function handleConditionAction(
    prescriptionId: string,
    conditionId: string,
    payload: { status?: 'active' | 'dismissed'; validDays?: number }
  ) {
    if (!userId) return;
    try {
      const res = await fetch(`/api/prescriptions/${encodeURIComponent(prescriptionId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-User-Id': userId },
        body: JSON.stringify({ userId, conditionId, ...payload }),
      });
      if (!res.ok) throw new Error('Unable to update condition.');
      await loadPrescriptions();
    } catch (err) {
      setPageError(err instanceof Error ? err.message : 'Update failed.');
    }
  }

  async function handleDeletePrescription(prescriptionId: string) {
    if (!userId) return;
    try {
      const res = await fetch(
        `/api/prescriptions/${encodeURIComponent(prescriptionId)}?userId=${encodeURIComponent(userId)}`,
        { method: 'DELETE', headers: { 'X-User-Id': userId } }
      );
      if (!res.ok) throw new Error('Unable to delete prescription.');
      await loadPrescriptions();
    } catch (err) {
      setPageError(err instanceof Error ? err.message : 'Delete failed.');
    }
  }

  async function handleCheckProductSuitability(
    titleOverride?: string,
    ingOverride?: string,
    nutOverride?: { calories?: number; sugars?: number; fat?: number; sodium_mg?: number }
  ) {
    const title = (titleOverride ?? testFoodName).trim();
    const ing = (ingOverride ?? testIngredients).trim();
    if (!title) return;
    setTestDismissed(false);
    setTestContinued(false);

    if (titleOverride) setTestFoodName(titleOverride);
    if (ingOverride !== undefined) setTestIngredients(ingOverride);

    try {
      const res = await fetch('/api/prescriptions/check-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-Id': userId },
        body: JSON.stringify({
          userId,
          product_title: title,
          ingredients_text: ing,
          nutrition: nutOverride || null,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setTestResult(data);
        return;
      }
    } catch {
      // Fallback to deterministic client checker
    }

    const fallback = evaluateProductAgainstActiveProfileClient({
      productTitle: title,
      ingredientsText: ing,
      nutrition: nutOverride || null,
      activeConditions: activeProfile.activeConditions,
      dietaryRestrictions: activeProfile.dietaryRestrictions,
    });
    setTestResult(fallback);
  }

  const expiringSoonCount = useMemo(
    () =>
      activeProfile.activeConditions.filter(
        (c) => typeof c.daysRemaining === 'number' && c.daysRemaining <= 3
      ).length,
    [activeProfile.activeConditions]
  );

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <p className="section-kicker" style={{ marginBottom: '4px' }}>
            SMART HEALTH ALERTS · MONGODB &amp; EXTENSION SYNCED
          </p>
          <h1 className="page-title">Prescription Health Alerts</h1>
          <p className="page-subtitle">
            Upload doctor prescriptions (PDF, JPG, PNG) to detect temporary or chronic
            conditions with expiry tracking and live cart warnings.
          </p>
        </div>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => void loadPrescriptions()}
          disabled={isLoading}
        >
          <RefreshCw size={15} className={isLoading ? 'spin-icon' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Non-diagnostic medical safety callout */}
      <div className="info-callout" role="note">
        <Info size={16} style={{ verticalAlign: 'text-bottom', marginRight: 6 }} />
        <strong>Informational Guidance Only:</strong> {PRESCRIPTION_DISCLAIMER}
      </div>

      {toastMsg && (
        <div className="rx-success-banner" role="status">
          <CheckCircle2 size={16} />
          <span>{toastMsg}</span>
        </div>
      )}

      {pageError && (
        <div className="error-banner" role="alert" style={{ marginTop: 12 }}>
          <AlertTriangle size={16} />
          <span>{pageError}</span>
        </div>
      )}

      {/* KPI Strip */}
      <section className="rx-kpi-grid" aria-label="Prescription summary metrics">
        <div className="kpi-card">
          <div className="kpi-label">Active Conditions</div>
          <div className="kpi-value tabular">{activeProfile.activeConditions.length}</div>
          <div className="kpi-note">
            {expiringSoonCount > 0
              ? `${expiringSoonCount} expiring within 3 days`
              : 'Checked against all store carts'}
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Saved Prescriptions</div>
          <div className="kpi-value tabular">{prescriptions.length}</div>
          <div className="kpi-note">Stored securely per user account</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Dietary Restrictions</div>
          <div className="kpi-value tabular">{activeProfile.dietaryRestrictions.length}</div>
          <div className="kpi-note">Applied across Amazon, Blinkit, Zomato &amp; Swiggy</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Active Medicines</div>
          <div className="kpi-value tabular">{activeProfile.medicines.length}</div>
          <div className="kpi-note">Extracted from Rx lines</div>
        </div>
      </section>

      {/* Main Two-Column Grid */}
      <div className="rx-main-grid">
        {/* Left: Upload & Draft Confirmation */}
        <div className="rx-col">
          <section className="card" aria-labelledby="rx-upload-title">
            <div className="rx-card-head">
              <div>
                <h2 id="rx-upload-title" className="card-title">
                  Upload Doctor Prescription
                </h2>
                <p className="card-subtitle">
                  Supports multi-page PDF, JPG, and PNG via Google Cloud Vision (DOCUMENT_TEXT_DETECTION) &amp; Gemini Vision.
                </p>
              </div>
              <button
                type="button"
                className="sc-text-link-btn"
                onClick={() => {
                  setManualTextInput(SAMPLE_PRESCRIPTION_TEXT);
                  setShowRawTextInput(true);
                }}
              >
                Load sample Rx
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
              className="sr-only"
              onChange={(e) => {
                void handleFilesSelected(e.target.files);
                e.target.value = '';
              }}
            />

            <div
              className={`rx-dropzone ${isDragging ? 'is-dragging' : ''}`}
              role="button"
              tabIndex={0}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                void handleFilesSelected(e.dataTransfer.files);
              }}
            >
              <Upload size={26} color="#146c43" />
              <div className="rx-dropzone-title">
                Drop prescription PDF or photos (1–6 pages) here
              </div>
              <div className="rx-dropzone-sub">
                or click to choose files · Handwritten OCR + Gemini Vision review before saving
              </div>
            </div>

            {ocrPct !== null && (
              <div className="ocr-progress-box" role="status" style={{ marginTop: 12 }}>
                <Loader2 size={16} className="spin-icon" />
                <span>
                  {ocrStatus || 'Processing prescription...'} ({ocrPct}%)
                </span>
              </div>
            )}

            {ocrError && (
              <div className="error-banner" role="alert" style={{ marginTop: 12 }}>
                <AlertTriangle size={15} />
                <span>{ocrError}</span>
              </div>
            )}

            <div style={{ marginTop: 12, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn-secondary"
                style={{ padding: '7px 12px', fontSize: '13px' }}
                onClick={() => setShowRawTextInput((v) => !v)}
              >
                <FileText size={14} />
                <span>
                  {showRawTextInput ? 'Hide Text Entry' : 'Paste or Type Prescription Text'}
                </span>
              </button>
              <button
                type="button"
                className="btn-secondary"
                style={{ padding: '7px 12px', fontSize: '13px' }}
                onClick={() => {
                  setDraftFileName('Manual Prescription Entry');
                  setDraftFileType('manual');
                  setDraftPatientName('');
                  setDraftPatientNameConf('high');
                  setDraftPatientNameUncertain(false);
                  setDraftDate(new Date().toISOString().slice(0, 10));
                  setDraftDateConf('high');
                  setDraftDateUncertain(false);
                  setDraftRawOcr('');
                  setDraftOcrProvider('manual_entry');
                  setDraftOcrConfidence(null);
                  setDraftOcrPages([]);
                  setDraftPreviewPages([]);
                  setDraftHandwritingQuality('clear');
                  setDraftOverallConfidence('high');
                  setDraftDoctorVerifyRecommended(false);
                  setDraftVerificationPrompt('');
                  setDraftQualityWarnings([]);
                  setDraftUserVerifiedAck(true);
                  setDraftConditions([]);
                  setDraftMedicines([]);
                  setDraftRestrictions([]);
                  setDraftOpen(true);
                }}
              >
                <Plus size={14} />
                <span>Enter Manually</span>
              </button>
            </div>

            {showRawTextInput && (
              <div className="rx-paste-box">
                <label htmlFor="rx-raw-paste" className="field-label">
                  <span>Prescription Text</span>
                  <span className="field-unit">Extracted directly</span>
                </label>
                <textarea
                  id="rx-raw-paste"
                  className="field-input"
                  rows={4}
                  placeholder="Paste prescription notes, medicines, and dietary advice..."
                  value={manualTextInput}
                  onChange={(e) => setManualTextInput(e.target.value)}
                />
                <button
                  type="button"
                  className="btn-primary"
                  style={{ flex: 'none', marginTop: 8, padding: '8px 14px', fontSize: '13px' }}
                  onClick={() =>
                    void extractAndOpenDraft({
                      rawText: manualTextInput,
                      fileName: 'Text Prescription',
                      fileType: 'manual',
                    })
                  }
                >
                  <Sparkles size={14} />
                  <span>Extract Conditions &amp; Diet Rules</span>
                </button>
              </div>
            )}
          </section>

          {/* Editable Verification & Confirmation Screen */}
          {draftOpen && (
            <form
              className="card rx-draft-card"
              onSubmit={handleSavePrescription}
              aria-label="Verify and confirm extracted prescription details"
            >
              <div className="rx-card-head">
                <div>
                  <h2 className="card-title">Verify &amp; Confirm Extracted Prescription</h2>
                  <p className="card-subtitle">
                    Review patient name, date, diagnoses, medicines (dosage &amp; frequency), and dietary notes before saving to MongoDB.
                  </p>
                </div>
                <button
                  type="button"
                  className="cart-remove-btn"
                  onClick={() => setDraftOpen(false)}
                  aria-label="Close review editor"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Extraction Confidence Summary Bar */}
              <div className="rx-conf-summary-bar">
                <span
                  className={`rx-conf-badge is-${draftOverallConfidence}`}
                >
                  Overall Confidence: {draftOverallConfidence.toUpperCase()}
                </span>
                <span className="rx-conf-meta-pill">
                  Handwriting: {draftHandwritingQuality.replace('_', ' ')}
                </span>
                {draftOcrConfidence !== null && (
                  <span className="rx-conf-meta-pill">
                    Cloud Vision OCR: {draftOcrConfidence}%
                  </span>
                )}
                {draftOcrPages.length > 0 && (
                  <span className="rx-conf-meta-pill">
                    {draftOcrPages.length} page{draftOcrPages.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>

              {/* Doctor Verification Banner for unreadable handwriting / blurry / uncertain fields */}
              {(draftDoctorVerifyRecommended || draftQualityWarnings.length > 0) && (
                <div className="rx-doctor-verify-banner" role="alert">
                  <div className="rx-doctor-verify-head">
                    <AlertTriangle size={17} color="#b45309" />
                    <span>
                      {draftHandwritingQuality === 'unreadable'
                        ? 'Handwriting Could Not Be Reliably Interpreted — Verify With Doctor'
                        : 'Manual Verification Recommended Before Saving'}
                    </span>
                  </div>
                  <p className="rx-doctor-verify-body">
                    {draftVerificationPrompt ||
                      'Some handwritten fields or image regions were blurry or ambiguous. Do not guess unclear medicine names or diagnoses—please verify uncertain fields directly with your doctor or pharmacist.'}
                  </p>
                  {draftQualityWarnings.length > 0 && (
                    <ul className="rx-quality-warning-list">
                      {draftQualityWarnings.map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* Multi-page Thumbnail Strip */}
              {draftPreviewPages.length > 0 && (
                <div className="rx-preview-strip" aria-label="Uploaded prescription pages">
                  {draftPreviewPages.map((pg) => (
                    <div key={pg.pageNumber} className="rx-preview-thumb-card">
                      <img
                        src={pg.dataUrl}
                        alt={`Prescription page ${pg.pageNumber}`}
                        className="rx-preview-thumb-img"
                      />
                      <div className="rx-preview-thumb-cap">
                        Page {pg.pageNumber}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="rx-draft-meta-row-3">
                <div className={`field ${draftPatientNameUncertain ? 'rx-field-uncertain' : ''}`}>
                  <label htmlFor="draft-rx-patient" className="field-label">
                    <span>Patient Name</span>
                    <span className={`rx-conf-badge is-${draftPatientNameConf}`}>
                      {draftPatientNameConf}
                    </span>
                  </label>
                  <input
                    id="draft-rx-patient"
                    type="text"
                    className="field-input"
                    placeholder={
                      draftPatientNameUncertain
                        ? 'Not clearly readable — enter or verify'
                        : 'Patient name'
                    }
                    value={draftPatientName}
                    onChange={(e) => {
                      setDraftPatientName(e.target.value);
                      setDraftPatientNameUncertain(false);
                    }}
                  />
                </div>
                <div className={`field ${draftDateUncertain ? 'rx-field-uncertain' : ''}`}>
                  <label htmlFor="draft-rx-date" className="field-label">
                    <span>Prescription Date</span>
                    <span className={`rx-conf-badge is-${draftDateConf}`}>
                      {draftDateConf}
                    </span>
                  </label>
                  <input
                    id="draft-rx-date"
                    type="date"
                    className="field-input"
                    value={draftDate}
                    onChange={(e) => {
                      setDraftDate(e.target.value);
                      setDraftDateUncertain(false);
                    }}
                  />
                </div>
                <div className="field">
                  <label htmlFor="draft-rx-name" className="field-label">
                    Document Title
                  </label>
                  <input
                    id="draft-rx-name"
                    type="text"
                    className="field-input"
                    value={draftFileName}
                    onChange={(e) => setDraftFileName(e.target.value)}
                  />
                </div>
              </div>

              {draftConditions.some((c) => {
                const ms = new Date(`${draftDate}T00:00:00`).getTime();
                return Number.isFinite(ms) && Date.now() > ms + (c.validDays || 7) * 86400000;
              }) && (
                <div className="rx-doctor-verify-banner" role="note" style={{ marginTop: 10 }}>
                  <div className="rx-doctor-verify-head">
                    <Clock size={16} color="#b45309" />
                    <span>Prescription Date Is Older Than Recovery Window</span>
                  </div>
                  <p className="rx-doctor-verify-body">
                    The prescription date ({draftDate}) plus valid days is already in the past, so saving with this date will mark conditions as Expired without Store Connect warnings. If you are still recovering today, update the date or extend Valid days.
                  </p>
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ marginTop: 6, padding: '6px 11px', fontSize: '12.5px' }}
                    onClick={() => {
                      const today = new Date().toISOString().slice(0, 10);
                      setDraftDate(today);
                      setDraftConditions((prev) =>
                        prev.map((c) => ({ ...c, prescribedDate: today }))
                      );
                    }}
                  >
                    Use Today&apos;s Date ({new Date().toISOString().slice(0, 10)})
                  </button>
                </div>
              )}

              {/* Diagnosed Conditions Editor */}
              <div className="rx-draft-section">
                <div className="rx-draft-label">
                  Diagnosed Conditions ({draftConditions.length})
                </div>
                {draftConditions.length === 0 ? (
                  <p className="card-subtitle">
                    No conditions clearly stated or legible — verify with your doctor or add confirmed conditions below.
                  </p>
                ) : (
                  <div className="rx-chip-edit-list">
                    {draftConditions.map((c) => (
                      <div
                        key={c.id}
                        className={`rx-draft-cond-row ${
                          c.needsVerification ? 'is-uncertain' : ''
                        }`}
                      >
                        <div style={{ flex: 1, minWidth: 180 }}>
                          <div className="rx-item-badge-row">
                            <input
                              type="text"
                              className="field-input rx-inline-edit-input"
                              value={c.name}
                              aria-label="Condition name"
                              onChange={(e) => {
                                const nextName = e.target.value;
                                setDraftConditions((prev) =>
                                  prev.map((item) =>
                                    item.id === c.id
                                      ? {
                                          ...item,
                                          name: nextName,
                                          canonicalKey: nextName
                                            .toLowerCase()
                                            .replace(/[^a-z0-9]+/g, '_'),
                                          needsVerification: false,
                                        }
                                      : item
                                  )
                                );
                              }}
                            />
                            <span className={`rx-conf-badge is-${c.confidence || 'medium'}`}>
                              {c.confidence || 'medium'}
                            </span>
                            {c.needsVerification && (
                              <span className="rx-verify-pill">Verify</span>
                            )}
                          </div>
                          <div className="rx-cond-sub">
                            {c.category === 'acute' ? 'Temporary / Acute' : 'Chronic / Ongoing'}
                            {c.uncertaintyReason
                              ? ` · ${c.uncertaintyReason}`
                              : c.sourceSnippet
                              ? ` · ${c.sourceSnippet}`
                              : ''}
                          </div>
                        </div>
                        <div className="rx-draft-cond-controls">
                          <label className="rx-inline-days">
                            <span>Valid days:</span>
                            <input
                              type="number"
                              min={1}
                              max={365}
                              className="field-input is-numeric"
                              style={{ width: 68, padding: '4px 6px' }}
                              value={c.validDays}
                              onChange={(e) => {
                                const val = Math.min(
                                  365,
                                  Math.max(1, parseInt(e.target.value, 10) || 7)
                                );
                                setDraftConditions((prev) =>
                                  prev.map((item) =>
                                    item.id === c.id ? { ...item, validDays: val } : item
                                  )
                                );
                              }}
                            />
                          </label>
                          <button
                            type="button"
                            className="cart-remove-btn"
                            aria-label={`Remove ${c.name}`}
                            onClick={() =>
                              setDraftConditions((prev) =>
                                prev.filter((item) => item.id !== c.id)
                              )
                            }
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="rx-add-inline">
                  <input
                    type="text"
                    className="field-input"
                    placeholder="Add confirmed condition (e.g. Fever, Gastritis)"
                    value={newConditionName}
                    onChange={(e) => setNewConditionName(e.target.value)}
                  />
                  <input
                    type="number"
                    min={1}
                    max={365}
                    className="field-input is-numeric"
                    style={{ width: 88 }}
                    title="Validity days"
                    value={newConditionDays}
                    onChange={(e) => setNewConditionDays(e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ flexShrink: 0 }}
                    onClick={handleAddDraftCondition}
                  >
                    <Plus size={14} />
                    <span>Add</span>
                  </button>
                </div>
              </div>

              {/* Medicines Editor (Name, Dosage, Frequency) */}
              <div className="rx-draft-section">
                <div className="rx-draft-label">
                  Medicines, Dosage &amp; Frequency ({draftMedicines.length})
                </div>
                {draftMedicines.length > 0 && (
                  <div className="rx-med-edit-list">
                    {draftMedicines.map((m, idx) => (
                      <div
                        key={`med-${idx}`}
                        className={`rx-med-edit-card ${
                          m.needsVerification ? 'is-uncertain' : ''
                        }`}
                      >
                        <div className="rx-med-edit-grid">
                          <input
                            type="text"
                            className="field-input rx-inline-edit-input"
                            placeholder="Medicine name"
                            aria-label={`Medicine ${idx + 1} name`}
                            value={m.name}
                            onChange={(e) => {
                              const val = e.target.value;
                              setDraftMedicines((prev) =>
                                prev.map((item, i) =>
                                  i === idx ? { ...item, name: val, needsVerification: false } : item
                                )
                              );
                            }}
                          />
                          <input
                            type="text"
                            className="field-input rx-inline-edit-input"
                            placeholder="Dosage (e.g. 650mg)"
                            aria-label={`Medicine ${idx + 1} dosage`}
                            value={m.dosage || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setDraftMedicines((prev) =>
                                prev.map((item, i) => (i === idx ? { ...item, dosage: val } : item))
                              );
                            }}
                          />
                          <input
                            type="text"
                            className="field-input rx-inline-edit-input"
                            placeholder="Frequency (e.g. 1-0-1 / BD)"
                            aria-label={`Medicine ${idx + 1} frequency`}
                            value={m.frequency || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setDraftMedicines((prev) =>
                                prev.map((item, i) =>
                                  i === idx ? { ...item, frequency: val } : item
                                )
                              );
                            }}
                          />
                          <div className="rx-med-edit-badges">
                            <span className={`rx-conf-badge is-${m.confidence || 'medium'}`}>
                              {m.confidence || 'medium'}
                            </span>
                            {m.needsVerification && (
                              <span className="rx-verify-pill">Verify</span>
                            )}
                            <button
                              type="button"
                              className="cart-remove-btn"
                              aria-label={`Remove medicine ${m.name || idx + 1}`}
                              onClick={() =>
                                setDraftMedicines((prev) => prev.filter((_, i) => i !== idx))
                              }
                            >
                              <X size={12} />
                            </button>
                          </div>
                        </div>
                        {m.uncertaintyReason && (
                          <div className="rx-uncertainty-note">
                            <AlertTriangle size={12} />
                            <span>{m.uncertaintyReason}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                <div className="rx-add-inline">
                  <input
                    type="text"
                    className="field-input"
                    placeholder="Medicine name"
                    value={newMedicineName}
                    onChange={(e) => setNewMedicineName(e.target.value)}
                  />
                  <input
                    type="text"
                    className="field-input"
                    style={{ maxWidth: 120 }}
                    placeholder="Dosage (650mg)"
                    value={newMedicineDosage}
                    onChange={(e) => setNewMedicineDosage(e.target.value)}
                  />
                  <input
                    type="text"
                    className="field-input"
                    style={{ maxWidth: 140 }}
                    placeholder="Freq (1-0-1 / BD)"
                    value={newMedicineFrequency}
                    onChange={(e) => setNewMedicineFrequency(e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ flexShrink: 0 }}
                    onClick={handleAddDraftMedicine}
                  >
                    <Plus size={14} />
                    <span>Add</span>
                  </button>
                </div>
              </div>

              {/* Dietary Restrictions Editor */}
              <div className="rx-draft-section">
                <div className="rx-draft-label">
                  Doctor-Mentioned Dietary Restrictions ({draftRestrictions.length})
                </div>
                {draftRestrictions.length > 0 && (
                  <div className="rx-chip-edit-list">
                    {draftRestrictions.map((dr, idx) => (
                      <div
                        key={`dr-${idx}`}
                        className={`rx-diet-edit-row ${
                          dr.needsVerification ? 'is-uncertain' : ''
                        }`}
                      >
                        <input
                          type="text"
                          className="field-input rx-inline-edit-input"
                          value={dr.text}
                          aria-label={`Dietary restriction ${idx + 1}`}
                          onChange={(e) => {
                            const val = e.target.value;
                            setDraftRestrictions((prev) =>
                              prev.map((item, i) =>
                                i === idx ? { ...item, text: val, needsVerification: false } : item
                              )
                            );
                          }}
                        />
                        <span className={`rx-conf-badge is-${dr.confidence || 'medium'}`}>
                          {dr.confidence || 'medium'}
                        </span>
                        {dr.needsVerification && (
                          <span className="rx-verify-pill">Verify</span>
                        )}
                        <button
                          type="button"
                          className="cart-remove-btn"
                          onClick={() =>
                            setDraftRestrictions((prev) => prev.filter((_, i) => i !== idx))
                          }
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="rx-add-inline">
                  <input
                    type="text"
                    className="field-input"
                    placeholder="Add restriction (e.g. Avoid cold drinks & ice cream)"
                    value={newRestrictionText}
                    onChange={(e) => setNewRestrictionText(e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ flexShrink: 0 }}
                    onClick={handleAddDraftRestriction}
                  >
                    <Plus size={14} />
                    <span>Add</span>
                  </button>
                </div>
              </div>

              {/* Preserved Original Google Cloud Vision OCR Text */}
              <details
                className="rx-raw-details"
                open={draftDoctorVerifyRecommended || Boolean(draftRawOcr)}
              >
                <summary>
                  Preserved Original Extracted Text (
                  {draftOcrProvider === 'manual_entry'
                    ? 'Manual'
                    : draftOcrProvider === 'gemini_vision_ocr'
                    ? 'Gemini Vision Multimodal OCR'
                    : draftOcrProvider === 'gemini_structured_text'
                    ? 'Gemini Structured Text'
                    : 'Google Cloud Vision DOCUMENT_TEXT_DETECTION'}
                  )
                </summary>
                <textarea
                  className="rx-raw-pre rx-raw-readonly"
                  readOnly
                  rows={5}
                  value={
                    draftRawOcr ||
                    '[No readable text was returned by OCR — inspect uploaded image(s) or confirm directly with your doctor.]'
                  }
                />
              </details>

              {draftDoctorVerifyRecommended && (
                <label className="rx-verify-ack-row">
                  <input
                    type="checkbox"
                    checked={draftUserVerifiedAck}
                    onChange={(e) => setDraftUserVerifiedAck(e.target.checked)}
                  />
                  <span>
                    I have reviewed the uncertain or blurry fields against the original prescription (or confirmed them with my doctor/pharmacist) before saving.
                  </span>
                </label>
              )}

              <div className="rx-draft-actions">
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={isSavingRx}
                  style={{ flex: 'none', padding: '10px 18px' }}
                >
                  {isSavingRx ? 'Saving to MongoDB...' : 'Confirm & Save Verified Prescription'}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setDraftOpen(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Right: Active Health Profile + Interactive Suitability Tester */}
        <div className="rx-col">
          {/* Active Health Profile with Expiry */}
          <section className="card" aria-labelledby="rx-active-heading">
            <div className="rx-card-head">
              <div>
                <h2 id="rx-active-heading" className="card-title">
                  Active Prescription Health Profile
                </h2>
                <p className="card-subtitle">
                  Active conditions auto-expire after their recovery window.
                </p>
              </div>
              <span className="pa-status-pill is-analyzed">
                {activeProfile.activeConditions.length} active
              </span>
            </div>

            {!hasLoadedOnce && isLoading ? (
              <div className="rx-loading-state">
                <Loader2 size={18} className="spin-icon" />
                <span>Loading prescription profile...</span>
              </div>
            ) : activeProfile.activeConditions.length === 0 ? (
              <div className="rx-empty-box">
                <ClipboardList size={24} color="#64748b" />
                <div>
                  <strong>No active temporary or chronic prescription conditions</strong>
                  <p>
                    Upload a doctor prescription on the left to activate smart cart warnings.
                  </p>
                </div>
              </div>
            ) : (
              <div className="rx-cond-list">
                {activeProfile.activeConditions.map((cond) => (
                  <div key={`${cond.prescription_id}-${cond.id}`} className="rx-active-cond-card">
                    <div className="rx-cond-top">
                      <div>
                        <div className="rx-cond-title">{cond.name}</div>
                        <div className="rx-cond-meta">
                          <Calendar size={12} />
                          <span>Prescribed {cond.prescribedDate}</span>
                          <span>·</span>
                          <Clock size={12} />
                          <span>
                            {cond.daysRemaining !== undefined
                              ? `${cond.daysRemaining} day${cond.daysRemaining === 1 ? '' : 's'} remaining`
                              : `Valid ${cond.validDays}d`}
                          </span>
                        </div>
                      </div>
                      <span className="risk-tag is-moderate">ACTIVE</span>
                    </div>

                    {cond.sourceSnippet && (
                      <p className="rx-cond-snippet">{cond.sourceSnippet}</p>
                    )}

                    {cond.prescription_id && (
                      <div className="rx-cond-actions">
                        <button
                          type="button"
                          className="btn-secondary"
                          style={{ padding: '5px 10px', fontSize: '12px' }}
                          onClick={() =>
                            void handleConditionAction(cond.prescription_id!, cond.id, {
                              validDays: (cond.validDays || 7) + 7,
                              status: 'active',
                            })
                          }
                        >
                          Extend +7 days
                        </button>
                        <button
                          type="button"
                          className="cart-remove-btn"
                          onClick={() =>
                            void handleConditionAction(cond.prescription_id!, cond.id, {
                              status: 'dismissed',
                            })
                          }
                        >
                          Dismiss Condition
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {activeProfile.dietaryRestrictions.length > 0 && (
              <div className="rx-active-subblock">
                <div className="rx-subblock-title">Active Dietary Restrictions</div>
                <ul className="rx-diet-bullets">
                  {activeProfile.dietaryRestrictions.map((rule, i) => (
                    <li key={i}>{rule}</li>
                  ))}
                </ul>
              </div>
            )}

            {activeProfile.medicines.length > 0 && (
              <div className="rx-active-subblock">
                <div className="rx-subblock-title">Recorded Medicines</div>
                <div className="rx-med-pill-grid">
                  {activeProfile.medicines.map((m, idx) => (
                    <span key={idx} className="store-chip">
                      <Pill size={12} style={{ marginRight: 5 }} />
                      {m.name}
                      {m.dosage ? ` (${m.dosage})` : ''}
                      {m.frequency ? ` · ${m.frequency}` : ''}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Interactive Product Suitability Preview & Chrome Extension Preview */}
          <section className="card" aria-labelledby="rx-tester-heading">
            <div className="rx-card-head">
              <div>
                <h2 id="rx-tester-heading" className="card-title">
                  Cart Warning &amp; Alternative Preview
                </h2>
                <p className="card-subtitle">
                  Test how Amazon, Blinkit, Zomato &amp; Swiggy carts check products against your active profile.
                </p>
              </div>
            </div>

            <div className="rx-quick-test-chips">
              {QUICK_TEST_FOODS.map((item) => (
                <button
                  key={item.title}
                  type="button"
                  className="btn-secondary"
                  style={{ padding: '6px 10px', fontSize: '12px' }}
                  onClick={() =>
                    void handleCheckProductSuitability(
                      item.title,
                      item.ingredients,
                      item.nutrition
                    )
                  }
                >
                  {item.title}
                </button>
              ))}
            </div>

            <div className="rx-test-form">
              <div className="field">
                <label htmlFor="rx-test-food" className="field-label">
                  Product / Dish Name
                </label>
                <input
                  id="rx-test-food"
                  type="text"
                  className="field-input"
                  value={testFoodName}
                  onChange={(e) => setTestFoodName(e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="rx-test-ing" className="field-label">
                  Ingredients / Notes
                </label>
                <input
                  id="rx-test-ing"
                  type="text"
                  className="field-input"
                  value={testIngredients}
                  onChange={(e) => setTestIngredients(e.target.value)}
                />
              </div>
              <button
                type="button"
                className="btn-primary"
                style={{ flex: 'none', padding: '9px 14px', fontSize: '13.5px' }}
                onClick={() => void handleCheckProductSuitability()}
              >
                <ShieldAlert size={15} />
                <span>Check Product Suitability</span>
              </button>
            </div>

            {testResult && !testDismissed && (
              <div
                className={`rx-warning-popup ${
                  testResult.hasWarnings ? 'is-alert' : 'is-clear'
                }`}
                role="region"
                aria-live="polite"
              >
                {testResult.hasWarnings ? (
                  <>
                    <div className="rx-warning-head">
                      <AlertTriangle size={17} color="#92400e" />
                      <span>Active Prescription Alert</span>
                    </div>
                    {testResult.warnings.map((w, idx) => (
                      <div key={idx} className="rx-warning-item">
                        <div className="rx-warning-headline">{w.headline}</div>
                        <div className="rx-warning-detail">{w.detail}</div>
                      </div>
                    ))}
                    {testResult.alternatives.length > 0 && (
                      <div className="rx-alt-box">
                        <div className="rx-alt-title">Safer alternatives to consider:</div>
                        <ul>
                          {testResult.alternatives.map((alt, i) => (
                            <li key={i}>{alt}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <p className="rx-disclaimer-mini">{testResult.disclaimer}</p>
                    <div className="rx-popup-actions">
                      <button
                        type="button"
                        className="btn-secondary"
                        style={{ padding: '7px 12px', fontSize: '12.5px' }}
                        onClick={() => setTestDismissed(true)}
                      >
                        Dismiss Warning
                      </button>
                      <button
                        type="button"
                        className="btn-primary"
                        style={{ flex: 'none', padding: '7px 12px', fontSize: '12.5px' }}
                        onClick={() => setTestContinued(true)}
                      >
                        Continue Ordering
                      </button>
                    </div>
                    {testContinued && (
                      <p className="rx-continued-note">
                        Noted — you chose to continue ordering "{testFoodName}".
                      </p>
                    )}
                  </>
                ) : (
                  <div className="rx-clear-row">
                    <CheckCircle2 size={17} color="#146c43" />
                    <div>
                      <strong>No prescription conflicts detected for "{testFoodName}"</strong>
                      <div className="rx-warning-detail">
                        {activeProfile.activeConditions.length === 0
                          ? 'Upload or activate a prescription condition to test conflict warnings.'
                          : 'Matches your current active prescription dietary guidelines.'}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Saved Prescriptions & Expired History */}
      <section className="card" style={{ marginTop: 18 }} aria-labelledby="rx-history-heading">
        <div className="rx-card-head">
          <div>
            <h2 id="rx-history-heading" className="card-title">
              Prescription History &amp; Expired Conditions
            </h2>
            <p className="card-subtitle">
              All uploaded prescriptions stored securely for {currentUser?.fullName}.
            </p>
          </div>
          <span className="sc-count-pill">{prescriptions.length} records</span>
        </div>

        {prescriptions.length === 0 ? (
          <p className="card-subtitle" style={{ marginTop: 10 }}>
            No prescriptions saved yet.
          </p>
        ) : (
          <div className="data-table-wrap limits-table-frame">
            <table className="data-table is-compact">
              <thead>
                <tr>
                  <th>Prescription</th>
                  <th>Date</th>
                  <th>Conditions &amp; Validity</th>
                  <th>Medicines</th>
                  <th className="num">Action</th>
                </tr>
              </thead>
              <tbody>
                {prescriptions.map((rx) => (
                  <tr key={rx.prescription_id}>
                    <td>
                      <div className="limits-row-product">{rx.fileName}</div>
                      <div className="limits-row-sub">
                        {rx.fileType.toUpperCase()} · {rx.pagesCount || 1} page{(rx.pagesCount || 1) > 1 ? 's' : ''}
                        {rx.patientName ? ` · Patient: ${rx.patientName}` : ''}
                        {typeof rx.ocrConfidence === 'number' ? ` · OCR ${rx.ocrConfidence}%` : ''}
                      </div>
                      {rx.rawOcrText && (
                        <details className="rx-history-raw">
                          <summary>Original OCR Text</summary>
                          <pre className="rx-raw-pre">{rx.rawOcrText}</pre>
                        </details>
                      )}
                    </td>
                    <td className="tabular">{rx.prescriptionDate}</td>
                    <td>
                      {rx.conditions.length === 0 ? (
                        <span className="card-subtitle">Diet / Rx advice</span>
                      ) : (
                        <div className="rx-history-conds">
                          {rx.conditions.map((c) => (
                            <div key={c.id} className="rx-history-cond-item">
                              <span
                                className={`eval-pill ${
                                  c.status === 'active'
                                    ? 'is-moderate'
                                    : 'is-neutral'
                                }`}
                              >
                                {c.name} ({c.status}
                                {c.status === 'active' && c.daysRemaining !== undefined
                                  ? ` · ${c.daysRemaining}d left`
                                  : ''}
                                )
                              </span>
                              {c.status !== 'active' && (
                                <button
                                  type="button"
                                  className="sc-text-link-btn"
                                  style={{ fontSize: '11.5px' }}
                                  onClick={() =>
                                    void handleConditionAction(rx.prescription_id, c.id, {
                                      status: 'active',
                                      validDays: (c.validDays || 7) + 7,
                                    })
                                  }
                                >
                                  Re-activate (+7d)
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                    <td>
                      {rx.medicines.length > 0 ? (
                        <div className="rx-history-meds">
                          {rx.medicines.map((m, i) => (
                            <div key={i}>
                              <strong>{m.name}</strong>
                              {m.dosage ? ` ${m.dosage}` : ''}
                              {m.frequency ? ` (${m.frequency})` : ''}
                            </div>
                          ))}
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="num">
                      <button
                        type="button"
                        className="cart-remove-btn"
                        aria-label={`Delete ${rx.fileName}`}
                        onClick={() => void handleDeletePrescription(rx.prescription_id)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
