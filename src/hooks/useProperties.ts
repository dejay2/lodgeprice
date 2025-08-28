import { useState, useEffect, useCallback } from 'react'
import { propertyApi } from '@/services/api'
import type { Property } from '@/types/database'

export function useProperties() {
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProperties = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await propertyApi.getAll()
      setProperties(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load properties')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProperties()
  }, [fetchProperties])

  const refetch = useCallback(() => {
    return fetchProperties()
  }, [fetchProperties])

  return {
    properties,
    loading,
    error,
    refetch
  }
}