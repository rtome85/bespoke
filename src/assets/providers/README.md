# Provider brand marks

Monochrome brand icons for the providers roster, taken from
[Simple Icons](https://simpleicons.org) (`simple-icons` npm package, icons
released under CC0 1.0).

Each file is the upstream 24×24 path with `role="img"` and `<title>` swapped
for `fill="currentColor"` plus `aria-hidden`, so the mark takes the colour of
the surrounding text and the accessible name comes from the row label instead.

They are imported through Plasmo's `react:` scheme (see
`src/components/options/ProviderIcon.tsx`), which runs them through SVGR.

| File             | Upstream slug  |
| ---------------- | -------------- |
| `anthropic.svg`  | `anthropic`    |
| `deepseek.svg`   | `deepseek`     |
| `google.svg`     | `googlegemini` |
| `mistral.svg`    | `mistralai`    |
| `ollama.svg`     | `ollama`       |
| `openai.svg`     | `openai`       |
| `openrouter.svg` | `openrouter`   |
| `perplexity.svg` | `perplexity`   |
