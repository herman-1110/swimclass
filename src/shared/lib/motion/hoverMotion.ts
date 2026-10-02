/**
 * Hover motion for buttons (DESIGN §5). With a mouse, an element marked `data-motion`
 * lifts while the pointer is over it, presses down while it is held, and settles back when
 * the pointer leaves. The colour and shadow change on hover is CSS (shared/ui
 * buttonClasses); this adds only the movement, with anime.js.
 *
 * Nothing depends on it. It never runs for touch or pen, under "reduce motion" (anime.js
 * doesn't follow it on its own), or on a button that can't be used now (disabled,
 * aria-disabled, busy). anime.js loads the first time a mouse needs it, so phones never
 * download it.
 */

/** `lift` for filled buttons (2 px), `soft` for quiet and icon buttons (1 px). */
export type MotionKind = 'lift' | 'soft'

type Pose = 'rest' | 'hover' | 'press'

type Anime = typeof import('./anime')
type AnimeAnimation = InstanceType<typeof import('animejs').JSAnimation>

const MARKED = '[data-motion]'
const UNAVAILABLE = ':disabled, [aria-disabled="true"], [data-disabled], [aria-busy="true"]'
const LIFT_PX: Record<MotionKind, number> = { lift: -2, soft: -1 }
const PRESS_SCALE = 0.97

/** True when the person asked for less motion. False where there is no matchMedia (jsdom). */
export function prefersReducedMotion(win: Window = window): boolean {
  return (
    typeof win.matchMedia === 'function' &&
    win.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

/** The marked element that holds `node`, whether or not it can move now. */
function marked(node: EventTarget | null): HTMLElement | null {
  return node instanceof Element ? node.closest<HTMLElement>(MARKED) : null
}

/** The marked element that holds `node`, if it can be used now. */
export function motionTarget(node: EventTarget | null): HTMLElement | null {
  const element = marked(node)
  return element && !element.matches(UNAVAILABLE) ? element : null
}

/** Where a pose puts an element of this kind. */
export function poseOf(kind: MotionKind, pose: Pose): { translateY: number; scale: number } {
  return {
    translateY: pose === 'hover' ? LIFT_PX[kind] : 0,
    scale: pose === 'press' ? PRESS_SCALE : 1,
  }
}

let anime: Promise<Anime> | null = null

function loadAnime(): Promise<Anime> {
  anime ??= import('./anime').catch((error: unknown) => {
    anime = null // try again next time (a chunk can fail to load offline)
    throw error
  })
  return anime
}

function move(element: HTMLElement, pose: Pose): void {
  const kind: MotionKind = element.dataset.motion === 'soft' ? 'soft' : 'lift'
  loadAnime()
    .then(({ animate, cleanInlineStyles, spring }) => {
      animate(element, {
        ...poseOf(kind, pose),
        ...(pose === 'press'
          ? { ease: 'outQuad', duration: 90 }
          : { ease: spring({ bounce: 0.4, duration: 250 }) }),
        // A new pose replaces this one mid-way. Back at rest, nothing stays inline.
        ...(pose === 'rest'
          ? {
              onComplete: (animation: AnimeAnimation) => {
                cleanInlineStyles(animation)
              },
            }
          : {}),
      })
    })
    .catch(() => {
      // No anime.js: the CSS hover still shows; the button just doesn't move.
    })
}

/** Starts hover motion for the whole page. Returns a function that stops it. */
export function installHoverMotion(doc: Document = document): () => void {
  const win = doc.defaultView ?? window
  // Elements that moved off their rest pose, so they settle back even if they became
  // unavailable meanwhile (a pending "Saving…" button the pointer then leaves).
  const moved = new WeakSet<HTMLElement>()

  const onOver = (event: PointerEvent) => {
    if (event.pointerType !== 'mouse' || prefersReducedMotion(win)) return
    const element = motionTarget(event.target)
    // Already lifted: the pointer moved onto the button's icon or label.
    if (!element || moved.has(element)) return
    moved.add(element)
    move(element, 'hover')
  }

  const onOut = (event: PointerEvent) => {
    const element = marked(event.target)
    if (!element || !moved.has(element)) return
    if (event.relatedTarget instanceof Node && element.contains(event.relatedTarget)) return
    moved.delete(element)
    move(element, 'rest')
  }

  const onDown = (event: PointerEvent) => {
    if (event.pointerType !== 'mouse' || event.button !== 0) return
    const element = motionTarget(event.target)
    if (element && moved.has(element)) move(element, 'press')
  }

  const onUp = (event: PointerEvent) => {
    const element = marked(event.target)
    if (element && moved.has(element)) move(element, 'hover')
  }

  const listeners = [
    ['pointerover', onOver],
    ['pointerout', onOut],
    ['pointercancel', onOut],
    ['pointerdown', onDown],
    ['pointerup', onUp],
  ] as const
  // Capture, so a component that stops a pointer event still gets its motion.
  for (const [type, listener] of listeners) doc.addEventListener(type, listener, true)
  return () => {
    for (const [type, listener] of listeners) doc.removeEventListener(type, listener, true)
  }
}
