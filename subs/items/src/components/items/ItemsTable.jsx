import React, { useMemo, useState } from 'react'
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { ArrowUpDown, Pencil } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { useUpdateItem } from '@/hooks/useUpdateItem'
import { SEASONS, STATUSES } from '@/lib/constants'
import { cn } from '@/lib/utils'

export function ItemsTable({ items = [] }) {
  const navigate = useNavigate()
  const { mutate: updateItem } = useUpdateItem()
  const [editingCell, setEditingCell] = useState(null)
  const [sorting, setSorting] = useState([])

  console.log('ItemsTable - items:', items.length);

  const handleInlineEdit = (itemId, field, value) => {
    updateItem({ id: itemId, data: { [field]: value } })
    setEditingCell(null)
  }

  const columns = useMemo(
    () => [
      {
        accessorKey: 'primary_image_url',
        header: '',
        cell: ({ row }) => (
          <div className="w-10 h-10 flex-shrink-0">
            {row.original.primary_image_url ? (
              <img
                src={row.original.primary_image_url}
                alt={row.original.short_name}
                className="w-10 h-10 object-cover rounded"
              />
            ) : (
              <div className="w-10 h-10 bg-slate-200 rounded flex items-center justify-center text-slate-400 text-xs">
                No img
              </div>
            )}
          </div>
        ),
        enableSorting: false,
      },
      {
        accessorKey: 'id',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="hover:bg-slate-100"
          >
            ID
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
      },
      {
        accessorKey: 'class',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="hover:bg-slate-100"
          >
            Class
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
      },
      {
        accessorKey: 'class_type',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="hover:bg-slate-100"
          >
            Type
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
      },
      {
        accessorKey: 'short_name',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="hover:bg-slate-100"
          >
            Name
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
      },
      {
        accessorKey: 'season',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="hover:bg-slate-100"
          >
            Season
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
      },
      {
        accessorKey: 'status',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="hover:bg-slate-100"
          >
            Status
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
      },
      {
        accessorKey: 'date_acquired',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="hover:bg-slate-100"
          >
            Acquired
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
      },
    ],
    []
  )

  const table = useReactTable({
    data: items,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  const { rows } = table.getRowModel()

  return (
    <div className="rounded-lg shadow-md bg-white border border-slate-200 overflow-hidden">
      {/* Desktop: Simple Table (no virtual scroll for now) */}
      <div className="hidden md:block">
        <div className="overflow-auto max-h-[600px]">
          <table className="w-full">
            <thead className="bg-slate-50 border-b-2 border-slate-200 sticky top-0 z-10">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider"
                    >
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {rows.map((row, idx) => {
                const isEven = idx % 2 === 0
                return (
                  <tr
                    key={row.id}
                    className={cn(
                      "cursor-pointer border-b border-slate-100 transition-colors duration-150",
                      isEven ? "bg-white hover:bg-slate-100" : "bg-slate-50 hover:bg-slate-100"
                    )}
                    onClick={() => navigate(`/items/${row.original.id}`)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className="px-6 py-4 whitespace-nowrap text-slate-700"
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile: Card view */}
      <div className="md:hidden space-y-2 p-4">
        {rows.map((row) => {
          const item = row.original
          return (
            <div
              key={item.id}
              className="p-4 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 cursor-pointer transition-colors"
              onClick={() => navigate(`/items/${item.id}`)}
            >
              <div className="flex gap-3">
                <div className="w-16 h-16 flex-shrink-0">
                  {item.primary_image_url ? (
                    <img
                      src={item.primary_image_url}
                      alt={item.short_name}
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 text-xs">
                      No img
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-800 truncate">
                    {item.short_name}
                  </h3>
                  <p className="text-sm text-slate-600 mt-1">
                    {item.class_type} • {item.season}
                  </p>
                  <div className="mt-2">
                    <span className={cn(
                      'px-3 py-1 rounded-full text-xs font-medium',
                      item.status === 'Active' && 'bg-emerald-50 text-emerald-700 border border-emerald-200',
                      item.status === 'Retired' && 'bg-slate-50 text-slate-700 border border-slate-200'
                    )}>
                      {item.status}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
