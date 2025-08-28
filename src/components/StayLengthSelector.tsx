/**
 * StayLengthSelector Component
 * Provides toggle interface for different stay lengths (1-7+ days)
 * With real-time price recalculation as per PRP-10 requirements
 */

import React from 'react'
import type { StayLengthSelectorProps } from '@/types/pricing-calendar.types'

const StayLengthSelector: React.FC<StayLengthSelectorProps> = ({
  selectedLength,
  onLengthChange,
  availableLengths = [1, 2, 3, 4, 5, 6, 7, 14, 21, 30],
  className = ''
}) => {
  // Standard stay lengths with labels
  const stayLengthOptions = [
    { nights: 1, label: '1 night' },
    { nights: 2, label: '2 nights' },
    { nights: 3, label: '3 nights' },
    { nights: 4, label: '4 nights' },
    { nights: 5, label: '5 nights' },
    { nights: 6, label: '6 nights' },
    { nights: 7, label: '1 week' },
    { nights: 14, label: '2 weeks' },
    { nights: 21, label: '3 weeks' },
    { nights: 30, label: '1 month' }
  ]

  // Filter options based on available lengths
  const filteredOptions = stayLengthOptions.filter(option => 
    availableLengths.includes(option.nights)
  )

  return (
    <div className={`stay-length-selector ${className}`}>
      <label className="form-label fw-semibold mb-2">
        Stay Length
      </label>
      
      {/* Button group for common stay lengths */}
      <div className="btn-group d-flex flex-wrap gap-1" role="group" aria-label="Stay length selector">
        {filteredOptions.slice(0, 7).map(({ nights, label }) => (
          <button
            key={nights}
            type="button"
            className={`btn ${
              selectedLength === nights 
                ? 'btn-primary' 
                : 'btn-outline-primary'
            } btn-sm`}
            data-testid={`stay-length-${nights}`}
            onClick={() => onLengthChange(nights)}
            aria-pressed={selectedLength === nights}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Dropdown for longer stay options if available */}
      {availableLengths.some(length => length > 7) && (
        <div className="mt-2">
          <select
            className="form-select form-select-sm"
            value={selectedLength > 7 ? selectedLength : ''}
            onChange={(e) => {
              const value = parseInt(e.target.value)
              if (value && !isNaN(value)) {
                onLengthChange(value)
              }
            }}
          >
            <option value="">Extended stays...</option>
            {filteredOptions.filter(option => option.nights > 7).map(({ nights, label }) => (
              <option key={nights} value={nights}>
                {label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Display current selection */}
      <div className="mt-2 small text-muted">
        Currently showing prices for {selectedLength} night{selectedLength !== 1 ? 's' : ''} stay
      </div>
    </div>
  )
}

export default React.memo(StayLengthSelector)