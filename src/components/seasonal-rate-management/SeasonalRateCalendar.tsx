/**
 * SeasonalRateCalendar - Visual calendar representation of seasonal periods
 * Shows seasonal rates as colored blocks with overlap detection
 */

import { useState, useMemo } from 'react'
import Calendar from 'react-calendar'
import { 
  format, 
  isWithinInterval
} from 'date-fns'
import type { SeasonalRate, CalendarPeriod } from './types/SeasonalRate'
import 'react-calendar/dist/Calendar.css'
import './SeasonalRateCalendar.css'

interface SeasonalRateCalendarProps {
  rates: SeasonalRate[]
  onDateSelect?: (date: Date) => void
  onRateSelect?: (rate: SeasonalRate) => void
}

// Color palette for seasonal rates
const COLOR_PALETTE = [
  '#e3f2fd', // Light Blue
  '#f3e5f5', // Light Purple
  '#e8f5e9', // Light Green
  '#fff3e0', // Light Orange
  '#fce4ec', // Light Pink
  '#e0f2f1', // Light Teal
  '#fff8e1', // Light Yellow
  '#f1f8e9', // Light Lime
]

export default function SeasonalRateCalendar({
  rates,
  onDateSelect,
  onRateSelect
}: SeasonalRateCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<'month' | 'year'>('month')
  const [hoveredRate, setHoveredRate] = useState<string | null>(null)

  // Convert rates to calendar periods with colors
  const calendarPeriods = useMemo((): CalendarPeriod[] => {
    return rates.map((rate, index) => ({
      id: rate.rate_id,
      name: rate.rate_name,
      startDate: new Date(rate.start_date),
      endDate: new Date(rate.end_date),
      rateAdjustment: rate.discount_rate,
      color: COLOR_PALETTE[index % COLOR_PALETTE.length],
      isOverlapping: rate.isOverlapping || false
    }))
  }, [rates])

  // Get periods for a specific date
  const getPeriodsForDate = (date: Date): CalendarPeriod[] => {
    return calendarPeriods.filter(period =>
      isWithinInterval(date, {
        start: period.startDate,
        end: period.endDate
      })
    )
  }

  // Tile content renderer for calendar
  const tileContent = ({ date, view }: { date: Date; view: string }) => {
    if (view !== 'month') return null

    const periods = getPeriodsForDate(date)
    if (periods.length === 0) return null

    return (
      <div className="calendar-tile-content">
        {periods.map((period) => (
          <div
            key={period.id}
            className={`period-indicator ${hoveredRate === period.id ? 'period-indicator--hovered' : ''}`}
            style={{
              backgroundColor: period.color,
              opacity: hoveredRate && hoveredRate !== period.id ? 0.3 : 1
            }}
            title={`${period.name} (${period.rateAdjustment > 0 ? '+' : ''}${(period.rateAdjustment * 100).toFixed(0)}%)`}
          />
        ))}
        {periods.length > 1 && (
          <span className="overlap-badge" title="Multiple periods on this date">
            {periods.length}
          </span>
        )}
      </div>
    )
  }

  // Tile class name for styling
  const tileClassName = ({ date, view }: { date: Date; view: string }) => {
    if (view !== 'month') return null

    const periods = getPeriodsForDate(date)
    const classes = []

    if (periods.length > 0) {
      classes.push('has-period')
    }
    
    if (periods.length > 1) {
      classes.push('has-overlap')
    }

    if (periods.some(p => p.id === hoveredRate)) {
      classes.push('period-highlighted')
    }

    return classes.join(' ')
  }

  // Legend component
  const renderLegend = () => (
    <div className="calendar-legend">
      <h4>Seasonal Rates</h4>
      <div className="legend-items">
        {calendarPeriods.map((period) => (
          <div
            key={period.id}
            className="legend-item"
            onMouseEnter={() => setHoveredRate(period.id)}
            onMouseLeave={() => setHoveredRate(null)}
            onClick={() => onRateSelect?.(rates.find(r => r.rate_id === period.id)!)}
          >
            <span
              className="legend-color"
              style={{ backgroundColor: period.color }}
            />
            <span className="legend-label">
              {period.name}
              <span className="legend-rate">
                {period.rateAdjustment > 0 ? '+' : ''}{(period.rateAdjustment * 100).toFixed(0)}%
              </span>
            </span>
            {period.isOverlapping && (
              <span className="overlap-warning" title="This period overlaps with another">
                ⚠️
              </span>
            )}
          </div>
        ))}
      </div>
      {calendarPeriods.length === 0 && (
        <p className="no-rates-message">No seasonal rates defined</p>
      )}
    </div>
  )

  return (
    <div className="seasonal-rate-calendar">
      <div className="calendar-header">
        <h3>Calendar View</h3>
        <div className="view-mode-selector">
          <button
            className={`view-mode-btn ${viewMode === 'month' ? 'active' : ''}`}
            onClick={() => setViewMode('month')}
          >
            Month
          </button>
          <button
            className={`view-mode-btn ${viewMode === 'year' ? 'active' : ''}`}
            onClick={() => setViewMode('year')}
          >
            Year
          </button>
        </div>
      </div>

      <div className="calendar-container">
        <div className="calendar-main">
          <Calendar
            value={currentDate}
            onChange={(value) => {
              if (value instanceof Date) {
                setCurrentDate(value)
                onDateSelect?.(value)
              }
            }}
            view={viewMode === 'year' ? 'year' : 'month'}
            tileContent={tileContent}
            tileClassName={tileClassName}
            navigationLabel={({ date, view }) => {
              if (view === 'month') {
                return format(date, 'MMMM yyyy')
              }
              return format(date, 'yyyy')
            }}
          />
        </div>

        <div className="calendar-sidebar">
          {renderLegend()}
          
          {hoveredRate && (
            <div className="rate-details">
              <h4>Rate Details</h4>
              {(() => {
                const rate = rates.find(r => r.rate_id === hoveredRate)
                if (!rate) return null
                return (
                  <div className="rate-details-content">
                    <p><strong>{rate.rate_name}</strong></p>
                    <p className="detail-row">
                      <span>Start:</span>
                      <span>{format(new Date(rate.start_date), 'MMM dd, yyyy')}</span>
                    </p>
                    <p className="detail-row">
                      <span>End:</span>
                      <span>{format(new Date(rate.end_date), 'MMM dd, yyyy')}</span>
                    </p>
                    <p className="detail-row">
                      <span>Adjustment:</span>
                      <span className={rate.discount_rate > 0 ? 'text-success' : 'text-danger'}>
                        {rate.discount_rate > 0 ? '+' : ''}{(rate.discount_rate * 100).toFixed(0)}%
                      </span>
                    </p>
                  </div>
                )
              })()}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}