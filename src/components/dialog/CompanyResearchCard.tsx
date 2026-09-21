import { Building2, ChevronRight, Users } from "lucide-react"

import type { CompanyInfo } from "~api/perplexityClient"

interface Props {
  companyName: string
  info: CompanyInfo | null
  isLoading: boolean
  /** Why research produced nothing, shown in place of the card's contents. */
  error: string
  projectsExpanded: boolean
  onToggleProjects: () => void
}

export function CompanyResearchCard({
  companyName,
  info,
  isLoading,
  error,
  projectsExpanded,
  onToggleProjects
}: Props) {
  return (
    <div className="rounded-aa-lg p-aa-4 flex flex-col gap-aa-3">
      {isLoading ? (
        <div className="flex items-center gap-aa-2 animate-pulse">
          <Building2 className="w-4 h-4 text-aa-neutral-500" />
          <span className="text-aa-sm font-semibold text-aa-text-primary">
            Researching {companyName}...
          </span>
        </div>
      ) : error ? (
        <p className="aa-section-error">{error}</p>
      ) : (
        info && (
          <>
            <div className="flex items-center gap-aa-2">
              <Building2 className="w-4 h-4 text-aa-neutral-500" />
              <h3 className="font-aa-heading text-aa-sm font-semibold text-aa-text-primary">
                About {companyName}
              </h3>
            </div>

            <div className="flex flex-wrap gap-aa-2">
              <span className="inline-flex items-center gap-1.5 rounded-aa-sm bg-aa-surface px-2.5 py-1.5 text-aa-11 text-aa-text-secondary">
                <Building2 className="w-3 h-3 text-aa-neutral-400" />
                {info.industry}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-aa-sm bg-aa-surface px-2.5 py-1.5 text-aa-11 text-aa-text-secondary">
                <Users className="w-3 h-3 text-aa-neutral-400" />
                {info.size}
              </span>
            </div>

            {info.description && (
              <p className="text-aa-caption text-aa-neutral-600 leading-aa-1.6">
                {info.description}
              </p>
            )}

            {info.notableProjects.length > 0 && (
              <div>
                <button
                  onClick={onToggleProjects}
                  className="flex items-center gap-1 text-aa-caption font-semibold text-aa-text-link">
                  <ChevronRight
                    className="w-3 h-3 transition-transform duration-200"
                    style={{
                      transform: projectsExpanded
                        ? "rotate(90deg)"
                        : "rotate(0deg)"
                    }}
                  />
                  Notable projects / products ({info.notableProjects.length})
                </button>
                {projectsExpanded && (
                  <ul className="list-disc list-inside text-aa-caption text-aa-neutral-600 space-y-1 pl-1 mt-2">
                    {info.notableProjects.map((project, index) => (
                      <li key={`${project}-${index}`}>{project}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {(info.ratings.glassdoor ||
              info.ratings.indeed ||
              info.ratings.teamlyzer) && (
              <div className="flex flex-wrap gap-2">
                {info.ratings.glassdoor && (
                  <span className="inline-flex items-center gap-1 rounded-aa-sm bg-aa-surface px-2.5 py-1.5 text-aa-11">
                    <span className="text-aa-text-secondary">Glassdoor</span>
                    <span
                      className={
                        info.ratings.glassdoor >= 3.5
                          ? "text-aa-success-strong"
                          : "text-aa-error-strong"
                      }>
                      {info.ratings.glassdoor}★
                    </span>
                  </span>
                )}
                {info.ratings.indeed && (
                  <span className="inline-flex items-center gap-1 rounded-aa-sm bg-aa-surface px-2.5 py-1.5 text-aa-11">
                    <span className="text-aa-text-secondary">Indeed</span>
                    <span
                      className={
                        info.ratings.indeed >= 3.5
                          ? "text-aa-success-strong"
                          : "text-aa-error-strong"
                      }>
                      {info.ratings.indeed}★
                    </span>
                  </span>
                )}
                {info.ratings.teamlyzer && (
                  <span className="inline-flex items-center gap-1 rounded-aa-sm bg-aa-surface px-2.5 py-1.5 text-aa-11">
                    <span className="text-aa-text-secondary">Teamlyzer</span>
                    <span
                      className={
                        info.ratings.teamlyzer >= 3.5
                          ? "text-aa-success-strong"
                          : "text-aa-error-strong"
                      }>
                      {info.ratings.teamlyzer}★
                    </span>
                  </span>
                )}
              </div>
            )}
          </>
        )
      )}
    </div>
  )
}
