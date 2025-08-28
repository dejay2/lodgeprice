import React, { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { PricePreview } from '../../hooks/usePricingPreview';
import './PricingPreview.css';

interface PricingPreviewProps {
  previewData: PricePreview | null;
  loading: boolean;
  error: string | null;
  onDateChange: (date: Date) => void;
  onNightsChange: (nights: number) => void;
  initialDate?: Date;
  initialNights?: number;
}

const PricingPreview: React.FC<PricingPreviewProps> = ({
  previewData,
  loading,
  error,
  onDateChange,
  onNightsChange,
  initialDate = new Date(),
  initialNights = 3
}) => {
  const [checkDate, setCheckDate] = useState(initialDate);
  const [nights, setNights] = useState(initialNights);

  useEffect(() => {
    onDateChange(checkDate);
  }, [checkDate]);

  useEffect(() => {
    onNightsChange(nights);
  }, [nights]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  return (
    <div className="pricing-preview">
      <div className="preview-header">
        <h3>Pricing Preview</h3>
        <div className="preview-controls">
          <div className="preview-control">
            <label>Check-in Date</label>
            <DatePicker
              selected={checkDate}
              onChange={(date) => date && setCheckDate(date)}
              minDate={new Date()}
              dateFormat="dd/MM/yyyy"
              className="preview-date-input"
            />
          </div>
          <div className="preview-control">
            <label>Nights</label>
            <input
              type="number"
              min="1"
              max="30"
              value={nights}
              onChange={(e) => setNights(parseInt(e.target.value) || 1)}
              className="preview-nights-input"
            />
          </div>
        </div>
      </div>

      <div className="preview-content">
        {loading && (
          <div className="preview-loading">
            <div className="spinner"></div>
            <p>Calculating preview...</p>
          </div>
        )}

        {error && (
          <div className="preview-error">
            <p className="error-title">Preview Error</p>
            <p className="error-message">{error}</p>
          </div>
        )}

        {!loading && !error && previewData && (
          <>
            <div className="preview-timing">
              <div className="timing-badge">
                {previewData.daysBeforeCheckin} days before check-in
              </div>
              {previewData.applicableRule && (
                <div className="rule-badge">
                  Rule: {formatPercentage(previewData.applicableRule.discount_percentage)} discount
                </div>
              )}
            </div>

            <div className="preview-calculation">
              <div className="calc-row">
                <span className="calc-label">Base Price:</span>
                <span className="calc-value">{formatCurrency(previewData.originalPrice)}/night</span>
              </div>
              
              {previewData.seasonalAdjustment !== 0 && (
                <div className="calc-row">
                  <span className="calc-label">Seasonal Adjustment:</span>
                  <span className={`calc-value ${previewData.seasonalAdjustment > 0 ? 'positive' : 'negative'}`}>
                    {previewData.seasonalAdjustment > 0 ? '+' : ''}{formatCurrency(previewData.seasonalAdjustment)}
                  </span>
                </div>
              )}
              
              {previewData.discountAmount > 0 && (
                <div className="calc-row discount-row">
                  <span className="calc-label">Last-Minute Discount:</span>
                  <span className="calc-value discount">
                    -{formatCurrency(previewData.discountAmount)} ({formatPercentage(previewData.discountPercentage)})
                  </span>
                </div>
              )}
              
              {previewData.minPriceEnforced && (
                <div className="calc-row warning-row">
                  <span className="calc-label">⚠️ Minimum Price Applied</span>
                </div>
              )}
              
              <div className="calc-divider"></div>
              
              <div className="calc-row total-row">
                <span className="calc-label">Final Price per Night:</span>
                <span className="calc-value total">{formatCurrency(previewData.finalPrice)}</span>
              </div>
              
              <div className="calc-row total-row">
                <span className="calc-label">Total for {nights} night{nights !== 1 ? 's' : ''}:</span>
                <span className="calc-value total">{formatCurrency(previewData.totalPrice)}</span>
              </div>
            </div>

            {previewData.discountAmount > 0 && (
              <div className="preview-savings">
                <div className="savings-icon">💰</div>
                <div className="savings-text">
                  Guest saves {formatCurrency(previewData.discountAmount * nights)} 
                  {' '}({formatPercentage(previewData.discountPercentage)} off)
                </div>
              </div>
            )}
          </>
        )}

        {!loading && !error && !previewData && (
          <div className="preview-empty">
            <p>Configure your discount strategy to see a pricing preview</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PricingPreview;