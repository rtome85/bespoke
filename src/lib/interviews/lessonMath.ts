/**
 * LaTeX in a lesson, turned into text a reader can actually read.
 *
 * Models reach for math notation unprompted — `$\rightarrow$`, `O(n \log n)`,
 * `\{a, b\}` — and nothing in this extension renders it: `MarkdownPreview`
 * walks marked's token AST, there is no KaTeX, and shipping one to render the
 * handful of arrows a lesson contains would be absurd. So the notation is
 * translated to Unicode instead of being typeset.
 *
 * Two rules keep this from damaging the text it walks:
 *
 * 1. **Code is never touched.** `$` is a live character in shell, PHP, Perl
 *    and template strings, and a lesson is mostly code examples — `echo $PATH`
 *    inside a fenced block has to survive verbatim. Fenced blocks and inline
 *    code spans are split out and passed through untouched.
 * 2. **Prose gets less than math does.** Inside `$…$` a backslash is a LaTeX
 *    command; in prose it is usually a markdown escape, and rewriting `\_` to
 *    `_` there would hand marked an emphasis marker the author escaped on
 *    purpose. So prose only gets the `\word` symbols, which markdown never
 *    uses, while braces, scripts and escapes are converted only inside math.
 */

/** `\word` → the character it stands for. Safe to apply anywhere. */
const SYMBOLS: Record<string, string> = {
  // Arrows — by far the most common thing a lesson reaches for.
  to: "→",
  rightarrow: "→",
  longrightarrow: "⟶",
  Rightarrow: "⇒",
  implies: "⇒",
  gets: "←",
  leftarrow: "←",
  Leftarrow: "⇐",
  leftrightarrow: "↔",
  Leftrightarrow: "⇔",
  iff: "⇔",
  uparrow: "↑",
  downarrow: "↓",
  mapsto: "↦",

  // Relations.
  le: "≤",
  leq: "≤",
  ge: "≥",
  geq: "≥",
  ne: "≠",
  neq: "≠",
  approx: "≈",
  equiv: "≡",
  sim: "~",
  propto: "∝",
  ll: "≪",
  gg: "≫",

  // Operators.
  times: "×",
  cdot: "·",
  div: "÷",
  pm: "±",
  mp: "∓",
  ast: "*",
  circ: "∘",
  oplus: "⊕",
  otimes: "⊗",

  // Sets and logic.
  in: "∈",
  notin: "∉",
  subset: "⊂",
  subseteq: "⊆",
  supset: "⊃",
  supseteq: "⊇",
  cup: "∪",
  cap: "∩",
  emptyset: "∅",
  varnothing: "∅",
  forall: "∀",
  exists: "∃",
  neg: "¬",
  lnot: "¬",
  land: "∧",
  wedge: "∧",
  lor: "∨",
  vee: "∨",

  // Miscellany.
  infty: "∞",
  partial: "∂",
  nabla: "∇",
  sum: "Σ",
  prod: "∏",
  int: "∫",
  sqrt: "√",
  angle: "∠",
  perp: "⊥",
  parallel: "∥",
  therefore: "∴",
  because: "∵",
  ldots: "…",
  dots: "…",
  cdots: "…",
  vdots: "⋮",
  bullet: "•",
  star: "★",
  dagger: "†",

  // Greek.
  alpha: "α",
  beta: "β",
  gamma: "γ",
  delta: "δ",
  epsilon: "ε",
  varepsilon: "ε",
  zeta: "ζ",
  eta: "η",
  theta: "θ",
  vartheta: "ϑ",
  iota: "ι",
  kappa: "κ",
  lambda: "λ",
  mu: "μ",
  nu: "ν",
  xi: "ξ",
  pi: "π",
  rho: "ρ",
  sigma: "σ",
  tau: "τ",
  upsilon: "υ",
  phi: "φ",
  varphi: "φ",
  chi: "χ",
  psi: "ψ",
  omega: "ω",
  Gamma: "Γ",
  Delta: "Δ",
  Theta: "Θ",
  Lambda: "Λ",
  Xi: "Ξ",
  Pi: "Π",
  Sigma: "Σ",
  Upsilon: "Υ",
  Phi: "Φ",
  Psi: "Ψ",
  Omega: "Ω",

  // Named functions set upright in LaTeX — they are already words.
  log: "log",
  ln: "ln",
  exp: "exp",
  sin: "sin",
  cos: "cos",
  tan: "tan",
  max: "max",
  min: "min",
  arg: "arg",
  lim: "lim",
  gcd: "gcd",
  det: "det",
  dim: "dim",
  deg: "deg",
  bmod: "mod",
  mod: "mod",

  // Sizing and spacing hints, which have no meaning outside a typesetter.
  left: "",
  right: "",
  displaystyle: "",
  quad: "  ",
  qquad: "    "
}

/** Digits are the only scripts worth rewriting — `n^2` is common, `n^k` isn't. */
const SUPERSCRIPTS: Record<string, string> = {
  "0": "⁰",
  "1": "¹",
  "2": "²",
  "3": "³",
  "4": "⁴",
  "5": "⁵",
  "6": "⁶",
  "7": "⁷",
  "8": "⁸",
  "9": "⁹"
}

const SUBSCRIPTS: Record<string, string> = {
  "0": "₀",
  "1": "₁",
  "2": "₂",
  "3": "₃",
  "4": "₄",
  "5": "₅",
  "6": "₆",
  "7": "₇",
  "8": "₈",
  "9": "₉"
}

/**
 * Fenced blocks and inline code spans — everything that passes through.
 *
 * The fence is matched the way CommonMark defines one, because the looser
 * version silently corrupted code. It had taken any ``` as an opener, wherever
 * it sat, and any ``` as its closer: so a four-backtick fence wrapping a
 * three-backtick one — a lesson showing how to fence a snippet — closed on the
 * inner opener, and everything after it fell into the prose bucket, where
 * `name="${A}_${B}"` came out as `name="A_{B}"`.
 *
 * So: an opener is three or more backticks or tildes at the start of a line,
 * `\1` pins both the character and the run length, and only a line holding
 * that same run (or longer) and nothing else closes it. An unterminated block
 * still runs to the end of the string — `(?![\s\S])` rather than `$`, which
 * under the `m` flag would end the block at the first line break.
 */
const CODE =
  /^[ \t]*(`{3,}|~{3,})[^\n]*(?:\n[\s\S]*?)?(?:^[ \t]*\1[`~]*[ \t]*$|(?![\s\S]))|`[^`\n]*`/gm

/** Wrappers whose only job is a typeface: keep the argument, drop the call. */
const FONT_COMMAND =
  /\\(?:text|textbf|textit|mathrm|mathbf|mathit|mathsf|mathtt|mathcal|mathbb|operatorname)\s*\{([^{}]*)\}/g

/**
 * `\word` → its character.
 *
 * `keepUnknown` is the prose/math split: an unrecognised `\word` in prose is
 * left exactly as written, because it is far more likely to be someone's
 * Windows path or a regex than a command we failed to list. Inside `$…$` it
 * really was meant as a command, so the backslash comes off and the word
 * stands on its own — `\lambda` reads better as "lambda" than as "\lambda".
 */
function symbols(text: string, keepUnknown: boolean): string {
  return text.replace(/\\([a-zA-Z]+)/g, (match, name: string) => {
    const hit = SYMBOLS[name]
    if (hit !== undefined) return hit
    return keepUnknown ? match : name
  })
}

/** The contents of a `$…$`, `\(…\)` or `$$…$$` span, as plain text. */
function math(inner: string): string {
  let out = inner

  // Fonts and fractions first: both wrap arguments that the passes below
  // should see unwrapped.
  out = out.replace(FONT_COMMAND, "$1")
  out = out.replace(
    /\\frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g,
    (_m, a: string, b: string) => `${a}/${b}`
  )
  out = out.replace(/\\sqrt\s*\{([^{}]*)\}/g, "√$1")

  out = symbols(out, false)

  // Scripts, braced or bare. Only all-digit runs convert; anything else keeps
  // its caret, which reads fine as `O(n^k)`.
  const script = (map: Record<string, string>) => (m: string, d: string) =>
    [...d].every((c) => map[c] !== undefined)
      ? [...d].map((c) => map[c]).join("")
      : m
  out = out.replace(/\^\{(\d+)\}/g, script(SUPERSCRIPTS))
  out = out.replace(/\^(\d)/g, script(SUPERSCRIPTS))
  out = out.replace(/_\{(\d+)\}/g, script(SUBSCRIPTS))
  out = out.replace(/_(\d)/g, script(SUBSCRIPTS))

  // Escapes, and the thin-space commands that are pure typesetting.
  //
  // An escaped brace is a brace the reader is meant to see — `\{a, b\}` is a
  // set — so it is parked on a sentinel first. Unescaping it in place would
  // hand it to the grouping strip below, which cannot tell the two apart and
  // would turn the set into "a, b".
  out = out.replace(/\\\{/g, "\u0000").replace(/\\\}/g, "\u0001")
  out = out.replace(/\\([%&#_$])/g, "$1")
  out = out.replace(/\\[,;:!]/g, " ")
  out = out.replace(/\\\\/g, " ")
  // Braces that survived are grouping, not content.
  out = out.replace(/[{}]/g, "")
  out = out.replace(/\u0000/g, "{").replace(/\u0001/g, "}")

  return out.replace(/\s+/g, " ").trim()
}

/**
 * Does this `$…$` span actually hold math?
 *
 * "$5 and $10 a seat" is a `$…$` span by the letter of the rule, and unwrapping
 * it would eat the currency. A real one carries a command, a script or a
 * grouping brace — the three things a dollar amount never does.
 */
const IS_MATH = /[\\^_{]/

/** Everything between the code spans: the only text that may be rewritten. */
function prose(part: string): string {
  if (!part) return part
  let out = part
  out = out.replace(/\$\$([\s\S]+?)\$\$/g, (_m, inner: string) => math(inner))
  out = out.replace(/\\\[([\s\S]+?)\\\]/g, (_m, inner: string) => math(inner))
  out = out.replace(/\\\(([\s\S]+?)\\\)/g, (_m, inner: string) => math(inner))
  out = out.replace(/\$([^$\n]+?)\$/g, (m, inner: string) =>
    IS_MATH.test(inner) ? math(inner) : m
  )
  // Commands the model wrote without any delimiter around them at all.
  return symbols(out, true)
}

export function lessonMathToText(markdown: string): string {
  if (!markdown || !/[\\$]/.test(markdown)) return markdown

  // Walked rather than `split`, because the fence pattern needs a capture
  // group for its backreference and `split` would then interleave that group
  // into the output alongside the matches, breaking the even/odd invariant
  // the old version counted on.
  let out = ""
  let last = 0
  for (const m of markdown.matchAll(CODE)) {
    const at = m.index ?? 0
    out += prose(markdown.slice(last, at)) + m[0]
    last = at + m[0].length
  }
  return out + prose(markdown.slice(last))
}
