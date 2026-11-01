'use client'

import {
  createContext,
  forwardRef,
  useContext,
  useState,
  type ComponentPropsWithoutRef,
  type ElementType,
} from 'react'
import { cn } from './cn'
import { themeDefaults } from './theme-defaults'

const t = themeDefaults.navbar

interface NavbarContextValue {
  isOpen?: boolean
  setIsOpen: (isOpen: boolean) => void
}
const NavbarContext = createContext<NavbarContextValue | undefined>(undefined)
function useNavbarContext() {
  const context = useContext(NavbarContext)
  if (!context)
    throw new Error(
      'useNavBarContext should be used within the NavbarContext provider!'
    )
  return context
}

export interface NavbarProps extends ComponentPropsWithoutRef<'nav'> {
  border?: boolean
  fluid?: boolean
  menuOpen?: boolean
  rounded?: boolean
}

const NavbarRoot = forwardRef<HTMLElement, NavbarProps>(function Navbar(
  { border, children, className, fluid = false, menuOpen, rounded, ...rest },
  ref
) {
  const [isOpen, setIsOpen] = useState(menuOpen)
  return (
    <NavbarContext.Provider value={{ isOpen, setIsOpen }}>
      <nav
        ref={ref}
        className={cn(
          t.root.base,
          t.root.bordered[border ? 'on' : 'off'],
          t.root.rounded[rounded ? 'on' : 'off'],
          className
        )}
        {...rest}
      >
        <div
          className={cn(
            t.root.inner.base,
            t.root.inner.fluid[fluid ? 'on' : 'off']
          )}
        >
          {children}
        </div>
      </nav>
    </NavbarContext.Provider>
  )
})

export interface NavbarBrandProps extends ComponentPropsWithoutRef<'a'> {
  as?: ElementType
}

export const NavbarBrand = forwardRef<HTMLAnchorElement, NavbarBrandProps>(
  function NavbarBrand({ as: Component = 'a', className, ...rest }, ref) {
    useNavbarContext()
    return (
      <Component ref={ref} className={cn(t.brand.base, className)} {...rest} />
    )
  }
)

export const Navbar = Object.assign(NavbarRoot, { Brand: NavbarBrand })
