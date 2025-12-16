import { useMemo } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { ItemTabs } from '@/components/items/ItemTabs'
import { ItemFilters } from '@/components/items/ItemFilters'
import { ItemsTable } from '@/components/items/ItemsTable'
import { Button } from '@/components/ui/button'
import { useItems } from '@/hooks/useItems'
import { TAB_OPTIONS } from '@/lib/constants'

export function ItemsListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()

  // Get state from URL
  const activeTab = searchParams.get('tab') || 'decorations'
  const classTypes = searchParams.get('class_type')?.split(',').filter(Boolean) || []
  const seasons = searchParams.get('season')?.split(',').filter(Boolean) || []
  const dateAcquired = searchParams.get('date_acquired')?.split(',').filter(Boolean) || []
  const search = searchParams.get('search') || ''
  const sort = searchParams.get('sort') || 'short_name'
  const order = searchParams.get('order') || 'asc'

  // Get active class from tab
  const activeClass = TAB_OPTIONS.find((t) => t.value === activeTab)?.class

  // Fetch items
  const { data, isLoading, error } = useItems({
    class: activeClass,
    class_type: classTypes,
    season: seasons,
    date_acquired: dateAcquired,
    search,
    sort,
    order,
  })

  const items = data?.items || []

  // Get unique years for filter
  const availableYears = useMemo(() => {
    const years = new Set()
    items.forEach((item) => {
      if (item.date_acquired) {
        years.add(item.date_acquired)
      }
    })
    return Array.from(years).sort((a, b) => b.localeCompare(a))
  }, [items])

  // Update URL params helper
  const updateParams = (updates) => {
    const newParams = new URLSearchParams(searchParams)
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '' || (Array.isArray(value) && value.length === 0)) {
        newParams.delete(key)
      } else if (Array.isArray(value)) {
        newParams.set(key, value.join(','))
      } else {
        newParams.set(key, value)
      }
    })
    
    setSearchParams(newParams)
  }

  const handleTabChange = (tab) => {
    updateParams({ 
      tab, 
      class_type: null, // Reset filters when changing tabs
      season: null,
      date_acquired: null,
    })
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-bold text-slate-800">Items</h1>
            <p className="text-slate-600 mt-2">
              Manage your decorations, accessories, and lights
            </p>
          </div>
          
          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <Button 
              onClick={() => navigate('/items/new')}
              className="h-12 px-6 rounded-full bg-amber-500 hover:bg-amber-600 text-white font-semibold shadow-md hover:shadow-lg transition-all duration-200"
            >
              <Plus className="h-5 w-5 mr-2" />
              Create Item
            </Button>
            
            <Button 
              onClick={() => {/* TODO: Implement retire functionality */}}
              variant="outline"
              className="h-12 px-6 rounded-full border-2 border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-400 font-semibold shadow-sm hover:shadow-md transition-all duration-200"
            >
              Retire Item
            </Button>
            
            <Button 
              onClick={() => {/* TODO: Implement delete functionality */}}
              variant="outline"
              className="h-12 px-6 rounded-full border-2 border-rose-300 bg-white text-rose-700 hover:bg-rose-50 hover:border-rose-400 font-semibold shadow-sm hover:shadow-md transition-all duration-200"
            >
              Delete Item
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <ItemTabs activeTab={activeTab} onTabChange={handleTabChange} />

        {/* Filters */}
        <ItemFilters
          activeClass={activeClass}
          classTypes={classTypes}
          seasons={seasons}
          dateAcquired={dateAcquired}
          search={search}
          onClassTypesChange={(value) => updateParams({ class_type: value })}
          onSeasonsChange={(value) => updateParams({ season: value })}
          onDateAcquiredChange={(value) => updateParams({ date_acquired: value })}
          onSearchChange={(value) => updateParams({ search: value })}
          availableYears={availableYears}
        />

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-16">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-slate-300 border-r-transparent"></div>
            <p className="text-slate-600 mt-4">Loading items...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-16">
            <div className="inline-block p-4 rounded-full bg-red-50 mb-4">
              <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-red-600 font-medium">Error loading items: {error.message}</p>
          </div>
        )}

        {/* Table */}
        {!isLoading && !error && (
          <>
            {items.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-lg border-2 border-dashed border-slate-200">
                <div className="inline-block p-4 rounded-full bg-slate-50 mb-4">
                  <svg className="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                </div>
                <p className="text-slate-600 mb-4 font-medium">No items found</p>
                <Button 
                  onClick={() => navigate('/items/new')} 
                  variant="outline"
                  className="rounded-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create your first item
                </Button>
              </div>
            ) : (
              <>
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-sm text-slate-600 font-medium">
                    Showing {items.length} {items.length === 1 ? 'item' : 'items'}
                  </span>
                </div>
                <ItemsTable items={items} />
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
