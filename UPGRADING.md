# Upgrading ember-m3

## 0.4.x

It is now possible for `computeAttributeReference` to return an array of `{id, type}` pairs.  This is treated as a plain array of references (not a `RecordArray`).

Expect `isAttributeArrayReference`, and `computeNestedModel` to behave similarly in the future.
