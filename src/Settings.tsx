import React, {Dispatch, SetStateAction, useCallback, useEffect} from 'react'
import {Dialog, Card, Stack, Text, TextInput, Button} from '@sanity/ui'
import {useSecrets} from './useSecrets'

export type SettingsKey = {
  key: string
  title: string
  description?: string
}

export type SettingsViewProps = {
  title: string
  namespace: string
  keys: SettingsKey[]
  onClose: () => void
}

export const SettingsView = ({
  namespace,
  keys,
  onClose,
  title = 'Configure',
}: SettingsViewProps) => {
  const {loading, secrets, storeSecrets} = useSecrets<Record<string, any>>(namespace)
  const [newSecrets, setNewSecrets] = React.useState<Record<string, any>>({})

  useEffect(() => {
    if (secrets) {
      setNewSecrets(secrets)
    }
  }, [secrets])

  const onClick = useCallback(() => storeSecrets(newSecrets), [storeSecrets, newSecrets])

  return (
    <Dialog id="translation-settings" onClose={onClose} header={title}>
      <Card padding={3}>
        <Stack space={3}>
          {keys.map((keyEntry) => (
            <SettingsKeEntry
              key={keyEntry.key}
              keyEntry={keyEntry}
              loading={loading}
              newSecrets={newSecrets}
              setNewSecrets={setNewSecrets}
            />
          ))}
          <Button
            disabled={loading}
            onClick={onClick}
            text={loading ? 'Loading…' : 'Save'}
            tone="positive"
          />
        </Stack>
      </Card>
    </Dialog>
  )
}

interface SettingsKeyProps {
  loading: boolean
  newSecrets: Record<string, any>
  setNewSecrets: Dispatch<SetStateAction<Record<string, any>>>
  keyEntry: SettingsKey
}

function SettingsKeEntry({loading, setNewSecrets, newSecrets, keyEntry}: SettingsKeyProps) {
  const onChange = useCallback(
    (event: React.FormEvent<HTMLInputElement>) => {
      const target = event.currentTarget
      const {value} = target
      setNewSecrets((prevState) => {
        const newState = {...prevState}
        newState[keyEntry.key] = value
        return newState
      })
    },
    [keyEntry, setNewSecrets]
  )

  return (
    <Stack space={2}>
      <Text as="label" weight="semibold" size={1}>
        {keyEntry.title}
      </Text>
      {keyEntry.description && (
        <Text muted size={1}>
          {keyEntry.description}
        </Text>
      )}
      <TextInput disabled={loading} onChange={onChange} value={newSecrets[keyEntry.key]} />
    </Stack>
  )
}
