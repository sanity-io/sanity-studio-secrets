# @sanity/studio-secrets

> **NOTE**
>
> This is the **Sanity Studio v3 version** of sanity-secrets, @sanity/studio-secrets.
>
> For the v2 version, please refer to the [v2-branch](https://github.com/sanity-io/sanity-secrets).

React hooks and UI for reading and managing secrets in a Sanity Studio. This is a good pattern for keeping configuration secret. Instead of using environment variables which would be bundled with the Studio source (it is an SPA), we store secret information in a document in the dataset. This document will not be readable to externals even in a public dataset. With custom access controls you can also specify which users can read the configuration in your Studio.

## Caveat

This plugin stores secrets as fields on a document in your dataset. 
Even though that document is not accessible without having the correct permissions 
(logged in user with read access) it will be included in any export your may do of your dataset and this is important to be aware of.

## Future deprecation

When native server-side secrets handling is available on the Sanity platform this plugin will be deprecated and a migration path will be provided.

## Installation

```
npm install --save @sanity/studio-secrets@studio-v3
```

or

```
yarn add @sanity/studio-secrets@studio-v3
```

## Usage

Quick example of both using the secrets and putting up a dialog to let user enter them.

```javascript
import {useEffect, useState} from 'react'
import {useSecrets, SettingsView} from '@sanity/studio-secrets'

const namespace = "myPlugin";

const pluginConfigKeys = [
  {
    key: "apiKey",
    title: "Your secret API key",
  },
];

const MyComponent = () => {
  const { secrets } = useSecrets(namespace);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    if (!secrets) {
      setShowSettings(true);
    }
  }, [secrets]);

  if (!showSettings) {
    return null;
  }
  return (
    <SettingsView
      title={"sdfds"}
      namespace={namespace}
      keys={pluginConfigKeys}
      onClose={() => {
        setShowSettings(false);
      }}
    />
  );
};

```
## License

MIT-licensed. See LICENSE.

## Develop & Test

This plugin uses [@sanity/plugin-kit](https://github.com/sanity-io/plugin-kit)
with default configuration for build & watch scripts.

See [Testing a plugin in Sanity Studio](https://github.com/sanity-io/plugin-kit#testing-a-plugin-in-sanity-studio)
on how to run this plugin with hotreload in the studio.

### Release new version

Run ["CI & Release" workflow](https://github.com/sanity-io/sanity-secrets/actions/workflows/main.yml).
Make sure to select the main branch and check "Release new version".

Semantic release will only release on configured branches, so it is safe to run release on any branch.

