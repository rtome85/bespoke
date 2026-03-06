import { marked } from "marked"

import { mapTokensToPdfContent } from "./map-tokens"
import { getDocumentDefinition } from "./styles"

/**
 * Adds " | " separators between adjacent contact-info fields on the same line.
 * Targets lines with 2+ patterns like "Label: value Label: value".
 */
function preprocessMarkdown(markdown: string): string {
  return markdown
    .split("\n")
    .map((line) => {
      const labelCount = (line.match(/\b[A-Z][a-zA-Z]+:\s/g) || []).length
      if (labelCount >= 2) {
        return line.replace(/(\S)\s+([A-Z][a-zA-Z]+:\s)/g, "$1 | $2")
      }
      return line
    })
    .join("\n")
}

/**
 * Export markdown CV to PDF using pdfmake
 * Lazy loads pdfmake and fonts to minimize bundle impact
 *
 * @param markdown - The markdown content to convert
 * @param filename - Optional filename for the PDF (defaults to "cv.pdf")
 * @param title - Optional document title
 * @param author - Optional document author
 */
export async function exportCvToPdf(
  markdown: string,
  filename?: string,
  title?: string,
  author?: string
): Promise<void> {
  if (!markdown || markdown.trim().length === 0) {
    throw new Error("No markdown content provided")
  }

  try {
    // Step 1: Parse markdown to AST using marked lexer
    const tokens = marked.lexer(preprocessMarkdown(markdown))

    if (!tokens || tokens.length === 0) {
      throw new Error("Failed to parse markdown content")
    }

    // Step 2: Map tokens to pdfmake content
    const pdfContent = mapTokensToPdfContent(tokens)

    if (pdfContent.length === 0) {
      throw new Error("No content generated from markdown")
    }

    // Step 3: Lazy load pdfmake and fonts
    // This ensures we only load ~1.5MB when the user actually exports
    const pdfMakeModule = await import("pdfmake/build/pdfmake")
    const pdfFontsModule = await import("pdfmake/build/vfs_fonts")

    // Access pdfMake from the module (handling both ESM and CJS)
    const pdfMake =
      pdfMakeModule.default ||
      (pdfMakeModule as typeof pdfMakeModule & { pdfMake: unknown }).pdfMake ||
      pdfMakeModule

    // Configure fonts properly
    // The vfs_fonts module exports vfs directly via module.exports
    // In ESM, it's available as pdfFontsModule.default or the module itself
    const vfs =
      (pdfFontsModule as { default?: Record<string, string> }).default ||
      (pdfFontsModule as Record<string, string>)

    // Configure fonts to use the standard vfs fonts
    const fonts = {
      Roboto: {
        normal: "Roboto-Regular.ttf",
        bold: "Roboto-Medium.ttf",
        italics: "Roboto-Italic.ttf",
        bolditalics: "Roboto-MediumItalic.ttf"
      }
    }

    const pm = pdfMake as {
      addVirtualFileSystem: (vfs: Record<string, string>) => void
      addFonts: (fonts: typeof fonts) => void
    }
    pm.addVirtualFileSystem(vfs)
    pm.addFonts(fonts)

    // Step 4: Create document definition
    const docDefinition = getDocumentDefinition(pdfContent, title, author)

    // Step 5: Generate and download PDF
    return new Promise((resolve, reject) => {
      const pdfDocGenerator = (
        pdfMake as {
          createPdf: (def: unknown) => {
            download: (filename: string, callback?: () => void) => void
          }
        }
      ).createPdf(docDefinition)

      const finalFilename = (filename || "cv").replace(/\.pdf$/i, "") + ".pdf"

      pdfDocGenerator.download(finalFilename, () => {
        resolve()
      })
    })
  } catch (error) {
    console.error("PDF Export Error:", error)
    throw new Error(
      `Failed to export PDF: ${error instanceof Error ? error.message : "Unknown error"}`
    )
  }
}

/**
 * Convenience function for quick CV export
 */
export async function downloadMarkdownAsPdf(
  markdownContent: string,
  originalFilename: string
): Promise<void> {
  const pdfFilename = originalFilename.replace(/\.md$/i, "")
  await exportCvToPdf(markdownContent, pdfFilename)
}
