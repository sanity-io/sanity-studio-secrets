# sanity-secrets

Not ready for production quite yet

React hooks and UI for reading and managing secrets in a Sanity Studio. This is a good pattern for keeping configuration secret. Instead of using environment variables that would be encoded in the build Studio source code, we store secret information in a document in the dataset. This document will not be readable to externals even in a public dataset.
