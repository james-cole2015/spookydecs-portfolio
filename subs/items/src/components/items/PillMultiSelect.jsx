import { useState, useRef, useEffect } from 'react'
import { ChevronDown, X, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export function PillMultiSelect({ 
  label, 
  options = [], 
  selected = [], 
  onChange, 
  placeholder = 'Select...' 
}) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const toggleOption = (option) => {
    if (selected.includes(option)) {
      onChange(selected.filter((item) => item !== option))
    } else {
      onChange([...selected, option])
    }
  }

  const displayText = selected.length > 0 
    ? `${selected.length} selected` 
    : placeholder

  return (
    <div ref={dropdownRef} className="relative">
      {label && (
        <label className="block text-sm font-medium text-slate-700 mb-2">
          {label}
        </label>
      )}
      
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full h-12 px-6 rounded-full border-2 transition-all duration-200",
          "flex items-center justify-between bg-white",
          "hover:border-slate-400 focus:outline-none focus:border-slate-500",
          isOpen ? "border-slate-500" : "border-slate-200"
        )}
      >
        <span className={cn(
          "text-sm font-medium",
          selected.length > 0 ? "text-slate-700" : "text-slate-400"
        )}>
          {displayText}
        </span>
        <ChevronDown 
          className={cn(
            "h-4 w-4 text-slate-400 transition-transform duration-200",
            isOpen && "rotate-180"
          )} 
        />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-lg max-h-64 overflow-auto">
          {options.length === 0 ? (
            <div className="px-4 py-3 text-sm text-slate-400">
              No options available
            </div>
          ) : (
            options.map((option) => {
              const isSelected = selected.includes(option)
              
              return (
                <button
                  key={option}
                  onClick={() => toggleOption(option)}
                  className={cn(
                    "w-full px-4 py-3 text-left text-sm transition-colors",
                    "flex items-center justify-between",
                    "hover:bg-slate-50",
                    isSelected && "bg-slate-50"
                  )}
                >
                  <span className={cn(
                    "font-medium",
                    isSelected ? "text-slate-700" : "text-slate-600"
                  )}>
                    {option}
                  </span>
                  {isSelected && (
                    <Check className="h-4 w-4 text-amber-500" />
                  )}
                </button>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
