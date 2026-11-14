import React from 'react';
import { Activity, AlertCircle, RotateCcw } from 'lucide-react';
import type { NutritionFormValues, SampleFood } from '../types';

interface NutritionFormProps {
  values: NutritionFormValues;
  samples: SampleFood[];
  selectedSampleName: string;
  isAnalyzing: boolean;
  errorMessage: string | null;
  onChange: (field: keyof NutritionFormValues, value: string) => void;
  onSelectSample: (sampleFoodName: string) => void;
  onQuickPreset: (label: 'Healthy' | 'Moderate' | 'Unhealthy') => void;
  onSubmit: (event: React.FormEvent) => void;
  onReset: () => void;
}

export function NutritionForm({
  values,
  samples,
  selectedSampleName,
  isAnalyzing,
  errorMessage,
  onChange,
  onSelectSample,
  onQuickPreset,
  onSubmit,
  onReset,
}: NutritionFormProps) {
  return (
    <section className="card" aria-labelledby="nutrition-form-heading">
      <div className="card-header">
        <div>
          <h2 id="nutrition-form-heading" className="card-title">
            Nutrition Input
          </h2>
          <p className="card-subtitle">
            Enter per-serving label values or load a cleaned dataset item.
          </p>
        </div>
      </div>

      <div className="sample-box">
        <label htmlFor="sample-food-select" className="sample-label">
          Dataset Sample Foods ({samples.length} items from CSVs)
        </label>
        <select
          id="sample-food-select"
          className="sample-select"
          value={selectedSampleName}
          onChange={(e) => onSelectSample(e.target.value)}
        >
          <option value="">-- Choose a food from the cleaned dataset --</option>
          {samples.map((item) => (
            <option key={item.food} value={item.food}>
              {item.food} ({item.calories} kcal · {item.dataset_label})
            </option>
          ))}
        </select>

        <div className="quick-presets">
          <button
            type="button"
            className="preset-btn"
            onClick={() => onQuickPreset('Healthy')}
          >
            Healthy Sample
          </button>
          <button
            type="button"
            className="preset-btn"
            onClick={() => onQuickPreset('Moderate')}
          >
            Moderate Sample
          </button>
          <button
            type="button"
            className="preset-btn"
            onClick={() => onQuickPreset('Unhealthy')}
          >
            Unhealthy Sample
          </button>
        </div>
      </div>

      <form className="form-stack" onSubmit={onSubmit}>
        <div className="field">
          <label htmlFor="food_name" className="field-label">
            <span>Food Product Name</span>
            <span className="field-unit">Optional</span>
          </label>
          <input
            id="food_name"
            type="text"
            className="field-input"
            placeholder="e.g., Greek Yogurt Bowl"
            value={values.food_name}
            onChange={(e) => onChange('food_name', e.target.value)}
            maxLength={120}
          />
        </div>

        <div className="field-grid">
          <div className="field">
            <label htmlFor="calories" className="field-label">
              <span>Calories</span>
              <span className="field-unit">kcal</span>
            </label>
            <input
              id="calories"
              type="number"
              min="0"
              max="10000"
              step="any"
              required
              className="field-input is-numeric"
              placeholder="e.g., 220"
              value={values.calories}
              onChange={(e) => onChange('calories', e.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="sugars" className="field-label">
              <span>Sugar</span>
              <span className="field-unit">g</span>
            </label>
            <input
              id="sugars"
              type="number"
              min="0"
              max="1000"
              step="any"
              required
              className="field-input is-numeric"
              placeholder="e.g., 6.5"
              value={values.sugars}
              onChange={(e) => onChange('sugars', e.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="fat" className="field-label">
              <span>Total Fat</span>
              <span className="field-unit">g</span>
            </label>
            <input
              id="fat"
              type="number"
              min="0"
              max="1000"
              step="any"
              required
              className="field-input is-numeric"
              placeholder="e.g., 4.5"
              value={values.fat}
              onChange={(e) => onChange('fat', e.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="protein" className="field-label">
              <span>Protein</span>
              <span className="field-unit">g</span>
            </label>
            <input
              id="protein"
              type="number"
              min="0"
              max="1000"
              step="any"
              required
              className="field-input is-numeric"
              placeholder="e.g., 14.0"
              value={values.protein}
              onChange={(e) => onChange('protein', e.target.value)}
            />
          </div>
        </div>

        <div className="field">
          <label htmlFor="sodium_mg" className="field-label">
            <span>Sodium</span>
            <span className="field-unit">mg</span>
          </label>
          <input
            id="sodium_mg"
            type="number"
            min="0"
            max="20000"
            step="any"
            required
            className="field-input is-numeric"
            placeholder="e.g., 180"
            value={values.sodium_mg}
            onChange={(e) => onChange('sodium_mg', e.target.value)}
          />
        </div>

        {errorMessage && (
          <div className="error-banner" role="alert">
            <AlertCircle size={16} />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="form-actions">
          <button type="submit" className="btn-primary" disabled={isAnalyzing}>
            <Activity size={16} />
            <span>{isAnalyzing ? 'Analyzing...' : 'Analyze Food'}</span>
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={onReset}
            title="Clear form values"
          >
            <RotateCcw size={15} />
            <span>Reset</span>
          </button>
        </div>
      </form>
    </section>
  );
}
