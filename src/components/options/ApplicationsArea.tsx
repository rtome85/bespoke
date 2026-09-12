import { ApplicationsList } from "~components/ApplicationsList"
import { ApplicationsOverview } from "~components/ApplicationsOverview"
import { ApplicationsRail } from "~components/ApplicationsRail"
import { DebriefsListPage } from "~components/interviews/DebriefsListPage"
import { DebriefWorkspace } from "~components/interviews/DebriefWorkspace"
import { PrepListPage } from "~components/interviews/PrepListPage"
import { PrepWorkspace } from "~components/interviews/PrepWorkspace"
import { SchedulePage } from "~components/interviews/SchedulePage"
import { RAIL_HASH } from "~constants/options"
import type { Route } from "~lib/router"
import type { AddRoundEditRef } from "~types/options"
import type { SavedApplication } from "~types/userProfile"

interface Props {
  route: Route
  apps: SavedApplication[]
  onNavigate: (hash: string) => void
  onAddRound: () => void
  onEditRound: (editRef: AddRoundEditRef) => void
  onDebriefSaved: (result: { advanced: boolean; appId: string }) => void
  onUpdateApplication: (id: string, patch: Partial<SavedApplication>) => void
  onDeleteApplication: (id: string) => void
  onOpenApplicationsWindow: () => void
}

export function ApplicationsArea({
  route,
  apps,
  onNavigate,
  onAddRound,
  onEditRound,
  onDebriefSaved,
  onUpdateApplication,
  onDeleteApplication,
  onOpenApplicationsWindow
}: Props) {
  const railActive =
    route.area === "interviews"
      ? route.view
      : route.view === "overview"
        ? "overview"
        : "all"

  return (
    <div className="flex flex-1">
      <ApplicationsRail
        active={railActive}
        apps={apps}
        onSelect={(value) => onNavigate(RAIL_HASH[value] ?? "#/applications")}
      />

      <div className="flex-1 overflow-y-auto px-8 py-8 min-w-0">
        {route.area === "applications" ? (
          <div>
            {route.view === "overview" ? (
              <ApplicationsOverview applications={apps} />
            ) : (
              <ApplicationsList
                applications={apps}
                onUpdate={onUpdateApplication}
                onDelete={onDeleteApplication}
                onOpenSidePanel={onOpenApplicationsWindow}
              />
            )}
          </div>
        ) : route.view === "schedule" ? (
          <SchedulePage apps={apps} onAdd={onAddRound} onEdit={onEditRound} />
        ) : route.view === "prep" ? (
          route.param ? (
            <PrepWorkspace
              key={route.param}
              apps={apps}
              roundId={route.param}
              onBack={() => onNavigate("#/interviews/prep")}
              onViewInSchedule={() => onNavigate("#/interviews/schedule")}
            />
          ) : (
            <PrepListPage
              apps={apps}
              onOpen={(id) => onNavigate(`#/interviews/prep/${id}`)}
            />
          )
        ) : route.param ? (
          <DebriefWorkspace
            key={route.param}
            apps={apps}
            roundId={route.param}
            onBack={() => onNavigate("#/interviews/debriefs")}
            onSaved={onDebriefSaved}
          />
        ) : (
          <DebriefsListPage
            apps={apps}
            onOpen={(id) => onNavigate(`#/interviews/debriefs/${id}`)}
          />
        )}
      </div>
    </div>
  )
}
