import {
  AlertTriangle,
  CheckCircle2,
  ScanLine,
  ShieldAlert,
  ShoppingCart,
} from 'lucide-react';
import type { HealthLabel, PacketScanResult, PredictionResult } from '../types';
import { BreakdownPieChart } from './BreakdownPieChart';
import { NutritionGauge } from './NutritionGauge';

interface AnalysisResultProps {
  result: PredictionResult | null;
  ingredientScan?: PacketScanResult | null;
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

function statusPillLabel(status?: 'good' | 'moderate' | 'high'): string {
  if (status === 'good') return 'Good';
  if (status === 'moderate') return 'Moderate';
  if (status === 'high') return 'High Concern';
  return 'Measured';
}

export function AnalysisResult({
  result,
  ingredientScan,
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
          dataset sample below to inspect its NutriCheck health score, calorie
          pie chart, and nutrition table.
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
          Evaluating nutrient density and macro ratios with NutriCheck.
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

  const proteinKcal = Math.round(result.nutrition.protein * 4);
  const fatKcal = Math.round(result.nutrition.fat * 9);
  const sugarKcal = Math.round(result.nutrition.sugars * 4);
  const otherKcal = Math.max(
    0,
    Math.round(result.nutrition.calories - (proteinKcal + fatKcal + sugarKcal))
  );

  const macroSlices = [
    {
      label: 'Protein',
      value: proteinKcal,
      color: '#16a34a',
      displayValue: `${result.nutrition.protein}g`,
    },
    {
      label: 'Total Fat',
      value: fatKcal,
      color: '#d97706',
      displayValue: `${result.nutrition.fat}g`,
    },
    {
      label: 'Sugars',
      value: sugarKcal,
      color: '#dc2626',
      displayValue: `${result.nutrition.sugars}g`,
    },
    {
      label: 'Other Carbs',
      value: otherKcal,
      color: '#64748b',
      displayValue: `${otherKcal} kcal`,
    },
  ];

  const rows = [
    {
      name: 'Calories',
      value: `${result.nutrition.calories} kcal`,
      share: 'Per 100g / serving',
      status: undefined,
    },
    {
      name: 'Sugars',
      value: `${result.nutrition.sugars} g`,
      share: `${result.nutrition.sugar_kcal_pct}% of kcal`,
      status: flagMap.get('Sugar')?.status,
    },
    {
      name: 'Total Fat',
      value: `${result.nutrition.fat} g`,
      share: `${result.nutrition.fat_kcal_pct}% of kcal`,
      status: flagMap.get('Total Fat')?.status,
    },
    {
      name: 'Protein',
      value: `${result.nutrition.protein} g`,
      share: `${result.nutrition.protein_kcal_pct}% of kcal`,
      status: flagMap.get('Protein')?.status,
    },
    {
      name: 'Sodium',
      value: `${Math.round(result.nutrition.sodium_mg)} mg`,
      share: `${Math.round(result.nutrition.sodium_per_100kcal)} mg / 100 kcal`,
      status: flagMap.get('Sodium')?.status,
    },
  ];

  const hasIngredientData = Boolean(
    ingredientScan &&
      (ingredientScan.ingredient_findings.length > 0 ||
        ingredientScan.parsed_ingredients.length > 0)
  );
  const ingGood = ingredientScan
    ? ingredientScan.ingredient_findings.filter((f) => f.rating === 'good').length
    : 0;
  const ingMod = ingredientScan
    ? ingredientScan.ingredient_findings.filter((f) => f.rating === 'moderate').length
    : 0;
  const ingBad = ingredientScan
    ? ingredientScan.ingredient_findings.filter((f) => f.rating === 'high').length
    : 0;
  const unflaggedNatural =
    ingredientScan && ingGood === 0 && ingMod === 0 && ingBad === 0
      ? ingredientScan.parsed_ingredients.length
      : 0;
  const ingTotal = ingGood + ingMod + ingBad + unflaggedNatural;

  const ingredientPieSlices = [
    {
      label: 'Good Ingredients',
      value: ingGood + unflaggedNatural,
      color: '#16a34a',
      displayValue: `${ingGood + unflaggedNatural} items`,
    },
    {
      label: 'Caution / Refined',
      value: ingMod,
      color: '#d97706',
      displayValue: `${ingMod} items`,
    },
    {
      label: 'Bad / High Concern',
      value: ingBad,
      color: '#dc2626',
      displayValue: `${ingBad} items`,
    },
  ];

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
          <span>{verdictText}</span>
        </div>
      </div>

      <div className="score-visual-grid">
        <div className="gauge-panel">
          <NutritionGauge
            score={result.health_score}
            label={verdictText}
            tone={gaugeTone}
            title="Nutrition score"
          />
        </div>

        <BreakdownPieChart
          title="Calorie & Macro Breakdown"
          subtitle="Share of calories from Protein, Fat, Sugars & Other Carbs"
          slices={macroSlices}
          centerValue={`${Math.round(result.nutrition.calories)}`}
          centerLabel="kcal"
          emptyMessage="Zero-calorie beverage or item."
        />
      </div>

      <div className="table-section">
        <div className="table-section-title">Nutrition Facts Table</div>
        <div className="data-table-wrap">
          <table className="data-table nutrition-table">
            <thead>
              <tr>
                <th>Nutrient</th>
                <th className="num">Quantity</th>
                <th className="num">Energy / Ratio</th>
                <th>Evaluation</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.name}>
                  <td>
                    <strong>{row.name}</strong>
                  </td>
                  <td className="num">{row.value}</td>
                  <td className="num">{row.share}</td>
                  <td>
                    <span
                      className={`eval-pill ${
                        row.status ? `is-${row.status}` : 'is-neutral'
                      }`}
                    >
                      {statusPillLabel(row.status)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {hasIngredientData && ingredientScan && (
        <div className="table-section" style={{ borderTop: '1px solid var(--border-subtle)', marginTop: 14 }}>
          <div className="table-section-title">
            Amazon Page Ingredients Analysis ({ingredientScan.verdict} · {ingredientScan.score}/100)
          </div>
          <div style={{ marginBottom: 14 }}>
            <BreakdownPieChart
              title="Good vs. Bad Ingredients"
              subtitle="Distribution of scanned ingredients from the Amazon product page"
              slices={ingredientPieSlices}
              centerValue={`${ingTotal}`}
              centerLabel="flagged"
              emptyMessage="No flagged additives detected in the ingredient list."
            />
          </div>

          {ingredientScan.ingredient_findings.length > 0 && (
            <div className="data-table-wrap">
              <table className="data-table nutrition-table">
                <thead>
                  <tr>
                    <th>Ingredient</th>
                    <th>Classification</th>
                    <th>Assessment</th>
                  </tr>
                </thead>
                <tbody>
                  {ingredientScan.ingredient_findings.map((finding) => (
                    <tr key={finding.ingredient}>
                      <td>
                        <strong>{finding.ingredient}</strong>
                      </td>
                      <td>
                        <span className={`eval-pill is-${finding.rating}`}>
                          {finding.rating === 'good'
                            ? 'Good'
                            : finding.rating === 'moderate'
                            ? 'Caution'
                            : 'Bad'}
                        </span>
                      </td>
                      <td className="table-note-cell">{finding.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {ingredientScan.parsed_ingredients.length > 0 && (
            <p className="card-subtitle" style={{ marginTop: 10 }}>
              <strong>Scanned Ingredients:</strong>{' '}
              {ingredientScan.parsed_ingredients.slice(0, 16).join(', ')}
              {ingredientScan.parsed_ingredients.length > 16
                ? ` (+${ingredientScan.parsed_ingredients.length - 16} more)`
                : ''}
            </p>
          )}
        </div>
      )}

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
