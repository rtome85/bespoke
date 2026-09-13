import React from "react"

interface DatePickerProps {
  label: string
  value: string | null
  onChange: (date: string | null) => void
  required?: boolean
  showCurrentPosition?: boolean
  currentPosition?: boolean
  onCurrentPositionChange?: (checked: boolean) => void
}

export function DatePicker({
  label,
  value,
  onChange,
  required = false,
  showCurrentPosition = false,
  currentPosition = false,
  onCurrentPositionChange
}: DatePickerProps) {
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = e.target.value
    onChange(date || null)
  }

  const handleCurrentPositionChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const isChecked = e.target.checked
    onCurrentPositionChange?.(isChecked)
    if (isChecked) {
      onChange(null)
    }
  }

  return (
    <div className="space-y-2">
      <label className="block text-[11px] font-semibold uppercase tracking-widest text-ink-secondary">
        {label}
        {required && <span className="text-[#991b1b] ml-1">*</span>}
      </label>

      <input
        type="date"
        value={value || ""}
        onChange={handleDateChange}
        disabled={currentPosition}
        required={required && !currentPosition}
        className="w-full px-4 py-3 bg-white border border-canvas-input-border text-ink text-sm
                 focus:outline-none focus:border-ink transition-colors
                 disabled:bg-canvas-divide disabled:text-ink-muted disabled:cursor-not-allowed"
      />

      {showCurrentPosition && (
        <label className="flex items-center mt-2 gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={currentPosition}
            onChange={handleCurrentPositionChange}
            className="w-4 h-4 accent-sidebar-accent"
          />
          <span className="text-sm text-ink">Current Position</span>
        </label>
      )}
    </div>
  )
}
