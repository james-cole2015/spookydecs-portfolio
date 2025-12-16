import { useNavigate } from 'react-router-dom'
import { Breadcrumbs } from '@/components/common/Breadcrumbs'
import { ItemForm } from '@/components/items/ItemForm'
import { useCreateItem } from '@/hooks/useCreateItem'

export function CreateItemPage() {
  const navigate = useNavigate()
  const { mutate: createItem, isPending } = useCreateItem()

  const handleSubmit = (data) => {
    createItem(data, {
      onSuccess: (response) => {
        const newItemId = response.confirmation?.id || response.item?.id
        if (newItemId) {
          navigate(`/items/${newItemId}`)
        } else {
          navigate('/items')
        }
      },
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <Breadcrumbs
            items={[
              { label: 'Items', href: '/items' },
              { label: 'New Item' },
            ]}
          />

          <h1 className="text-3xl font-bold text-gray-900 mb-8">Create New Item</h1>

          <ItemForm onSubmit={handleSubmit} isPending={isPending} />
        </div>
      </div>
    </div>
  )
}
