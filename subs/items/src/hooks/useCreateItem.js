import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export function useCreateItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data) => api.createItem(data),
    onSuccess: () => {
      // Invalidate items list to refetch
      queryClient.invalidateQueries({ queryKey: ['items'] })
    },
  })
}
