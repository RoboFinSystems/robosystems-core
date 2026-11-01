'use client'

import { Floating, type FloatingProps } from './Floating'
import { themeDefaults } from './theme-defaults'

export type TooltipProps = Omit<FloatingProps, 'theme'>

export function Tooltip({
  animation = 'duration-300',
  arrow = true,
  children,
  className,
  content,
  placement = 'top',
  style = 'dark',
  trigger = 'hover',
  ...rest
}: TooltipProps) {
  return (
    <Floating
      animation={animation}
      arrow={arrow}
      content={content}
      placement={placement}
      style={style}
      theme={themeDefaults.tooltip}
      trigger={trigger}
      className={className}
      {...rest}
    >
      {children}
    </Floating>
  )
}
