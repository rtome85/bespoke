// Plasmo/Parcel resolve these imports to a URL string at bundle time; tsc
// needs the ambient declarations to type the default export.
declare module "*.png" {
  const src: string
  export default src
}

declare module "*.svg" {
  const src: string
  export default src
}

declare module "data-base64:*" {
  const src: string
  export default src
}

declare module "data-text:*" {
  const src: string
  export default src
}

// The `react:` scheme runs the SVG through SVGR, so the default export is a
// component that forwards props (className, aria-*) onto the <svg> root.
declare module "react:*.svg" {
  import type { FunctionComponent, SVGProps } from "react"
  const Component: FunctionComponent<SVGProps<SVGSVGElement>>
  export default Component
}
