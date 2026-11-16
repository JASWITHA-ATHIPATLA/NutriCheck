import React, { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { HealthCondition } from '../types';
import {
  HEALTH_CONDITION_OPTIONS,
  parseAllergiesInput,
  parseCustomConditionsInput,
} from '../utils/healthProfileEngine';

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [age, setAge] = useState('');
  const [conditions, setConditions] = useState<HealthCondition[]>([]);
  const [hasOtherDisease, setHasOtherDisease] = useState(false);
  const [otherDiseaseInput, setOtherDiseaseInput] = useState('');
  const [allergiesInput, setAllergiesInput] = useState('');
  const [dietaryNotes, setDietaryNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function toggleCondition(key: HealthCondition) {
    setConditions((prev) =>
      prev.includes(key) ? prev.filter((c) => c !== key) : [...prev, key]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (hasOtherDisease && !otherDiseaseInput.trim()) {
      setError('Please enter your other disease name(s) or uncheck "Other disease".');
      return;
    }
    setSubmitting(true);
    try {
      const res = await register({
        fullName,
        email,
        password,
        age: Number(age),
        conditions,
        otherConditions: hasOtherDisease
          ? parseCustomConditionsInput(otherDiseaseInput)
          : [],
        allergies: parseAllergiesInput(allergiesInput),
        dietaryNotes,
      });

      if (!res.ok) {
        setError(res.error || 'Unable to create account.');
        return;
      }

      navigate('/dashboard');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page-shell auth-shell">
      <div className="card auth-card">
        <div className="auth-header">
          <h1 className="page-title">Create your account</h1>
          <p className="page-subtitle">
            Your health profile is used to personalize food screening across products,
            packet scans, daily limits, and online grocery checks.
          </p>
        </div>

        <form className="form-stack" onSubmit={handleSubmit} noValidate>
          <div className="field-grid">
            <div className="field">
              <label htmlFor="reg-fullname" className="field-label">
                Full name
              </label>
              <input
                id="reg-fullname"
                type="text"
                className="field-input"
                placeholder="Enter your name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="reg-email" className="field-label">
                Email
              </label>
              <input
                id="reg-email"
                type="email"
                className="field-input"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="reg-password" className="field-label">
                Password (minimum 6 characters)
              </label>
              <input
                id="reg-password"
                type="password"
                className="field-input"
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="reg-age" className="field-label">
                Age
              </label>
              <input
                id="reg-age"
                type="number"
                min={1}
                max={120}
                className="field-input is-numeric"
                placeholder="e.g., 35"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                required
              />
            </div>
          </div>

          <fieldset className="condition-fieldset">
            <legend className="field-label">
              Known health conditions (select all that apply)
            </legend>
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
                  onChange={(e) => setHasOtherDisease(e.target.checked)}
                />
                <span>Other disease</span>
              </label>
            </div>

            {hasOtherDisease && (
              <div className="field" style={{ marginTop: '10px' }}>
                <label htmlFor="reg-other-disease" className="field-label">
                  Specify other disease (comma-separated)
                </label>
                <input
                  id="reg-other-disease"
                  type="text"
                  className="field-input"
                  placeholder="e.g., High Cholesterol, PCOS, Thyroid, Celiac, Gout"
                  value={otherDiseaseInput}
                  onChange={(e) => setOtherDiseaseInput(e.target.value)}
                />
              </div>
            )}
          </fieldset>

          <div className="field">
            <label htmlFor="reg-allergies" className="field-label">
              Food allergies (comma-separated, e.g. milk, peanuts, wheat)
            </label>
            <input
              id="reg-allergies"
              type="text"
              className="field-input"
              placeholder="None, or list allergens (e.g., milk, peanuts, soy)"
              value={allergiesInput}
              onChange={(e) => setAllergiesInput(e.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="reg-notes" className="field-label">
              Other dietary notes (optional)
            </label>
            <textarea
              id="reg-notes"
              className="field-input field-textarea"
              placeholder="e.g., Low sodium diet, avoid artificial sweeteners"
              value={dietaryNotes}
              onChange={(e) => setDietaryNotes(e.target.value)}
            />
          </div>

          {error && (
            <div className="error-banner" role="alert">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <button type="submit" className="btn-primary auth-submit-btn" disabled={submitting}>
            {submitting ? 'Creating account...' : 'Register and continue'}
          </button>
        </form>

        <div className="auth-footer-note">
          Already have an account?{' '}
          <Link to="/login" className="text-action-link">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
