import type { Token, Tokens } from "marked"

/**
 * Maps Marked AST tokens to pdfmake Content elements
 */

// Type definition for pdfmake content (simplified)
type PdfContent =
  | string
  | {
      text?: string | PdfContent[]
      style?: string | string[]
      bold?: boolean
      italics?: boolean
      color?: string
      decoration?: string
      decorationStyle?: string
      font?: string
      fontSize?: number
      margin?: [number, number, number, number] | [number, number]
      alignment?: "left" | "right" | "center" | "justify"
      ul?: PdfContent[]
      ol?: PdfContent[]
      link?: string
      canvas?: Array<{
        type: "line"
        x1: number
        y1: number
        x2: number
        y2: number
        lineWidth: number
        lineColor?: string
      }>
    }

/**
 * Map a single token to pdfmake content
 */
function mapToken(token: Token): PdfContent {
  switch (token.type) {
    case "heading": {
      const headingToken = token as Tokens.Heading
      const styleMap: Record<number, string> = {
        1: "h1",
        2: "h2",
        3: "h3",
        4: "h4"
      }
      return {
        text: mapInlineTokens(headingToken.tokens),
        style: styleMap[headingToken.depth] || "h4"
      }
    }

    case "paragraph": {
      const paraToken = token as Tokens.Paragraph
      return {
        text: mapInlineTokens(paraToken.tokens),
        style: "paragraph"
      }
    }

    case "list": {
      const listToken = token as Tokens.List
      const items = listToken.items.map((item) => ({
        text: mapInlineTokens(item.tokens),
        style: "listItem"
      }))

      if (listToken.ordered) {
        return {
          ol: items,
          margin: [0, 0, 0, 6]
        }
      } else {
        return {
          ul: items,
          margin: [0, 0, 0, 6]
        }
      }
    }

    case "hr": {
      // Horizontal rule as canvas line
      return {
        canvas: [
          {
            type: "line",
            x1: 0,
            y1: 0,
            x2: 515, // A4 width minus margins (595 - 40 - 40)
            y2: 0,
            lineWidth: 1,
            lineColor: "#000000"
          }
        ],
        margin: [0, 12, 0, 12]
      }
    }

    case "space":
      return "" // Empty string for space tokens

    default:
      // For any unknown token, try to extract text
      if ("text" in token && typeof token.text === "string") {
        return {
          text: token.text,
          style: "paragraph"
        }
      }
      return ""
  }
}

/**
 * Map inline tokens to pdfmake content array
 */
function mapInlineTokens(tokens: Token[] | undefined): PdfContent[] {
  if (!tokens || tokens.length === 0) {
    return [""]
  }

  return tokens.map((token) => {
    switch (token.type) {
      case "text": {
        const textToken = token as Tokens.Text
        return textToken.text || ""
      }

      case "strong": {
        const strongToken = token as Tokens.Strong
        return {
          text: mapInlineTokens(strongToken.tokens),
          bold: true
        }
      }

      case "em": {
        const emToken = token as Tokens.Em
        return {
          text: mapInlineTokens(emToken.tokens),
          italics: true
        }
      }

      case "link": {
        const linkToken = token as Tokens.Link
        return {
          text: linkToken.text || mapInlineTokens(linkToken.tokens),
          link: linkToken.href,
          color: "#000000",
          decoration: "underline",
          decorationStyle: "dotted"
        }
      }

      case "codespan": {
        const codeToken = token as Tokens.Codespan
        return {
          text: codeToken.text,
          font: "Roboto",
          fontSize: 9,
          background: "#f5f5f5"
        }
      }

      case "br": {
        return "\n"
      }

      default:
        // For nested tokens, recursively process
        if ("tokens" in token && Array.isArray(token.tokens)) {
          return {
            text: mapInlineTokens(token.tokens)
          }
        }
        // Fallback to text property
        if ("text" in token && typeof token.text === "string") {
          return token.text
        }
        return ""
    }
  })
}

/**
 * Main function: Convert array of marked tokens to pdfmake content
 */
export function mapTokensToPdfContent(tokens: Token[]): PdfContent[] {
  const content: PdfContent[] = []

  for (const token of tokens) {
    const mapped = mapToken(token)
    // Filter out empty strings
    if (mapped !== "" && mapped !== undefined) {
      content.push(mapped)
    }
  }

  return content
}
