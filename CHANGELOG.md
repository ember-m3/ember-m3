# ember-m3 changelog

## master

## 0.3.2

* setting `id` now only asserts for top-level models, and not embedded models

## 0.3.1

* `model.reload` now supports passing `{ adapterOptions }`
* setting `id` for an existing model now asserts

## 0.3.0

* Nested model's `unloadRecord` now no-ops and warns instead of erroring
