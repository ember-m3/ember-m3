# ember-m3 changelog

## 0.7.2

* bugfix: `setUnknownProperty` only update cache when value is resolved.

## 0.7.1

* bugfix: Now able to get `length` of `M3RecordArray` as property.

## 0.7.0

* breaking: Properties manually set, including those set in initial record
  creation, are treated as resolved.  This means that
  `createRecord({ myprop })` will not use transforms for `myprop`.

* bugfix: now able to set `RecordArray` properties with `RecordArray` values.
  Semantics are still update in-place, as when setting to arrays of models.

## 0.6.0

* breaking: To be consistent with the request types used in ember-data,
  `queryURL` will pass a `requestType` of `queryURL`.  Previously `query-url`
  was passed.

* breaking: All arrays of references are now returned as `RecordArray`s.
  `schema.isAttributeArrayRef` is therefore deprecated.

* `store.queryURL` will now call `adapter.queryURL` if it exists, instead of
  `adapter.ajax`.  This is intended to be a hook for doing app-wide url
  conversion for `store.queryURL` calls beyond prepending the adapter
  namespace.

## 0.5.1

* bugfix: when using `schemaInterface` to compute attribute references from
  data other than `key`, dependencies are now tracked and `key` is invalidated
  correctly when those dependencies are invalidated. (thanks @dnalagatla)

## 0.5.0

* bugfix: prevent `notifyProperties(undefined)` from nested models with no changed attributes (thanks @sangm)
* nested models that specify type, id are not re-used when these change.  `null` id is fine for indicating a uniform type that should always be reused when new properties come in (thanks @dnachev)
* attribute semantics now merge (so missing attributes are not treated as deletes thanks @dnachev)

## 0.4.2

* fix phantomjs regression (use of native Map).
* calls to `queryURL` for the same `cacheKey` are now batched (thanks @dnalagatla)

## 0.4.1

* fix ember 3.1 regression from unusual CP definition

* fix regression from 0.4.0: `eachAttribute` iterates over modified attributes,
  as well as the last known attributes from the server.

* deleted models removed from record arrays

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
