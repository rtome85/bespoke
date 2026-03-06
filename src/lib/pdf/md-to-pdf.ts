import { marked } from "marked"

import { mapTokensToPdfContent } from "./map-tokens"
import { getDocumentDefinition } from "./styles"

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
    const tokens = marked.lexer(markdown)

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

    // Set the vfs on pdfMake
    ;(pdfMake as { vfs?: Record<string, string> }).vfs = vfs

    // Configure fonts to use the standard vfs fonts
    const fonts = {
      Roboto: {
        normal: "Roboto-Regular.ttf",
        bold: "Roboto-Medium.ttf",
        italics: "Roboto-Italic.ttf",
        bolditalics: "Roboto-MediumItalic.ttf"
      }
    }

    ;(pdfMake as { fonts?: typeof fonts }).fonts = fonts

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
