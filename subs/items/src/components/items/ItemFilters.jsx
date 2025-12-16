import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { PillMultiSelect } from './PillMultiSelect'
import { CLASS_TYPES, SEASONS } from '@/lib/constants'

export function ItemFilters({
  activeClass,
  classTypes = [],
  seasons = [],
  dateAcquired = [],
  search = '',
  onClassTypesChange,
  onSeasonsChange,
  onDateAcquiredChange,
  onSearchChange,
  availableYears = [],
}) {
  const classTypeOptions = CLASS_TYPES[activeClass] || []

  const hasActiveFilters = 
    classTypes.length > 0 || 
    seasons.length > 0 || 
    dateAcquired.length > 0 || 
    search

  return (
    <div className="space-y-6 mb-8">
      {/* Search Bar - Full Width */}
      <div className="relative">
        <Search className="absolute left-5 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
        <Input
          placeholder="Search items by name or ID..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-14 h-12 rounded-full border-2 border-slate-200 focus:border-slate-400 text-base"
        />
      </div>

      {/* Filters Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <PillMultiSelect
          label="Class Type"
          options={classTypeOptions}
          selected={classTypes}
          onChange={onClassTypesChange}
          placeholder="All types"
        />

        <PillMultiSelect
          label="Season"
          options={SEASONS}
          selected={seasons}
          onChange={onSeasonsChange}
          placeholder="All seasons"
        />

        <PillMultiSelect
          label="Year Acquired"
          options={availableYears}
          selected={dateAcquired}
          onChange={onDateAcquiredChange}
          placeholder="All years"
        />
      </div>

      {/* Active Filter Pills */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-slate-500">
            Active filters:
          </span>
          
          {classTypes.map((type) => (
            <button
              key={type}
              onClick={() => onClassTypesChange(classTypes.filter((t) => t !== type))}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-100 border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-200 transition-colors"
            >
              {type}
              <X className="h-3 w-3" />
            </button>
          ))}
          
          {seasons.map((season) => (
            <button
              key={season}
              onClick={() => onSeasonsChange(seasons.filter((s) => s !== season))}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-100 border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-200 transition-colors"
            >
              {season}
              <X className="h-3 w-3" />
            </button>
          ))}
          
          {dateAcquired.map((year) => (
            <button
              key={year}
              onClick={() => onDateAcquiredChange(dateAcquired.filter((y) => y !== year))}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-100 border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-200 transition-colors"
            >
              {year}
              <X className="h-3 w-3" />
            </button>
          ))}
          
          {search && (
            <button
              onClick={() => onSearchChange('')}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-100 border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-200 transition-colors"
            >
              Search: "{search}"
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      )}
    </div>
  )
}
