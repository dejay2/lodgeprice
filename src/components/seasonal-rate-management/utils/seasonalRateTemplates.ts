/**
 * Seasonal Rate Templates
 * Pre-defined templates for common seasonal periods
 */

import type { SeasonalRateTemplate } from '../types/SeasonalRate'

export const getSeasonalTemplates = (): SeasonalRateTemplate[] => [
  {
    id: 'summer-season',
    name: 'Summer Season',
    description: 'Peak summer months with increased rates',
    periods: [
      {
        name: 'Early Summer',
        startMonth: 5, // June
        startDay: 1,
        endMonth: 5,
        endDay: 30,
        rateAdjustment: 0.25 // +25%
      },
      {
        name: 'Peak Summer',
        startMonth: 6, // July
        startDay: 1,
        endMonth: 7, // August
        endDay: 31,
        rateAdjustment: 0.5 // +50%
      },
      {
        name: 'Late Summer',
        startMonth: 8, // September
        startDay: 1,
        endMonth: 8,
        endDay: 15,
        rateAdjustment: 0.25 // +25%
      }
    ]
  },
  {
    id: 'winter-holidays',
    name: 'Winter Holidays',
    description: 'Christmas and New Year premium pricing',
    periods: [
      {
        name: 'Christmas Week',
        startMonth: 11, // December
        startDay: 20,
        endMonth: 11,
        endDay: 27,
        rateAdjustment: 0.75 // +75%
      },
      {
        name: 'New Year Week',
        startMonth: 11, // December
        startDay: 28,
        endMonth: 0, // January (next year)
        endDay: 5,
        rateAdjustment: 1.0 // +100%
      }
    ]
  },
  {
    id: 'off-season',
    name: 'Off Season',
    description: 'Discounted rates for low-demand periods',
    periods: [
      {
        name: 'Late Autumn',
        startMonth: 10, // November
        startDay: 1,
        endMonth: 10,
        endDay: 30,
        rateAdjustment: -0.2 // -20%
      },
      {
        name: 'Early Spring',
        startMonth: 2, // March
        startDay: 1,
        endMonth: 3, // April
        endDay: 15,
        rateAdjustment: -0.15 // -15%
      }
    ]
  },
  {
    id: 'easter-holiday',
    name: 'Easter Holiday',
    description: 'Easter weekend premium pricing',
    periods: [
      {
        name: 'Easter Weekend',
        startMonth: 3, // April (adjust based on year)
        startDay: 10,
        endMonth: 3,
        endDay: 20,
        rateAdjustment: 0.4 // +40%
      }
    ]
  },
  {
    id: 'bank-holidays',
    name: 'UK Bank Holidays',
    description: 'Long weekend premium pricing',
    periods: [
      {
        name: 'May Bank Holiday',
        startMonth: 4, // May
        startDay: 1,
        endMonth: 4,
        endDay: 7,
        rateAdjustment: 0.3 // +30%
      },
      {
        name: 'Spring Bank Holiday',
        startMonth: 4, // May
        startDay: 25,
        endMonth: 4,
        endDay: 31,
        rateAdjustment: 0.3 // +30%
      },
      {
        name: 'August Bank Holiday',
        startMonth: 7, // August
        startDay: 26,
        endMonth: 7,
        endDay: 31,
        rateAdjustment: 0.35 // +35%
      }
    ]
  },
  {
    id: 'autumn-midweek',
    name: 'Autumn Midweek Special',
    description: 'Discounted midweek stays in autumn',
    periods: [
      {
        name: 'September Midweek',
        startMonth: 8, // September
        startDay: 16,
        endMonth: 8,
        endDay: 30,
        rateAdjustment: -0.25 // -25%
      },
      {
        name: 'October Midweek',
        startMonth: 9, // October
        startDay: 1,
        endMonth: 9,
        endDay: 31,
        rateAdjustment: -0.3 // -30%
      }
    ]
  },
  {
    id: 'last-minute',
    name: 'Last Minute Discount',
    description: 'Short-term discount for immediate bookings',
    periods: [
      {
        name: 'Last Minute Special',
        startMonth: new Date().getMonth(),
        startDay: new Date().getDate(),
        endMonth: new Date().getMonth(),
        endDay: new Date().getDate() + 14,
        rateAdjustment: -0.35 // -35%
      }
    ]
  }
]

/**
 * Apply template to current or specific year
 */
export const applyTemplateToYear = (
  template: SeasonalRateTemplate,
  year?: number
): Array<{
  name: string
  startDate: Date
  endDate: Date
  rateAdjustment: number
}> => {
  const targetYear = year || new Date().getFullYear()
  
  return template.periods.map(period => {
    const startDate = new Date(targetYear, period.startMonth, period.startDay)
    let endDate = new Date(targetYear, period.endMonth, period.endDay)
    
    // Handle year transition (e.g., Dec to Jan)
    if (endDate < startDate) {
      endDate = new Date(targetYear + 1, period.endMonth, period.endDay)
    }
    
    return {
      name: period.name,
      startDate,
      endDate,
      rateAdjustment: period.rateAdjustment
    }
  })
}

/**
 * Validate template periods for conflicts
 */
export const validateTemplatePeriods = (
  periods: Array<{ startDate: Date; endDate: Date }>
): boolean => {
  for (let i = 0; i < periods.length; i++) {
    for (let j = i + 1; j < periods.length; j++) {
      const period1 = periods[i]
      const period2 = periods[j]
      
      // Check for overlap
      if (
        (period1.startDate <= period2.endDate && period1.endDate >= period2.startDate) ||
        (period2.startDate <= period1.endDate && period2.endDate >= period1.startDate)
      ) {
        return false // Overlap detected
      }
    }
  }
  
  return true // No overlaps
}