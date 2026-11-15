import React, { useState } from 'react';
import { ArrowLeft, PlusCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { parseAllergiesInput } from '../utils/healthProfileEngine';

export function AddProductPage() {
  const { addCustomProduct } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState('Packaged Snack');
  const [servingSize, setServingSize] = useState('100 g');
  const [calories, setCalories] = useState('');
  const [sugarG, setSugarG] = useState('');
  const [sodiumMg, setSodiumMg] = useState('');
  const [satFatG, setSatFatG] = useState('');
  const [fatG, setFatG] = useState('');
  const [proteinG, setProteinG] = useState('');
  const [fiberG, setFiberG] = useState('');
  const [ingredients, setIngredients] = useState('');
  const [allergensInput, setAllergensInput] = useState('');
  const [storeUrl, setStoreUrl] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const created = addCustomProduct({
      name: name.trim() || 'Custom Packaged Food',
      brand: brand.trim() || 'Custom Brand',
      category: category.trim() || 'Packaged Food',
      servingSize: servingSize.trim() || '100 g',
      calories: Math.max(0, Number(calories) || 0),
      sugar_g: Math.max(0, Number(sugarG) || 0),
      sodium_mg: Math.max(0, Number(sodiumMg) || 0),
      saturated_fat_g: Math.max(0, Number(satFatG) || 0),
      fat_g: Math.max(0, Number(fatG) || Number(satFatG) || 0),
      protein_g: Math.max(0, Number(proteinG) || 0),
      fiber_g: Math.max(0, Number(fiberG) || 0),
      ingredients: ingredients.trim() || 'Not specified',
      allergens: parseAllergiesInput(allergensInput),
      storeUrl: storeUrl.trim() || undefined,
    });
    navigate(`/dashboard/${created.id}`);
  }

  return (
    <div className="page-shell auth-shell">
      <div style={{ marginBottom: '14px' }}>
        <Link to="/dashboard" className="text-action-link">
          <ArrowLeft size={15} />
          <span>Back to products</span>
        </Link>
      </div>

      <div className="card auth-card">
        <div className="auth-header">
          <h1 className="page-title" style={{ fontSize: '24px' }}>
            Add product to catalogue
          </h1>
          <p className="page-subtitle">
            Enter the nutrition panel (per 100 g) and ingredients to screen it
            immediately against your saved health profile.
          </p>
        </div>

        <form className="form-stack" onSubmit={handleSubmit}>
          <div className="field-grid">
            <div className="field">
              <label htmlFor="add-prod-name" className="field-label">
                Product name
              </label>
              <input
                id="add-prod-name"
                type="text"
                className="field-input"
                placeholder="e.g., Almond Granola Bar"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="add-prod-brand" className="field-label">
                Brand
              </label>
              <input
                id="add-prod-brand"
                type="text"
                className="field-input"
                placeholder="e.g., Nature Kitchen"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
              />
            </div>

            <div className="field">
              <label htmlFor="add-prod-cat" className="field-label">
                Category
              </label>
              <input
                id="add-prod-cat"
                type="text"
                className="field-input"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />
            </div>

            <div className="field">
              <label htmlFor="add-prod-serving" className="field-label">
                Serving basis
              </label>
              <input
                id="add-prod-serving"
                type="text"
                className="field-input"
                value={servingSize}
                onChange={(e) => setServingSize(e.target.value)}
              />
            </div>

            <div className="field">
              <label htmlFor="add-prod-cal" className="field-label">
                Calories (kcal)
              </label>
              <input
                id="add-prod-cal"
                type="number"
                step="any"
                min="0"
                className="field-input is-numeric"
                placeholder="220"
                value={calories}
                onChange={(e) => setCalories(e.target.value)}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="add-prod-sugar" className="field-label">
                Sugar (g)
              </label>
              <input
                id="add-prod-sugar"
                type="number"
                step="any"
                min="0"
                className="field-input is-numeric"
                placeholder="12"
                value={sugarG}
                onChange={(e) => setSugarG(e.target.value)}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="add-prod-sodium" className="field-label">
                Sodium (mg)
              </label>
              <input
                id="add-prod-sodium"
                type="number"
                step="any"
                min="0"
                className="field-input is-numeric"
                placeholder="180"
                value={sodiumMg}
                onChange={(e) => setSodiumMg(e.target.value)}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="add-prod-satfat" className="field-label">
                Saturated fat (g)
              </label>
              <input
                id="add-prod-satfat"
                type="number"
                step="any"
                min="0"
                className="field-input is-numeric"
                placeholder="3.5"
                value={satFatG}
                onChange={(e) => setSatFatG(e.target.value)}
              />
            </div>

            <div className="field">
              <label htmlFor="add-prod-fat" className="field-label">
                Total fat (g)
              </label>
              <input
                id="add-prod-fat"
                type="number"
                step="any"
                min="0"
                className="field-input is-numeric"
                placeholder="9.0"
                value={fatG}
                onChange={(e) => setFatG(e.target.value)}
              />
            </div>

            <div className="field">
              <label htmlFor="add-prod-protein" className="field-label">
                Protein (g)
              </label>
              <input
                id="add-prod-protein"
                type="number"
                step="any"
                min="0"
                className="field-input is-numeric"
                placeholder="6.0"
                value={proteinG}
                onChange={(e) => setProteinG(e.target.value)}
              />
            </div>

            <div className="field">
              <label htmlFor="add-prod-fiber" className="field-label">
                Fiber (g)
              </label>
              <input
                id="add-prod-fiber"
                type="number"
                step="any"
                min="0"
                className="field-input is-numeric"
                placeholder="4.0"
                value={fiberG}
                onChange={(e) => setFiberG(e.target.value)}
              />
            </div>

            <div className="field">
              <label htmlFor="add-prod-allergens" className="field-label">
                Allergens (comma-separated)
              </label>
              <input
                id="add-prod-allergens"
                type="text"
                className="field-input"
                placeholder="e.g., Milk, Almonds, Soy"
                value={allergensInput}
                onChange={(e) => setAllergensInput(e.target.value)}
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="add-prod-ingredients" className="field-label">
              Ingredients list
            </label>
            <textarea
              id="add-prod-ingredients"
              className="field-input field-textarea"
              placeholder="Paste comma-separated packet ingredients..."
              value={ingredients}
              onChange={(e) => setIngredients(e.target.value)}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="add-prod-url" className="field-label">
              Store product link (optional)
            </label>
            <input
              id="add-prod-url"
              type="url"
              className="field-input"
              placeholder="https://www.bigbasket.com/... or https://www.amazon.in/..."
              value={storeUrl}
              onChange={(e) => setStoreUrl(e.target.value)}
            />
          </div>

          <button type="submit" className="btn-primary auth-submit-btn">
            <PlusCircle size={16} />
            <span>Save &amp; View Health Check</span>
          </button>
        </form>
      </div>
    </div>
  );
}
