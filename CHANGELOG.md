# ember-m3 changelog

## 0.9.0

- apps now specify schemas via a service rather than global registration
- tracked arrays accept embedded models from other top models (although this is
  not recommended)

## 0.8.2

- bugfix: tracked arrays no longer overwrite existing entries (thanks @dnalagatla)

## 0.8.1

- `modelName` is now passed to `computeAttributes`

## 0.8.0

- bugfix: dependent keys are tracked even when they are initially absent in the server payload
- breaking: schema manager is now a service. See UPGRADING.md. (thanks @dnachev)
- bugfix: fix support for ember 3.4.0-beta.1
- feature: Added [cacheURL](https://github.com/hjdivad/ember-m3/blob/e760dd7eed86dd3d19fdd7f9b36dec25c347a18c/README.md#manual-cache-insertion) (thanks @sangm)
- records added to tracked arrays now remove themselves when unloaded

## 0.7.13

- Added support to track changes in Array #136

## 0.7.12

- models added to record arrays are now entangled with those arrays, so they'll
  be auto-removed when eg destroyed. Previously only models that started in
  record arrays were entangled.

## 0.7.11

- Fixed `computeNestedModel` schema hook to be able to call `schemaInterface.getAttr()`

## 0.7.9

- Added `setAttribute` schema hook #127

## 0.7.8

- Fixed updating state of model to `loaded.update.uncommitted` upon invoking `set` in model.

## 0.7.7

- Fixed changedAttributes() on a projection to return all changes.

## 0.7.6

- Fixed handling of model names normalization. The schema no longer needs to normalize when returning
  references, nested models and base model names.

## 0.7.5

- Model supports client validation errors. `errors` an instance of DS.Errors provides list of vaidation errors.

## 0.7.4

- bugfix: `setUnknownProperty` remove cache and child model data if value is not resolved.

## 0.7.3

- bugfix: `setUnknownProperty` remove cache after setting a new value and only update cache when value is resolved.

## 0.7.2

- bugfix: `setUnknownProperty` only update cache when value is resolved.

## 0.7.1

- bugfix: Now able to get `length` of `M3RecordArray` as property.

## 0.7.0

- breaking: Properties manually set, including those set in initial record
  creation, are treated as resolved. This means that
  `createRecord({ myprop })` will not use transforms for `myprop`.

- bugfix: now able to set `RecordArray` properties with `RecordArray` values.
  Semantics are still update in-place, as when setting to arrays of models.

## 0.6.0

- breaking: To be consistent with the request types used in ember-data,
  `queryURL` will pass a `requestType` of `queryURL`. Previously `query-url`
  was passed.

- breaking: All arrays of references are now returned as `RecordArray`s.
  `schema.isAttributeArrayRef` is therefore deprecated.

- `store.queryURL` will now call `adapter.queryURL` if it exists, instead of
  `adapter.ajax`. This is intended to be a hook for doing app-wide url
  conversion for `store.queryURL` calls beyond prepending the adapter
  namespace.

## 0.5.1

- bugfix: when using `schemaInterface` to compute attribute references from
  data other than `key`, dependencies are now tracked and `key` is invalidated
  correctly when those dependencies are invalidated. (thanks @dnalagatla)

## 0.5.0

- bugfix: prevent `notifyProperties(undefined)` from nested models with no changed attributes (thanks @sangm)
- nested models that specify type, id are not re-used when these change. `null` id is fine for indicating a uniform type that should always be reused when new properties come in (thanks @dnachev)
- attribute semantics now merge (so missing attributes are not treated as deletes thanks @dnachev)

## 0.4.2

- fix phantomjs regression (use of native Map).
- calls to `queryURL` for the same `cacheKey` are now batched (thanks @dnalagatla)

## 0.4.1

- fix ember 3.1 regression from unusual CP definition

- fix regression from 0.4.0: `eachAttribute` iterates over modified attributes,
  as well as the last known attributes from the server.

- deleted models removed from record arrays

## 0.4.0

- change to use ModelData. This is based on the implementation of the [ModelData RFC](https://github.com/emberjs/rfcs/pull/293) and so is "pre-canary". This release should therefore be considered unstable. 0.5.x will likely depend on a version of Ember Data in which ModelData is the intimate addon API.

- M3 models now report changed attributes via `changedAttributes`, like Ember
  Data. `changedAttributes` reports changed attributes recursively for nested
  models.

## 0.3.3

- schema APIs now have access to the full data hash. This enables schemas that
  depend on key mutations. For example, `computeAttributeReference` might work
  based on a key prefix `{ '*book': '123' }` that differs from the property
  name (in this example, `book`). Thanks @dnalagatla

## 0.3.2

- setting `id` now only asserts for top-level models, and not embedded models

## 0.3.1

- `model.reload` now supports passing `{ adapterOptions }`
- setting `id` for an existing model now asserts

## 0.3.0

- Nested model's `unloadRecord` now no-ops and warns instead of erroring
