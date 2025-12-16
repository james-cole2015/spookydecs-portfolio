import { useParams, useNavigate } from 'react-router-dom'
import { Breadcrumbs } from '@/components/common/Breadcrumbs'
import { ItemForm } from '@/components/items/ItemForm'
import { useItem } from '@/hooks/useItem'
import { useUpdateItem } from '@/hooks/useUpdateItem'

export function EditItemPage() {
  const { itemId } = useParams()
  const navigate = useNavigate()
  const { data, isLoading, error } = useItem(itemId)
  const { mutate: updateItem, isPending } = useUpdateItem()

  const handleSubmit = (formData) => {
    updateItem(
      { id: itemId, data: formData },
      {
        onSuccess: () => {
          navigate(`/items/${itemId}`)
        },
      }
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Loading item...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error loading item: {error.message}</p>
          <Button onClick={() => navigate('/items')}>Back to Items</Button>
        </div>
      </div>
    )
  }

  const item = data?.item

  if (!item) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Item not found</p>
          <Button onClick={() => navigate('/items')}>Back to Items</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <Breadcrumbs
            items={[
              { label: 'Items', href: '/items' },
              { label: item.short_name, href: `/items/${itemId}` },
              { label: 'Edit' },
            ]}
          />

          <h1 className="text-3xl font-bold text-gray-900 mb-8">Edit Item</h1>

          <ItemForm
            defaultValues={item}
            onSubmit={handleSubmit}
            isPending={isPending}
          />
        </div>
      </div>
    </div>
  )
}
