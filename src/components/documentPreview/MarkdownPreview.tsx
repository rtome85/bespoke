import { marked, type Token, type Tokens } from "marked"
import type { ReactNode } from "react"

// Renders the generated resume/cover-letter markdown as read-only JSX,
// walking marked's token AST ourselves (same approach as
// ~lib/pdf/map-tokens.ts) instead of injecting marked's HTML output —
// LLM output is untrusted text, and building React elements directly from
// typed tokens means there's no HTML string to sanitize in the first place.
const SAFE_HREF = /^(https?:|mailto:)/i

function renderInline(tokens: Token[] | undefined): ReactNode {
  if (!tokens || tokens.length === 0) return null

  return tokens.map((token, i) => {
    switch (token.type) {
      case "text": {
        const t = token as Tokens.Text
        return t.tokens?.length ? (
          <span key={i}>{renderInline(t.tokens)}</span>
        ) : (
          t.text
        )
      }
      case "strong": {
        const t = token as Tokens.Strong
        return <strong key={i}>{renderInline(t.tokens)}</strong>
      }
      case "em": {
        const t = token as Tokens.Em
        return <em key={i}>{renderInline(t.tokens)}</em>
      }
      case "link": {
        const t = token as Tokens.Link
        const href = t.href?.trim() ?? ""
        const label = renderInline(t.tokens) ?? t.text
        if (!SAFE_HREF.test(href)) return <span key={i}>{label}</span>
        return (
          <a
            key={i}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-aa-primary underline underline-offset-2">
            {label}
          </a>
        )
      }
      case "codespan": {
        const t = token as Tokens.Codespan
        return (
          <code
            key={i}
            className="px-1 py-0.5 rounded-aa-sm bg-aa-neutral-100 text-[0.9em] font-mono">
            {t.text}
          </code>
        )
      }
      case "br":
        return <br key={i} />
      default:
        if ("tokens" in token && Array.isArray(token.tokens)) {
          return <span key={i}>{renderInline(token.tokens as Token[])}</span>
        }
        if ("text" in token && typeof token.text === "string") {
          return token.text
        }
        return null
    }
  })
}

function renderBlock(token: Token, i: number): ReactNode {
  switch (token.type) {
    case "heading": {
      const t = token as Tokens.Heading
      const text = renderInline(t.tokens)
      if (t.depth === 1)
        return (
          <h1
            key={i}
            className="text-[20px] font-bold text-aa-text-primary mt-5 first:mt-0">
            {text}
          </h1>
        )
      if (t.depth === 2)
        return (
          <h2
            key={i}
            className="text-[16px] font-bold text-aa-text-primary mt-4 first:mt-0">
            {text}
          </h2>
        )
      if (t.depth === 3)
        return (
          <h3
            key={i}
            className="text-[14px] font-bold text-aa-text-primary mt-3 first:mt-0">
            {text}
          </h3>
        )
      return (
        <h4
          key={i}
          className="text-[13px] font-bold text-aa-text-primary mt-2 first:mt-0">
          {text}
        </h4>
      )
    }
    case "paragraph": {
      const t = token as Tokens.Paragraph
      return (
        <p
          key={i}
          className="text-[13px] leading-relaxed text-aa-text-primary mt-2 first:mt-0">
          {renderInline(t.tokens)}
        </p>
      )
    }
    case "list": {
      const t = token as Tokens.List
      const items = t.items.map((item, j) => (
        <li key={j}>{renderInline(item.tokens)}</li>
      ))
      return t.ordered ? (
        <ol
          key={i}
          className="mt-2 pl-5 list-decimal text-[13px] leading-relaxed text-aa-text-primary">
          {items}
        </ol>
      ) : (
        <ul
          key={i}
          className="mt-2 pl-5 list-disc text-[13px] leading-relaxed text-aa-text-primary">
          {items}
        </ul>
      )
    }
    case "hr":
      return <hr key={i} className="my-4 border-aa-border" />
    case "space":
      return null
    default:
      if ("text" in token && typeof token.text === "string") {
        return (
          <p
            key={i}
            className="text-[13px] leading-relaxed text-aa-text-primary mt-2">
            {token.text}
          </p>
        )
      }
      return null
  }
}

export function MarkdownPreview({ content }: { content: string }) {
  const tokens = marked.lexer(content)
  return <>{tokens.map((t, i) => renderBlock(t, i))}</>
}
