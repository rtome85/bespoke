import type { Dispatch, SetStateAction } from "react"

import { APPLICATION_STATUSES } from "~constants/applications"
import type { SaveApplicationFormData } from "~types/dialog"
import type { ApplicationStatus } from "~types/userProfile"

interface Props {
  formData: SaveApplicationFormData
  setFormData: Dispatch<SetStateAction<SaveApplicationFormData>>
}

export function ApplicationDetailsFields({ formData, setFormData }: Props) {
  return (
    <div className="space-y-4">
      <div>
        <label
          htmlFor="save-application-company"
          className="aa-field-label">
          Company *
        </label>
        <input
          id="save-application-company"
          type="text"
          value={formData.company}
          onChange={(event) =>
            setFormData((current) => ({
              ...current,
              company: event.target.value
            }))
          }
          className="aa-field-input"
        />
      </div>

      <div>
        <label
          htmlFor="save-application-job-title"
          className="aa-field-label">
          Job title *
        </label>
        <input
          id="save-application-job-title"
          type="text"
          value={formData.jobTitle}
          onChange={(event) =>
            setFormData((current) => ({
              ...current,
              jobTitle: event.target.value
            }))
          }
          className="aa-field-input"
        />
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <label
            htmlFor="save-application-status"
            className="aa-field-label">
            Status
          </label>
          <select
            id="save-application-status"
            value={formData.status}
            onChange={(event) =>
              setFormData((current) => ({
                ...current,
                status: event.target.value as ApplicationStatus
              }))
            }
            className="aa-field-input">
            {APPLICATION_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label
            htmlFor="save-application-date"
            className="aa-field-label">
            Date applied *
          </label>
          <input
            id="save-application-date"
            type="date"
            value={formData.date}
            onChange={(event) =>
              setFormData((current) => ({
                ...current,
                date: event.target.value
              }))
            }
            className="aa-field-input"
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="save-application-job-url"
          className="aa-field-label">
          Job posting URL
        </label>
        <input
          id="save-application-job-url"
          type="url"
          value={formData.jobUrl}
          onChange={(event) =>
            setFormData((current) => ({
              ...current,
              jobUrl: event.target.value
            }))
          }
          placeholder="https://…"
          className="aa-field-input"
        />
      </div>
    </div>
  )
}
