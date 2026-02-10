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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sharedListeners = new Map<string, any>()

export function useSecrets<T>(namespace: string): Secrets<T> {
  const [loading, setLoading] = useState<boolean>(true)
  const [secrets, setSecrets] = useState<T>()

  // Stabilize the client reference to avoid re-triggering the useEffect
  // when useClient() returns a new object on re-renders.
  const client = useClient({apiVersion: '2021-03-01'})
  const clientRef = useRef(client)
  clientRef.current = client

  const id = `secrets.${namespace}`

  // Monotonic counter to prevent a pre-existing race condition: if an SSE
  // event arrives while the initial fetch is in flight, the slower fetch
  // response could overwrite the newer SSE value. Each write increments
  // the counter; the fetch only applies its result if no write occurred
  // since it started.
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
    const subscription = sharedListeners.get(id)!.subscribe((result: Record<string, any>) => {
      writeVersionRef.current++
      setSecrets(result?.['result']?.secrets)
    })
    return () => {
      subscription.unsubscribe()
    }
  }, [id])

  useEffect(() => {
    async function fetchData() {
      const fetchedAtVersion = writeVersionRef.current
      clientRef.current
        .fetch(query, {id}, {tag: 'secrets.get'})
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .then((doc: Record<string, any> | null) => {
          // Only apply if no SSE event arrived while the fetch was in flight
          if (writeVersionRef.current === fetchedAtVersion) {
            writeVersionRef.current++
            setSecrets(doc?.['secrets'])
          }
        })
        .catch(() => {
          // Non-fatal — the SSE listener will deliver the value when it connects
        })
        .finally(() => setLoading(false))
    }
    fetchData()
  }, [id])

  const storeSecrets = useCallback(
    (updatedSecret: T) => {
      setLoading(true)
      const currentClient = clientRef.current
      const keysPatch = currentClient.patch(id).set({secrets: updatedSecret})
      currentClient
        .transaction()
        .createIfNotExists({_id: id, _type: type})
        .patch(keysPatch)
        .commit({visibility: 'async', tag: 'secrets.store'})
        .finally(() => setLoading(false))
    },
    [id],
  )

  return {loading, secrets, storeSecrets}
}
