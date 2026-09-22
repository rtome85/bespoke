export interface ScorePresentation {
  fill: string
  ink: string
  band: string
}

export function getScorePresentation(percentage: number): ScorePresentation {
  if (percentage >= 75) {
    return {
      fill: "var(--aa-success)",
      ink: "var(--aa-success-strong)",
      band: "Strong match"
    }
  }

  if (percentage >= 50) {
    return {
      fill: "var(--aa-warning)",
      ink: "var(--aa-warning-strong)",
      band: "Moderate match"
    }
  }

  return {
    fill: "var(--aa-error)",
    ink: "var(--aa-error-strong)",
    band: "Weak match"
  }
}
