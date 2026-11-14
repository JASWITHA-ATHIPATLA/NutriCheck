import {
  AlertTriangle,
  CheckCircle2,
  ScanLine,
  ShieldAlert,
  ShoppingCart,
} from 'lucide-react';
import type { HealthLabel, PredictionResult } from '../types';
import { NutritionGauge } from './NutritionGauge';

interface AnalysisResultProps {
  result: PredictionResult | null;
  isAnalyzing: boolean;
  onAddToCart: (result: PredictionResult) => void;
  onQuickPreset: (label: HealthLabel) => void;
}

function getStatusClass(label: HealthLabel): string {
  if (label === 'Healthy') return 'is-healthy';
  if (label === 'Moderate') return 'is-moderate';
  return 'is-unhealthy';
}

function StatusIcon({ label }: { label: HealthLabel }) {
  if (label === 'Healthy') return <CheckCircle2 size={18} />;
  if (label === 'Moderate') return <AlertTriangle size={18} />;
  return <ShieldAlert size={18} />;
}

export function AnalysisResult({
  result,
  isAnalyzing,
  onAddToCart,
  onQuickPreset,
}: AnalysisResultProps) {
  if (!result && !isAnalyzing) {
    return (
      <section className="card empty-state" aria-label="Health analysis output">
        <div className="empty-icon" aria-hidden="true">
          <ScanLine size={22} />
        </div>
        <h2 className="empty-title">Ready to Analyze Nutrition</h2>
        <p className="empty-desc">
          Select any food above, enter nutrition values on the left, or load a
          dataset sample below to inspect its NutriCheck health score and
          classification.
        </p>
        <div className="form-actions" style={{ justifyContent: 'center' }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => onQuickPreset('Healthy')}
          >
            Try Broccoli Sample
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => onQuickPreset('Unhealthy')}
          >
            Try Soda Sample
          </button>
        </div>
      </section>
    );
  }

  if (isAnalyzing && !result) {
    return (
      <section className="card empty-state" aria-busy="true">
        <h2 className="empty-title">Running Nutrition Model...</h2>
        <p className="empty-desc">
          Evaluating nutrient density and macro ratios with the trained Random
          Forest model.
        </p>
      </section>
    );
  }

  if (!result) return null;

  const statusCls = getStatusClass(result.classification);
  const gaugeTone =
    result.classification === 'Healthy'
      ? 'good'
      : result.classification === 'Moderate'
      ? 'moderate'
      : 'bad';
  const verdictText =
    result.classification === 'Healthy'
      ? 'Good'
      : result.classification === 'Moderate'
      ? 'Moderate'
      : 'Not Good';
  const flagMap = new Map(result.nutrient_flags.map((f) => [f.nutrient, f]));

  return (
    <section className="card" aria-labelledby="analysis-result-heading">
      <div className="result-hero">
        <div>
          <h2 id="analysis-result-heading" className="result-food-name">
            {result.food_name}
          </h2>
          <p className="result-meta-line">
            Model: {result.model_used} · Confidence{' '}
            <span className="tabular">{result.confidence}%</span>
          </p>
        </div>

        <div className={`status-badge ${statusCls}`}>
          <StatusIcon label={result.classification} />
          <span>{result.classification}</span>
        </div>
      </div>

      <div className="score-section score-gauge-row">
        <NutritionGauge
          score={result.health_score}
          label={verdictText}
          tone={gaugeTone}
          title="Nutrition score"
        />

        <div className="score-meta-col">
          <div className="score-meta-title">ML Class Probabilities</div>
          <div className="prob-bars">
            <div className="prob-bar-item">
              <span>Healthy</span>
              <span className="tabular">{result.probabilities.Healthy}%</span>
            </div>
            <div className="prob-bar-item">
              <span>Moderate</span>
              <span className="tabular">{result.probabilities.Moderate}%</span>
            </div>
            <div className="prob-bar-item">
              <span>Unhealthy</span>
              <span className="tabular">{result.probabilities.Unhealthy}%</span>
            </div>
          </div>
        </div>
      </div>

      <div className="nutrient-grid">
        <div className="nutrient-cell">
          <div className="nutrient-cell-label">
            <span>Calories</span>
          </div>
          <div className="nutrient-cell-value">{result.nutrition.calories} kcal</div>
          <div className="nutrient-cell-note">Per 100g / serving</div>
        </div>

        <div className="nutrient-cell">
          <div className="nutrient-cell-label">
            <span>Sugar</span>
            {flagMap.get('Sugar') && (
              <span className={`flag-text-${flagMap.get('Sugar')!.status}`}>
                {flagMap.get('Sugar')!.status.toUpperCase()}
              </span>
            )}
          </div>
          <div className="nutrient-cell-value">{result.nutrition.sugars} g</div>
          <div className="nutrient-cell-note">
            <span className="tabular">{result.nutrition.sugar_kcal_pct}%</span> of kcal
          </div>
        </div>

        <div className="nutrient-cell">
          <div className="nutrient-cell-label">
            <span>Total Fat</span>
            {flagMap.get('Total Fat') && (
              <span className={`flag-text-${flagMap.get('Total Fat')!.status}`}>
                {flagMap.get('Total Fat')!.status.toUpperCase()}
              </span>
            )}
          </div>
          <div className="nutrient-cell-value">{result.nutrition.fat} g</div>
          <div className="nutrient-cell-note">
            <span className="tabular">{result.nutrition.fat_kcal_pct}%</span> of kcal
          </div>
        </div>

        <div className="nutrient-cell">
          <div className="nutrient-cell-label">
            <span>Protein</span>
            {flagMap.get('Protein') && (
              <span className={`flag-text-${flagMap.get('Protein')!.status}`}>
                {flagMap.get('Protein')!.status.toUpperCase()}
              </span>
            )}
          </div>
          <div className="nutrient-cell-value">{result.nutrition.protein} g</div>
          <div className="nutrient-cell-note">
            <span className="tabular">{result.nutrition.protein_kcal_pct}%</span> of kcal
          </div>
        </div>

        <div className="nutrient-cell">
          <div className="nutrient-cell-label">
            <span>Sodium</span>
            {flagMap.get('Sodium') && (
              <span className={`flag-text-${flagMap.get('Sodium')!.status}`}>
                {flagMap.get('Sodium')!.status.toUpperCase()}
              </span>
            )}
          </div>
          <div className="nutrient-cell-value">
            {Math.round(result.nutrition.sodium_mg)} mg
          </div>
          <div className="nutrient-cell-note">
            <span className="tabular">
              {Math.round(result.nutrition.sodium_per_100kcal)}
            </span>{' '}
            mg/100 kcal
          </div>
        </div>
      </div>

      <div className="explanation-box">
        <div className="explanation-heading">Health Analysis Summary</div>
        <p className="explanation-text">{result.explanation}</p>
      </div>

      <div className="result-footer-actions">
        <button
          type="button"
          className="btn-cart"
          onClick={() => onAddToCart(result)}
        >
          <ShoppingCart size={16} />
          <span>Add to Cart (Demo)</span>
        </button>
        <span className="footer-hint">
          Triggers an instant health alert in your NutriCheck cart.
        </span>
      </div>
    </section>
  );
}
