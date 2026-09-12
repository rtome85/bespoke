import { Sparkles, X } from "lucide-react"
import type { Dispatch, SetStateAction } from "react"

import { ApplicationDetailsFields } from "~components/dialog/ApplicationDetailsFields"
import { ApplicationTagsField } from "~components/dialog/ApplicationTagsField"
import {
  FORM_FIELD_INPUT_CLASS,
  FORM_FIELD_LABEL_CLASS
} from "~constants/dialog"
import type { SaveApplicationFormData } from "~types/dialog"
import type { SavedApplication } from "~types/userProfile"

interface Props {
  editingApplication: SavedApplication | null
  formData: SaveApplicationFormData
  setFormData: Dispatch<SetStateAction<SaveApplicationFormData>>
  saveDocuments: boolean
  showSaveDocuments: boolean
  error: string
  generatingDocuments: boolean
  documentGenerationError: string
  onSaveDocumentsChange: (value: boolean) => void
  onGenerateDocuments: () => void
  onSave: () => void
  onClose: () => void
}

export function SaveApplicationScreen({
  editingApplication,
  formData,
  setFormData,
  saveDocuments,
  showSaveDocuments,
  error,
  generatingDocuments,
  documentGenerationError,
  onSaveDocumentsChange,
  onGenerateDocuments,
  onSave,
  onClose
}: Props) {
  return (
    <div className="min-h-screen bg-aa-surface-subtle flex flex-col font-aa text-aa-text-primary">
      <div className="h-[60px] shrink-0 bg-aa-surface px-6 flex items-center justify-between border-b border-aa-border">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-[17px] font-bold tracking-[-0.3px] text-aa-text-primary leading-none">
            {editingApplication ? "Edit application" : "Save application"}
          </h1>
          <p className="text-[12px] text-aa-text-secondary leading-none">
            Keep your pipeline up to date
          </p>
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          className="w-8 h-8 grid place-items-center rounded-aa-md bg-aa-neutral-100 text-aa-text-secondary hover:bg-aa-neutral-200 transition-colors">
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 px-6 py-8 overflow-auto flex justify-center">
        <div className="w-full max-w-lg space-y-5">
          <ApplicationDetailsFields
            formData={formData}
            setFormData={setFormData}
          />

          <div className="border-t border-aa-border" />

          <ApplicationTagsField formData={formData} setFormData={setFormData} />

          <div>
            <label className={FORM_FIELD_LABEL_CLASS}>Notes</label>
            <textarea
              rows={3}
              value={formData.notes}
              onChange={(event) =>
                setFormData((current) => ({
                  ...current,
                  notes: event.target.value
                }))
              }
              placeholder="Interview notes, contacts, reminders…"
              className={`${FORM_FIELD_INPUT_CLASS} resize-none`}
            />
          </div>

          {showSaveDocuments && (
            <label className="flex items-center gap-2.5 text-[13px] text-aa-text-primary cursor-pointer">
              <input
                type="checkbox"
                checked={saveDocuments}
                onChange={(event) =>
                  onSaveDocumentsChange(event.target.checked)
                }
                className="w-4 h-4 accent-aa-primary"
              />
              Save resume and cover letter
            </label>
          )}

          {error && <p className="text-sm text-aa-error-strong">{error}</p>}

          {editingApplication?.jobDescription &&
            !editingApplication.resumeContent && (
              <div className="border-t border-aa-border pt-5">
                <button
                  onClick={onGenerateDocuments}
                  disabled={generatingDocuments}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5
                           bg-aa-primary text-aa-text-on-primary rounded-aa-md text-[13px] font-semibold
                           hover:bg-aa-primary-hover transition-colors
                           disabled:opacity-50 disabled:cursor-not-allowed">
                  {generatingDocuments ? (
                    <>
                      <div className="w-4 h-4 border-2 border-aa-text-on-primary/30 border-t-aa-text-on-primary rounded-full animate-spin" />
                      <span>Generating documents…</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={15} />
                      <span>Generate CV + cover letter</span>
                    </>
                  )}
                </button>
                {documentGenerationError && (
                  <p className="mt-2 text-sm text-aa-error-strong">
                    {documentGenerationError}
                  </p>
                )}
              </div>
            )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={onSave}
              className="flex-1 px-4 py-2.5 bg-aa-primary text-aa-text-on-primary rounded-aa-md text-[13px] font-semibold
                         hover:bg-aa-primary-hover transition-colors">
              Save
            </button>
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-aa-border text-aa-text-secondary rounded-aa-md text-[13px] font-semibold
                         hover:text-aa-text-primary hover:border-aa-neutral-400 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
