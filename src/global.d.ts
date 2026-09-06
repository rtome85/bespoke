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
