




## v5.0.3 (2021-11-01)

#### :bug: Bug Fix
* [#1403](https://github.com/hjdivad/ember-m3/pull/1403) Fix for tracked properties updating when using m3 native properties ([@igorT](https://github.com/igorT))

#### Committers: 1
- Igor Terzic ([@igorT](https://github.com/igorT))


## v5.0.2 (2021-09-29)

#### :bug: Bug Fix
* [#1376](https://github.com/hjdivad/ember-m3/pull/1376) Fix native property access in production ([@igorT](https://github.com/igorT))

#### Committers: 1
- Igor Terzic ([@igorT](https://github.com/igorT))


## v5.0.1 (2021-09-09)

#### :rocket: Enhancement
* [#1337](https://github.com/hjdivad/ember-m3/pull/1337) Add support for Node v16 ([@igorT](https://github.com/igorT))

#### Committers: 1
- Igor Terzic ([@igorT](https://github.com/igorT))


## v5.0.0 (2021-09-02)

#### :boom: Breaking Change
* [#1299](https://github.com/hjdivad/ember-m3/pull/1299) `Array.isArray(value)` should not be used with M3 Arrays and will be returning `true` in the future.

With Ember Data versions `3.28.0` and above M3 Arrays can be used as native JS arrays other than in IE11 which doesn't support proxies. For example, instead of having to do `m3Array.objectAt(0)` you can now do `m3Array[0]`. 

However, because M3 Arrays are now proxying JavaScript native arrays, the return value of `Array.isArray(m3Array)` will change to now be `true`,
so it is no longer safe to rely on `Array.isArray` to distinguish between native and m3 arrays. If you need to detect an M3 Array we have now provided a utility method `isM3Array`:

```js
import isM3Array from 'ember-m3/utils/is-m3-array'

// To replicate old behavior of `Array.isArray(value)` you would need to do:
let isJSArray = Array.isArray(value) && !isM3Array(value)
```

#### :rocket: Enhancement
* [#1300](https://github.com/hjdivad/ember-m3/pull/1300) Do not emit array change events when app is being destroyed ([@igorT](https://github.com/igorT))
* [#1301](https://github.com/hjdivad/ember-m3/pull/1301) Sync projections and base model deleted state with CUSTOM_MODEL_CLASS ([@igorT](https://github.com/igorT))
* [#1238](https://github.com/hjdivad/ember-m3/pull/1238) Add array native access ([@igorT](https://github.com/igorT))
* [#1232](https://github.com/hjdivad/ember-m3/pull/1232) Add native property access for models ([@igorT](https://github.com/igorT))

#### :bug: Bug Fix
* [#1315](https://github.com/hjdivad/ember-m3/pull/1315) Add IE testing and guard proxies when they are not present ([@igorT](https://github.com/igorT))
* [#1298](https://github.com/hjdivad/ember-m3/pull/1298) Do not needlessly access `isDirty` ([@igorT](https://github.com/igorT))
* [#1299](https://github.com/hjdivad/ember-m3/pull/1299) Switch m3 array proxies to proxy [] insted of BaseRecordArray ([@igorT](https://github.com/igorT))
* [#1301](https://github.com/hjdivad/ember-m3/pull/1301) Sync projections and base model deleted state with CUSTOM_MODEL_CLASS ([@igorT](https://github.com/igorT))
* [#1295](https://github.com/hjdivad/ember-m3/pull/1295) Fix isDeleted rollbackAttributes for Custom Model Class ([@igorT](https://github.com/igorT))
* [#1241](https://github.com/hjdivad/ember-m3/pull/1241) fix: skip this.errors.remove if useUnderlyingErrorsValue ([@spham92](https://github.com/spham92))
* [#1243](https://github.com/hjdivad/ember-m3/pull/1243) Fix isError and adapterError with CUSTOM_MODEL_CLASSES ([@igorT](https://github.com/igorT))
* [#1240](https://github.com/hjdivad/ember-m3/pull/1240) Fix for projected models resolving in projected arrays, when CUSTOM_MODEL_CLASS is on ([@igorT](https://github.com/igorT))
* [#1248](https://github.com/hjdivad/ember-m3/pull/1248) Add 'for' and 'since' to nativeProperties deprecation ([@igorT](https://github.com/igorT))
* [#1249](https://github.com/hjdivad/ember-m3/pull/1249) Fix isSaving for embedded records when CUSTOM MODEL CLASS is on ([@igorT](https://github.com/igorT))
* [#1242](https://github.com/hjdivad/ember-m3/pull/1242) Fix isDirty for inflight records and set _topModel to the proxy value ([@igorT](https://github.com/igorT))
* [#1247](https://github.com/hjdivad/ember-m3/pull/1247) Don't trigger dot access deprecations when useNativeProperties hook isn't defined ([@igorT](https://github.com/igorT))

#### :memo: Documentation
* [#1252](https://github.com/hjdivad/ember-m3/pull/1252) Add documentation for native property access ([@igorT](https://github.com/igorT))

#### :house: Internal
* [#1296](https://github.com/hjdivad/ember-m3/pull/1296) Convert state tests to use native property access ([@igorT](https://github.com/igorT))
* [#1251](https://github.com/hjdivad/ember-m3/pull/1251) Cleanup the invalid errors test ([@igorT](https://github.com/igorT))

#### Committers: 2
- Igor Terzic ([@igorT](https://github.com/igorT))
- Steven Pham ([@spham92](https://github.com/spham92))


## v4.2.0 (2021-08-02)

#### :rocket: Enhancement
* [#1238](https://github.com/hjdivad/ember-m3/pull/1238) Add nattive property access for arrays ([@igorT](https://github.com/igorT))
* [#1232](https://github.com/hjdivad/ember-m3/pull/1232) Add native property access for models ([@igorT](https://github.com/igorT))

#### :bug: Bug Fix
* [#1241](https://github.com/hjdivad/ember-m3/pull/1241) fix: skip this.errors.remove if useUnderlyingErrorsValue ([@spham92](https://github.com/spham92))
* [#1243](https://github.com/hjdivad/ember-m3/pull/1243) Fix isError and adapterError with CUSTOM_MODEL_CLASSES ([@igorT](https://github.com/igorT))
* [#1240](https://github.com/hjdivad/ember-m3/pull/1240) Fix for projected models resolving in projected arrays, when CUSTOM_MODEL_CLASS is on ([@igorT](https://github.com/igorT))
* [#1249](https://github.com/hjdivad/ember-m3/pull/1249) Fix isSaving for embedded records when CUSTOM MODEL CLASS is on ([@igorT](https://github.com/igorT))
* [#1242](https://github.com/hjdivad/ember-m3/pull/1242) Fix isDirty for inflight records and set _topModel to the proxy value ([@igorT](https://github.com/igorT))

#### :memo: Documentation
* [#1252](https://github.com/hjdivad/ember-m3/pull/1252) Add documentation for native property access ([@igorT](https://github.com/igorT))

#### :house: Internal
* [#1251](https://github.com/hjdivad/ember-m3/pull/1251) Cleanup the invalid errors test ([@igorT](https://github.com/igorT))

#### Committers: 2
- Igor Terzic ([@igorT](https://github.com/igorT))
- Steven Pham ([@spham92](https://github.com/spham92))


## v4.1.3 (2021-07-27)

#### :bug: Bug Fix
* [#1226](https://github.com/hjdivad/ember-m3/pull/1226) Fix array resolving for non references when CUSTOM_MODEL_CLASS is off ([@igorT](https://github.com/igorT))
* [#1169](https://github.com/hjdivad/ember-m3/pull/1169) Custom Model Classes: Ensure isDirty for embedded records doesn't recursively loop ([@igorT](https://github.com/igorT))
* [#1175](https://github.com/hjdivad/ember-m3/pull/1175) Custom Model Classs: Fix isLoading and isLoaded flags on model ([@igorT](https://github.com/igorT))

#### :house: Internal
* [#1184](https://github.com/hjdivad/ember-m3/pull/1184) Use  operator instead of property access for existence checks ([@igorT](https://github.com/igorT))
* [#1183](https://github.com/hjdivad/ember-m3/pull/1183) Avoid repeatedly looking up the schema type when resolving ([@igorT](https://github.com/igorT))
* [#1179](https://github.com/hjdivad/ember-m3/pull/1179) Make perfomance testing app more robust to slow tests ([@igorT](https://github.com/igorT))
* [#1172](https://github.com/hjdivad/ember-m3/pull/1172) Upgrade ember-lts versions to actual latest and latest-1 ([@igorT](https://github.com/igorT))

#### Committers: 1
- Igor Terzic ([@igorT](https://github.com/igorT))


## v4.1.2 (2021-07-02)

#### :bug: Bug Fix
* [#1180](https://github.com/hjdivad/ember-m3/pull/1180) Fix feature flag infra code for node ([@igorT](https://github.com/igorT))

#### :house: Internal
* [#1174](https://github.com/hjdivad/ember-m3/pull/1174) Make perfomance testing app more robust to slow tests ([@igorT](https://github.com/igorT))

#### Committers: 1
- Igor Terzic ([@igorT](https://github.com/igorT))


## v4.1.1 (2021-06-30)

#### :bug: Bug Fix
* [#1167](https://github.com/hjdivad/ember-m3/pull/1167) Allow custom ObjectProxy instances to be wrapped around an M3Model instance  ([@igorT](https://github.com/igorT))

#### :house: Internal
* [#1157](https://github.com/hjdivad/ember-m3/pull/1157) Add CI workflow for running TracerBench ([@igorT](https://github.com/igorT))
* [#1156](https://github.com/hjdivad/ember-m3/pull/1156) Add a performance testing app ([@igorT](https://github.com/igorT))

#### Committers: 2
- Igor Terzic ([@igorT](https://github.com/igorT))
- Robert Jackson ([@rwjblue](https://github.com/rwjblue))


## v4.1.0 (2021-06-25)

#### :rocket: Enhancement
* [#1145](https://github.com/hjdivad/ember-m3/pull/1145) Make errors attribute configurable ([@spham92](https://github.com/spham92))

#### Committers: 1
- Steven Pham ([@spham92](https://github.com/spham92))


## v4.0.2 (2021-06-24)
Internal release - no user-visible changes


## v4.0.1 (2021-06-24)
Internal release - no user-visible changes

## v4.0.0 (2021-06-24)

#### :boom: Breaking Change
* [#1100](https://github.com/hjdivad/ember-m3/pull/1100) Drop support for inactive node 10 ([@hjdivad](https://github.com/hjdivad))

#### :rocket: Enhancement
* [#1032](https://github.com/hjdivad/ember-m3/pull/1032) Adds support for native Proxy behind a canary feature flag ([@pzuraq](https://github.com/pzuraq))
* [#787](https://github.com/hjdivad/ember-m3/pull/787) replace computeNestedModel and computeAttributeReference schema hooks with computeAttribute ([@igorT](https://github.com/igorT))

#### :bug: Bug Fix
* [#1131](https://github.com/hjdivad/ember-m3/pull/1131) Ensure we do not add custom babel plugins multiple times ([@rwjblue](https://github.com/rwjblue))
* [#1121](https://github.com/hjdivad/ember-m3/pull/1121) Avoid invalid imports in production app tree ([@rwjblue](https://github.com/rwjblue))
* [#1099](https://github.com/hjdivad/ember-m3/pull/1099) Fix state notifications when CUSTOM_MODEL_CLASS is active ([@runspired](https://github.com/runspired))
* [#1005](https://github.com/hjdivad/ember-m3/pull/1005) Pass owner when creating M3DebugAdapter ([@pzuraq](https://github.com/pzuraq))
* [#817](https://github.com/hjdivad/ember-m3/pull/817) temporary fix for stringifying models in the debug adapter ([@betocantu93](https://github.com/betocantu93))
* [#840](https://github.com/hjdivad/ember-m3/pull/840) Replace `new Object(null)` with `Object.create(null)`. ([@rwjblue](https://github.com/rwjblue))

#### :house: Internal
* [#1091](https://github.com/hjdivad/ember-m3/pull/1091) Updated pinned yarn version ([@hjdivad](https://github.com/hjdivad))
* [#1047](https://github.com/hjdivad/ember-m3/pull/1047) Refactor warning capturing and testing. ([@rwjblue](https://github.com/rwjblue))
* [#822](https://github.com/hjdivad/ember-m3/pull/822) Remove work around for Ember < 2.12 relying on `setOwner` enumerability ([@rwjblue](https://github.com/rwjblue))
* [#789](https://github.com/hjdivad/ember-m3/pull/789) and [#793](https://github.com/hjdivad/ember-m3/pull/793) TrackedArrays and ReferenceArrays are now unified as a ManagedArray ([@igorT](https://github.com/igorT))

#### Committers: 7
- Alberto Cantú Gómez ([@betocantu93](https://github.com/betocantu93))
- Chris Garrett ([@pzuraq](https://github.com/pzuraq))
- Chris Thoburn ([@runspired](https://github.com/runspired))
- David J. Hamilton ([@hjdivad](https://github.com/hjdivad))
- Igor Terzic ([@igorT](https://github.com/igorT))
- Robert Jackson ([@rwjblue](https://github.com/rwjblue))
- Steven Pham ([@spham92](https://github.com/spham92))


## v3.0.8 (2021-07-28)

#### :bug: Bug Fix
* [#1131](https://github.com/hjdivad/ember-m3/pull/1131) Ensure we do not add custom babel plugins multiple times ([@rwjblue](https://github.com/rwjblue))
* [#1121](https://github.com/hjdivad/ember-m3/pull/1121) Avoid invalid imports in production app tree ([@rwjblue](https://github.com/rwjblue))
* [#1099](https://github.com/hjdivad/ember-m3/pull/1099) Fix state notifications when CUSTOM_MODEL_CLASS is active ([@runspired](https://github.com/runspired))

#### :house: Internal
* [#1047](https://github.com/hjdivad/ember-m3/pull/1047) Refactor warning capturing and testing. ([@rwjblue](https://github.com/rwjblue))


## v3.0.7 (2021-03-17)

#### :bug: Bug Fix

- [#1041](https://github.com/hjdivad/ember-m3/pull/1041) Only execute callback once per key for eachAttribute (backport #1022) ([@betocantu93](https://github.com/betocantu93))

#### Committers: 1

- Alberto Cantú Gómez ([@betocantu93](https://github.com/betocantu93))

## v3.0.6 (2021-03-15)

#### :bug: Bug Fix

- [#1033](https://github.com/hjdivad/ember-m3/pull/1033) fix: outer object replacement and nested property change (backport #1031) ([@spham92](https://github.com/spham92))

#### :house: Internal

- [#1036](https://github.com/hjdivad/ember-m3/pull/1036) chore: bump release-it, release-it-lerna-changelog ([@hjdivad](https://github.com/hjdivad))

#### Committers: 2

- David J. Hamilton ([@hjdivad](https://github.com/hjdivad))
- Steven Pham ([@spham92](https://github.com/spham92))

## v3.0.5 (2021-01-05)

#### :rocket: Enhancement

- [#784](Add queryParams option for Store.queryURL) (backported via #980)

#### Committers: 1

- ([@2hu](https://github.com/2hu12))

## v3.0.4 (2020-09-29)

#### :bug: Bug Fix

- [#892](https://github.com/hjdivad/ember-m3/pull/892) Fix keeping embedded records in sync inside projections ([@igorT](https://github.com/igorT))

#### Committers: 1

- Igor Terzic ([@igorT](https://github.com/igorT))

## v3.0.3 (2020-08-28)

#### :rocket: Enhancement

- [#852](https://github.com/hjdivad/ember-m3/pull/852) queryURL can resolve primitive values ([@hjdivad](https://github.com/hjdivad))

#### Committers: 1

- David J. Hamilton ([@hjdivad](https://github.com/hjdivad))

## v3.0.2 (2020-08-20)

#### :rocket: Enhancement

- [#837](https://github.com/hjdivad/ember-m3/pull/837) Avoid checking project dependencies more than once per project ([@hjdivad](https://github.com/hjdivad))

#### Committers: 2

- David J. Hamilton ([@hjdivad](https://github.com/hjdivad))
- Robert Jackson ([@rwjblue](https://github.com/rwjblue))

## v3.0.1 (2020-08-20)

#### :bug: Bug Fix

Avoid `checker.check` when project depends on ember-data for a performance gain

#### Committers: 1

- Robert Jackson ([@rwjblue](https://github.com/rwjblue))

## v3.0.0 (2020-06-09)

#### :boom: Breaking Change

- [#760](https://github.com/hjdivad/ember-m3/pull/760) fix: flag store reopen and extend store properly ([@runspired](https://github.com/runspired))

**Migrating**

If your app or addon previously used `extendStore` or directly applied the store mixin, you will need to migrate your app or addon to extend from the ember-m3 store.

**before with extendStore**

```js
import { extendStore } from 'ember-m3/mixins/store';
import Store from '@ember-data/store';

class AppStore extends Store {}
extendStore(AppStore);

export default AppStore;
```

**before with Mixin**

```js
import StoreMixin from 'ember-m3/mixins/store';
import Store from '@ember-data/store';

class AppStore extends Store.extend(StoreMixin) {}

export default AppStore;
```

**after**

```js
import Store from 'ember-m3/services/store';

export default class AppStore extends Store {}
```

#### :bug: Bug Fix

- [#760](https://github.com/hjdivad/ember-m3/pull/760) fix: flag store reopen and extend store properly ([@runspired](https://github.com/runspired))

#### Committers: 1

- Chris Thoburn ([@runspired](https://github.com/runspired))

## v2.1.0 (2020-06-07)

#### :rocket: Enhancement

- [#727](https://github.com/hjdivad/ember-m3/pull/727) Assert against projection cycles ([@hjdivad](https://github.com/hjdivad))

#### :bug: Bug Fix

- [#732](https://github.com/hjdivad/ember-m3/pull/732) queryURL learns to tolerate empty responses ([@hjdivad](https://github.com/hjdivad))

#### Committers: 1

- David J. Hamilton ([@hjdivad](https://github.com/hjdivad))

## v2.0.0 (2020-05-18)

#### :boom: Breaking Change

- [#695](https://github.com/hjdivad/ember-m3/pull/695) utilize ember-data's project trim ([@hjdivad](https://github.com/hjdivad))
- [#705](https://github.com/hjdivad/ember-m3/pull/705) cleanup: BREAKING drop EmberData<3.16 support for 2.0 ([@runspired](https://github.com/runspired))
- [#693](https://github.com/hjdivad/ember-m3/pull/693) Dropping support for < ember-data 3.12 ([@hjdivad](https://github.com/hjdivad))

#### :rocket: Enhancement

- [#695](https://github.com/hjdivad/ember-m3/pull/695) utilize ember-data's project trim ([@hjdivad](https://github.com/hjdivad))

#### :memo: Documentation

- [#719](https://github.com/hjdivad/ember-m3/pull/719) updates readme with tests/dummy example and fix dummy ([@betocantu93](https://github.com/betocantu93))

#### :house: Internal

- [#655](https://github.com/hjdivad/ember-m3/pull/655) Unpin `ember-source` version in `package.json` ([@rwjblue](https://github.com/rwjblue))
- [#656](https://github.com/hjdivad/ember-m3/pull/656) Add ember-lts-3.16 ember-try scenario. ([@rwjblue](https://github.com/rwjblue))

#### Committers: 5

- Alberto Cantú Gómez ([@betocantu93](https://github.com/betocantu93))
- Chris Thoburn ([@runspired](https://github.com/runspired))
- David J. Hamilton ([@hjdivad](https://github.com/hjdivad))
- Robert Jackson ([@rwjblue](https://github.com/rwjblue))
- Stefan Penner ([@stefanpenner](https://github.com/stefanpenner))

## v1.0.3 (2020-04-09)

#### :bug: Bug Fix

- [#651](https://github.com/hjdivad/ember-m3/pull/651) Fix monkeypatching logic for memory leak ([@igorT](https://github.com/igorT))

#### Committers: 1

- Igor Terzic ([@igorT](https://github.com/igorT))

## v1.0.2 (2020-04-03)

#### :bug: Bug Fix

- [#642](https://github.com/hjdivad/ember-m3/pull/642) Fix memory leak in fastboot caused by modifying class prototype ([@igorT](https://github.com/igorT))

#### Committers: 3

- David J. Hamilton ([@hjdivad](https://github.com/hjdivad))
- Igor Terzic ([@igorT](https://github.com/igorT))
- Robert Jackson ([@rwjblue](https://github.com/rwjblue))

## v1.0.1 (2020-03-19)

#### :bug: Bug Fix

- [#611](https://github.com/hjdivad/ember-m3/pull/611) Fix trackedNotifications for destroying records ([@igorT](https://github.com/igorT))

#### :house: Internal

- [#595](https://github.com/hjdivad/ember-m3/pull/595) Update automated release setup. ([@rwjblue](https://github.com/rwjblue))

#### Committers: 3

- David J. Hamilton ([@hjdivad](https://github.com/hjdivad))
- Igor Terzic ([@igorT](https://github.com/igorT))
- Robert Jackson ([@rwjblue](https://github.com/rwjblue))

## v1.0.0 (2020-03-04)

#### :boom: Breaking Change

- [#563](https://github.com/hjdivad/ember-m3/pull/563) Drop node 8 & upgrade all dependencies ([@stefanpenner](https://github.com/stefanpenner))
- [#573](https://github.com/hjdivad/ember-m3/pull/573) Drop node 8, like everybody else ([@hjdivad](https://github.com/hjdivad))

#### :bug: Bug Fix

- [#567](https://github.com/hjdivad/ember-m3/pull/567) Drop direct dependencies on Ember Data ([@hjdivad](https://github.com/hjdivad))
- [#570](https://github.com/hjdivad/ember-m3/pull/570) Re-export interop-debug-adapter in app as data-adapter ([@SYU15](https://github.com/SYU15))
- [#544](https://github.com/hjdivad/ember-m3/pull/544) Allow .toString to be called on record prototype ([@SYU15](https://github.com/SYU15))

#### :house: Internal

- [#582](https://github.com/hjdivad/ember-m3/pull/582) action time ([@hjdivad](https://github.com/hjdivad))

#### Committers: 3

- David J. Hamilton ([@hjdivad](https://github.com/hjdivad))
- Sarah Yu ([@SYU15](https://github.com/SYU15))
- Stefan Penner ([@stefanpenner](https://github.com/stefanpenner))

## v0.11.11 (2020-01-17)

#### :bug: Bug Fix

- [#529](https://github.com/hjdivad/ember-m3/pull/529) Fix hasChangedAttributes with arrays of nested models ([@igorT](https://github.com/igorT))

## v0.11.10 (2020-01-13)

#### :rocket: Enhancement

- [#478](https://github.com/hjdivad/ember-m3/pull/478) feat: support @ember-data packages and trimming ([@runspired](https://github.com/runspired))

#### :bug: Bug Fix

- [#513](https://github.com/hjdivad/ember-m3/pull/513) Fix isDirty check for parents of nested models ([@igorT](https://github.com/igorT))

#### Committers: 2

- Chris Thoburn ([@runspired](https://github.com/runspired))
- Igor Terzic ([@igorT](https://github.com/igorT))

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
