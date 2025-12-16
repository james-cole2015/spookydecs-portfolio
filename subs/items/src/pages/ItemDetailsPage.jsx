import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Pencil, Trash2 } from 'lucide-react'
import { Breadcrumbs } from '@/components/common/Breadcrumbs'
import { Button } from '@/components/ui/button'
import { DeleteItemDialog } from '@/components/items/DeleteItemDialog'
import { useItem } from '@/hooks/useItem'

export function ItemDetailsPage() {
  const { itemId } = useParams()
  const navigate = useNavigate()
  const { data, isLoading, error } = useItem(itemId)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [imageError, setImageError] = useState(false)

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

  const formatHeightLength = (value) => {
    if (value === null || value === undefined) return null
    return Math.round(parseFloat(value))
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <Breadcrumbs
            items={[
              { label: 'Items', href: '/items' },
              { label: item.short_name },
            ]}
          />

          <div className="flex items-start gap-8 mb-8">
            {/* Image */}
            <div className="flex-shrink-0">
              {item.primary_image_url && !imageError ? (
                <img
                  src={item.primary_image_url}
                  alt={item.short_name}
                  className="w-64 h-64 object-cover rounded-lg"
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="w-64 h-64 bg-gray-200 rounded-lg flex items-center justify-center">
                  <p className="text-gray-400">No image</p>
                </div>
              )}
            </div>

            {/* Details */}
            <div className="flex-1">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    {item.short_name}
                  </h1>
                  <p className="text-sm text-gray-600 font-mono">{item.id}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/items/${itemId}/edit`)}
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setDeleteDialogOpen(true)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>

              {/* Metadata Grid */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-sm font-medium text-gray-500">Class</p>
                  <p className="text-gray-900">{item.class}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Type</p>
                  <p className="text-gray-900">{item.class_type}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Season</p>
                  <p className="text-gray-900">{item.season}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Status</p>
                  <p className="text-gray-900">{item.status}</p>
                </div>
                {item.date_acquired && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">Date Acquired</p>
                    <p className="text-gray-900">{item.date_acquired}</p>
                  </div>
                )}
              </div>

{/* Additional Details */}
{(item.stakes != null || item.tethers != null || item.height_length != null || 
  item.male_ends != null || item.female_ends != null || item.length != null ||
  item.color || item.bulb_type) && (
  <div className="border-t pt-4 mb-6">
    <h2 className="text-lg font-semibold mb-3">Additional Details</h2>
    <div className="grid grid-cols-2 gap-4">
      {item.stakes != null && (
        <div>
          <p className="text-sm font-medium text-gray-500">Stakes</p>
          <p className="text-gray-900">{item.stakes}</p>
        </div>
      )}
      {item.tethers != null && (
        <div>
          <p className="text-sm font-medium text-gray-500">Tethers</p>
          <p className="text-gray-900">{item.tethers}</p>
        </div>
      )}
      {item.height_length != null && (
        <div>
          <p className="text-sm font-medium text-gray-500">Height/Length</p>
          <p className="text-gray-900">{formatHeightLength(item.height_length)}</p>
        </div>
      )}
      {item.male_ends != null && (
        <div>
          <p className="text-sm font-medium text-gray-500">Male Ends</p>
          <p className="text-gray-900">{item.male_ends}</p>
        </div>
      )}
      {item.female_ends != null && (
        <div>
          <p className="text-sm font-medium text-gray-500">Female Ends</p>
          <p className="text-gray-900">{item.female_ends}</p>
        </div>
      )}
      {item.length != null && (
        <div>
          <p className="text-sm font-medium text-gray-500">Length</p>
          <p className="text-gray-900">{item.length}</p>
        </div>
      )}
      {item.color && (
        <div>
          <p className="text-sm font-medium text-gray-500">Color</p>
          <p className="text-gray-900">{item.color}</p>
        </div>
      )}
      {item.bulb_type && (
        <div>
          <p className="text-sm font-medium text-gray-500">Bulb Type</p>
          <p className="text-gray-900">{item.bulb_type}</p>
        </div>
      )}
    </div>
  </div>
)}

              {/* Quick Stats */}
              <div className="border-t pt-4">
                <h2 className="text-lg font-semibold mb-3">Quick Stats</h2>
                <div className="grid grid-cols-2 gap-4">
                  {item.storage_location && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">Storage Location</p>
                      <p className="text-gray-900">{item.storage_location}</p>
                    </div>
                  )}
                  {item.needs_repair !== undefined && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">Repairs Needed</p>
                      <p className="text-gray-900">{item.needs_repair ? 'Yes' : 'No'}</p>
                    </div>
                  )}
                  {item.last_deployed && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">Last Deployed</p>
                      <p className="text-gray-900">
                        {new Date(item.last_deployed).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Notes */}
              {item.general_notes && (
                <div className="border-t pt-4 mt-4">
                  <h2 className="text-lg font-semibold mb-3">Notes</h2>
                  <p className="text-gray-700 whitespace-pre-wrap">{item.general_notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <DeleteItemDialog
        item={item}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
      />
    </div>
  )
}