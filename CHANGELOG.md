# ember-m3 changelog

## master

## 0.3.3

* schema APIs now have access to the full data hash.  This enables schemas that
  depend on key mutations.  For example, `computeAttributeReference` might work
  based on a key prefix `{ '*book': '123' }` that differs from the property
  name (in this example, `book`).  Thanks @dnalagatla

## 0.3.2

* setting `id` now only asserts for top-level models, and not embedded models

## 0.3.1

* `model.reload` now supports passing `{ adapterOptions }`
* setting `id` for an existing model now asserts

## 0.3.0

* Nested model's `unloadRecord` now no-ops and warns instead of erroring
