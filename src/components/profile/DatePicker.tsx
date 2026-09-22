import type { ChangeEvent } from "react"

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
  const handleDateChange = (e: ChangeEvent<HTMLInputElement>) => {
    const date = e.target.value
    onChange(date || null)
  }

  const handleCurrentPositionChange = (e: ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked
    onCurrentPositionChange?.(isChecked)
    if (isChecked) {
      onChange(null)
    }
  }

  return (
    <div>
      <label className="aa-label">
        {label}
        {required && <span className="text-aa-error-strong ml-1">*</span>}
      </label>

      <input
        type="date"
        value={value || ""}
        onChange={handleDateChange}
        disabled={currentPosition}
        required={required && !currentPosition}
        className="w-full px-3 py-2.5 bg-aa-surface border border-aa-border rounded-aa-md text-aa-text-primary text-sm
                 focus:outline-none focus:border-aa-primary transition-colors
                 disabled:bg-aa-neutral-100 disabled:text-aa-text-disabled disabled:cursor-not-allowed"
      />

      {showCurrentPosition && (
        <label className="flex items-center mt-2 gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={currentPosition}
            onChange={handleCurrentPositionChange}
            className="w-4 h-4 accent-aa-primary"
          />
          <span className="text-sm text-aa-text-primary">Current position</span>
        </label>
      )}
    </div>
  )
}
