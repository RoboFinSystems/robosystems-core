import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  mount,
  seg,
  steps,
  swap,
  typed,
  variant,
  type DemoDefinition,
  type DemoTheme,
} from '../runtime'

const THEME: DemoTheme = {
  side: '.side',
  rest: [230, 228, 238],
  restSub: [207, 203, 220],
  active: [124, 58, 237],
}

const chrome = (active: string) => `<div class="app">
  <div class="side"><div class="pill"></div>
    <div class="nv" data-k="home">Home</div>
    <div class="nv sub" data-k="inbox">Inbox</div>
    <div class="nv${active === 'close' ? ' on' : ''}" data-k="close">Close</div>
  </div>
  <div data-loop id="main"></div>
</div>`

const demo = (over: Partial<DemoDefinition> = {}): DemoDefinition => ({
  width: 800,
  height: 600,
  total: 4,
  poster: 2,
  css: '.demo-css {}',
  html: chrome('close'),
  setup: () => () => {},
  ...over,
})

// jsdom has no layout: give each sidebar item an offsetTop from its position.
let restore: PropertyDescriptor | undefined
beforeEach(() => {
  restore = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetTop')
  Object.defineProperty(HTMLElement.prototype, 'offsetTop', {
    configurable: true,
    get(this: HTMLElement) {
      if (!this.classList.contains('nv')) return 0
      return (
        [...(this.parentElement?.querySelectorAll('.nv') ?? [])].indexOf(this) *
        40
      )
    },
  })
})
afterEach(() => {
  if (restore)
    Object.defineProperty(HTMLElement.prototype, 'offsetTop', restore)
})

const host = () => {
  const el = document.createElement('div')
  document.body.appendChild(el)
  return el
}

describe('timing helpers', () => {
  it('seg maps a window to 0..1 and clamps outside it', () => {
    expect(seg(1, 0, 2)).toBe(0.5)
    expect(seg(-1, 0, 2)).toBe(0)
    expect(seg(3, 0, 2)).toBe(1)
  })

  it('typed reveals characters at the given rate', () => {
    expect(typed('hello', 1.1, 1, 20)).toBe('he')
    expect(typed('hello', 0.5, 1)).toBe('')
  })

  it('swap changes text at the moment and dips opacity across it', () => {
    const el = document.createElement('span')
    expect(swap(el, 0.9, 1, 'Draft', 'Shared')).toBe(false)
    expect(el.textContent).toBe('Draft')
    swap(el, 1, 1, 'Draft', 'Shared')
    expect(el.textContent).toBe('Shared')
    expect(Number(el.style.opacity)).toBeCloseTo(0.15)
    swap(el, 2, 1, 'Draft', 'Shared')
    expect(el.style.opacity).toBe('1')
  })

  it('swap with no text leaves the text alone and only dips', () => {
    const el = document.createElement('span')
    el.textContent = 'set elsewhere'
    swap(el, 1, 1)
    expect(el.textContent).toBe('set elsewhere')
    expect(Number(el.style.opacity)).toBeCloseTo(0.15)
  })

  it('steps counts the states passed', () => {
    const el = document.createElement('span')
    expect(steps(el, 5, [1, 3], ['a', 'b', 'c'])).toBe(2)
    expect(el.textContent).toBe('c')
  })
})

describe('variant', () => {
  it('keeps the desktop layout unless asked for the phone one', () => {
    const def = demo({ mobile: { width: 720, height: 1000, css: '.p {}' } })
    expect(variant(def, false)).toBe(def)
    const v = variant(def, true)
    expect([v.width, v.height]).toEqual([720, 1000])
    expect(v.css).toBe('.demo-css {}.p {}')
  })
})

describe('mount', () => {
  it('stacks the stage reset, the app css and the demo css in one shadow style', () => {
    const el = host()
    mount(el, demo(), { autoplay: false, css: '.app-css {}', theme: THEME })
    const style = el.shadowRoot!.querySelector('style')!.textContent!
    expect(style.indexOf('.stage')).toBeLessThan(style.indexOf('.app-css'))
    expect(style.indexOf('.app-css')).toBeLessThan(style.indexOf('.demo-css'))
  })

  it('starts the pill under the active item for a demo that never calls nav()', () => {
    const el = host()
    mount(el, demo(), { autoplay: false, theme: THEME })
    const root = el.shadowRoot!
    expect(root.querySelector<HTMLElement>('.pill')!.style.top).toBe('80px')
    expect(
      root.querySelector<HTMLElement>('[data-k="close"]')!.style.color
    ).toBe('rgb(124, 58, 237)')
    expect(
      root.querySelector<HTMLElement>('[data-k="inbox"]')!.style.color
    ).toBe('rgb(207, 203, 220)')
  })

  it('leaves the sidebar alone without a theme', () => {
    const el = host()
    mount(el, demo(), { autoplay: false })
    expect(el.shadowRoot!.querySelector<HTMLElement>('.pill')!.style.top).toBe(
      ''
    )
  })

  it('poses the poster frame and fades [data-loop] content at the loop ends', () => {
    const el = host()
    const seen: number[] = []
    const { seek } = mount(
      el,
      demo({ setup: () => (t) => void seen.push(t) }),
      { autoplay: false, theme: THEME }
    )
    expect(seen).toEqual([2])
    const main = el.shadowRoot!.getElementById('main')!
    expect(main.style.opacity).toBe('1')
    seek(0)
    expect(main.style.opacity).toBe('0')
  })

  it('hands setup a nav() that slides the pill between items', () => {
    const el = host()
    mount(
      el,
      demo({
        setup: (ctx) => (t) => ctx.nav('close', 'home', t),
      }),
      { autoplay: false, theme: THEME }
    ).seek(0.5)
    // halfway on the ease-in-out: halfway between 0 and 80
    expect(el.shadowRoot!.querySelector<HTMLElement>('.pill')!.style.top).toBe(
      '40px'
    )
  })
})
