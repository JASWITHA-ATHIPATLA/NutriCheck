import { useState } from 'react';
import {
  AlertTriangle,
  ThumbsUp,
} from 'lucide-react';
import { Navigate, useNavigate } from 'react-router-dom';
import { NutritionGauge } from '../components/NutritionGauge';
import { useAuth } from '../context/AuthContext';

interface PreviewPacket {
  id: 'oats' | 'cookies' | 'soda';
  label: string;
  product: string;
  score: number;
  verdict: 'Low Risk' | 'Moderate' | 'High Risk';
  tone: 'good' | 'moderate' | 'bad';
  reasons: { type: 'good' | 'warning'; text: string }[];
}

const PREVIEW_PACKETS: PreviewPacket[] = [
  {
    id: 'oats',
    label: 'Plain Oats',
    product: 'Wholegrain Rolled Oats',
    score: 88,
    verdict: 'Low Risk',
    tone: 'good',
    reasons: [
      {
        type: 'good',
        text: 'Low sugar (1.0g) and high fiber (10.1g) supportive for glucose control.',
      },
      {
        type: 'good',
        text: 'Minimal sodium (2mg) within blood-pressure and kidney targets.',
      },
    ],
  },
  {
    id: 'cookies',
    label: 'Wheat Biscuits',
    product: 'Whole Wheat Biscuits',
    score: 52,
    verdict: 'Moderate',
    tone: 'moderate',
    reasons: [
      {
        type: 'warning',
        text: 'Contains 18.0g sugar & invert syrup — portion size matters.',
      },
      {
        type: 'warning',
        text: 'Contains milk solids and wheat allergens.',
      },
    ],
  },
  {
    id: 'soda',
    label: 'Cola Drink',
    product: 'Carbonated Cola Soft Drink',
    score: 26,
    verdict: 'High Risk',
    tone: 'bad',
    reasons: [
      {
        type: 'warning',
        text: 'High sugar content may make blood-glucose management harder.',
      },
      {
        type: 'warning',
        text: 'Low fiber & protein with empty liquid calories.',
      },
    ],
  },
];

export function HomePage() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [previewId, setPreviewId] = useState<'oats' | 'cookies' | 'soda'>('oats');

  if (currentUser) {
    return <Navigate to="/dashboard" replace />;
  }

  const activePreview =
    PREVIEW_PACKETS.find((p) => p.id === previewId) || PREVIEW_PACKETS[0];

  return (
    <div className="home-page">
      {/* Clean Hero matching video flow: Create account + Sign in */}
      <section className="nc-hero" aria-label="NutriCheck Overview">
        <div className="nc-hero-inner">
          <div className="nc-hero-copy">
            <p className="nc-hero-kicker">PERSONALIZED FOOD CHECKER</p>
            <h1 className="nc-hero-title">
              Understand what&apos;s inside your food.
            </h1>
            <p className="nc-hero-desc">
              Check packaged food against your saved health profile and see a LOW,
              MODERATE or HIGH RISK screening result with clear reasons—plus camera
              packet scanning and live online store checks after you sign in.
            </p>

            <div className="nc-hero-actions">
              <button
                type="button"
                className="nc-btn-primary"
                onClick={() => navigate('/register')}
              >
                Create account
              </button>

              <button
                type="button"
                className="nc-btn-secondary-hero"
                onClick={() => navigate('/login')}
              >
                Sign in
              </button>
            </div>
          </div>

          <div className="nc-hero-showcase" aria-label="Sample Risk Screening Preview">
            <div className="showcase-tabs" role="tablist" aria-label="Sample products">
              {PREVIEW_PACKETS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={previewId === item.id}
                  className={`showcase-tab ${previewId === item.id ? 'is-active' : ''}`}
                  onClick={() => setPreviewId(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="showcase-card">
              <div className="showcase-product-name">{activePreview.product}</div>
              <NutritionGauge
                score={activePreview.score}
                label={activePreview.verdict}
                tone={activePreview.tone}
                title="Personalized risk score"
              />

              <div className="showcase-reasons">
                {activePreview.reasons.map((reason, idx) => (
                  <div key={idx} className="reason-row">
                    <span
                      className={`reason-icon ${
                        reason.type === 'good' ? 'is-good' : 'is-warning'
                      }`}
                      aria-hidden="true"
                    >
                      {reason.type === 'good' ? (
                        <ThumbsUp size={15} />
                      ) : (
                        <AlertTriangle size={15} />
                      )}
                    </span>
                    <span className="reason-text">{reason.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3-Column Feature Summary matching the video */}
      <section className="home-features-strip" aria-label="Key capabilities">
        <div className="section-container">
          <div className="home-pillars-grid">
            <div className="home-pillar-card">
              <div className="home-pillar-head">
                <h3>Personal profile</h3>
              </div>
              <p>
                Set age group, known health conditions (diabetes, hypertension, heart,
                kidney, obesity), and food allergies.
              </p>
            </div>

            <div className="home-pillar-card">
              <div className="home-pillar-head">
                <h3>Product &amp; packet checker</h3>
              </div>
              <p>
                Search the product catalogue, scan any packet back label, or check live
                items on Amazon, Flipkart, Swiggy &amp; BigBasket.
              </p>
            </div>

            <div className="home-pillar-card">
              <div className="home-pillar-head">
                <h3>Clear explanations &amp; swaps</h3>
              </div>
              <p>
                See which nutrition values triggered a caution and get safer food
                suggestions tailored to your health profile.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
