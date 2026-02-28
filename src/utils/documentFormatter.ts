export function generateFilename(
  type: "resume" | "cover-letter",
  companyName: string,
  jobTitle: string,
  timestamp?: Date
): string {
  const date = timestamp || new Date()
  const dateStr = date.toISOString().split("T")[0]

  const sanitizedCompany = sanitizeFilename(companyName)
  const sanitizedTitle = sanitizeFilename(jobTitle)

  return `${type}-${sanitizedCompany}-${sanitizedTitle}-${dateStr}.md`
}

function sanitizeFilename(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 50)
}

export function formatMarkdownContent(
  content: string,
  _type: "resume" | "cover-letter",
  _companyName: string,
  _jobTitle: string,
  _model: string,
  _generatedAt: Date
): string {
  return content
}

export async function downloadMarkdownFile(
  filename: string,
  content: string
): Promise<void> {
  const base64Content = btoa(unescape(encodeURIComponent(content)))
  const dataUrl = `data:text/markdown;charset=utf-8;base64,${base64Content}`

  await chrome.downloads.download({
    url: dataUrl,
    filename: filename,
    saveAs: false
  })
}
