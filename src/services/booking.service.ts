/**
 * Booking Service
 * Handles booking validation, conflict checking, and management
 */

import { supabase } from '@/lib/supabase'
import {
  ValidationError,
  BookingConflictError,
  DatabaseError,
} from '@/types/helpers'
import type {
  DateRange,
} from '@/types/helpers'
import type { Database } from '@/types/database.generated'
import type { BookingFormData } from '@/types/pricing'

type BookingRow = Database['public']['Tables']['bookings']['Row']
type BookingInsert = Database['public']['Tables']['bookings']['Insert']
type BookingUpdate = Database['public']['Tables']['bookings']['Update']

/**
 * Booking validation result
 */
export interface BookingValidationResult {
  isValid: boolean
  conflictDetails?: {
    bookingId: string
    guestName: string
    arrivalDate: string
    departureDate: string
  }
  errors?: string[]
}

/**
 * Booking list filters
 */
export interface BookingFilters {
  propertyId?: string
  status?: string
  dateFrom?: Date
  dateTo?: Date
  guestName?: string
}

/**
 * Main booking service class
 */
export class BookingService {
  /**
   * Check for booking conflicts
   * Uses check_booking_conflict database function
   */
  async validateDates(
    propertyId: string,
    arrival: Date,
    departure: Date,
    excludeBookingId?: string | null
  ): Promise<BookingValidationResult> {
    // Validate inputs
    const errors = this.validateBookingDates(arrival, departure)
    if (errors.length > 0) {
      return { isValid: false, errors }
    }
    
    try {
      // Call database function to check conflicts
      const { data: hasConflict, error } = await supabase.rpc('check_booking_conflict', {
        p_property_id: propertyId,
        p_arrival_date: arrival.toISOString().split('T')[0],
        p_departure_date: departure.toISOString().split('T')[0],
        p_exclude_booking_id: excludeBookingId || null,
      })
      
      if (error) {
        throw new DatabaseError(
          `Failed to check booking conflict: ${error.message}`,
          'CONFLICT_CHECK',
          error
        )
      }
      
      // If there's a conflict, get the conflicting booking details
      if (hasConflict) {
        const conflictDetails = await this.getConflictDetails(
          propertyId,
          arrival,
          departure,
          excludeBookingId
        )
        
        return {
          isValid: false,
          conflictDetails,
          errors: ['Selected dates conflict with an existing booking'],
        }
      }
      
      return { isValid: true }
    } catch (error) {
      return this.handleBookingError(error, 'validate-dates')
    }
  }
  
  /**
   * Create a new booking
   */
  async createBooking(bookingData: BookingFormData): Promise<BookingRow> {
    // Validate dates first
    const validation = await this.validateDates(
      bookingData.propertyId,
      bookingData.arrivalDate,
      bookingData.departureDate
    )
    
    if (!validation.isValid) {
      throw new BookingConflictError(
        validation.errors?.join(', ') || 'Booking validation failed',
        validation
      )
    }
    
    // Get property internal ID
    const { data: property, error: propError } = await supabase
      .from('properties')
      .select('id')
      .eq('lodgify_property_id', bookingData.propertyId)
      .single()
    
    if (propError || !property) {
      throw new ValidationError(`Property not found: ${bookingData.propertyId}`)
    }
    
    // Create booking record
    const bookingInsert: BookingInsert = {
      booking_id: this.generateBookingId(),
      property_id: bookingData.propertyId,
      property_internal_id: property.id,
      arrival_date: bookingData.arrivalDate.toISOString().split('T')[0],
      departure_date: bookingData.departureDate.toISOString().split('T')[0],
      guest_name: bookingData.guestName,
      total_price: bookingData.totalPrice,
      booking_status: 'pending',
    }
    
    try {
      const { data, error } = await supabase
        .from('bookings')
        .insert(bookingInsert)
        .select()
        .single()
      
      if (error) {
        // Check for specific constraint violations
        if (error.code === '23505') {
          throw new BookingConflictError(
            'A booking already exists for these dates',
            error
          )
        }
        throw new DatabaseError(
          `Failed to create booking: ${error.message}`,
          'CREATE_BOOKING',
          error
        )
      }
      
      return data as BookingRow
    } catch (error) {
      return this.handleBookingError(error, 'create-booking')
    }
  }
  
  /**
   * Update an existing booking
   */
  async updateBooking(
    bookingId: string,
    updates: Partial<BookingFormData>
  ): Promise<BookingRow> {
    // If dates are being updated, validate them
    if (updates.arrivalDate || updates.departureDate) {
      // Get current booking to have complete date information
      const { data: currentBooking } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', bookingId)
        .single()
      
      if (!currentBooking) {
        throw new ValidationError('Booking not found')
      }
      
      const arrival = updates.arrivalDate || new Date(currentBooking.arrival_date)
      const departure = updates.departureDate || new Date(currentBooking.departure_date)
      const propertyId = updates.propertyId || currentBooking.property_id || ''
      
      const validation = await this.validateDates(
        propertyId,
        arrival,
        departure,
        bookingId
      )
      
      if (!validation.isValid) {
        throw new BookingConflictError(
          validation.errors?.join(', ') || 'Booking validation failed',
          validation
        )
      }
    }
    
    // Build update object
    const bookingUpdate: BookingUpdate = {}
    
    if (updates.arrivalDate) {
      bookingUpdate.arrival_date = updates.arrivalDate.toISOString().split('T')[0]
    }
    if (updates.departureDate) {
      bookingUpdate.departure_date = updates.departureDate.toISOString().split('T')[0]
    }
    if (updates.guestName) {
      bookingUpdate.guest_name = updates.guestName
    }
    if (updates.totalPrice !== undefined) {
      bookingUpdate.total_price = updates.totalPrice
    }
    
    try {
      const { data, error } = await supabase
        .from('bookings')
        .update(bookingUpdate)
        .eq('id', bookingId)
        .select()
        .single()
      
      if (error) {
        throw new DatabaseError(
          `Failed to update booking: ${error.message}`,
          'UPDATE_BOOKING',
          error
        )
      }
      
      return data as BookingRow
    } catch (error) {
      return this.handleBookingError(error, 'update-booking')
    }
  }
  
  /**
   * Cancel a booking
   */
  async cancelBooking(bookingId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ booking_status: 'cancelled' })
        .eq('id', bookingId)
      
      if (error) {
        throw new DatabaseError(
          `Failed to cancel booking: ${error.message}`,
          'CANCEL_BOOKING',
          error
        )
      }
    } catch (error) {
      return this.handleBookingError(error, 'cancel-booking')
    }
  }
  
  /**
   * Get bookings for a property
   */
  async getPropertyBookings(
    propertyId: string,
    filters?: BookingFilters
  ): Promise<BookingRow[]> {
    try {
      let query = supabase
        .from('bookings')
        .select('*')
        .eq('property_id', propertyId)
        .order('arrival_date', { ascending: true })
      
      // Apply filters
      if (filters?.status) {
        query = query.eq('booking_status', filters.status)
      }
      
      if (filters?.dateFrom) {
        query = query.gte('arrival_date', filters.dateFrom.toISOString().split('T')[0])
      }
      
      if (filters?.dateTo) {
        query = query.lte('departure_date', filters.dateTo.toISOString().split('T')[0])
      }
      
      if (filters?.guestName) {
        query = query.ilike('guest_name', `%${filters.guestName}%`)
      }
      
      const { data, error } = await query
      
      if (error) {
        throw new DatabaseError(
          `Failed to fetch bookings: ${error.message}`,
          'FETCH_BOOKINGS',
          error
        )
      }
      
      return (data as BookingRow[]) || []
    } catch (error) {
      return this.handleBookingError(error, 'get-bookings')
    }
  }
  
  /**
   * Get bookings that overlap with a date range
   */
  async getOverlappingBookings(
    propertyId: string,
    dateRange: DateRange
  ): Promise<BookingRow[]> {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('property_id', propertyId)
        .in('booking_status', ['confirmed', 'pending'])
        .or(
          `and(arrival_date.lte.${dateRange.end.toISOString().split('T')[0]}` +
          `,departure_date.gte.${dateRange.start.toISOString().split('T')[0]})`
        )
        .order('arrival_date', { ascending: true })
      
      if (error) {
        throw new DatabaseError(
          `Failed to fetch overlapping bookings: ${error.message}`,
          'FETCH_OVERLAPPING',
          error
        )
      }
      
      return (data as BookingRow[]) || []
    } catch (error) {
      return this.handleBookingError(error, 'get-overlapping')
    }
  }
  
  /**
   * Get available dates for a property
   */
  async getAvailableDates(
    propertyId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Date[]> {
    // Get all bookings in the range
    const bookings = await this.getOverlappingBookings(propertyId, {
      start: startDate,
      end: endDate,
    })
    
    // Create a set of booked dates
    const bookedDates = new Set<string>()
    
    bookings.forEach(booking => {
      const arrival = new Date(booking.arrival_date)
      const departure = new Date(booking.departure_date)
      
      for (let d = new Date(arrival); d < departure; d.setDate(d.getDate() + 1)) {
        bookedDates.add(d.toISOString().split('T')[0])
      }
    })
    
    // Generate list of available dates
    const availableDates: Date[] = []
    
    for (
      let d = new Date(startDate);
      d <= endDate;
      d.setDate(d.getDate() + 1)
    ) {
      const dateStr = d.toISOString().split('T')[0]
      if (!bookedDates.has(dateStr)) {
        availableDates.push(new Date(d))
      }
    }
    
    return availableDates
  }
  
  /**
   * Private helper methods
   */
  
  private validateBookingDates(arrival: Date, departure: Date): string[] {
    const errors: string[] = []
    
    if (departure <= arrival) {
      errors.push('Departure date must be after arrival date')
    }
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    if (arrival < today) {
      errors.push('Arrival date cannot be in the past')
    }
    
    const nights = Math.ceil(
      (departure.getTime() - arrival.getTime()) / (1000 * 60 * 60 * 24)
    )
    
    if (nights > 365) {
      errors.push('Booking cannot exceed 365 nights')
    }
    
    return errors
  }
  
  private async getConflictDetails(
    propertyId: string,
    arrival: Date,
    departure: Date,
    excludeBookingId?: string | null
  ) {
    const { data } = await supabase
      .from('bookings')
      .select('booking_id, guest_name, arrival_date, departure_date')
      .eq('property_id', propertyId)
      .in('booking_status', ['confirmed', 'pending'])
      .neq('id', excludeBookingId || '')
      .or(
        `and(arrival_date.lt.${departure.toISOString().split('T')[0]}` +
        `,departure_date.gt.${arrival.toISOString().split('T')[0]})`
      )
      .limit(1)
      .single()
    
    return data ? {
      bookingId: data.booking_id,
      guestName: data.guest_name,
      arrivalDate: data.arrival_date,
      departureDate: data.departure_date,
    } : undefined
  }
  
  private generateBookingId(): string {
    const timestamp = Date.now().toString(36)
    const randomStr = Math.random().toString(36).substring(2, 7)
    return `BK-${timestamp}-${randomStr}`.toUpperCase()
  }
  
  private handleBookingError(error: unknown, operation: string): never {
    if (error instanceof ValidationError || error instanceof BookingConflictError) {
      throw error
    }
    
    if (error instanceof Error) {
      const message = error.message.toLowerCase()
      
      if (message.includes('conflict') || message.includes('overlap')) {
        throw new BookingConflictError(
          `Booking conflict detected during ${operation}`,
          error
        )
      }
      
      if (message.includes('network') || message.includes('connection')) {
        throw new DatabaseError(
          `Network error during ${operation}. Please check your connection.`,
          'NETWORK_ERROR',
          error
        )
      }
      
      throw new DatabaseError(
        `Booking operation failed: ${error.message}`,
        'BOOKING_ERROR',
        error
      )
    }
    
    throw new DatabaseError(
      `Unknown error during ${operation}`,
      'UNKNOWN_ERROR',
      error
    )
  }
}

// Export singleton instance
export const bookingService = new BookingService()