/**
 * Validation Schemas for Seasonal Rate Management
 * Yup schemas for React Hook Form validation
 */

import * as yup from 'yup'
import { isValid } from 'date-fns'

// Custom validation messages
const validationMessages = {
  required: 'This field is required',
  nameMin: 'Name must be at least 2 characters',
  nameMax: 'Name cannot exceed 100 characters',
  dateInvalid: 'Please provide a valid date',
  startDateFuture: 'Start date cannot be in the past',
  endDateAfterStart: 'End date must be after start date',
  rateAdjustmentMin: 'Rate adjustment cannot be less than -100% (complete discount)',
  rateAdjustmentMax: 'Rate adjustment cannot exceed 1000% (10x increase)',
  rateAdjustmentZero: 'Rate adjustment cannot be zero (no change)',
  dateRangeMinDuration: 'Date range must be at least 1 day',
  dateRangeMaxDuration: 'Date range cannot exceed 365 days',
}

// Seasonal rate form validation schema
export const seasonalRateValidationSchema = yup.object().shape({
  name: yup
    .string()
    .required(validationMessages.required)
    .min(2, validationMessages.nameMin)
    .max(100, validationMessages.nameMax)
    .trim(),

  startDate: yup
    .date()
    .required(validationMessages.required)
    .typeError(validationMessages.dateInvalid)
    .min((() => {
      const date = new Date()
      date.setHours(0, 0, 0, 0)
      return date
    })(), validationMessages.startDateFuture)
    .test('valid-date', validationMessages.dateInvalid, (value) => {
      return value ? isValid(value) : false
    }),

  endDate: yup
    .date()
    .required(validationMessages.required)
    .typeError(validationMessages.dateInvalid)
    .min(yup.ref('startDate'), validationMessages.endDateAfterStart)
    .test('valid-date', validationMessages.dateInvalid, (value) => {
      return value ? isValid(value) : false
    })
    .test('max-duration', validationMessages.dateRangeMaxDuration, function (value) {
      const { startDate } = this.parent
      if (startDate && value) {
        const diffInDays = Math.ceil((value.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
        return diffInDays <= 365
      }
      return true
    }),

  rateAdjustment: yup
    .number()
    .required(validationMessages.required)
    .min(-1, validationMessages.rateAdjustmentMin)
    .max(10, validationMessages.rateAdjustmentMax)
    .test('not-zero', validationMessages.rateAdjustmentZero, (value) => value !== 0)
})

// Bulk import validation schema
export const bulkImportValidationSchema = yup.object().shape({
  version: yup.string().required(),
  exportDate: yup.string().required(),
  seasonalRates: yup.array().of(
    yup.object().shape({
      rate_name: yup.string().required().min(2).max(100),
      start_date: yup.string().required(),
      end_date: yup.string().required(),
      discount_rate: yup.number().required().min(-1).max(10)
    })
  ),
  metadata: yup.object().shape({
    totalCount: yup.number().required().positive().integer(),
    dateRange: yup.object().shape({
      earliest: yup.string().required(),
      latest: yup.string().required()
    })
  })
})

// Template validation schema
export const templateValidationSchema = yup.object().shape({
  name: yup.string().required().min(2).max(50),
  description: yup.string().max(200),
  periods: yup.array().of(
    yup.object().shape({
      name: yup.string().required(),
      startMonth: yup.number().required().min(0).max(11),
      startDay: yup.number().required().min(1).max(31),
      endMonth: yup.number().required().min(0).max(11),
      endDay: yup.number().required().min(1).max(31),
      rateAdjustment: yup.number().required().min(-1).max(10)
    })
  ).min(1, 'Template must have at least one period')
})

// Filter validation schema
export const filterValidationSchema = yup.object().shape({
  dateRange: yup.object().shape({
    start: yup.string(),
    end: yup.string()
  }).optional(),
  rateAdjustmentRange: yup.object().shape({
    min: yup.number().min(-1).max(10),
    max: yup.number().min(-1).max(10)
  }).optional(),
  searchTerm: yup.string().max(100).optional(),
  activeOnly: yup.boolean().optional()
})

// Export form data type from schema
export type SeasonalRateFormData = yup.InferType<typeof seasonalRateValidationSchema>
export type BulkImportFormData = yup.InferType<typeof bulkImportValidationSchema>
export type TemplateFormData = yup.InferType<typeof templateValidationSchema>
export type FilterFormData = yup.InferType<typeof filterValidationSchema>