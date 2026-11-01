import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  Alert,
  Badge,
  Button,
  DarkThemeToggle,
  Dropdown,
  DropdownItem,
  getThemeModeScript,
  Modal,
  ModalBody,
  ModalHeader,
  TabItem,
  Tabs,
  THEME_MODE_STORAGE_KEY,
  themeDefaults,
  ToggleSwitch,
  Tooltip,
  useThemeMode,
} from '../index'

describe('thin components', () => {
  it('Button renders the resolved default classes and the color variant', () => {
    render(<Button color="primary">Save</Button>)
    const button = screen.getByRole('button', { name: 'Save' })
    expect(button).toHaveAttribute('type', 'button')
    for (const cls of themeDefaults.button.base.split(' '))
      expect(button).toHaveClass(cls)
    for (const cls of themeDefaults.button.color.primary.split(' '))
      expect(button).toHaveClass(cls)
  })

  it('Button renders as an anchor when given href, and as a custom element via `as`', () => {
    const { rerender } = render(<Button href="/x">Go</Button>)
    expect(screen.getByRole('link', { name: 'Go' })).toHaveAttribute(
      'href',
      '/x'
    )
    const Fake = (props: Record<string, unknown>) => (
      <span data-testid="fake" {...props} />
    )
    rerender(<Button as={Fake}>Go</Button>)
    expect(screen.getByTestId('fake')).toHaveTextContent('Go')
  })

  it('an unknown color renders without that class group instead of failing', () => {
    render(<Badge color="not-a-color">x</Badge>)
    const badge = screen.getByTestId('flowbite-badge')
    for (const cls of themeDefaults.badge.root.base.split(' '))
      expect(badge).toHaveClass(cls)
  })

  it('Alert has role=alert and a dismiss button only when onDismiss is given', () => {
    const onDismiss = vi.fn()
    const { rerender } = render(<Alert color="failure">Oops</Alert>)
    expect(screen.getByRole('alert')).toHaveTextContent('Oops')
    expect(screen.queryByRole('button', { name: 'Dismiss' })).toBeNull()
    rerender(
      <Alert color="failure" onDismiss={onDismiss}>
        Oops
      </Alert>
    )
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }))
    expect(onDismiss).toHaveBeenCalledOnce()
  })

  it('ToggleSwitch is a switch that reports the next value', () => {
    const onChange = vi.fn()
    render(<ToggleSwitch checked={false} onChange={onChange} label="Enabled" />)
    const toggle = screen.getByRole('switch', { name: 'Enabled' })
    expect(toggle).toHaveAttribute('aria-checked', 'false')
    fireEvent.click(toggle)
    expect(onChange).toHaveBeenCalledWith(true)
  })
})

describe('Tabs', () => {
  it('renders a tablist, switches panels on click and reports the index', async () => {
    const onChange = vi.fn()
    render(
      <Tabs onActiveTabChange={onChange}>
        <TabItem title="One">first</TabItem>
        <TabItem title="Two">second</TabItem>
      </Tabs>
    )
    expect(screen.getByRole('tablist')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'One' })).toHaveAttribute(
      'aria-selected',
      'true'
    )
    expect(screen.getByText('second')).not.toBeVisible()
    await userEvent.click(screen.getByRole('tab', { name: 'Two' }))
    expect(onChange).toHaveBeenCalledWith(1)
    expect(screen.getByText('second')).toBeVisible()
  })

  it('supports the Tabs.Item alias', () => {
    render(
      <Tabs>
        <Tabs.Item title="A">a</Tabs.Item>
      </Tabs>
    )
    expect(screen.getByRole('tab', { name: 'A' })).toBeInTheDocument()
  })
})

describe('Modal', () => {
  function Harness({ dismissible = false }: { dismissible?: boolean }) {
    const [show, setShow] = useState(true)
    return (
      <>
        <button type="button">outside</button>
        <Modal
          show={show}
          onClose={() => setShow(false)}
          dismissible={dismissible}
        >
          <ModalHeader>Title</ModalHeader>
          <ModalBody>
            <input aria-label="field" />
          </ModalBody>
        </Modal>
      </>
    )
  }

  it('renders in a portal with role=dialog labelled by its header', () => {
    render(<Harness />)
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAccessibleName('Title')
    expect(screen.getByTestId('modal-overlay')).toBeInTheDocument()
  })

  it('shows a Close button and closes on Escape only when dismissible', async () => {
    const { unmount } = render(<Harness />)
    expect(screen.queryByRole('button', { name: 'Close' })).toBeNull()
    await userEvent.keyboard('{Escape}')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    unmount()

    render(<Harness dismissible />)
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument()
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('closes from the header Close button', async () => {
    render(<Harness dismissible />)
    await userEvent.click(screen.getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('moves focus into the dialog', async () => {
    render(<Harness />)
    await waitFor(() =>
      expect(screen.getByRole('dialog').contains(document.activeElement)).toBe(
        true
      )
    )
  })
})

describe('Dropdown', () => {
  it('opens on click, lists menu items, and closes after selecting one', async () => {
    const onClick = vi.fn()
    render(
      <Dropdown label="Menu">
        <DropdownItem onClick={onClick}>First</DropdownItem>
        <DropdownItem>Second</DropdownItem>
      </Dropdown>
    )
    expect(screen.queryByTestId('flowbite-dropdown')).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: /Menu/ }))
    expect(screen.getByTestId('flowbite-dropdown')).toBeInTheDocument()
    expect(screen.getAllByRole('menuitem')).toHaveLength(2)
    await userEvent.click(screen.getByText('First'))
    expect(onClick).toHaveBeenCalledOnce()
    await waitFor(() =>
      expect(screen.queryByTestId('flowbite-dropdown')).toBeNull()
    )
  })

  it('closes on Escape', async () => {
    render(
      <Dropdown label="Menu">
        <DropdownItem>First</DropdownItem>
      </Dropdown>
    )
    await userEvent.click(screen.getByRole('button', { name: /Menu/ }))
    expect(screen.getByTestId('flowbite-dropdown')).toBeInTheDocument()
    await userEvent.keyboard('{Escape}')
    await waitFor(() =>
      expect(screen.queryByTestId('flowbite-dropdown')).toBeNull()
    )
  })

  it('renders a custom trigger', async () => {
    render(
      <Dropdown
        label=""
        renderTrigger={() => <span data-testid="trigger">open</span>}
      >
        <DropdownItem>Only</DropdownItem>
      </Dropdown>
    )
    await userEvent.click(screen.getByTestId('trigger'))
    expect(screen.getByRole('menuitem')).toHaveTextContent('Only')
  })
})

describe('Tooltip', () => {
  it('has a hidden tooltip that shows on hover', async () => {
    render(
      <Tooltip content="Help text">
        <button type="button">target</button>
      </Tooltip>
    )
    const tip = screen.getByTestId('flowbite-tooltip')
    expect(tip).toHaveClass(themeDefaults.tooltip.hidden.split(' ')[0])
    await userEvent.hover(screen.getByRole('button', { name: 'target' }))
    await waitFor(() =>
      expect(tip).not.toHaveClass(themeDefaults.tooltip.hidden.split(' ')[0])
    )
    expect(screen.getByText('Help text')).toBeInTheDocument()
  })
})

describe('theme mode', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove('dark')
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })) as unknown as typeof window.matchMedia
  })
  afterEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove('dark')
  })

  it('the inline script reads the flowbite key and toggles the dark class', () => {
    localStorage.setItem(THEME_MODE_STORAGE_KEY, 'dark')
    new Function(getThemeModeScript())()
    expect(document.documentElement).toHaveClass('dark')
    expect(localStorage.getItem(THEME_MODE_STORAGE_KEY)).toBe('dark')
  })

  it('useThemeMode toggles the class, persists under the flowbite key, and the toggle button drives it', async () => {
    function Probe() {
      const { mode, computedMode } = useThemeMode()
      return (
        <span data-testid="probe">
          {mode}/{computedMode}
        </span>
      )
    }
    render(
      <>
        <Probe />
        <DarkThemeToggle />
      </>
    )
    expect(screen.getByTestId('probe')).toHaveTextContent('auto/light')
    await userEvent.click(
      screen.getByRole('button', { name: 'Toggle dark mode' })
    )
    expect(document.documentElement).toHaveClass('dark')
    expect(localStorage.getItem(THEME_MODE_STORAGE_KEY)).toBe('dark')
    expect(screen.getByTestId('probe')).toHaveTextContent('dark/dark')
    await userEvent.click(
      screen.getByRole('button', { name: 'Toggle dark mode' })
    )
    expect(document.documentElement).not.toHaveClass('dark')
    expect(localStorage.getItem(THEME_MODE_STORAGE_KEY)).toBe('light')
  })
})

describe('per-call theme override', () => {
  it('merges a nested slot over the defaults with cn semantics', () => {
    render(
      <Modal
        show
        onClose={() => {}}
        theme={{ content: { inner: 'h-[90dvh]' } }}
      >
        <ModalBody>x</ModalBody>
      </Modal>
    )
    const inner = screen.getByText('x').parentElement as HTMLElement
    expect(inner).toHaveClass('h-[90dvh]')
    for (const cls of themeDefaults.modal.content.inner
      .split(' ')
      .filter((c) => !c.startsWith('max-h')))
      expect(inner).toHaveClass(cls)
  })

  it('a conflicting class in the override replaces the default one', () => {
    render(<Alert theme={{ wrapper: 'items-start' }}>y</Alert>)
    const wrapper = screen.getByTestId('flowbite-alert-wrapper')
    expect(wrapper).toHaveClass('items-start')
    expect(wrapper).not.toHaveClass('items-center')
  })
})
