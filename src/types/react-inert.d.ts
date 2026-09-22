// `inert` is a standard boolean HTML attribute but @types/react 18 doesn't
// type it yet (added upstream in React 19's types). The `import` below makes
// this file a module so the augmentation merges into react's real types
// instead of replacing them.
import "react"

declare module "react" {
  interface HTMLAttributes<T> {
    inert?: boolean
  }
}
