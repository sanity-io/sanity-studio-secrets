import { useState, useEffect } from 'react';
import client from 'part:@sanity/base/client';

const id = 'secret.settings';
const query = '* [_id == $id] {"secrets": @[$namespace]}[0]';
const type = 'hidden.secrets';

export function useSecrets<T>(namespace: string) {
  const [loading, setLoading] = useState<boolean>(true);
  const [secrets, setSecrets] = useState<T>();

  type Doc = {
    secrets: T;
  };

  let subscription: any;
  useEffect(() => {
    subscription = client.observable
      .listen(query, { id, namespace }, { visibility: 'query' })
      .subscribe((result: any) => {
        setSecrets(result.result[namespace] || {});
      });
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    async function fetchData() {
      client
        .fetch(query, { id, namespace })
        .then((doc: Doc) => {
          setSecrets(doc.secrets);
        })
        .finally(() => setLoading(false));
    }
    fetchData();
  }, []);

  const storeSecrets = (secrets: T) => {
    setLoading(true);
    const objPatch: Record<string, any> = {};
    objPatch[namespace] = secrets;
    const keysPatch = client.patch(id).set(objPatch);
    client
      .transaction()
      .createIfNotExists({ _id: id, _type: type })
      .patch(keysPatch)
      .commit()
      .finally(() => setLoading(false));
  };

  return { loading, secrets, storeSecrets };
}
