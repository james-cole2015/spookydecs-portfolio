import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export function useDeleteItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id) => api.deleteItem(id),
    onSuccess: () => {
      // Invalidate items list to refetch
      queryClient.invalidateQueries({ queryKey: ['items'] })
    },
  })
}
