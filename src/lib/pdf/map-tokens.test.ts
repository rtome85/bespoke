import { marked } from "marked"
import { describe, expect, it } from "vitest"

import { mapTokensToPdfContent } from "./map-tokens"

describe("mapTokensToPdfContent", () => {
  it("maps headings and rich inline paragraph content", () => {
    const tokens = marked.lexer(
      "# Heading\n\nText with **bold**, *italic*, [link](https://example.com), and `code`."
    )

    expect(mapTokensToPdfContent(tokens)).toEqual([
      {
        text: ["Heading"],
        style: "h1"
      },
      {
        text: [
          "Text with ",
          { text: ["bold"], bold: true },
          ", ",
          { text: ["italic"], italics: true },
          ", ",
          {
            text: "link",
            link: "https://example.com",
            color: "#000000",
            decoration: "underline",
            decorationStyle: "dotted"
          },
          ", and ",
          {
            text: "code",
            font: "Roboto",
            fontSize: 9,
            background: "#f5f5f5"
          },
          "."
        ],
        style: "paragraph"
      }
    ])
  })

  it("maps ordered and unordered lists", () => {
    const tokens = marked.lexer("- One\n- Two\n\n1. First\n2. Second")
    const result = mapTokensToPdfContent(tokens) as any[]

    expect(result[0]).toMatchObject({
      ul: [
        { text: [{ text: ["One"] }], style: "listItem" },
        { text: [{ text: ["Two"] }], style: "listItem" }
      ]
    })
    expect(result[1]).toMatchObject({
      ol: [
        { text: [{ text: ["First"] }], style: "listItem" },
        { text: [{ text: ["Second"] }], style: "listItem" }
      ]
    })
  })

  it("maps horizontal rules and discards space tokens", () => {
    const result = mapTokensToPdfContent(marked.lexer("Above\n\n---\n\nBelow"))

    expect(result).toHaveLength(3)
    expect(result[1]).toMatchObject({
      canvas: [expect.objectContaining({ type: "line", x2: 515 })]
    })
  })

  it("normalizes punctuation and invisible Unicode for the embedded font", () => {
    const [paragraph] = mapTokensToPdfContent(
      marked.lexer("“Smart”—text… © ® ™ A B​C • item")
    ) as any[]

    expect(paragraph.text).toEqual(['"Smart"-text... (c) (R) (TM) A BC - item'])
  })

  it("uses h4 styling for heading depths beyond the explicit map", () => {
    expect(mapTokensToPdfContent(marked.lexer("##### Deep"))).toEqual([
      { text: ["Deep"], style: "h4" }
    ])
  })
})
