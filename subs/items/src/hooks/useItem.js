import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export function useItem(id) {
  return useQuery({
    queryKey: ['items', id],
    queryFn: () => api.getItem(id),
    enabled: !!id,
    staleTime: 60000, // 1 minute
  })
}
