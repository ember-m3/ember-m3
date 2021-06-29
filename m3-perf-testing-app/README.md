# m3-perf-testing-app

This app is used for tracking performance improvements and regressions, using the perf-check CI workflow

It currently has two routes used for tracking performance `materializing` and `rendering`.

Materializing tests pushing a sample m3 payload which includes includes plain attributes, managed arrays, embedded models and references into the store,
and accessing a few of their properties, in order to test overall push speed and the speed of going through the attribute resolution.

Renderirng tests pushing and rendering a sample m3 payload which includes plain attributes, managed arrays, embedded models and references, in order to test the core non network workflow of typical m3 usage.