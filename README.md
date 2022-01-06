# sanity-secrets

React hooks and UI for reading and managing secrets in a Sanity Studio. This is a good pattern for keeping configuration secret. Instead of using environment variables which would be bundled with the Studio source (it is an SPA), we store secret information in a document in the dataset. This document will not be readable to externals even in a public dataset. With custom access controls you can also specify which users can read the configuration in your Studio.

## Caveat

This plugin stores secrets as fields on a document in your dataset. Even though that document is not accessible without having the correct permissions (logged in user with read access) it will be included in any export your may do of your dataset and this is important to be aware of.

## Future deprecation

When native server-side secrets handling is available on the Sanity platform this plugin will be deprecated and a migration path will be provided.

# Usage Example
Quick example of both using the secrets and putting up a dialog to let user enter them.

```javascript
import {useSecrets, SettingsView} from 'sanity-secrets'

const namespace = "myPlugin"

const pluginConfigKeys = [{
  key: 'apiKey',
  title: 'Your secret API key'
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
  )
}
```

