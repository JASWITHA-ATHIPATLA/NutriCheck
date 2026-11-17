import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, LogOut, UserCheck } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { HealthCondition } from '../types';
import {
  HEALTH_CONDITION_OPTIONS,
  getAgeGroupLabel,
  parseAllergiesInput,
  parseCustomConditionsInput,
} from '../utils/healthProfileEngine';

export function ProfilePage() {
  const { currentUser, updateProfile, logout } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState(currentUser?.fullName || '');
  const [age, setAge] = useState(currentUser ? String(currentUser.age) : '');
  const [conditions, setConditions] = useState<HealthCondition[]>(
    currentUser?.conditions || []
  );
  const [hasOtherDisease, setHasOtherDisease] = useState(
    Boolean(currentUser?.otherConditions && currentUser.otherConditions.length > 0)
  );
  const [otherDiseaseInput, setOtherDiseaseInput] = useState(
    currentUser?.otherConditions?.join(', ') || ''
  );
  const [allergiesInput, setAllergiesInput] = useState(
    currentUser?.allergies.join(', ') || ''
  );
  const [dietaryNotes, setDietaryNotes] = useState(currentUser?.dietaryNotes || '');
  const [savedBanner, setSavedBanner] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setFullName(currentUser.fullName);
      setAge(String(currentUser.age));
      setConditions(currentUser.conditions);
      const otherList = currentUser.otherConditions || [];
      setHasOtherDisease(otherList.length > 0);
      setOtherDiseaseInput(otherList.join(', '));
      setAllergiesInput(currentUser.allergies.join(', '));
      setDietaryNotes(currentUser.dietaryNotes);
    }
  }, [currentUser]);

  if (!currentUser) {
    return (
      <div className="page-shell auth-shell">
        <div className="card empty-state auth-card-narrow">
          <div className="empty-icon">
            <UserCheck size={22} />
          </div>
          <h1 className="empty-title">No Health Profile Signed In</h1>
          <p className="empty-desc">
            Create an account or sign in so NutriCheck can personalize food verdicts
            for your age, medical conditions, and allergies.
          </p>
          <div className="nc-hero-actions" style={{ justifyContent: 'center' }}>
            <Link to="/register" className="nc-btn-primary" style={{ textDecoration: 'none' }}>
              Create account
            </Link>
            <Link to="/login" className="btn-secondary" style={{ textDecoration: 'none' }}>
              Sign in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  function toggleCondition(key: HealthCondition) {
    setSavedBanner(false);
    setSaveError(null);
    setConditions((prev) =>
      prev.includes(key) ? prev.filter((c) => c !== key) : [...prev, key]
    );
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!currentUser) return;
    setSavedBanner(false);
    setSaveError(null);

    const trimmedName = fullName.trim();
    if (!trimmedName) {
      setSaveError('Please enter your full name.');
      return;
    }

    const numericAge = Number(age);
    if (!Number.isFinite(numericAge) || numericAge < 1 || numericAge > 120) {
      setSaveError('Please enter a valid age between 1 and 120.');
      return;
    }

    if (hasOtherDisease && !otherDiseaseInput.trim()) {
      setSaveError('Please enter your other disease name(s) or uncheck "Other disease".');
      return;
    }

    setSaving(true);
    try {
      const res = await updateProfile({
        fullName: trimmedName,
        age: Math.round(numericAge),
        conditions,
        otherConditions: hasOtherDisease
          ? parseCustomConditionsInput(otherDiseaseInput)
          : [],
        allergies: parseAllergiesInput(allergiesInput),
        dietaryNotes,
      });

      if (!res.ok) {
        setSaveError(res.error || 'Unable to save your profile to the backend.');
        return;
      }
      setSavedBanner(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page-shell auth-shell">
      <div className="card auth-card">
        <div className="card-header" style={{ alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div>
            <h1 className="page-title" style={{ fontSize: '24px' }}>
              Health profile
            </h1>
            <p className="card-subtitle">
              Update these details to personalize product checks ({getAgeGroupLabel(Number(age) || currentUser.age)} profile).
            </p>
          </div>

          <div className="profile-header-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => navigate('/limits')}
            >
              Daily Limits
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => navigate('/dashboard')}
            >
              Back to Dashboard
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                logout();
                navigate('/');
              }}
            >
              <LogOut size={15} />
              <span>Logout</span>
            </button>
          </div>
        </div>

        {savedBanner && (
          <div className="amazon-live-banner level-success" style={{ marginBottom: '18px' }} role="status">
            <div className="cart-alert-body">
              <CheckCircle2 size={18} />
              <div>
                <div className="cart-alert-title">Profile updated</div>
                <p className="cart-alert-msg">
                  All products, Daily Limits, and packet scans now reflect your updated health profile.
                </p>
              </div>
            </div>
            <button
              type="button"
              className="alert-dismiss-btn"
              onClick={() => navigate('/dashboard')}
            >
              View Dashboard
            </button>
          </div>
        )}

        {saveError && (
          <div className="error-banner" role="alert" style={{ marginBottom: '18px' }}>
            <AlertCircle size={16} />
            <span>{saveError}</span>
          </div>
        )}

        <form className="form-stack" onSubmit={handleSave}>
          <div className="field">
            <label htmlFor="prof-email" className="field-label">
              Account email
            </label>
            <input
              id="prof-email"
              type="email"
              className="field-input"
              value={currentUser.email}
              readOnly
              disabled
            />
          </div>

          <div className="field">
            <label htmlFor="prof-name" className="field-label">
              Name
            </label>
            <input
              id="prof-name"
              type="text"
              className="field-input"
              value={fullName}
              onChange={(e) => {
                setSavedBanner(false);
                setSaveError(null);
                setFullName(e.target.value);
              }}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="prof-age" className="field-label">
              Age
            </label>
            <input
              id="prof-age"
              type="number"
              min={1}
              max={120}
              className="field-input is-numeric"
              value={age}
              onChange={(e) => {
                setSavedBanner(false);
                setAge(e.target.value);
              }}
              required
            />
          </div>

          <fieldset className="condition-fieldset">
            <legend className="field-label">Health conditions</legend>
            <div className="condition-grid">
              {HEALTH_CONDITION_OPTIONS.map((opt) => {
                const checked = conditions.includes(opt.key);
                return (
                  <label
                    key={opt.key}
                    className={`condition-option ${checked ? 'is-checked' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleCondition(opt.key)}
                    />
                    <span>{opt.label}</span>
                  </label>
                );
              })}

              <label
                className={`condition-option ${hasOtherDisease ? 'is-checked' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={hasOtherDisease}
                  onChange={(e) => {
                    setSavedBanner(false);
                    setHasOtherDisease(e.target.checked);
                  }}
                />
                <span>Other disease</span>
              </label>
            </div>

            {hasOtherDisease && (
              <div className="field" style={{ marginTop: '10px' }}>
                <label htmlFor="prof-other-disease" className="field-label">
                  Other disease (comma-separated)
                </label>
                <input
                  id="prof-other-disease"
                  type="text"
                  className="field-input"
                  placeholder="e.g., High Cholesterol, PCOS, Thyroid, Celiac, Gout"
                  value={otherDiseaseInput}
                  onChange={(e) => {
                    setSavedBanner(false);
                    setOtherDiseaseInput(e.target.value);
                  }}
                />
              </div>
            )}
          </fieldset>

          <div className="field">
            <label htmlFor="prof-allergies" className="field-label">
              Food allergies (comma separated)
            </label>
            <input
              id="prof-allergies"
              type="text"
              className="field-input"
              placeholder="e.g., milk, peanuts, wheat"
              value={allergiesInput}
              onChange={(e) => {
                setSavedBanner(false);
                setAllergiesInput(e.target.value);
              }}
            />
          </div>

          <div className="field">
            <label htmlFor="prof-notes" className="field-label">
              Other dietary notes
            </label>
            <textarea
              id="prof-notes"
              className="field-input field-textarea"
              value={dietaryNotes}
              onChange={(e) => {
                setSavedBanner(false);
                setDietaryNotes(e.target.value);
              }}
            />
          </div>

          <button type="submit" className="btn-primary auth-submit-btn" disabled={saving}>
            {saving ? 'Saving to backend...' : 'Save profile'}
          </button>
        </form>
      </div>
    </div>
  );
}
