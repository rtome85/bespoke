import type { CompanyInfo } from "~api/perplexityClient"
import { BackLink } from "~components/BackLink"
import { CompanyResearchCard } from "~components/dialog/CompanyResearchCard"
import { DocumentGenerationControls } from "~components/dialog/DocumentGenerationControls"
import { GeneratedDocumentsCard } from "~components/dialog/GeneratedDocumentsCard"
import { MatchBreakdown } from "~components/dialog/MatchBreakdown"
import { ScoreSummaryCard } from "~components/dialog/ScoreSummaryCard"
import { StrengthenApplication } from "~components/dialog/StrengthenApplication"
import { TriageActions } from "~components/dialog/TriageActions"
import { ScoreGauge } from "~components/ScoreGauge"
import { getScorePresentation } from "~lib/dialog/scorePresentation"
import type {
  AddedGapSkills,
  GeneratedDocuments,
  GenerationResult,
  MatchAccordionSection,
  TriageDecision
} from "~types/dialog"
import type { DocumentPreviewTab } from "~types/documentPreview"

interface Props {
  fullName: string
  companyName: string
  jobTitle: string
  result: GenerationResult
  triageDecision: TriageDecision | null
  openMatchSection: MatchAccordionSection | null
  companyInfo: CompanyInfo | null
  companyInfoLoading: boolean
  projectsExpanded: boolean
  addedGapSkills: AddedGapSkills
  documentsLoading: boolean
  documentsProgress: number
  documentsError: string
  previewError: string
  onToggleMatchSection: (section: MatchAccordionSection) => void
  onToggleProjects: () => void
  onApply: () => void
  onSaveForLater: () => void
  onDiscard: () => void
  onBackToReport: () => void
  onAddGapSkill: (index: number, name: string, years: number) => void
  onGenerateDocuments: () => void
  onPreviewDocuments: (
    tab: DocumentPreviewTab,
    documents: GeneratedDocuments
  ) => void
}

export function MatchReportScreen({
  fullName,
  companyName,
  jobTitle,
  result,
  triageDecision,
  openMatchSection,
  companyInfo,
  companyInfoLoading,
  projectsExpanded,
  addedGapSkills,
  documentsLoading,
  documentsProgress,
  documentsError,
  previewError,
  onToggleMatchSection,
  onToggleProjects,
  onApply,
  onSaveForLater,
  onDiscard,
  onBackToReport,
  onAddGapSkill,
  onGenerateDocuments,
  onPreviewDocuments
}: Props) {
  const percentage = result.match.percentage
  const score = getScorePresentation(percentage)
  const documents =
    result.resumeContent &&
    result.resumeFilename &&
    result.coverLetterContent &&
    result.coverLetterFilename
      ? {
          resumeContent: result.resumeContent,
          resumeFilename: result.resumeFilename,
          coverLetterContent: result.coverLetterContent,
          coverLetterFilename: result.coverLetterFilename
        }
      : null

  return (
    <div className="min-h-screen bg-aa-surface flex flex-col font-aa text-aa-text-primary">
      <div className="flex-1 overflow-y-auto px-aa-6 pt-[36px] pb-aa-8 flex flex-col gap-aa-6">
        <div className="flex items-center justify-between gap-aa-4">
          <div className="flex flex-col gap-[6px]">
            <h1 className="text-[24px] font-bold leading-[1.2] tracking-[-0.4px] text-aa-text-primary">
              {fullName || "Match report"}
            </h1>
            <p className="text-[13px] leading-[1.4] text-aa-text-secondary">
              {jobTitle || "This role"}
              {companyName ? ` — ${companyName}` : ""}
            </p>
          </div>
          <div
            className={`overflow-hidden shrink-0 transition-all duration-500 ease-in-out ${
              triageDecision === "apply"
                ? "w-[60px] opacity-100 scale-100"
                : "w-0 opacity-0 scale-75"
            }`}>
            <ScoreGauge
              percentage={percentage}
              ringColor={score.fill}
              textColor={score.ink}
            />
          </div>
        </div>

        <div className="flex flex-col">
          <div
            className={`flex flex-col gap-aa-6 overflow-hidden transition-all duration-500 ease-in-out ${
              triageDecision === "apply"
                ? "max-h-0 opacity-0 -translate-y-2 pointer-events-none"
                : "max-h-[3000px] opacity-100 translate-y-0"
            }`}>
            <ScoreSummaryCard
              percentage={percentage}
              summary={result.match.summary}
              presentation={score}
            />
            <MatchBreakdown
              match={result.match}
              openSection={openMatchSection}
              onToggle={onToggleMatchSection}
            />
            {(companyInfo || companyInfoLoading) && (
              <CompanyResearchCard
                companyName={companyName}
                info={companyInfo}
                isLoading={companyInfoLoading}
                projectsExpanded={projectsExpanded}
                onToggleProjects={onToggleProjects}
              />
            )}
            <TriageActions
              onApply={onApply}
              onSaveForLater={onSaveForLater}
              onDiscard={onDiscard}
            />
          </div>

          <div
            className={`overflow-hidden transition-all duration-500 ease-in-out ${
              triageDecision === "apply"
                ? "max-h-[3000px] opacity-100 translate-y-0"
                : "max-h-0 opacity-0 -translate-y-2 pointer-events-none"
            }`}>
            <div className="flex flex-col gap-aa-6">
              <BackLink label="Back to report" onClick={onBackToReport} />
              <StrengthenApplication
                weaknesses={result.match.weaknesses ?? []}
                addedGapSkills={addedGapSkills}
                onAddGapSkill={onAddGapSkill}
              />
              <DocumentGenerationControls
                isLoading={documentsLoading}
                progress={documentsProgress}
                error={documentsError}
                hasDocuments={Boolean(documents)}
                onGenerate={onGenerateDocuments}
              />
              {documents && (
                <GeneratedDocumentsCard
                  documents={documents}
                  previewError={previewError}
                  onPreview={onPreviewDocuments}
                />
              )}
              {!documents && previewError && (
                <p className="text-[13px] text-aa-error-strong">
                  {previewError}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
