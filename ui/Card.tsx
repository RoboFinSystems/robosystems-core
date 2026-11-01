'use client'

import {
  createElement,
  forwardRef,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from 'react'
import { cn } from './cn'
import { mergeTheme, type DeepPartial } from './merge-theme'
import { themeDefaults } from './theme-defaults'

const defaults = themeDefaults.card
export type CardTheme = DeepPartial<typeof defaults>

export interface CardProps extends ComponentPropsWithoutRef<'div'> {
  horizontal?: boolean
  href?: string
  imgAlt?: string
  imgSrc?: string
  renderImage?: (theme: typeof defaults, horizontal: boolean) => ReactNode
  /** Per-call override merged over the defaults (strings merge with cn). */
  theme?: CardTheme
}

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  {
    children,
    className,
    horizontal,
    href,
    imgAlt,
    imgSrc,
    renderImage,
    theme,
    ...rest
  },
  ref
) {
  const t = mergeTheme(defaults, theme)
  const Component = typeof href === 'undefined' ? 'div' : 'a'
  const image =
    renderImage?.(t, !!horizontal) ??
    (imgSrc && (
      <img
        data-testid="flowbite-card-image"
        alt={imgAlt ?? ''}
        src={imgSrc}
        className={cn(t.img.base, t.img.horizontal[horizontal ? 'on' : 'off'])}
      />
    ))
  return createElement(
    Component,
    {
      ref,
      'data-testid': 'flowbite-card',
      href,
      className: cn(
        t.root.base,
        t.root.horizontal[horizontal ? 'on' : 'off'],
        href && t.root.href,
        className
      ),
      ...rest,
    },
    image,
    <div className={t.root.children}>{children}</div>
  )
})
