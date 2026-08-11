import { describe, expect, it, vi } from 'vitest'
import {
  buildLoginHomeUrl,
  buildReturnTo,
  isSafeRelativePath,
  parseReturnTo,
} from '../login-home'

// Mock the config module so tests are independent of build-time env
vi.mock('../config', () => ({
  APP_CONFIGS: {
    robosystems: { url: 'https://robosystems.ai', name: 'robosystems' },
    roboledger: { url: 'https://roboledger.ai', name: 'roboledger' },
    roboinvestor: { url: 'https://roboinvestor.ai', name: 'roboinvestor' },
  },
  getLoginHomeUrl: () => 'https://robosystems.ai',
}))

describe('isSafeRelativePath', () => {
  it('accepts same-app relative paths', () => {
    expect(isSafeRelativePath('/')).toBe(true)
    expect(isSafeRelativePath('/reports/x')).toBe(true)
    expect(isSafeRelativePath('/reports/x?tab=1&y=2')).toBe(true)
  })

  it('rejects open-redirect vectors', () => {
    expect(isSafeRelativePath('//evil.com')).toBe(false)
    expect(isSafeRelativePath('//evil.com/path')).toBe(false)
    expect(isSafeRelativePath('/\\evil.com')).toBe(false)
    expect(isSafeRelativePath('\\/evil.com')).toBe(false)
    expect(isSafeRelativePath('https://evil.com')).toBe(false)
    expect(isSafeRelativePath('http://evil.com')).toBe(false)
    expect(isSafeRelativePath('javascript:alert(1)')).toBe(false)
    expect(isSafeRelativePath('relative-no-slash')).toBe(false)
    expect(isSafeRelativePath('')).toBe(false)
  })
})

describe('buildReturnTo', () => {
  it('qualifies a safe path with the app key', () => {
    expect(buildReturnTo('roboledger', '/reports/x')).toBe(
      'roboledger:/reports/x'
    )
  })

  it('degrades to app-only without a path', () => {
    expect(buildReturnTo('roboledger')).toBe('roboledger')
    expect(buildReturnTo('roboledger', null)).toBe('roboledger')
  })

  it('degrades to app-only for unsafe paths', () => {
    expect(buildReturnTo('roboledger', '//evil.com')).toBe('roboledger')
    expect(buildReturnTo('roboledger', 'https://evil.com')).toBe('roboledger')
  })
})

describe('parseReturnTo', () => {
  it('parses app-only form as default landing', () => {
    expect(parseReturnTo('roboledger')).toEqual({
      app: 'roboledger',
      path: null,
    })
  })

  it('parses app:path form, splitting on the first colon only', () => {
    expect(parseReturnTo('roboledger:/reports/x')).toEqual({
      app: 'roboledger',
      path: '/reports/x',
    })
    // A colon inside the path stays in the path
    expect(parseReturnTo('roboledger:/reports/a:b')).toEqual({
      app: 'roboledger',
      path: '/reports/a:b',
    })
  })

  it('rejects unknown apps entirely', () => {
    expect(parseReturnTo('evilapp:/x')).toBeNull()
    expect(parseReturnTo('evilapp')).toBeNull()
  })

  it('degrades unsafe paths to the default landing, keeping the app', () => {
    expect(parseReturnTo('roboledger://evil.com')).toEqual({
      app: 'roboledger',
      path: null,
    })
    expect(parseReturnTo('roboledger:https://evil.com')).toEqual({
      app: 'roboledger',
      path: null,
    })
    expect(parseReturnTo('roboledger:/\\evil.com')).toEqual({
      app: 'roboledger',
      path: null,
    })
  })

  it('returns null for empty values', () => {
    expect(parseReturnTo(null)).toBeNull()
    expect(parseReturnTo(undefined)).toBeNull()
    expect(parseReturnTo('')).toBeNull()
  })
})

describe('buildLoginHomeUrl', () => {
  it('targets the login home surface for each mode', () => {
    expect(buildLoginHomeUrl('login')).toBe('https://robosystems.ai/login')
    expect(buildLoginHomeUrl('register')).toBe(
      'https://robosystems.ai/register'
    )
    expect(buildLoginHomeUrl('logout')).toBe('https://robosystems.ai/logout')
  })

  it('sets return_to and reason', () => {
    const url = new URL(
      buildLoginHomeUrl('login', {
        returnTo: 'roboledger:/reports/x',
        reason: 'session_expired',
      })
    )
    expect(url.searchParams.get('return_to')).toBe('roboledger:/reports/x')
    expect(url.searchParams.get('reason')).toBe('session_expired')
  })

  it('forwards foreign params but drops flow-owned ones', () => {
    const incoming = new URLSearchParams(
      'invite=tok123&session_id=abc&returnUrl=/x&return_to=stale&reason=stale'
    )
    const url = new URL(
      buildLoginHomeUrl('register', {
        returnTo: 'roboledger',
        forwardParams: incoming,
      })
    )
    expect(url.searchParams.get('invite')).toBe('tok123')
    expect(url.searchParams.get('session_id')).toBeNull()
    expect(url.searchParams.get('returnUrl')).toBeNull()
    // Explicit option wins over the stale incoming value
    expect(url.searchParams.get('return_to')).toBe('roboledger')
    expect(url.searchParams.get('reason')).toBeNull()
  })
})
