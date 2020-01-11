## v0.11.9 (2019-12-18)

#### :rocket: Enhancement

- [#477](https://github.com/hjdivad/ember-m3/pull/477) perf: instantiate errors lazily ([@runspired](https://github.com/runspired))

#### :bug: Bug Fix

- [#490](https://github.com/hjdivad/ember-m3/pull/490) Fix isDirty regression ([@hjdivad](https://github.com/hjdivad))
- [#472](https://github.com/hjdivad/ember-m3/pull/472) fix: remove seen model types in debug-adapter when inspector is closed ([@SYU15](https://github.com/SYU15))
- [#458](https://github.com/hjdivad/ember-m3/pull/458) fix: don't overwrite existing babel plugins ([@hjdivad](https://github.com/hjdivad))

#### :memo: Documentation

- [#484](https://github.com/hjdivad/ember-m3/pull/484) Update support policy ([@hjdivad](https://github.com/hjdivad))

#### :house: Internal

- [#485](https://github.com/hjdivad/ember-m3/pull/485) dx: Fix ember data feature import ([@hjdivad](https://github.com/hjdivad))
- [#483](https://github.com/hjdivad/ember-m3/pull/483) dx: Fix CUSTOM_MODEL_CLASS fallback ([@hjdivad](https://github.com/hjdivad))
- [#460](https://github.com/hjdivad/ember-m3/pull/460) chore: cleanup deprecations ([@runspired](https://github.com/runspired))
- [#459](https://github.com/hjdivad/ember-m3/pull/459) Fix canary feature imports ([@igorT](https://github.com/igorT))

#### Committers: 4

- Chris Thoburn ([@runspired](https://github.com/runspired))
- David J. Hamilton ([@hjdivad](https://github.com/hjdivad))
- Igor Terzic ([@igorT](https://github.com/igorT))
- Sarah Yu ([@SYU15](https://github.com/SYU15))

## 0.11.8

- feat: Add support for Ember Data custom model classes (thanks @igort)
- feat: Add support for displaying models in ember inspector (thanks @syu15)
- feat: Add `meta` support in `queryURL` (thanks @2hu12)
- feat: Add headers support in `queryURL` (thanks @pyuan)
- fix: Fix `isDirty` when setting an attr to its previous value (thanks @2hu12)
- feat: Various updates to maintain compatibility with Ember Data canary (thanks @runspired)

## 0.11.7

- fix: Do not cause build errors with ember-cli-babel@7 (#386 thanks @rwjblue)

## 0.11.6

- docs: Improved debugging docs (thanks @syu15)
- feat: `adapter.queryURL` now supports `adapterOptions` (thanks @loganrosen)

## 0.11.5

- fix: model now dirties during set if the schema dirties any attribute (including ones other than what was set) #377 (thanks @rwjblue)

## 0.11.4

- feat: add debug-adapter for Ember-Inspector support (thanks @syu15)
- fix: fix `debugJSON` for projections (thanks @syu15)
- fix: trigger change notifications when updating references in reference arrays (thanks @runspired)
- fix: trigger array change with correct index arg (thanks @rwjblue)

## 0.11.3

- fix: issues when creating record data for projections (thanks @runspired)
- fix: allow user schemas to compute references with null ids
- fix: user schema hooks take priority over raw values for determining reference arrays

## 0.11.2

- fix: compatibility with Ember Data 3.12.x (thanks @rwjblue)

## 0.11.1

- fix: only store base types in global cache (#315)

## 0.11.0

- chore: drop support for node 6 and ember 2.18 (we support latest 2 LTS and current release)
- feat: batch array changes. Array updates (eg from references updated in `store.push`) are now deferred along with regular property updates.

## 0.10.6

- fix: queryURL no longer erroneously caches rejected responses (thanks @teopalva)
- docs: update contributing guide (thanks @ghaagsma)

## 0.10.5

- fix: bring back M3TrackedArray.value and deprecate

## 0.10.4

- feat: allow handling of EmbeddedMegamorphicModels by computeNestedModel
- feat: dont stash value on tracked arrays
- feat: enable computeNestedModel to handle arrays
- bugfix: batch change notifications
- bugfix: setting arrays with a mix of models and pojos
- bugfix: Revert "Revert "Delegate `_destroyChildRecordData` to base""

## 0.10.2

- bugfix: Revert 'Delegate `_destroyChildRecordData` to base'

## 0.10.1

- bugfix: prevent cycles in dependencies from self-referential schemas (thanks @igort)
- bugfix: fix changed attributes for projections when dirty nested models set to null

## 0.10.0

- feature: Add `isAttributeResolved` API for schema control over interpreting set values as already resolved or not
- bugfix: empty native arrays are now correctly treated as unresolved when set
- breaking: `changedAttributes` improved format for newly created nested records so they can be distinguished from edits to existing nested records (thanks @iterzic @eddie-ruva)
- cleanup: add assertion for attempts to save embedded m3 models directly (thanks @ghaagsma)

## 0.9.9

- bugfix: `changedAttributes` could stack overflow from incorrect deep copy cycle detection (#231)

## 0.9.8

- bugfix: `hasLocalAttr` was not taking into account the base record data when dealing with a projection record. (thanks @eddi-ruva)

## 0.9.7

- feature: add `deleteAttr` to schema interface (thanks @eddi-ruva)
- bugfix: nested model updates from local updates with partial updates from server #215 thanks (@ygongdev)
- bugfix: `rollbackAttributes` for record data from projections (thanks @eddi-ruva)

## 0.9.6

- bugfix: reference array updates are now resolved lazily #205
- bugfix: destroying new records does not trigger API request
- cleanup: dropped use of deprecated `Ember.copy`
- cleanup: fixed errors in README (thanks @ibraheem4)

## 0.9.5

- bugfix: do not throw when setting an id to its current value
- bugfix: add support for ember-data 3.5.x

## 0.9.4

- bugfix: reference arrays can update to undefined (treated as now empty)

## 0.9.3

- bugfix: keep nested model state in sync
- bugfix: add `changedAttributes()` to nested models
- bugfix: projections iterate attributes from base (#165)

## 0.9.2

- rollback ember-cli-babel to v6

## 0.9.1

- no longer including useless default service in `app/services/-ember-m3` which
  mainly forced apps with in-repo addons to ensure they had `after` specified

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

- Model supports client validation errors. For convenience with migrating from @ember-data/model, `errors` an instance of same `Errors` class used by
  `@ember-data/model`, which provides list of vaidation errors.

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
