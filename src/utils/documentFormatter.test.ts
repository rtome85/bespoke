import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  downloadMarkdownFile,
  formatMarkdownContent,
  generateFilename
} from "./documentFormatter"

beforeEach(() => {
  vi.stubGlobal("chrome", {
    downloads: {
      download: vi.fn().mockResolvedValue(1)
    }
  })
})

describe("documentFormatter", () => {
  it("builds a safe lowercase filename from the company", () => {
    expect(
      generateFilename(
        "cover-letter",
        "  Acme & Sons / Portugal  ",
        "Senior Engineer",
        new Date("2026-09-22T12:00:00.000Z")
      )
    ).toBe("roberto-tome-cover-letter-acme-sons-portugal.md")
  })

  it("caps the sanitized company segment at fifty characters", () => {
    const filename = generateFilename("resume", "A".repeat(80), "Engineer")

    expect(filename).toBe(`roberto-tome-resume-${"a".repeat(50)}.md`)
  })

  it("leaves generated markdown content unchanged", () => {
    const content = "# Resume\n\nExperience"
    expect(
      formatMarkdownContent(
        content,
        "resume",
        "Acme",
        "Engineer",
        "model",
        new Date()
      )
    ).toBe(content)
  })

  it("downloads UTF-8 markdown as a data URL", async () => {
    await downloadMarkdownFile("résumé.md", "Olá — résumé")

    expect(chrome.downloads.download).toHaveBeenCalledWith({
      url: expect.stringMatching(
        /^data:text\/markdown;charset=utf-8;base64,[A-Za-z0-9+/=]+$/
      ),
      filename: "résumé.md",
      saveAs: false
    })
  })
})
