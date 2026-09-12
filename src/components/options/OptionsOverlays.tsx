import { AddRoundDrawer } from "~components/interviews/AddRoundDrawer"
import { AdvanceRoundPrompt } from "~components/options/AdvanceRoundPrompt"
import { PromptDialog } from "~components/PromptDialog"
import type {
  PerplexityDialogState,
  PromptDialogState,
  RoundDrawerState
} from "~types/options"
import type { SavedApplication } from "~types/userProfile"

interface Props {
  apps: SavedApplication[]
  roundDrawer: RoundDrawerState
  showAdvancePrompt: boolean
  dialogState: PromptDialogState
  dialogPrompt: string
  perplexityDialogState: PerplexityDialogState
  perplexityDialogPrompt: string
  onCloseDialog: () => void
  onSaveDialog: (prompt: string) => void
  onClosePerplexityDialog: () => void
  onSavePerplexityDialog: (prompt: string) => void
  onCloseRoundDrawer: () => void
  onAddAdvancedRound: () => void
  onDismissAdvance: () => void
}

export function OptionsOverlays({
  apps,
  roundDrawer,
  showAdvancePrompt,
  dialogState,
  dialogPrompt,
  perplexityDialogState,
  perplexityDialogPrompt,
  onCloseDialog,
  onSaveDialog,
  onClosePerplexityDialog,
  onSavePerplexityDialog,
  onCloseRoundDrawer,
  onAddAdvancedRound,
  onDismissAdvance
}: Props) {
  return (
    <>
      <PromptDialog
        isOpen={dialogState.isOpen}
        title={dialogState.title}
        prompt={dialogPrompt}
        onClose={onCloseDialog}
        onSave={onSaveDialog}
      />

      <PromptDialog
        isOpen={perplexityDialogState.isOpen}
        title={perplexityDialogState.title}
        prompt={perplexityDialogPrompt}
        onClose={onClosePerplexityDialog}
        onSave={onSavePerplexityDialog}
      />

      {roundDrawer && (
        <AddRoundDrawer
          mode={roundDrawer.mode}
          apps={apps}
          presetAppId={
            roundDrawer.mode === "create" ? roundDrawer.presetAppId : undefined
          }
          presetType={
            roundDrawer.mode === "create" ? roundDrawer.presetType : undefined
          }
          editRef={roundDrawer.editRef}
          onClose={onCloseRoundDrawer}
        />
      )}

      {showAdvancePrompt && (
        <AdvanceRoundPrompt
          onAdd={onAddAdvancedRound}
          onDismiss={onDismissAdvance}
        />
      )}
    </>
  )
}
