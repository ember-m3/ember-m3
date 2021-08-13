# m3-perf-testing-app

This app is used for tracking performance improvements and regressions, using the perf-check CI workflow

It currently has two routes used for tracking performance `materializing` and `rendering`.

## Materializing

The materializing route tests pushing a sample m3 payload which includes plain attributes, managed arrays, embedded models and references into the store,
and accessing a few of their properties.

The goal of this test is to cover the overall push speed and the speed of going through the attribute resolution.

## Rendering

Rendering tests pushing and rendering a sample m3 payload which includes plain attributes, managed arrays, embedded models and references.

The goal of this test is to cover the non-networking workflow of typical m3 usage.
