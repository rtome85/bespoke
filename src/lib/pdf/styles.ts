/**
 * ATS-friendly PDF styles for CV export
 * Based on professional resume standards
 */

// Using inline type definitions to avoid module resolution issues
export const CV_STYLES = {
  // Default base style
  defaultStyle: {
    font: "Roboto",
    fontSize: 10,
    lineHeight: 1.3,
    color: "#000000"
  },

  // Heading styles - use "Roboto" with bold/italics properties
  // pdfmake will automatically use Roboto-Medium.ttf when bold: true
  h1: {
    font: "Roboto",
    fontSize: 26,
    alignment: "left",
    margin: [0, 0, 0, 0],
    bold: true
  },

  h2: {
    font: "Roboto",
    fontSize: 16,
    margin: [0, 6, 0, 6],
    bold: true,
    color: "#000000"
  },

  h3: {
    font: "Roboto",
    fontSize: 11,
    margin: [0, 6, 0, 3],
    bold: true
  },

  h4: {
    font: "Roboto",
    fontSize: 10,
    margin: [0, 6, 0, 2],
    bold: true
  },

  // Paragraph style
  paragraph: {
    margin: [0, 0, 0, 6],
    alignment: "left"
  },

  // List styles
  listItem: {
    margin: [0, 0, 0, 3]
  },

  // Inline styles
  bold: {
    bold: true
  },

  italic: {
    italics: true
  },

  link: {
    color: "#000000",
    decoration: "underline",
    decorationStyle: "dotted"
  },

  code: {
    font: "Roboto",
    fontSize: 9,
    background: "#f5f5f5",
    color: "#000000"
  },

  // Horizontal rule (implemented as canvas line)
  hr: {
    margin: [0, 0, 0, 0]
  }
}

/**
 * Get document definition with CV styling
 */
export function getDocumentDefinition(
  content: unknown,
  title?: string,
  author?: string
): Record<string, unknown> {
  return {
    content,
    styles: CV_STYLES,
    defaultStyle: CV_STYLES.defaultStyle,
    pageSize: "A4",
    pageMargins: [40, 40, 40, 40],
    info: {
      title: title || "CV",
      author: author || "Bespoke",
      creator: "Bespoke",
      producer: "Bespoke"
    }
  }
}
