import { CertificateEditor } from "~components/profile/CertificateEditor"
import { EducationEditor } from "~components/profile/Education"
import { ExperienceEditor } from "~components/profile/ExperienceEditor"
import { LanguageEditor } from "~components/profile/LanguageEditor"
import { PersonalInfo } from "~components/profile/PersonalInfo"
import { ProjectEditor } from "~components/profile/ProjectEditor"
import { SkillEditor } from "~components/profile/SkillEditor"
import type { UserProfile } from "~types/userProfile"

export type ProfileSettingsView =
  | "personal-info"
  | "education"
  | "skills"
  | "experience"
  | "projects"
  | "languages"

interface Props {
  view: ProfileSettingsView
  userProfile: UserProfile
  onChange: (profile: UserProfile) => void
}

export function ProfileSettingsScreen({ view, userProfile, onChange }: Props) {
  if (view === "personal-info") {
    return (
      <div className="aa-card">
        <h2 className="aa-section-heading">Personal Information</h2>
        <hr className="aa-divider" />
        <PersonalInfo
          personalInfo={userProfile.personalInfo}
          onChange={(personalInfo) =>
            onChange({ ...userProfile, personalInfo })
          }
        />
      </div>
    )
  }

  if (view === "education") {
    return (
      <div className="space-y-aa-px-30">
        <EducationEditor
          education={userProfile.education}
          onChange={(education) => onChange({ ...userProfile, education })}
        />

        <CertificateEditor
          certificates={userProfile.certificates ?? []}
          onChange={(certificates) => onChange({ ...userProfile, certificates })}
        />
      </div>
    )
  }

  if (view === "skills") {
    return (
      <div className="aa-card">
        <h2 className="aa-section-heading">Skills &amp; Expertise</h2>
        <hr className="aa-divider" />
        <SkillEditor
          skills={userProfile.skills}
          onChange={(skills) => onChange({ ...userProfile, skills })}
        />
      </div>
    )
  }

  if (view === "experience") {
    return (
      <ExperienceEditor
        experiences={userProfile.workExperience}
        onChange={(workExperience) =>
          onChange({ ...userProfile, workExperience })
        }
      />
    )
  }

  if (view === "projects") {
    return (
      <div className="aa-card">
        <h2 className="aa-section-heading">Personal Projects</h2>
        <hr className="aa-divider" />
        <ProjectEditor
          projects={userProfile.personalProjects}
          onChange={(personalProjects) =>
            onChange({ ...userProfile, personalProjects })
          }
        />
      </div>
    )
  }

  return (
    <div className="aa-card">
      <h2 className="aa-section-heading">Languages</h2>
      <hr className="aa-divider" />
      <LanguageEditor
        languages={userProfile.languages}
        onChange={(languages) => onChange({ ...userProfile, languages })}
      />
    </div>
  )
}
