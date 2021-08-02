# ember-m3

## Deprecations

### 4.x

#### Model Native Properties

**ID**: 'm3.model.native-property',

**Until**: 5.0

M3 is adding support for not having to use `.get()` and `.set()` on models. If you do not currently
do `.` access on your m3 models, i.e. you don't have code that does `someModel.someInternalState = value`
it is safe to turn on the native property access support by definining `useNativeProperties` method
in your schema:

```js
  useNativeProperties(/* modelName */) {
    return true;
  }

```
This will allow you to use `.` instead of `.get()` and `.set()` with your m3 models.

If you do currently access your models using `.`, you will need to migrate away from doing that, as
once you enable native property access, those values will be treated as attributes to be sent to 
the server.

For a smooth and piecemeal migration, you can define the following in your schema:

```js
  useNativeProperties(/* modelName */) {
    return false;
  }
```

Returning false from `useNativeProperties` will trigger a deprecation every time you set a value on
your m3 model by using `.`. Once you have migrated the existing native access, you can turn the
m3 native access on for the model type for which you know it is safe. For example, after removing
all instances of `m3Record.someInternalState = value` for a model of type `mymodels.book` you can do:
```js
  useNativeProperties(modelName) {
    if (modelName === 'mymodels.book') {
      return true
    } else {
      return false;
    }
  }
```
