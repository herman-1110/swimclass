// The first thing a keyboard user reaches: jumps past the sidebar to <main id="main">.
// Hidden until focused.
export function SkipLink() {
  return (
    <a
      href="#main"
      // Styles only apply on focus: focus:not-sr-only resets padding, so plain px/py
      // classes would lose to it.
      className="sr-only font-semibold focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-20 focus:inline-flex focus:min-h-11 focus:items-center focus:rounded-small focus:border focus:border-field focus:bg-white focus:px-4"
    >
      Skip to main content
    </a>
  )
}
