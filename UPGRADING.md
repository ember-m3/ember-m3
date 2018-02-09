# Upgrading ember-m3

## 0.4.x

TODO: changes to `computeAttributeReference` to handle `Array.isArray(value)` for the `isAttributeArrayRef` case
  - ie where isAttributeRefrence returns true now computeAttributeReference will be called for the whole array not each individual element

  - it's still the case that computeAttriubteReference is called individually for values that are arrays
    (this is goofy and should be replaced by having ocmputeAttrReference return an array)
