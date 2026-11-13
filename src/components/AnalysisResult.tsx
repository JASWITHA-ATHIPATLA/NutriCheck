import {
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  ShoppingCart,
  Sparkles,
} from 'lucide-react';
import type { HealthLabel, PredictionResult } from '../types';

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
          <Sparkles size={22} />
        </div>
        <h2 className="empty-title">Ready to Analyze Nutrition</h2>
        <p className="empty-desc">
          Enter calories, sugar, fat, protein, and sodium on the left—or load a
          sample food below—to compute a Scikit-learn health classification,
          health score, and instant cart alert.
        </p>
        <div className="form-actions" style={{ justifyContent: 'center' }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => onQuickPreset('Healthy')}
          >
            <span className="dot dot-healthy" aria-hidden="true" />
            Try Broccoli Sample
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => onQuickPreset('Unhealthy')}
          >
            <span className="dot dot-unhealthy" aria-hidden="true" />
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

      <div className="score-section">
        <div className="score-row">
          <span className="score-label">Health Score</span>
          <div className="score-value">
            {result.health_score}
            <span className="score-denom"> / 100</span>
          </div>
        </div>

        <div className="score-track" role="progressbar" aria-valuenow={result.health_score} aria-valuemin={0} aria-valuemax={100}>
          <div
            className={`score-fill ${statusCls}`}
            style={{ width: `${Math.min(100, Math.max(0, result.health_score))}%` }}
          />
        </div>

        <div className="prob-strip">
          <span>
            Class Probabilities — Healthy:{' '}
            <strong className="tabular">{result.probabilities.Healthy}%</strong>
          </span>
          <span>
            Moderate:{' '}
            <strong className="tabular">{result.probabilities.Moderate}%</strong>
          </span>
          <span>
            Unhealthy:{' '}
            <strong className="tabular">{result.probabilities.Unhealthy}%</strong>
          </span>
        </div>
      </div>

      <div className="nutrient-grid">
        <div className="nutrient-cell">
          <div className="nutrient-cell-label">
            <span>Calories</span>
          </div>
          <div className="nutrient-cell-value">{result.nutrition.calories} kcal</div>
          <div className="nutrient-cell-note">Per serving</div>
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
        <div className="explanation-heading">Health Analysis Explanation</div>
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
          Triggers an instant health alert based on the product classification.
        </span>
      </div>
    </section>
  );
}
