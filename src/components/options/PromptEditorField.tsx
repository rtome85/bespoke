
interface Props {
  id: string
  label: string
  hint: string
  value: string
  rows: number
  onChange: (value: string) => void
  onExpand: () => void
}

export function PromptEditorField({
  id,
  label,
  hint,
  value,
  rows,
  onChange,
  onExpand
}: Props) {
  return (
    <div>
      <label htmlFor={id} className="aa-label">
        {label}
      </label>
      <textarea
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        className="aa-textarea"
      />
      <div className="flex items-center justify-between mt-1">
        <p className="aa-hint">{hint}</p>
        <button
          type="button"
          onClick={onExpand}
          className="px-3 py-1 text-aa-10 font-bold uppercase tracking-widest bg-aa-primary text-aa-text-on-primary border-0 rounded-aa-sm hover:opacity-90 transition-opacity">
          Edit
        </button>
      </div>
    </div>
  )
}
