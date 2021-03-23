import React, { useEffect } from 'react';
import { Dialog, Card, Stack, Text, TextInput, Button } from '@sanity/ui';
import { useSecrets } from './useSecrets';

export type SettingsKey = {
  key: string;
  title: string;
  description: string;
};

export type SettingsViewProps = {
  title: string;
  namespace: string;
  keys: SettingsKey[];
  onClose: () => void;
};

export const SettingsView = ({
  namespace,
  keys,
  onClose,
  title = 'Configure',
}: SettingsViewProps) => {
  const { loading, secrets, storeSecrets } = useSecrets<Record<string, any>>(
    namespace
  );
  const [newSecrets, setNewSecrets] = React.useState<Record<string, any>>({});

  useEffect(() => {
    if (secrets) {
      setNewSecrets(secrets);
    }
  }, [secrets]);

  return (
    <Dialog id="translation-settings" onClose={onClose} header={title}>
      <Card padding={3}>
        <Stack space={3}>
          {keys.map(k => (
            <React.Fragment key={k.key}>
              <Text as="label" weight="semibold" size={1}>
                {k.title}
              </Text>
              <TextInput
                disabled={loading}
                onChange={(event: React.FormEvent<HTMLInputElement>) => {
                  const target = event.currentTarget;
                  const { value } = target;
                  const o: Record<string, any> = { ...newSecrets };
                  o[k.key] = value;
                  setNewSecrets(o);
                }}
                value={newSecrets[k.key]}
              ></TextInput>
            </React.Fragment>
          ))}
          <Button
            disabled={loading}
            onClick={() => storeSecrets(newSecrets)}
            text={loading ? 'Loading…' : 'Save'}
            tone="positive"
          />
        </Stack>
      </Card>
    </Dialog>
  );
};
