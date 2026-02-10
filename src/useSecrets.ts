import {finalize, share} from 'rxjs'
import {useCallback, useEffect, useRef, useState} from 'react'
import {useClient} from 'sanity'

const query = '* [_id == $id] {secrets}[0]'
const type = 'pluginSecrets'

export interface Secrets<T> {
  loading: boolean
  secrets?: T
  storeSecrets: (secrets: T) => void
}

// ---------------------------------------------------------------------------
// Shared SSE listeners keyed by document ID.
//
// RxJS share() handles ref-counting: the SSE connection is created on first
// subscribe and torn down when the last subscriber unsubscribes.
//
// resetOnRefCountZero: true means a brief disconnect on unmount/remount
// (e.g. React strict mode). This is the correct tradeoff for a secrets config
// hook — don't add a delay timer here to "optimize" reconnection.
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sharedListeners = new Map<string, any>()

/** Exposed for testing — clears the shared listener cache. */
export function _resetListenerCache(): void {
  sharedListeners.clear()
}

export function useSecrets<T>(namespace: string): Secrets<T> {
  const [loading, setLoading] = useState<boolean>(true)
  const [secrets, setSecrets] = useState<T>()

  // Stabilize the client reference so it never appears in effect deps.
  // useClient() may return a new object on re-renders, but the underlying
  // Sanity client instance is functionally identical.
  const client = useClient({apiVersion: '2021-03-01'})
  const clientRef = useRef(client)
  clientRef.current = client

  const id = `secrets.${namespace}`

  // Monotonic write counter — prevents a stale fetch response from
  // overwriting a newer SSE value. Each write (SSE or fetch) increments
  // the counter. A fetch only applies its result if no newer write
  // arrived while it was in flight.
  const writeVersionRef = useRef(0)

  useEffect(() => {
    if (!sharedListeners.has(id)) {
      sharedListeners.set(
        id,
        clientRef.current.observable
          .listen(query, {id}, {visibility: 'query', tag: 'secrets.listen'})
          .pipe(
            finalize(() => sharedListeners.delete(id)),
            share({resetOnRefCountZero: true}),
          ),
      )
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sub = sharedListeners.get(id)!.subscribe((result: Record<string, any>) => {
      writeVersionRef.current++
      setSecrets(result?.['result']?.secrets)
    })
    return () => {
      sub.unsubscribe()
    }
  }, [id])

  useEffect(() => {
    const fetchedAtVersion = writeVersionRef.current
    clientRef.current
      .fetch(query, {id}, {tag: 'secrets.get'})
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then((doc: Record<string, any> | null) => {
        // Only apply if no SSE event arrived while the fetch was in flight
        if (writeVersionRef.current === fetchedAtVersion) {
          writeVersionRef.current++
          setSecrets(doc?.['secrets'] as T | undefined)
        }
      })
      .catch(() => {
        // Fetch errors are non-fatal — the SSE listener will deliver
        // the current value when it connects.
      })
      .finally(() => setLoading(false))
  }, [id])

  const storeSecrets = useCallback(
    (updatedSecret: T) => {
      setLoading(true)
      const c = clientRef.current
      const keysPatch = c.patch(id).set({secrets: updatedSecret})
      c.transaction()
        .createIfNotExists({_id: id, _type: type})
        .patch(keysPatch)
        .commit({visibility: 'async', tag: 'secrets.store'})
        .finally(() => setLoading(false))
    },
    [id],
  )

  return {loading, secrets, storeSecrets}
}
