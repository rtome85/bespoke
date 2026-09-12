import { PromptEditorField } from "~components/options/PromptEditorField"
import { PromptTemplateCard } from "~components/options/PromptTemplateCard"
import {
  CARD_CLASS,
  DIVIDER_CLASS,
  OUTLINE_BUTTON_CLASS,
  SECTION_HEADING_CLASS
} from "~constants/options"
import {
  DEFAULT_INTERVIEW_PREP_PROMPT,
  PROMPT_TEMPLATES,
  type CustomPrompts,
  type PerplexityConfig,
  type PromptTemplate
} from "~types/config"
import type { PerplexityPromptType } from "~types/options"

interface Props {
  customPrompts: CustomPrompts
  perplexityConfig: PerplexityConfig
  activeTemplateName: string | undefined
  onApplyTemplate: (template: PromptTemplate) => void
  onResetPrompts: () => void
  onChangePrompt: (key: keyof CustomPrompts, value: string) => void
  onChangePerplexity: (config: PerplexityConfig) => void
  onOpenPrompt: (title: string, key: keyof CustomPrompts) => void
  onOpenPerplexityPrompt: (
    title: string,
    promptType: PerplexityPromptType
  ) => void
}

const CUSTOM_PROMPT_FIELDS = [
  {
    key: "resumeSystemPrompt" as keyof CustomPrompts,
    label: "Resume system prompt",
    hint: "Defines how the AI behaves when generating resumes."
  },
  {
    key: "resumeUserPromptTemplate" as keyof CustomPrompts,
    label: "Resume user prompt template",
    hint: "Use {{companyName}}, {{jobTitle}}, {{jobDescription}}, and {{userProfile}} as placeholders."
  },
  {
    key: "coverLetterSystemPrompt" as keyof CustomPrompts,
    label: "Cover letter system prompt",
    hint: "Defines how the AI behaves when generating cover letters."
  },
  {
    key: "coverLetterUserPromptTemplate" as keyof CustomPrompts,
    label: "Cover letter user prompt template",
    hint: "Use {{companyName}}, {{jobTitle}}, {{jobDescription}}, and {{userProfile}} as placeholders."
  }
] as const

export function PromptsSettingsScreen({
  customPrompts,
  perplexityConfig,
  activeTemplateName,
  onApplyTemplate,
  onResetPrompts,
  onChangePrompt,
  onChangePerplexity,
  onOpenPrompt,
  onOpenPerplexityPrompt
}: Props) {
  return (
    <div className="space-y-6">
      <div className={CARD_CLASS}>
        <h2 className={SECTION_HEADING_CLASS}>Start from a preset</h2>
        <p className="text-sm text-aa-text-secondary -mt-1 mb-4">
          Applying a preset overwrites the custom prompts below.
        </p>
        <hr className={DIVIDER_CLASS} />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PROMPT_TEMPLATES.map((template) => (
            <PromptTemplateCard
              key={template.id}
              template={template}
              isActive={activeTemplateName === template.name}
              onApply={() => onApplyTemplate(template)}
            />
          ))}
        </div>
      </div>

      <div className={CARD_CLASS}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className={SECTION_HEADING_CLASS}>Custom prompts</h2>
            <p className="text-sm text-aa-text-secondary -mt-1">
              Override the system and user prompts sent to the model.
            </p>
          </div>
          <button
            type="button"
            onClick={onResetPrompts}
            className={OUTLINE_BUTTON_CLASS}>
            Reset to defaults
          </button>
        </div>
        <hr className={DIVIDER_CLASS} />
        <div className="space-y-6">
          {CUSTOM_PROMPT_FIELDS.map(({ key, label, hint }) => (
            <PromptEditorField
              key={key}
              id={`prompt-${key}`}
              label={label}
              hint={hint}
              value={customPrompts[key]}
              rows={4}
              onChange={(value) => onChangePrompt(key, value)}
              onExpand={() => onOpenPrompt(label, key)}
            />
          ))}
        </div>
      </div>

      <div className={CARD_CLASS}>
        <h2 className={SECTION_HEADING_CLASS}>Company research</h2>
        <p className="text-sm text-aa-text-secondary -mt-1 mb-4">
          Runs on Perplexity Sonar to fill the "About the company" section of
          the report. Connect Perplexity on the Providers page.
        </p>
        <hr className={DIVIDER_CLASS} />
        <PromptEditorField
          id="company-research-prompt"
          label="Research prompt"
          hint={"Use {{companyName}} as a placeholder for the company name."}
          value={perplexityConfig.customPrompt}
          rows={6}
          onChange={(customPrompt) =>
            onChangePerplexity({ ...perplexityConfig, customPrompt })
          }
          onExpand={() => onOpenPerplexityPrompt("Research Prompt", "research")}
        />
      </div>

      <div className={CARD_CLASS}>
        <h2 className={SECTION_HEADING_CLASS}>Interview prep</h2>
        <p className="text-sm text-aa-text-secondary -mt-1 mb-4">
          Feeds the per-round Prep workspace (Interviews → Prep). Runs on your
          Document&nbsp;drafting model and must return JSON with{" "}
          <code className="text-[12px]">likelyTopics</code> and{" "}
          <code className="text-[12px]">talkingPoints</code> arrays.
        </p>
        <hr className={DIVIDER_CLASS} />
        <PromptEditorField
          id="interview-prep-prompt"
          label="Prep prompt"
          hint="Use {{roundType}}, {{companyName}}, {{jobTitle}}, {{jobDescription}}, and {{userProfile}} as placeholders."
          value={
            perplexityConfig.interviewPrepPrompt ??
            DEFAULT_INTERVIEW_PREP_PROMPT
          }
          rows={8}
          onChange={(interviewPrepPrompt) =>
            onChangePerplexity({ ...perplexityConfig, interviewPrepPrompt })
          }
          onExpand={() =>
            onOpenPerplexityPrompt("Interview prep prompt", "preparation")
          }
        />
      </div>
    </div>
  )
}
