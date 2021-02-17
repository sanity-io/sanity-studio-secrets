# sanity-secrets

React hooks and UI for reading and managing secrets in a Sanity Studio. This is a good pattern for keeping configuration secret. Instead of using environment variables that would be encoded in the build Studio source code, we store secret information in a document in the dataset. This document will not be readable to externals even in a public dataset.

## Example
Quick example of both using the secrets and putting up a dialog to let user enter them.

```javascript
import {useSecrets, SettingsView} from 'sanity-secrets'

const namespace = "myPlugin"

const pluginConfigKeys = [
{
  key: 'apiKey',
  description: 'Your secret API key'
}]

const MyComponent = () => {
  const {secrets} = useSecrets(namespace)
  const [showSettings, setShowSettings] = useState(false)
  
  useEffect(() => {
    if (!secrets) { setShowSettings(true)}
  }, [secrets])
  
  return (
    {showSettings && (
    <SettingsView
      namespace={namespace}
      keys={pluginConfigKeys}
      onClose={() => {
        setShowSettings(false)
      }}
    />
  )}
}
```

