'use client'

import {
  forwardRef,
  useId,
  type ComponentPropsWithoutRef,
  type KeyboardEvent,
} from 'react'
import { cn } from './cn'
import { themeDefaults } from './theme-defaults'
import type { DynamicStringEnumKeysOf } from './types'

const t = themeDefaults.toggleSwitch

export interface ToggleSwitchProps extends Omit<
  ComponentPropsWithoutRef<'button'>,
  'onChange' | 'color'
> {
  checked: boolean
  color?: DynamicStringEnumKeysOf<typeof t.toggle.checked.color>
  sizing?: DynamicStringEnumKeysOf<typeof t.toggle.sizes>
  label?: string
  onChange: (checked: boolean) => void
}

export const ToggleSwitch = forwardRef<HTMLInputElement, ToggleSwitchProps>(
  function ToggleSwitch(
    {
      checked,
      className,
      color = 'default',
      sizing = 'md',
      disabled,
      label,
      name,
      onChange,
      ...rest
    },
    ref
  ) {
    const id = useId()
    function handleOnKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
      if (event.code === 'Enter') event.preventDefault()
    }
    return (
      <>
        <input
          ref={ref}
          checked={checked}
          name={name}
          type="checkbox"
          className={t.root.input}
          readOnly
          hidden
        />
        <button
          aria-checked={checked}
          aria-labelledby={`${id}-flowbite-toggleswitch-label`}
          disabled={disabled}
          id={`${id}-flowbite-toggleswitch`}
          onClick={() => onChange(!checked)}
          onKeyDown={handleOnKeyDown}
          role="switch"
          tabIndex={0}
          type="button"
          className={cn(
            t.root.base,
            t.root.active[disabled ? 'off' : 'on'],
            className
          )}
          {...rest}
        >
          <div
            data-testid="flowbite-toggleswitch-toggle"
            className={cn(
              t.toggle.base,
              t.toggle.checked.color[
                color as keyof typeof t.toggle.checked.color
              ],
              t.toggle.checked[checked ? 'on' : 'off'],
              t.toggle.sizes[sizing as keyof typeof t.toggle.sizes]
            )}
          />
          {!!label?.length && (
            <span
              data-testid="flowbite-toggleswitch-label"
              id={`${id}-flowbite-toggleswitch-label`}
              className={t.root.label}
            >
              {label}
            </span>
          )}
        </button>
      </>
    )
  }
)
