import React, { useState } from "react"

interface ArrayInputProps<T> {
  items: T[]
  onAdd: () => void
  onUpdate: (index: number, item: T) => void
  onRemove: (index: number) => void
  renderItem: (
    item: T,
    index: number,
    onUpdate: (item: T) => void
  ) => React.ReactNode
  renderSummary?: (item: T, index: number) => React.ReactNode
  emptyMessage: string
  addButtonText: string
}

export function ArrayInput<T>({
  items,
  onAdd,
  onUpdate,
  onRemove,
  renderItem,
  renderSummary,
  emptyMessage,
  addButtonText
}: ArrayInputProps<T>) {
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set())

  const toggleExpanded = (index: number) => {
    const newExpanded = new Set(expandedItems)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedItems(newExpanded)
  }

  return (
    <div className="space-y-4">
      {items.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500 mb-4">{emptyMessage}</p>
          <button
            onClick={onAdd}
            className="bg-purple-100 text-purple-700 px-4 py-2 rounded-lg
                     hover:bg-purple-200 transition-colors font-medium">
            + {addButtonText}
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {items.map((item, index) => (
              <div
                key={index}
                className={`bg-white border rounded-lg transition-all
                  ${expandedItems.has(index)
                    ? "border-purple-300 shadow-sm"
                    : "border-gray-200 hover:border-gray-300 hover:shadow-sm"}`}>
                {/* Accordion header */}
                <div className="flex items-center gap-2 px-4 py-3">
                  <button
                    onClick={() => toggleExpanded(index)}
                    className="flex-1 flex items-center gap-3 min-w-0 text-left group">
                    <svg
                      className={`w-4 h-4 shrink-0 text-gray-400 transition-transform duration-150
                        ${expandedItems.has(index) ? "rotate-90 text-purple-500" : "group-hover:text-gray-600"}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                    {renderSummary ? (
                      renderSummary(item, index)
                    ) : (
                      <span className="text-sm text-gray-600">
                        {expandedItems.has(index) ? "Collapse" : "Expand"}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => onRemove(index)}
                    className="shrink-0 p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50
                               rounded-md transition-colors"
                    title="Delete item">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>

                {expandedItems.has(index) && (
                  <div className="px-4 pb-4 border-t border-gray-100 pt-4">
                    {renderItem(item, index, (updatedItem) =>
                      onUpdate(index, updatedItem)
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          <button
            onClick={onAdd}
            className="w-full py-3 border-2 border-dashed border-gray-300
                     rounded-lg text-gray-600 hover:border-purple-400
                     hover:text-purple-600 transition-colors font-medium">
            + Add {addButtonText}
          </button>
        </>
      )}
    </div>
  )
}
