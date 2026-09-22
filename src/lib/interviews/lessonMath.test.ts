import { describe, expect, it } from "vitest"

import { lessonMathToText } from "./lessonMath"

describe("lessonMathToText", () => {
  it("returns ordinary markdown unchanged", () => {
    expect(lessonMathToText("# Lesson\n\nPlain prose.")).toBe(
      "# Lesson\n\nPlain prose."
    )
  })

  it("converts common symbols, fractions, roots, and numeric scripts", () => {
    expect(
      lessonMathToText(
        String.raw`Use $\frac{1}{2} \le x_2 \rightarrow \sqrt{n^2}$ now.`
      )
    ).toBe("Use 1/2 ≤ x₂ → √n² now.")
  })

  it("supports parenthesized and display math delimiters", () => {
    expect(
      lessonMathToText(String.raw`\(a \neq b\) and $$x \in \{1, 2\}$$`)
    ).toBe("a ≠ b and x ∈ {1, 2}")
  })

  it("does not mistake currency for math", () => {
    expect(lessonMathToText("Tickets cost $5 and $10 a seat.")).toBe(
      "Tickets cost $5 and $10 a seat."
    )
  })

  it("preserves fenced and inline code exactly", () => {
    const markdown = [
      "Before $x_2$.",
      "",
      "~~~sh",
      String.raw`echo $PATH && printf '\rightarrow'`,
      "~~~",
      "",
      "Run `echo $HOME` after."
    ].join("\n")
    const expected = [
      "Before x₂.",
      "",
      "~~~sh",
      String.raw`echo $PATH && printf '\rightarrow'`,
      "~~~",
      "",
      "Run `echo $HOME` after."
    ].join("\n")

    expect(lessonMathToText(markdown)).toBe(expected)
  })

  it("keeps unknown prose commands but makes unknown math readable", () => {
    expect(
      lessonMathToText(String.raw`Path C:\Users stays; $\unknown + 1$ reads.`)
    ).toBe(String.raw`Path C:\Users stays; unknown + 1 reads.`)
  })

  it("preserves an unterminated fenced block through end of input", () => {
    const markdown = "```js\nconst template = `${A}_${B}`"
    expect(lessonMathToText(markdown)).toBe(markdown)
  })
})
