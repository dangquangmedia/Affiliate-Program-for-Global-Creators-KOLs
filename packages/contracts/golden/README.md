# Golden HTTP fixtures

These are normalized examples captured from the Nest oracle contract. Placeholder strings wrapped
in `<...>` represent nondeterministic values and are replaced by the differential-test normalizer:

- UUIDs → `<uuid>`
- correlation IDs → `<correlation-id>`
- opaque session token → `<token>`
- timestamps → `<iso-date>`

The sibling `.meta.json` field `status` is part of the contract even though HTTP status is not in
the body. Full stateful scenario fixtures will grow module-by-module; these Week 1 fixtures freeze
the global success/error conventions and public/auth foundation.

