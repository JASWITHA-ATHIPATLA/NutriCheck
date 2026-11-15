import type { EvaluationReport } from '../types';

interface ModelMetricsViewProps {
  report: EvaluationReport | null;
  error: string | null;
}

const EDA_LABELS: Record<string, string> = {
  calories_kcal: 'Calories (kcal)',
  sugars_g: 'Sugars (g)',
  fat_g: 'Total Fat (g)',
  saturated_fat_g: 'Saturated Fat (g)',
  protein_g: 'Protein (g)',
  dietary_fiber_g: 'Dietary Fiber (g)',
  sodium_mg: 'Sodium (mg)',
};

export function ModelMetricsView({ report, error }: ModelMetricsViewProps) {
  if (error) {
    return (
      <div className="error-banner" role="alert">
        <span>{error}</span>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="card empty-state">
        <h2 className="empty-title">Loading Dataset &amp; Model Report...</h2>
      </div>
    );
  }

  const bestEntry = report.model_comparison.find(
    (m) => m.model === report.best_model
  );

  return (
    <div className="metrics-stack">
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">Raw Dataset Rows (5 CSVs)</div>
          <div className="kpi-value">
            {report.cleaning_summary.raw_rows.toLocaleString()}
          </div>
          <div className="kpi-note">
            FOOD-DATA-GROUP1 through GROUP5
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">Cleaned Valid Rows</div>
          <div className="kpi-value">
            {report.cleaning_summary.cleaned_rows.toLocaleString()}
          </div>
          <div className="kpi-note">
            {report.cleaning_summary.anomalies_removed.total_invalid_rows_removed}{' '}
            anomalous/zero rows removed
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">Selected Best Model</div>
          <div className="kpi-value" style={{ fontSize: '20px' }}>
            {report.best_model}
          </div>
          <div className="kpi-note">
            Saved via Joblib · Split {report.train_test_split.train_size}/
            {report.train_test_split.test_size}
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">Best Test Accuracy / F1</div>
          <div className="kpi-value">
            {bestEntry ? `${(bestEntry.accuracy * 100).toFixed(2)}%` : '—'}
          </div>
          <div className="kpi-note">
            Weighted F1:{' '}
            <span className="tabular">
              {bestEntry ? (bestEntry.f1_score * 100).toFixed(2) : '—'}%
            </span>
          </div>
        </div>
      </div>

      <section className="card" aria-labelledby="model-comp-heading">
        <div className="card-header">
          <div>
            <h2 id="model-comp-heading" className="card-title">
              Model Evaluation Comparison (Hold-Out Test Set, n=
              {report.train_test_split.test_size})
            </h2>
            <p className="card-subtitle">
              Actual metrics recorded from Scikit-learn evaluation on cleaned
              nutrition data.
            </p>
          </div>
        </div>

        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Model</th>
                <th className="num">Accuracy</th>
                <th className="num">Precision</th>
                <th className="num">Recall</th>
                <th className="num">F1-Score</th>
              </tr>
            </thead>
            <tbody>
              {report.model_comparison.map((row) => {
                const isBest = row.model === report.best_model;
                return (
                  <tr key={row.model} className={isBest ? 'is-best-row' : ''}>
                    <td>
                      <strong>{row.model}</strong>
                      {isBest && <span className="best-tag">Selected Best</span>}
                    </td>
                    <td className="num">{(row.accuracy * 100).toFixed(2)}%</td>
                    <td className="num">{(row.precision * 100).toFixed(2)}%</td>
                    <td className="num">{(row.recall * 100).toFixed(2)}%</td>
                    <td className="num">{(row.f1_score * 100).toFixed(2)}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <div className="two-col-grid">
        {bestEntry && (
          <section className="card" aria-labelledby="cm-heading">
            <h2 id="cm-heading" className="card-title">
              {report.best_model} Confusion Matrix
            </h2>
            <p className="card-subtitle">
              Rows = Actual label, Columns = Predicted label (test set n=
              {report.train_test_split.test_size}).
            </p>
            <div className="data-table-wrap">
              <table className="cm-table">
                <thead>
                  <tr>
                    <th>Actual \ Predicted</th>
                    {report.class_labels.map((lbl) => (
                      <th key={lbl}>{lbl}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bestEntry.confusion_matrix.map((rowVals, rIdx) => (
                    <tr key={report.class_labels[rIdx]}>
                      <th>{report.class_labels[rIdx]}</th>
                      {rowVals.map((val, cIdx) => (
                        <td
                          key={cIdx}
                          className={`tabular ${rIdx === cIdx ? 'cm-diag' : ''}`}
                        >
                          {val}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <section className="card" aria-labelledby="labeling-heading">
          <h2 id="labeling-heading" className="card-title">
            Scientific Labeling &amp; Cleaning Summary
          </h2>
          <p className="card-subtitle">
            {report.labeling_methodology.framework}
          </p>
          <ul className="rule-list">
            <li>
              <strong>Unit standardization:</strong>{' '}
              {report.cleaning_summary.unit_standardization}
            </li>
            <li>
              <strong>Class distribution:</strong> Healthy (
              <span className="tabular">
                {report.labeling_methodology.class_distribution.Healthy}
              </span>
              ) · Moderate (
              <span className="tabular">
                {report.labeling_methodology.class_distribution.Moderate}
              </span>
              ) · Unhealthy (
              <span className="tabular">
                {report.labeling_methodology.class_distribution.Unhealthy}
              </span>
              )
            </li>
            {report.labeling_methodology.rules.slice(0, 4).map((rule, idx) => (
              <li key={idx}>{rule}</li>
            ))}
          </ul>
        </section>
      </div>

      <section className="card" aria-labelledby="eda-heading">
        <div className="card-header">
          <div>
            <h2 id="eda-heading" className="card-title">
              Cleaned Dataset Exploratory Statistics (n=
              {report.cleaning_summary.cleaned_rows})
            </h2>
            <p className="card-subtitle">
              Observed summary distributions after deduplication and anomaly
              filtering.
            </p>
          </div>
        </div>

        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nutrient</th>
                <th className="num">Mean</th>
                <th className="num">Median</th>
                <th className="num">Std Dev</th>
                <th className="num">Min</th>
                <th className="num">Max</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(report.eda_summary).map(([key, stats]) => (
                <tr key={key}>
                  <td>{EDA_LABELS[key] || key}</td>
                  <td className="num">{stats.mean}</td>
                  <td className="num">{stats.median}</td>
                  <td className="num">{stats.std}</td>
                  <td className="num">{stats.min}</td>
                  <td className="num">{stats.max}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
