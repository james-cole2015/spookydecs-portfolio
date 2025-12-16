import { Palette, Plug, Lightbulb } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { TAB_OPTIONS } from '@/lib/constants'

const TAB_ICONS = {
  decorations: Palette,
  accessories: Plug,
  lights: Lightbulb,
}

export function ItemTabs({ activeTab, onTabChange }) {
  return (
    <>
      {/* Desktop: Large Full-Width Tabs */}
      <div className="hidden md:block mb-8">
        <div className="bg-white rounded-t-xl shadow-md overflow-hidden">
          <div className="flex">
            {TAB_OPTIONS.map((tab) => {
              const Icon = TAB_ICONS[tab.value]
              const isActive = activeTab === tab.value
              
              return (
                <button
                  key={tab.value}
                  onClick={() => onTabChange(tab.value)}
                  className={`
                    flex-1 h-14 flex items-center justify-center gap-2 
                    font-semibold transition-all duration-200
                    ${isActive 
                      ? 'bg-slate-600 text-white border-b-2 border-amber-500' 
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }
                  `}
                >
                  <Icon className="h-5 w-5" />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Mobile: Dropdown */}
      <div className="md:hidden mb-6">
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Item Class
        </label>
        <Select value={activeTab} onValueChange={onTabChange}>
          <SelectTrigger className="rounded-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TAB_OPTIONS.map((tab) => {
              const Icon = TAB_ICONS[tab.value]
              return (
                <SelectItem key={tab.value} value={tab.value}>
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </div>
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>
      </div>
    </>
  )
}
