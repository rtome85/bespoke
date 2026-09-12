import { useState } from "react"

import {
  PROMPT_TEMPLATES,
  type CustomPrompts,
  type PerplexityConfig,
  type PromptTemplate
} from "~types/config"
import type {
  PerplexityDialogState,
  PerplexityPromptType,
  PromptDialogState
} from "~types/options"

type StorageSetter<T> = (value: T | ((previous: T) => T)) => void

interface Args {
  customPrompts: CustomPrompts
  perplexityConfig: PerplexityConfig
  setCustomPrompts: StorageSetter<CustomPrompts>
  setPerplexityConfig: StorageSetter<PerplexityConfig>
}

export function usePromptConfiguration({
  customPrompts,
  perplexityConfig,
  setCustomPrompts,
  setPerplexityConfig
}: Args) {
  const [dialogState, setDialogState] = useState<PromptDialogState>({
    isOpen: false,
    title: "",
    promptKey: null
  })
  const [perplexityDialogState, setPerplexityDialogState] =
    useState<PerplexityDialogState>({
      isOpen: false,
      title: "",
      promptType: null
    })

  const changePrompt = (key: keyof CustomPrompts, value: string) => {
    setCustomPrompts({ ...customPrompts, [key]: value })
  }

  const openPromptDialog = (title: string, promptKey: keyof CustomPrompts) => {
    setDialogState({ isOpen: true, title, promptKey })
  }

  const closePromptDialog = () => {
    setDialogState({ isOpen: false, title: "", promptKey: null })
  }

  const savePromptFromDialog = (prompt: string) => {
    if (!dialogState.promptKey) return
    setCustomPrompts({ ...customPrompts, [dialogState.promptKey]: prompt })
  }

  const openPerplexityDialog = (
    title: string,
    promptType: PerplexityPromptType
  ) => {
    setPerplexityDialogState({ isOpen: true, title, promptType })
  }

  const closePerplexityDialog = () => {
    setPerplexityDialogState({ isOpen: false, title: "", promptType: null })
  }

  const savePerplexityPromptFromDialog = (prompt: string) => {
    if (perplexityDialogState.promptType === "research") {
      setPerplexityConfig({ ...perplexityConfig, customPrompt: prompt })
    } else if (perplexityDialogState.promptType === "preparation") {
      setPerplexityConfig({
        ...perplexityConfig,
        interviewPrepPrompt: prompt
      })
    }
  }

  const activeTemplateName = PROMPT_TEMPLATES.find(
    (template) =>
      template.prompts.resumeSystemPrompt ===
        customPrompts.resumeSystemPrompt &&
      template.prompts.resumeUserPromptTemplate ===
        customPrompts.resumeUserPromptTemplate &&
      template.prompts.coverLetterSystemPrompt ===
        customPrompts.coverLetterSystemPrompt &&
      template.prompts.coverLetterUserPromptTemplate ===
        customPrompts.coverLetterUserPromptTemplate
  )?.name

  const applyTemplate = (template: PromptTemplate) => {
    if (
      activeTemplateName === undefined &&
      !confirm(
        `Apply "${template.name}"? This will overwrite your current custom prompts.`
      )
    ) {
      return
    }
    setCustomPrompts(template.prompts)
  }

  return {
    dialogState,
    perplexityDialogState,
    activeTemplateName,
    changePrompt,
    openPromptDialog,
    closePromptDialog,
    savePromptFromDialog,
    openPerplexityDialog,
    closePerplexityDialog,
    savePerplexityPromptFromDialog,
    applyTemplate
  }
}
