import { useState, useEffect } from 'react';
import sanityClient from 'part:@sanity/base/client';

const client = sanityClient.withConfig({ apiVersion: '2021-03-01' });

const query = '* [_id == $id] {secrets}[0]';
const type = 'pluginSecrets';

export function useSecrets<T>(namespace: string) {
  const [loading, setLoading] = useState<boolean>(true);
  const [secrets, setSecrets] = useState<T>();

  const id = `secrets.${namespace}`;

  useEffect(() => {
    let subscription = client.observable
      .listen(query, { id }, { visibility: 'query', tag: 'secrets.listen' })
      .subscribe((result: Record<string, any>) => {
        setSecrets(result?.result?.secrets);
      });
    return () => {
      subscription.unsubscribe();
    };
  }, [id]);

  useEffect(() => {
    async function fetchData() {
      client
        .fetch(query, { id }, { tag: 'secrets.get' })
        .then((doc: Record<string, any> | null) => setSecrets(doc?.secrets))
        .finally(() => setLoading(false));
    }
    fetchData();
  }, [id]);

  const storeSecrets = (secrets: T) => {
    setLoading(true);
    const keysPatch = client.patch(id).set({ secrets });
    client
      .transaction()
      .createIfNotExists({ _id: id, _type: type })
      .patch(keysPatch)
      .commit({ visibility: 'async', tag: 'secrets.store' })
      .finally(() => setLoading(false));
  };

  return { loading, secrets, storeSecrets };
}
