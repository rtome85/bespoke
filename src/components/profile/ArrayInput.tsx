import { Pencil, Plus, Trash2 } from "lucide-react"
import { useState } from "react"
import type { ReactNode } from "react"

interface ArrayInputProps<T> {
  items: T[]
  getItemKey: (item: T) => string
  onAdd: () => void
  onUpdate: (index: number, item: T) => void
  onRemove: (index: number) => void
  renderItem: (item: T, index: number, onUpdate: (item: T) => void) => ReactNode
  renderSummary?: (item: T, index: number) => ReactNode
  emptyMessage: string
  addButtonText: string
  /** Flush chrome: bare hairline rows, for a caller that supplies its own
   *  .aa-card-base surface, section title and add button (see .aa-list-row in
   *  style.css). The Education, Experience and Projects screens use it; the
   *  other profile lists still render the boxed rows below. */
  flush?: boolean
}

export function ArrayInput<T>({
  items,
  getItemKey,
  onAdd,
  onUpdate,
  onRemove,
  renderItem,
  renderSummary,
  emptyMessage,
  addButtonText,
  flush = false
}: ArrayInputProps<T>) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())

  const toggleExpanded = (key: string) => {
    const newExpanded = new Set(expandedItems)
    if (newExpanded.has(key)) {
      newExpanded.delete(key)
    } else {
      newExpanded.add(key)
    }
    setExpandedItems(newExpanded)
  }

  if (items.length === 0) {
    return flush ? (
      // No button here: a flush caller renders its own add button in the
      // section header, which shows whether or not the list has entries.
      <div className="aa-list-empty">
        <p className="text-aa-13 text-aa-text-secondary">{emptyMessage}</p>
      </div>
    ) : (
      <div className="rounded-aa-md border border-aa-border bg-aa-neutral-50 py-8 text-center">
        <p className="text-sm text-aa-text-secondary mb-4">{emptyMessage}</p>
        <button onClick={onAdd} className="aa-btn-accent">
          Add {addButtonText}
        </button>
      </div>
    )
  }

  if (flush) {
    return (
      <div>
        {items.map((item, index) => {
          const key = getItemKey(item)
          const isExpanded = expandedItems.has(key)
          return (
            <div key={key}>
              <div className="aa-list-row">
                {renderSummary ? (
                  renderSummary(item, index)
                ) : (
                  <span className="flex-1 text-sm text-aa-text-secondary">
                    {isExpanded ? "Collapse" : "Expand"}
                  </span>
                )}

                <div className="flex items-center gap-0.5">
                  <button
                    onClick={() => toggleExpanded(key)}
                    className="aa-list-row-action"
                    title={isExpanded ? "Close" : "Edit item"}>
                    <Pencil className="w-aa-px-15 h-aa-px-15" />
                  </button>

                  <button
                    onClick={() => onRemove(index)}
                    className="aa-list-row-action hover:text-aa-error-strong"
                    title="Delete item">
                    <Trash2 className="w-aa-px-15 h-aa-px-15" />
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="aa-list-panel">
                  {renderItem(item, index, (updatedItem) =>
                    onUpdate(index, updatedItem)
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {items.map((item, index) => {
        const key = getItemKey(item)
        const isExpanded = expandedItems.has(key)
        return (
          <div
            key={key}
            className="rounded-aa-md border border-aa-border bg-aa-surface">
            <div className="flex items-center gap-3 px-3.5 py-3">
              {renderSummary ? (
                renderSummary(item, index)
              ) : (
                <span className="flex-1 text-sm text-aa-text-secondary">
                  {isExpanded ? "Collapse" : "Expand"}
                </span>
              )}

              <button
                onClick={() => toggleExpanded(key)}
                className="shrink-0 text-aa-neutral-500 hover:text-aa-text-primary transition-colors"
                title={isExpanded ? "Close" : "Edit item"}>
                <Pencil className="w-aa-px-15 h-aa-px-15" />
              </button>

              <button
                onClick={() => onRemove(index)}
                className="shrink-0 text-aa-neutral-400 hover:text-aa-error-strong transition-colors"
                title="Delete item">
                <Trash2 className="w-aa-px-15 h-aa-px-15" />
              </button>
            </div>

            {isExpanded && (
              <div className="px-3.5 pb-4 border-t border-aa-border pt-4">
                {renderItem(item, index, (updatedItem) =>
                  onUpdate(index, updatedItem)
                )}
              </div>
            )}
          </div>
        )
      })}

      <button
        onClick={onAdd}
        className={`w-full flex items-center justify-center gap-2 aa-btn-outline`}>
        <Plus className="w-aa-px-15 h-aa-px-15" />
        Add {addButtonText}
      </button>
    </div>
  )
}
