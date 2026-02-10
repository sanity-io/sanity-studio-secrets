/* eslint-disable @typescript-eslint/no-explicit-any */
import {renderHook, act, cleanup} from '@testing-library/react'
import {Subject} from 'rxjs'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {useSecrets, _resetListenerCache} from '../useSecrets'

// ---------------------------------------------------------------------------
// Mock sanity client
// ---------------------------------------------------------------------------

let listenSubject: Subject<any>
let fetchResolve: (value: any) => void
let commitResolve: (value: any) => void

function createFetchPromise() {
  return new Promise<any>((resolve) => {
    fetchResolve = resolve
  })
}

function createCommitPromise() {
  return new Promise<any>((resolve) => {
    commitResolve = resolve
  })
}

let currentFetchPromise = createFetchPromise()
let currentCommitPromise = createCommitPromise()

const mockClient = {
  observable: {
    listen: vi.fn(() => {
      listenSubject = new Subject()
      return listenSubject
    }),
  },
  fetch: vi.fn(() => currentFetchPromise),
  patch: vi.fn(() => ({
    set: vi.fn(() => 'keysPatch'),
  })),
  transaction: vi.fn(() => ({
    createIfNotExists: vi.fn().mockReturnThis(),
    patch: vi.fn().mockReturnThis(),
    commit: vi.fn(() => currentCommitPromise),
  })),
}

vi.mock('sanity', () => ({
  useClient: () => mockClient,
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

beforeEach(() => {
  _resetListenerCache()
  currentFetchPromise = createFetchPromise()
  currentCommitPromise = createCommitPromise()
  vi.clearAllMocks()
})

afterEach(() => {
  cleanup()
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useSecrets', () => {
  it('returns loading=true initially, then loading=false after fetch resolves', async () => {
    const {result} = renderHook(() => useSecrets<{apiKey: string}>('techBlog'))

    expect(result.current.loading).toBe(true)
    expect(result.current.secrets).toBeUndefined()

    await act(async () => {
      fetchResolve({secrets: {apiKey: 'sk-123'}})
      await Promise.resolve()
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.secrets).toEqual({apiKey: 'sk-123'})
  })

  it('creates only one SSE listener for the same namespace across multiple hooks', () => {
    renderHook(() => useSecrets('techBlog'))
    renderHook(() => useSecrets('techBlog'))

    // client.observable.listen should be called exactly once — the second
    // hook subscribes to the shared observable via share()
    expect(mockClient.observable.listen).toHaveBeenCalledTimes(1)
  })

  it('tears down SSE when all subscribers unmount', () => {
    const {unmount: unmount1} = renderHook(() => useSecrets('techBlog'))
    const {unmount: unmount2} = renderHook(() => useSecrets('techBlog'))

    // Both subscribed to the same shared observable
    expect(mockClient.observable.listen).toHaveBeenCalledTimes(1)

    // Unmount first — SSE should still be alive (one subscriber left)
    unmount1()

    // Unmount second — SSE should be torn down (refcount zero)
    // finalize() cleans the Map entry, so a new mount creates a fresh listener
    unmount2()

    renderHook(() => useSecrets('techBlog'))
    expect(mockClient.observable.listen).toHaveBeenCalledTimes(2)
  })

  it('updates secrets when SSE delivers a value', async () => {
    const {result} = renderHook(() => useSecrets<{apiKey: string}>('techBlog'))

    await act(async () => {
      fetchResolve({secrets: {apiKey: 'initial'}})
      await Promise.resolve()
    })

    expect(result.current.secrets).toEqual({apiKey: 'initial'})

    act(() => {
      listenSubject.next({result: {secrets: {apiKey: 'updated-via-sse'}}})
    })

    expect(result.current.secrets).toEqual({apiKey: 'updated-via-sse'})
  })

  it('skips stale fetch result if SSE delivered while fetch was in flight', async () => {
    const {result} = renderHook(() => useSecrets<{apiKey: string}>('techBlog'))

    // SSE delivers BEFORE fetch resolves
    act(() => {
      listenSubject.next({result: {secrets: {apiKey: 'sse-value'}}})
    })

    expect(result.current.secrets).toEqual({apiKey: 'sse-value'})

    // Now fetch resolves with an older value — should be ignored
    await act(async () => {
      fetchResolve({secrets: {apiKey: 'stale-fetch-value'}})
      await Promise.resolve()
    })

    // SSE value should win
    expect(result.current.secrets).toEqual({apiKey: 'sse-value'})
    expect(result.current.loading).toBe(false)
  })

  it('storeSecrets sets loading=true then loading=false on completion', async () => {
    const {result} = renderHook(() => useSecrets<{apiKey: string}>('techBlog'))

    // Resolve initial fetch first
    await act(async () => {
      fetchResolve({secrets: {apiKey: 'initial'}})
      await Promise.resolve()
    })

    expect(result.current.loading).toBe(false)

    // Store new secrets
    act(() => {
      result.current.storeSecrets({apiKey: 'new-key'})
    })

    expect(result.current.loading).toBe(true)

    // Resolve the commit
    await act(async () => {
      commitResolve({})
      await Promise.resolve()
    })

    expect(result.current.loading).toBe(false)
  })

  it('does not re-create listener when client reference changes (re-render)', () => {
    const {rerender} = renderHook(() => useSecrets('techBlog'))

    expect(mockClient.observable.listen).toHaveBeenCalledTimes(1)

    // Simulate re-renders (which would give a new client ref in production)
    rerender()
    rerender()
    rerender()

    // Still only one listener
    expect(mockClient.observable.listen).toHaveBeenCalledTimes(1)
  })

  it('creates separate listeners for different namespaces', () => {
    renderHook(() => useSecrets('techBlog'))
    renderHook(() => useSecrets('analytics'))

    expect(mockClient.observable.listen).toHaveBeenCalledTimes(2)
  })

  it('handles fetch error without getting stuck in loading state', async () => {
    // Override fetch to return a rejected promise for this test
    const originalFetch = mockClient.fetch
    mockClient.fetch = vi.fn(() => Promise.reject(new Error('network error')))

    const {result} = renderHook(() => useSecrets<{apiKey: string}>('techBlog'))

    expect(result.current.loading).toBe(true)

    // Let the rejected promise + .catch() + .finally() flush
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10))
    })

    // Should still transition to loading=false even on error
    expect(result.current.loading).toBe(false)
    expect(result.current.secrets).toBeUndefined()

    mockClient.fetch = originalFetch
  })
})
