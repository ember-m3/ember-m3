# ember-m3 changelog

## master

## 0.4.0

* change to use ModelData.  This is based on the implementation of the [ModelData RFC](https://github.com/emberjs/rfcs/pull/293) and so is "pre-canary".  This release should therefore be considered unstable.  0.5.x will likely depend on a version of Ember Data in which ModelData is the intimate addon API.

* M3 models now report changed attributes via `changedAttributes`, like Ember
  Data.  `changedAttributes` reports changed attributes recursively for nested
  models.

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
