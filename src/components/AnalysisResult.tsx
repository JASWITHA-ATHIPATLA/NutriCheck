import { useEffect, useState } from 'react';
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
  if (status === 'moderate') return 'Caution';
  if (status === 'high') return 'High';
  return 'Measured';
}

export function AnalysisResult({
  result,
  ingredientScan,
  isAnalyzing,
  onAddToCart,
  onQuickPreset,
}: AnalysisResultProps) {
  const hasIngredientData = Boolean(
    ingredientScan &&
      (ingredientScan.ingredient_findings.length > 0 ||
        ingredientScan.parsed_ingredients.length > 0)
  );
  const [chartTab, setChartTab] = useState<'ingredients' | 'macros'>(
    hasIngredientData ? 'ingredients' : 'macros'
  );

  useEffect(() => {
    setChartTab(hasIngredientData ? 'ingredients' : 'macros');
  }, [hasIngredientData, result?.food_name]);

  if (!result && !isAnalyzing) {
    return (
      <section className="card empty-state" aria-label="Health analysis output">
        <div className="empty-icon" aria-hidden="true">
          <ScanLine size={22} />
        </div>
        <h2 className="empty-title">Ready to Analyze Nutrition</h2>
        <p className="empty-desc">
          Pick any food above, enter nutrition numbers on the left, or load a
          sample below to see its Good / Not Good verdict, calorie pie chart, and
          easy-to-read table.
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
      label: 'Bad / Additives',
      value: ingBad,
      color: '#dc2626',
      displayValue: `${ingBad} items`,
    },
  ];

  const showingIngredientsChart = hasIngredientData && chartTab === 'ingredients';

  return (
    <section className="card" aria-labelledby="analysis-result-heading">
      <div className="result-hero">
        <div>
          <h2 id="analysis-result-heading" className="result-food-name">
            {result.food_name}
          </h2>
          <p className="result-meta-line">
            {result.model_used} · Confidence{' '}
            <span className="tabular">{result.confidence}%</span>
          </p>
        </div>

        <div className={`status-badge ${statusCls}`}>
          <StatusIcon label={result.classification} />
          <span>{verdictText}</span>
        </div>
      </div>

      {/* Plain-English 1-sentence takeaway right up top so the answer is immediate */}
      <div className="explanation-box" style={{ marginBottom: 4 }}>
        <div className="explanation-heading">Plain-English Takeaway</div>
        <p className="explanation-text">{result.explanation}</p>
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

        <div>
          {hasIngredientData && (
            <div className="pie-card-header-row" style={{ marginBottom: 8 }}>
              <span className="table-section-title" style={{ marginBottom: 0 }}>
                Visual Breakdown
              </span>
              <div className="chart-switch-tabs" role="tablist" aria-label="Pie chart view">
                <button
                  type="button"
                  role="tab"
                  aria-selected={chartTab === 'ingredients'}
                  className={`chart-switch-tab ${
                    chartTab === 'ingredients' ? 'is-active' : ''
                  }`}
                  onClick={() => setChartTab('ingredients')}
                >
                  Good vs. Bad Ingredients
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={chartTab === 'macros'}
                  className={`chart-switch-tab ${chartTab === 'macros' ? 'is-active' : ''}`}
                  onClick={() => setChartTab('macros')}
                >
                  Calorie Breakdown
                </button>
              </div>
            </div>
          )}

          {showingIngredientsChart ? (
            <BreakdownPieChart
              title="Good vs. Bad Ingredients"
              subtitle="Share of whole-food vs refined & additive ingredients"
              slices={ingredientPieSlices}
              centerValue={`${ingTotal}`}
              centerLabel="items"
              emptyMessage="No flagged additives detected in the ingredient list."
            />
          ) : (
            <BreakdownPieChart
              title="Calorie & Macro Breakdown"
              subtitle="Energy share from Protein, Fat, Sugars & Other Carbs"
              slices={macroSlices}
              centerValue={`${Math.round(result.nutrition.calories)}`}
              centerLabel="kcal"
              emptyMessage="Zero-calorie beverage or item."
            />
          )}
        </div>
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
                <th>Status</th>
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

      {hasIngredientData &&
        ingredientScan &&
        ingredientScan.ingredient_findings.length > 0 && (
          <div className="table-section">
            <div className="table-section-title">
              What&apos;s Good vs. What to Watch ({ingredientScan.verdict} ·{' '}
              <span className="tabular">{ingredientScan.score}</span>/100)
            </div>
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
                  {[...ingredientScan.ingredient_findings]
                    .sort((a, b) => {
                      const ord =
                        ingredientScan.verdict === 'Good'
                          ? { good: 0, moderate: 1, high: 2 }
                          : { high: 0, moderate: 1, good: 2 };
                      return ord[a.rating] - ord[b.rating];
                    })
                    .map((finding) => (
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
          </div>
        )}

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
          Logs this item into your NutriCheck cart summary.
        </span>
      </div>
    </section>
  );
}
