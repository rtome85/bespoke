import { X } from "lucide-react"
import type { FormEventHandler } from "react"

import {
  FORM_FIELD_INPUT_CLASS,
  FORM_FIELD_LABEL_CLASS
} from "~constants/dialog"
import type { RoutingLabels } from "~types/dialog"
import type { UserProfile } from "~types/userProfile"

interface Props {
  companyName: string
  jobTitle: string
  jobDescription: string
  routingLabels: RoutingLabels
  userProfile: UserProfile
  status: string
  onCompanyNameChange: (value: string) => void
  onJobTitleChange: (value: string) => void
  onJobDescriptionChange: (value: string) => void
  onSubmit: FormEventHandler<HTMLFormElement>
  onOpenSettings: () => void
  onClose: () => void
}

export function MatchFormScreen({
  companyName,
  jobTitle,
  jobDescription,
  routingLabels,
  userProfile,
  status,
  onCompanyNameChange,
  onJobTitleChange,
  onJobDescriptionChange,
  onSubmit,
  onOpenSettings,
  onClose
}: Props) {
  return (
    <div className="min-h-screen bg-aa-surface-subtle flex flex-col font-aa text-aa-text-primary">
      <div className="h-[60px] shrink-0 bg-aa-surface px-6 flex items-center justify-between border-b border-aa-border">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-[17px] font-bold tracking-[-0.3px] text-aa-text-primary leading-none">
            Check your match
          </h1>
          <p className="text-[12px] text-aa-text-secondary leading-none">
            Confirm the job details, then analyze
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
        <div className="w-full max-w-lg">
          <form onSubmit={onSubmit} className="space-y-5">
            <div>
              <label className={FORM_FIELD_LABEL_CLASS}>Company name *</label>
              <input
                type="text"
                value={companyName}
                onChange={(event) => onCompanyNameChange(event.target.value)}
                placeholder="e.g. Google, Microsoft"
                required
                className={FORM_FIELD_INPUT_CLASS}
              />
            </div>

            <div>
              <label className={FORM_FIELD_LABEL_CLASS}>Job title *</label>
              <input
                type="text"
                value={jobTitle}
                onChange={(event) => onJobTitleChange(event.target.value)}
                placeholder="e.g. Senior Software Engineer"
                required
                className={FORM_FIELD_INPUT_CLASS}
              />
            </div>

            {jobDescription && (
              <div>
                <label className={FORM_FIELD_LABEL_CLASS}>
                  Job description (extracted)
                </label>
                <textarea
                  value={jobDescription}
                  onChange={(event) =>
                    onJobDescriptionChange(event.target.value)
                  }
                  rows={8}
                  className={`${FORM_FIELD_INPUT_CLASS} resize-y`}
                />
              </div>
            )}

            <div>
              <label className={FORM_FIELD_LABEL_CLASS}>AI model</label>
              <div className="w-full px-3.5 py-2.5 bg-aa-surface border border-aa-border rounded-aa-md text-sm space-y-1">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-aa-text-secondary">Match scoring</span>
                  <span className="font-medium text-aa-text-primary">
                    {routingLabels.scoring ?? "Set in Settings"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-aa-text-secondary">
                    Document drafting
                  </span>
                  <span className="font-medium text-aa-text-primary">
                    {routingLabels.drafting ?? "Set in Settings"}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={onOpenSettings}
                className="mt-1.5 text-[11px] font-semibold text-aa-primary hover:underline">
                Change in Settings → Model routing
              </button>
            </div>

            <div className="border-t border-aa-border pt-4">
              <p className="text-[12px] text-aa-text-secondary">
                Profile: {userProfile.skills?.length ?? 0} skills,{" "}
                {userProfile.workExperience?.length ?? 0} experiences,{" "}
                {userProfile.personalProjects?.length ?? 0} projects,{" "}
                {userProfile.languages?.length ?? 0} languages
              </p>
            </div>

            <button
              type="submit"
              className="w-full px-4 py-2.5 bg-aa-primary text-aa-text-on-primary rounded-aa-md text-[13px] font-semibold hover:bg-aa-primary-hover transition-colors">
              Analyze match
            </button>
          </form>

          {status && (
            <p
              className={`mt-3 text-sm ${
                status.includes("failed") ||
                status.includes("error") ||
                status.includes("Error")
                  ? "text-aa-error-strong"
                  : "text-aa-primary"
              }`}>
              {status}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
