import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { installHoverMotion, motionTarget, poseOf, prefersReducedMotion } from './hoverMotion'

type Params = { translateY: number; scale: number; onComplete?: (animation: unknown) => void }

const { animate, cleanInlineStyles } = vi.hoisted(() => ({
  animate: vi.fn<(element: HTMLElement, params: Params) => void>(),
  cleanInlineStyles: vi.fn(),
}))

vi.mock('animejs', () => ({
  animate,
  spring: (params: object) => ({ spring: params }),
  cleanInlineStyles,
}))

let stop: () => void = () => {}

beforeEach(() => {
  document.body.innerHTML = `
    <button id="save" data-motion="lift"><span id="label">Save payment</span></button>
    <button id="cancel" data-motion="soft">Cancel</button>
    <button id="off" data-motion="lift" disabled>Pick a time</button>
    <button id="soft-off" data-motion="lift" aria-disabled="true" data-disabled>Save changes</button>
    <button id="busy" data-motion="lift" aria-busy="true">Saving…</button>
    <button id="plain">Plain</button>`
  stop = installHoverMotion()
})

afterEach(() => {
  stop()
  animate.mockClear()
  cleanInlineStyles.mockClear()
  vi.unstubAllGlobals()
})

const byId = (id: string) => document.getElementById(id)!

function pointer(
  type: string,
  target: Element,
  init: PointerEventInit = {},
  pointerType = 'mouse',
): void {
  target.dispatchEvent(new PointerEvent(type, { bubbles: true, pointerType, ...init }))
}

/** anime.js loads on first use: let the import and its then() run. */
async function settled(): Promise<void> {
  await vi.dynamicImportSettled()
  await new Promise((resolve) => setTimeout(resolve, 0))
}

/** The pose of each animate() call: [element id, translateY, scale]. */
const poses = () =>
  animate.mock.calls.map(([element, params]) => [element.id, params.translateY, params.scale])

describe('poseOf', () => {
  it('lifts filled buttons 2 px and quiet ones 1 px, and presses both to 97%', () => {
    expect(poseOf('lift', 'hover')).toEqual({ translateY: -2, scale: 1 })
    expect(poseOf('soft', 'hover')).toEqual({ translateY: -1, scale: 1 })
    expect(poseOf('lift', 'press')).toEqual({ translateY: 0, scale: 0.97 })
    expect(poseOf('soft', 'rest')).toEqual({ translateY: 0, scale: 1 })
  })
})

describe('motionTarget', () => {
  it('finds the marked button from its label, and skips buttons that can’t be used now', () => {
    expect(motionTarget(byId('label'))).toBe(byId('save'))
    expect(motionTarget(byId('plain'))).toBeNull()
    expect(motionTarget(byId('off'))).toBeNull()
    expect(motionTarget(byId('soft-off'))).toBeNull()
    expect(motionTarget(byId('busy'))).toBeNull()
    expect(motionTarget(null)).toBeNull()
  })
})

describe('installHoverMotion', () => {
  it('lifts a button under the mouse and settles it back, leaving no inline style', async () => {
    pointer('pointerover', byId('save'))
    await settled()
    pointer('pointerout', byId('save'), { relatedTarget: document.body })
    await settled()
    expect(poses()).toEqual([
      ['save', -2, 1],
      ['save', 0, 1],
    ])
    animate.mock.lastCall?.[1].onComplete?.('the animation')
    expect(cleanInlineStyles).toHaveBeenCalledWith('the animation')
  })

  it('lifts quiet buttons less', async () => {
    pointer('pointerover', byId('cancel'))
    await settled()
    expect(poses()).toEqual([['cancel', -1, 1]])
  })

  it('stays lifted while the mouse moves between the button and its label', async () => {
    pointer('pointerover', byId('save'))
    pointer('pointerout', byId('save'), { relatedTarget: byId('label') })
    pointer('pointerover', byId('label'), { relatedTarget: byId('save') })
    await settled()
    expect(poses()).toEqual([['save', -2, 1]])
  })

  it('presses down while held, then lifts again', async () => {
    pointer('pointerover', byId('save'))
    pointer('pointerdown', byId('label'), { button: 0 })
    pointer('pointerup', byId('label'), { button: 0 })
    await settled()
    expect(poses()).toEqual([
      ['save', -2, 1],
      ['save', 0, 0.97],
      ['save', -2, 1],
    ])
  })

  it('doesn’t move for touch or pen, or for a press that never hovered', async () => {
    pointer('pointerover', byId('save'), {}, 'touch')
    pointer('pointerdown', byId('save'), { button: 0 }, 'touch')
    pointer('pointerover', byId('cancel'), {}, 'pen')
    pointer('pointerdown', byId('plain'), { button: 0 })
    await settled()
    expect(animate).not.toHaveBeenCalled()
  })

  it('doesn’t move buttons that can’t be used now', async () => {
    for (const id of ['off', 'soft-off', 'busy', 'plain']) pointer('pointerover', byId(id))
    await settled()
    expect(animate).not.toHaveBeenCalled()
  })

  it('doesn’t move under "reduce motion"', async () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
    }))
    expect(prefersReducedMotion()).toBe(true)
    pointer('pointerover', byId('save'))
    await settled()
    expect(animate).not.toHaveBeenCalled()
  })

  it('settles a lifted button that became busy when the mouse leaves', async () => {
    pointer('pointerover', byId('save'))
    byId('save').setAttribute('aria-busy', 'true')
    pointer('pointerout', byId('save'), { relatedTarget: null })
    await settled()
    expect(poses()).toEqual([
      ['save', -2, 1],
      ['save', 0, 1],
    ])
  })

  it('stops listening when stopped', async () => {
    stop()
    pointer('pointerover', byId('save'))
    await settled()
    expect(animate).not.toHaveBeenCalled()
  })
})
