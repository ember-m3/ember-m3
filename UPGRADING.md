# Upgrading ember-m3

## 0.8.x
`SchemaManager` is now a service, which requires schema initialization to happen in an instance
initializer or equivalent. The name of the service is `m3-schema-manager`.

## 0.4.x

It is now possible for `computeAttributeReference` to return an array of `{id, type}` pairs.  This is treated as a plain array of references (not a `RecordArray`).

Expect `isAttributeArrayReference`, and `computeNestedModel` to behave similarly in the future.
