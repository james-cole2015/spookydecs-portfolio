import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export function useItems(params = {}) {
  return useQuery({
    queryKey: ['items', params],
    queryFn: () => api.getItems(params),
    staleTime: 30000, // 30 seconds
  })
}
