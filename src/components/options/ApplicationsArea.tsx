import { DebriefsListPage } from "~components/interviews/DebriefsListPage"
import { DebriefWorkspace } from "~components/interviews/DebriefWorkspace"
import { PrepListPage } from "~components/interviews/PrepListPage"
import { PrepWorkspace } from "~components/interviews/PrepWorkspace"
import { SchedulePage } from "~components/interviews/SchedulePage"
import { ApplicationsList } from "~components/options/ApplicationsList"
import { ApplicationsOverview } from "~components/options/ApplicationsOverview"
import { ApplicationsRail } from "~components/options/ApplicationsRail"
import { RAIL_HASH } from "~constants/options"
import type { Route } from "~lib/router"
import type { AddRoundEditRef, AppSection, ListFilter } from "~types/options"
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
  section: AppSection
  onSection: (s: AppSection) => void
  email?: string
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
  section,
  onSection,
  email
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
        section={section}
        onSection={onSection}
        email={email}
      />

      {/* No `overflow-y-auto` here: the shell is `min-h-screen`, so this
          column has no height to scroll within and the window is what
          actually scrolls. The declaration did nothing except register this
          div as the nearest scrollport, which silently disabled `sticky` for
          everything inside it (see the Prep section rail). */}
      <div className="flex-1 px-8 py-8 min-w-0">
        {route.area === "applications" ? (
          <div>
            {route.view === "overview" ? (
              <ApplicationsOverview
                applications={apps}
                onNavigate={onNavigate}
              />
            ) : (
              <ApplicationsList
                applications={apps}
                onUpdate={onUpdateApplication}
                onDelete={onDeleteApplication}
                routeFilter={route.param as ListFilter | undefined}
                onFilterChange={(filter) =>
                  onNavigate(
                    filter === "All"
                      ? "#/applications"
                      : `#/applications/all/${filter}`
                  )
                }
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
