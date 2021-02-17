import { useState, useEffect } from 'react';
import client from 'part:@sanity/base/client';

const query = '* [_id == $id] {secrets}[0]';
const type = 'pluginSecrets';

export function useSecrets<T>(namespace: string) {
  const [loading, setLoading] = useState<boolean>(true);
  const [secrets, setSecrets] = useState<T>();

  const id = `secrets.${namespace}`;

  let subscription: any;
  useEffect(() => {
    subscription = client.observable
      .listen(query, { id }, { visibility: 'query' })
      .subscribe((result: Record<string, any>) => {
        setSecrets(result.result.secrets || {});
      });
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    async function fetchData() {
      client
        .fetch(query, { id })
        .then((doc: Record<string, any>) => setSecrets(doc.secrets))
        .finally(() => setLoading(false));
    }
    fetchData();
  }, []);

  const storeSecrets = (secrets: T) => {
    setLoading(true);
    const keysPatch = client.patch(id).set({ secrets });
    client
      .transaction()
      .createIfNotExists({ _id: id, _type: type })
      .patch(keysPatch)
      .commit()
      .finally(() => setLoading(false));
  };

  return { loading, secrets, storeSecrets };
}
