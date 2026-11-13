import { AlertTriangle, CheckCircle2, ShieldAlert, Trash2 } from 'lucide-react';
import type { CartAlert, CartItem } from '../types';

interface CartPanelProps {
  activeAlert: (CartAlert & { itemId?: string }) | null;
  cartItems: CartItem[];
  onDismissAlert: () => void;
  onRemoveItem: (id: string) => void;
  onClearCart: () => void;
}

function AlertIcon({ level }: { level: CartAlert['level'] }) {
  if (level === 'success') return <CheckCircle2 size={20} />;
  if (level === 'warning') return <AlertTriangle size={20} />;
  return <ShieldAlert size={20} />;
}

export function CartPanel({
  activeAlert,
  cartItems,
  onDismissAlert,
  onRemoveItem,
  onClearCart,
}: CartPanelProps) {
  return (
    <div id="demo-cart-section" className="result-column">
      {activeAlert && (
        <div
          className={`cart-alert level-${activeAlert.level}`}
          role="alert"
          aria-live="assertive"
        >
          <div className="cart-alert-body">
            <AlertIcon level={activeAlert.level} />
            <div>
              <div className="cart-alert-title">{activeAlert.title}</div>
              <p className="cart-alert-msg">{activeAlert.message}</p>
            </div>
          </div>

          <div className="cart-alert-actions">
            {activeAlert.itemId && activeAlert.level !== 'success' && (
              <button
                type="button"
                className="alert-dismiss-btn"
                onClick={() => {
                  onRemoveItem(activeAlert.itemId!);
                  onDismissAlert();
                }}
              >
                Remove Item
              </button>
            )}
            <button
              type="button"
              className="alert-dismiss-btn"
              onClick={onDismissAlert}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <section className="card" aria-labelledby="demo-cart-heading">
        <div className="card-header">
          <div>
            <h3 id="demo-cart-heading" className="card-title">
              Demo Cart ({cartItems.length})
            </h3>
            <p className="card-subtitle">
              Items added during this session with instant health alert status.
            </p>
          </div>
          {cartItems.length > 0 && (
            <button
              type="button"
              className="cart-remove-btn"
              onClick={onClearCart}
            >
              Clear All
            </button>
          )}
        </div>

        {cartItems.length === 0 ? (
          <p className="card-subtitle">
            No items in cart yet. Analyze a food product and click &ldquo;Add to
            Cart (Demo)&rdquo; to trigger an instant health alert.
          </p>
        ) : (
          <div className="cart-list">
            {cartItems.map((item) => {
              const dotClass =
                item.classification === 'Healthy'
                  ? 'dot-healthy'
                  : item.classification === 'Moderate'
                  ? 'dot-moderate'
                  : 'dot-unhealthy';

              return (
                <div key={item.id} className="cart-row">
                  <div className="cart-row-left">
                    <span className={`dot ${dotClass}`} aria-hidden="true" />
                    <div style={{ minWidth: 0 }}>
                      <div className="cart-row-name">{item.food_name}</div>
                      <div className="cart-row-meta">
                        {item.classification} · Score{' '}
                        <span className="tabular">{item.health_score}</span> ·{' '}
                        <span className="tabular">{item.calories}</span> kcal ·{' '}
                        <span className="tabular">{item.sugars}g</span> sugar ·{' '}
                        <span className="tabular">{Math.round(item.sodium_mg)}mg</span>{' '}
                        sodium
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="cart-remove-btn"
                    onClick={() => onRemoveItem(item.id)}
                    aria-label={`Remove ${item.food_name}`}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
