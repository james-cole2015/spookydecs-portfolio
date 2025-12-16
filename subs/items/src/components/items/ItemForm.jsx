import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import {
  CLASSES,
  CLASS_TYPES,
  SEASONS,
  STATUSES,
  CONDITIONAL_FIELDS,
} from '@/lib/constants'

const itemSchema = z.object({
  class: z.string().min(1, 'Class is required'),
  class_type: z.string().min(1, 'Class type is required'),
  short_name: z.string().min(1, 'Short name is required'),
  season: z.string().min(1, 'Season is required'),
  status: z.string().optional(),
  date_acquired: z.string().optional(),
  // Conditional fields
  stakes: z.string().optional(),
  tethers: z.string().optional(),
  height_length: z.string().optional(),
  male_ends: z.string().optional(),
  female_ends: z.string().optional(),
  length: z.string().optional(),
  color: z.string().optional(),
  bulb_type: z.string().optional(),
  general_notes: z.string().optional(),
})

export function ItemForm({ defaultValues, onSubmit, isPending }) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(itemSchema),
    defaultValues: defaultValues || {
      class: CLASSES.DECORATION,
      class_type: '',
      short_name: '',
      season: SEASONS[0],
      status: STATUSES[0],
      date_acquired: new Date().getFullYear().toString(),
    },
  })

  const selectedClass = watch('class')
  const selectedClassType = watch('class_type')

  // Get available class types for selected class
  const availableClassTypes = CLASS_TYPES[selectedClass] || []

  // Get required fields for selected class and class_type
  const requiredFields = selectedClass && selectedClassType
    ? CONDITIONAL_FIELDS[selectedClass]?.[selectedClassType] || []
    : []

  // Reset class_type when class changes
  const handleClassChange = (value) => {
    setValue('class', value)
    setValue('class_type', '')
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Class */}
        <div className="space-y-2">
          <Label htmlFor="class">
            Class <span className="text-red-500">*</span>
          </Label>
          <Select
            value={selectedClass}
            onValueChange={handleClassChange}
          >
            <SelectTrigger id="class">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.values(CLASSES).filter(c => c !== CLASSES.RECEPTACLE).map((cls) => (
                <SelectItem key={cls} value={cls}>
                  {cls}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.class && (
            <p className="text-sm text-red-500">{errors.class.message}</p>
          )}
        </div>

        {/* Class Type */}
        <div className="space-y-2">
          <Label htmlFor="class_type">
            Class Type <span className="text-red-500">*</span>
          </Label>
          <Select
            value={selectedClassType}
            onValueChange={(value) => setValue('class_type', value)}
            disabled={!selectedClass}
          >
            <SelectTrigger id="class_type">
              <SelectValue placeholder="Select class first" />
            </SelectTrigger>
            <SelectContent>
              {availableClassTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.class_type && (
            <p className="text-sm text-red-500">{errors.class_type.message}</p>
          )}
        </div>

        {/* Short Name */}
        <div className="space-y-2">
          <Label htmlFor="short_name">
            Short Name <span className="text-red-500">*</span>
          </Label>
          <Input
            id="short_name"
            {...register('short_name')}
            placeholder="e.g., Giant Pumpkin"
          />
          {errors.short_name && (
            <p className="text-sm text-red-500">{errors.short_name.message}</p>
          )}
        </div>

        {/* Season */}
        <div className="space-y-2">
          <Label htmlFor="season">
            Season <span className="text-red-500">*</span>
          </Label>
          <Select
            value={watch('season')}
            onValueChange={(value) => setValue('season', value)}
          >
            <SelectTrigger id="season">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SEASONS.map((season) => (
                <SelectItem key={season} value={season}>
                  {season}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.season && (
            <p className="text-sm text-red-500">{errors.season.message}</p>
          )}
        </div>

        {/* Status */}
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select
            value={watch('status')}
            onValueChange={(value) => setValue('status', value)}
          >
            <SelectTrigger id="status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Date Acquired */}
        <div className="space-y-2">
          <Label htmlFor="date_acquired">Date Acquired</Label>
          <Input
            id="date_acquired"
            {...register('date_acquired')}
            placeholder="2025"
          />
        </div>
      </div>

      {/* Conditional Fields */}
      {requiredFields.length > 0 && (
        <div className="border-t pt-6">
          <h3 className="text-lg font-medium mb-4">Additional Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {requiredFields.includes('stakes') && (
              <div className="space-y-2">
                <Label htmlFor="stakes">Stakes</Label>
                <Input
                  id="stakes"
                  {...register('stakes')}
                  placeholder="Number of stakes"
                />
              </div>
            )}

            {requiredFields.includes('tethers') && (
              <div className="space-y-2">
                <Label htmlFor="tethers">Tethers</Label>
                <Input
                  id="tethers"
                  {...register('tethers')}
                  placeholder="Number of tethers"
                />
              </div>
            )}

            {requiredFields.includes('height_length') && (
              <div className="space-y-2">
                <Label htmlFor="height_length">Height/Length</Label>
                <Input
                  id="height_length"
                  {...register('height_length')}
                  placeholder="e.g., 12 ft"
                />
              </div>
            )}

            {requiredFields.includes('male_ends') && (
              <div className="space-y-2">
                <Label htmlFor="male_ends">Male Ends</Label>
                <Input
                  id="male_ends"
                  {...register('male_ends')}
                  placeholder="Number of male ends"
                />
              </div>
            )}

            {requiredFields.includes('female_ends') && (
              <div className="space-y-2">
                <Label htmlFor="female_ends">Female Ends</Label>
                <Input
                  id="female_ends"
                  {...register('female_ends')}
                  placeholder="Number of female ends"
                />
              </div>
            )}

            {requiredFields.includes('length') && (
              <div className="space-y-2">
                <Label htmlFor="length">Length</Label>
                <Input
                  id="length"
                  {...register('length')}
                  placeholder="e.g., 25 ft"
                />
              </div>
            )}

            {requiredFields.includes('color') && (
              <div className="space-y-2">
                <Label htmlFor="color">Color</Label>
                <Input
                  id="color"
                  {...register('color')}
                  placeholder="e.g., Orange"
                />
              </div>
            )}

            {requiredFields.includes('bulb_type') && (
              <div className="space-y-2">
                <Label htmlFor="bulb_type">Bulb Type</Label>
                <Input
                  id="bulb_type"
                  {...register('bulb_type')}
                  placeholder="e.g., LED"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* General Notes */}
      <div className="space-y-2">
        <Label htmlFor="general_notes">General Notes</Label>
        <textarea
          id="general_notes"
          {...register('general_notes')}
          className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          placeholder="Additional notes..."
        />
      </div>

      {/* Form Actions */}
      <div className="flex gap-4 justify-end pt-6 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={() => window.history.back()}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Saving...' : defaultValues ? 'Save Changes' : 'Create Item'}
        </Button>
      </div>
    </form>
  )
}
