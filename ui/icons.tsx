import { forwardRef, type ComponentPropsWithoutRef } from 'react'

type SvgProps = ComponentPropsWithoutRef<'svg'>

/* Icons lifted from flowbite-react 0.12.17 (MIT, Copyright (c) 2022 Themesberg). */

const filled = (path: string, displayName: string) => {
  const Icon = forwardRef<SVGSVGElement, SvgProps>((props, ref) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="1em"
      height="1em"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth={0}
      viewBox="0 0 20 20"
      ref={ref}
      {...props}
    >
      <path fillRule="evenodd" stroke="none" d={path} clipRule="evenodd" />
    </svg>
  ))
  Icon.displayName = displayName
  return Icon
}

const outlined = (path: string, displayName: string) => {
  const Icon = forwardRef<SVGSVGElement, SvgProps>((props, ref) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
      ref={ref}
      {...props}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d={path} />
    </svg>
  ))
  Icon.displayName = displayName
  return Icon
}

export const XIcon = filled(
  'M4.293 4.293a1 1 0 0 1 1.414 0L10 8.586l4.293-4.293a1 1 0 1 1 1.414 1.414L11.414 10l4.293 4.293a1 1 0 0 1-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 0 1-1.414-1.414L8.586 10 4.293 5.707a1 1 0 0 1 0-1.414z',
  'XIcon'
)
export const ChevronDownIcon = filled(
  'M5.293 7.293a1 1 0 0 1 1.414 0L10 10.586l3.293-3.293a1 1 0 1 1 1.414 1.414l-4 4a1 1 0 0 1-1.414 0l-4-4a1 1 0 0 1 0-1.414z',
  'ChevronDownIcon'
)
export const SunIcon = filled(
  'M10 2a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0V3a1 1 0 0 1 1-1zm4 8a4 4 0 1 1-8 0 4 4 0 0 1 8 0zm-.464 4.95.707.707a1 1 0 0 0 1.414-1.414l-.707-.707a1 1 0 0 0-1.414 1.414zm2.12-10.607a1 1 0 0 1 0 1.414l-.706.707a1 1 0 1 1-1.414-1.414l.707-.707a1 1 0 0 1 1.414 0zM17 11a1 1 0 1 0 0-2h-1a1 1 0 1 0 0 2h1zm-7 4a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0v-1a1 1 0 0 1 1-1zM5.05 6.464A1 1 0 1 0 6.465 5.05l-.708-.707a1 1 0 0 0-1.414 1.414l.707.707zm1.414 8.486-.707.707a1 1 0 0 1-1.414-1.414l.707-.707a1 1 0 0 1 1.414 1.414zM4 11a1 1 0 1 0 0-2H3a1 1 0 0 0 0 2h1z',
  'SunIcon'
)
export const MoonIcon = forwardRef<SVGSVGElement, SvgProps>((props, ref) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="1em"
    height="1em"
    fill="currentColor"
    stroke="currentColor"
    strokeWidth={0}
    viewBox="0 0 20 20"
    ref={ref}
    {...props}
  >
    <path
      stroke="none"
      d="M17.293 13.293A8 8 0 0 1 6.707 2.707a8.001 8.001 0 1 0 10.586 10.586z"
    />
  </svg>
))
MoonIcon.displayName = 'MoonIcon'

export const OutlineXIcon = outlined('M6 18 18 6M6 6l12 12', 'OutlineXIcon')
export const ChevronRightIcon = outlined('m9 5 7 7-7 7', 'ChevronRightIcon')
export const ChevronLeftIcon = outlined('m15 19-7-7 7-7', 'ChevronLeftIcon')
export const ChevronUpIcon = outlined('m5 15 7-7 7 7', 'ChevronUpIcon')
