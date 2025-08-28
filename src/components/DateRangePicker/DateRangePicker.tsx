// src/components/DateRangePicker/DateRangePicker.tsx
import { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import { addDays, addYears } from 'date-fns';
import "react-datepicker/dist/react-datepicker.css";
import './DateRangePicker.css';

interface DateRangePickerProps {
  onDateRangeChange: (startDate: Date | null, endDate: Date | null) => void;
  initialStartDate?: Date;
  initialEndDate?: Date;
  disabled?: boolean;
  className?: string;
}

interface DateRangeState {
  startDate: Date | null;
  endDate: Date | null;
  activePreset: string | null;
  validationErrors: string[];
}

const PRESET_OPTIONS = [
  { label: 'Next 7 days', key: '7d', days: 7 },
  { label: 'Next 30 days', key: '30d', days: 30 },
  { label: 'Next 90 days', key: '90d', days: 90 },
  { label: 'Next 1 year', key: '1y', days: 365 }
];

export default function DateRangePicker({
  onDateRangeChange,
  initialStartDate,
  initialEndDate,
  disabled = false,
  className = ''
}: DateRangePickerProps) {
  const [state, setState] = useState<DateRangeState>({
    startDate: initialStartDate || null,
    endDate: initialEndDate || null,
    activePreset: null,
    validationErrors: []
  });

  // Validation function
  const validateDateRange = (start: Date | null, end: Date | null): string[] => {
    const errors: string[] = [];
    if (start && end && start > end) {
      errors.push('End date must be after start date');
    }
    if (start && end) {
      const daysDiff = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
      if (daysDiff > 730) { // 2 years maximum
        errors.push('Date range cannot exceed 2 years');
      }
    }
    return errors;
  };

  // Handle date selection
  const handleStartDateChange = (date: Date | null) => {
    const errors = validateDateRange(date, state.endDate);
    setState(prev => ({
      ...prev,
      startDate: date,
      activePreset: null,
      validationErrors: errors
    }));
    
    if (errors.length === 0) {
      onDateRangeChange(date, state.endDate);
    }
  };

  const handleEndDateChange = (date: Date | null) => {
    const errors = validateDateRange(state.startDate, date);
    setState(prev => ({
      ...prev,
      endDate: date,
      activePreset: null,
      validationErrors: errors
    }));
    
    if (errors.length === 0) {
      onDateRangeChange(state.startDate, date);
    }
  };

  // Handle preset selection
  const handlePresetClick = (preset: typeof PRESET_OPTIONS[0]) => {
    const today = new Date();
    const startDate = today;
    const endDate = addDays(today, preset.days);
    
    setState(prev => ({
      ...prev,
      startDate,
      endDate,
      activePreset: preset.key,
      validationErrors: []
    }));
    
    onDateRangeChange(startDate, endDate);
  };

  // Clear date range
  const handleClear = () => {
    setState(prev => ({
      ...prev,
      startDate: null,
      endDate: null,
      activePreset: null,
      validationErrors: []
    }));
    
    onDateRangeChange(null, null);
  };

  // Session persistence
  useEffect(() => {
    const savedRange = sessionStorage.getItem('dateRange');
    if (savedRange) {
      try {
        const { startDate, endDate } = JSON.parse(savedRange);
        if (startDate) setState(prev => ({ ...prev, startDate: new Date(startDate) }));
        if (endDate) setState(prev => ({ ...prev, endDate: new Date(endDate) }));
      } catch (error) {
        console.warn('Failed to restore date range from session storage');
      }
    }
  }, []);

  useEffect(() => {
    if (state.startDate || state.endDate) {
      sessionStorage.setItem('dateRange', JSON.stringify({
        startDate: state.startDate?.toISOString(),
        endDate: state.endDate?.toISOString()
      }));
    }
  }, [state.startDate, state.endDate]);

  return (
    <div className={`date-range-picker ${className}`}>
      <div className="date-range-picker__header">
        <h3 className="date-range-picker__title">Select Date Range</h3>
        <button 
          type="button"
          className="date-range-picker__clear"
          onClick={handleClear}
          disabled={disabled || (!state.startDate && !state.endDate)}
        >
          Clear
        </button>
      </div>

      {/* Preset buttons */}
      <div className="date-range-picker__presets">
        {PRESET_OPTIONS.map((preset) => (
          <button
            key={preset.key}
            type="button"
            className={`date-range-picker__preset ${
              state.activePreset === preset.key ? 'date-range-picker__preset--active' : ''
            }`}
            onClick={() => handlePresetClick(preset)}
            disabled={disabled}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Date pickers */}
      <div className="date-range-picker__inputs">
        <div className="date-range-picker__input-group">
          <label htmlFor="start-date" className="date-range-picker__label">
            Start Date
          </label>
          <DatePicker
            id="start-date"
            selected={state.startDate}
            onChange={handleStartDateChange}
            selectsStart
            startDate={state.startDate}
            endDate={state.endDate}
            maxDate={state.endDate || addYears(new Date(), 2)}
            disabled={disabled}
            className="date-range-picker__input"
            placeholderText="Select start date"
            dateFormat="MMM dd, yyyy"
            showPopperArrow={false}
          />
        </div>

        <div className="date-range-picker__input-group">
          <label htmlFor="end-date" className="date-range-picker__label">
            End Date
          </label>
          <DatePicker
            id="end-date"
            selected={state.endDate}
            onChange={handleEndDateChange}
            selectsEnd
            startDate={state.startDate}
            endDate={state.endDate}
            minDate={state.startDate || new Date()}
            maxDate={addYears(new Date(), 2)}
            disabled={disabled}
            className="date-range-picker__input"
            placeholderText="Select end date"
            dateFormat="MMM dd, yyyy"
            showPopperArrow={false}
          />
        </div>
      </div>

      {/* Validation errors */}
      {state.validationErrors.length > 0 && (
        <div className="date-range-picker__errors">
          {state.validationErrors.map((error, index) => (
            <div key={index} className="date-range-picker__error">
              {error}
            </div>
          ))}
        </div>
      )}

      {/* Selected range display */}
      {state.startDate && state.endDate && state.validationErrors.length === 0 && (
        <div className="date-range-picker__display">
          <span className="date-range-picker__range-text">
            Selected: {state.startDate.toLocaleDateString()} - {state.endDate.toLocaleDateString()}
          </span>
        </div>
      )}
    </div>
  );
}