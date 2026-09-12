import { CertificateEditor } from "~components/CertificateEditor"
import { EducationEditor } from "~components/Education"
import { ExperienceEditor } from "~components/ExperienceEditor"
import { LanguageEditor } from "~components/LanguageEditor"
import { PersonalInfo } from "~components/PersonalInfo"
import { ProjectEditor } from "~components/ProjectEditor"
import { SkillEditor } from "~components/SkillEditor"
import {
  CARD_CLASS,
  DIVIDER_CLASS,
  SECTION_HEADING_CLASS
} from "~constants/options"
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
      <div className={CARD_CLASS}>
        <h2 className={SECTION_HEADING_CLASS}>Personal Information</h2>
        <hr className={DIVIDER_CLASS} />
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
      <div className="space-y-6">
        <div className={CARD_CLASS}>
          <h2 className={SECTION_HEADING_CLASS}>Education</h2>
          <hr className={DIVIDER_CLASS} />
          <EducationEditor
            education={userProfile.education}
            onChange={(education) => onChange({ ...userProfile, education })}
          />
        </div>

        <div className={CARD_CLASS}>
          <h2 className={SECTION_HEADING_CLASS}>Certificates</h2>
          <p className="text-sm text-aa-text-secondary mb-4">
            Certifications, online courses, bootcamps and professional training.
          </p>
          <CertificateEditor
            certificates={userProfile.certificates ?? []}
            onChange={(certificates) =>
              onChange({ ...userProfile, certificates })
            }
          />
        </div>
      </div>
    )
  }

  if (view === "skills") {
    return (
      <div className={CARD_CLASS}>
        <h2 className={SECTION_HEADING_CLASS}>Skills &amp; Expertise</h2>
        <hr className={DIVIDER_CLASS} />
        <SkillEditor
          skills={userProfile.skills}
          onChange={(skills) => onChange({ ...userProfile, skills })}
        />
      </div>
    )
  }

  if (view === "experience") {
    return (
      <div className={CARD_CLASS}>
        <h2 className={SECTION_HEADING_CLASS}>Work Experience</h2>
        <hr className={DIVIDER_CLASS} />
        <ExperienceEditor
          experiences={userProfile.workExperience}
          onChange={(workExperience) =>
            onChange({ ...userProfile, workExperience })
          }
        />
      </div>
    )
  }

  if (view === "projects") {
    return (
      <div className={CARD_CLASS}>
        <h2 className={SECTION_HEADING_CLASS}>Personal Projects</h2>
        <hr className={DIVIDER_CLASS} />
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
    <div className={CARD_CLASS}>
      <h2 className={SECTION_HEADING_CLASS}>Languages</h2>
      <hr className={DIVIDER_CLASS} />
      <LanguageEditor
        languages={userProfile.languages}
        onChange={(languages) => onChange({ ...userProfile, languages })}
      />
    </div>
  )
}
