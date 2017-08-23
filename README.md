# ember-m3 [![Build Status](https://secure.travis-ci.org/hjdivad/ember-m3.svg?branch=master)](http://travis-ci.org/hjdivad/ember-m3)

This addon provides an alternative model implementation to `DS.Model` that is
compatible with the rest of the [ember-data](https://github.com/emberjs/data) ecosystem.

## Background

Ember-data users define their schemas via `DS.Model` classes which explicitly
state what attributes and relationships they expect.  Having many such classes
each explicitly defining their schemas provides a lot of clarity and a pleasant
environment for implementing standard object oriented principles.

However, it can be an issue in environments where the API responses are not
easily known in advance, or where they are so varied as to require thousands of
`DS.Model`s which can be a burden both to developer ergonomics as well as
runtime performance.

---

ember-m3 lets you use a single class for many API endpoints, inferring the
schema from the payload and API-specific conventions.

For example, if your API returns responses like the following:

```json
{
  "data": {
    "id": "isbn:9780439708180",
    "type": "com.example.bookstore.Book",
    "attributes": {
      "name": "Harry Potter and the Sorcerer's Stone",
      "author": "urn:Author:3",
      "chapters": [{
        "name": "The Boy Who Lived",
        "mentionedCharacters": ["urn:Character:harry"],
        "readerComments": [{
          "id": "urn:ReaderComment:1",
          "type": "com.example.bookstore.ReaderComment",
          "name": "Someone or Other",
          "body": "I have it on good authority that this is part of a book of some kind",
        }]
      }],
    },
  },
  "included": [{
    "id": "urn:author:3",
    "type": "com.example.bookstore.Author",
    "attributes": {
      "name": "JK Rowling",
    },
  }],
}
```

You could support it with the following schema:

```js
const BookstoreRegExp = /^com\.example\.bookstore\.*/;
const ISBNRegExp = /^isbn:.*/;
const URNRegExp = /^urn:(\w+):(.*)/;

SchemaManager.registerSchema({
  includesModel(modelName) {
    return BookstoreRegExp.test(modelName);
  },

  computeAttributeReference(key, value) {
    if (!value) { return; }

    let match;

    if (ISBNRegExp.test(value)) {
      return {
        id: value,
        type: 'com.example.bookstore.Book',
      };
    } else if (match = URNRegExp.exec(value)) {
      return {
        id: match[2],
        type: `com.example.bookstore.${match[1]}`,
      }
    }
  },

  computeNestedModel(key, value) {
    if (value && typeof value === 'object') {
      return {
        id: value.id,
        type: value.type,
        attributes: value,
      }
    }
  },
})
```

Notice that in this case, the schema doesn't specify anything model-specific and
would work whether the API returns 3 different kinds of models or 3,000.

Model-specific information *is* still needed to handle cases that cannot be
generally inferred from the payload (such as distinguishing `Date` fields).  See
the [Schema](#Schema) section for details.

## Trade-Offs

The benefits of using m3 over `DS.Model` are:

  - handle dynamic schemas whose structure is not known in advance
  - handle relationship references at arbitrary points in the payload seamlessly (eg relationship references within POJO attributes)
  - limit the payload size of schema information by inferring as much as
    possible from the structure of the payload itself
  - more easily query arbitrary URLs, especially when the returned models are
    not known in advance

The trade-offs made for this include:

  - Having only one model class prevents the use of some OOP patterns: You can't
    add computed properties to only one model for instance, and will need to
    rely on a different pattern of helpers and utility functions
  - Inferring the schema from the payload can make the client side code less
    clear as is often the case in "static" vs. "dynamic" tradeoffs

## Installation

* `ember install ember-m3`
* `ember generate schema-initializer`

## Querying

The existing store API works as expected. `findRecord`, `queryRecord` &c., will
build a URL using the `-ember-m3` adapter and create a record for the returned
response using `MegamorphicModel`.  Note that the actual name queried will be
passed to the adapter so you can build URLs correctly.

For example

```js
store.findRecord('com.example.bookstore.book', 'isbn:9780439708180');
```

Results in an adaapter call

```js
import MegamorphicModel from 'ember-m3/model';

findRecord(store, modelClass, id, snapshot) {
  modelClass === MegamorphicModel;
  snapshot.modelName === 'com.example.bookstore.book';
  id === 'isbn:9780439708180';
}
```

Ember-m3 does not define an `-ember-m3` adapter but you can define one in your
app.  Otherwise the default adapter lookup rules are followed (ie your
`application` adapter will be used).

### Store.queryURL

ember-m3 also adds `store.queryURL`.  This is helpful for one-off endpoints or
endpoints where the type returned is not known and you just want a thin wrapper
around the API response that knows how to look up relationships.

```js
store.queryURL(url, options);
```

#### Return Value

Returns a promise that will resolve to

  1. A `MegamorphicModel` if the [primary data][json-api:primary-data] of the normalized response is a resource.
  2. A `RecordArray` of `MegamorphicModel`s if the [primary data][json-api:primary-data] of the normalized response is an array of
     resources.

The raw API response is normalized via the `-ember-m3` serializer.  M3 does not
define such a serializer but you can add one to your app if your API requires
normalization to JSON API.

#### Arguments

- `url` The URL path to query.  The `-ember-m3` adapter is consulted for its
  `host` and `namespace` properties.
  - When `url` is an absolute URL, (eg `http://bookstore.example.com/books`) or a network-path reference (eg `//books`), the adapter's `host` and `namespace` properties are ignored.
  - When `url` is an absolute path reference (eg `/books`) it is prefixed with the adapter's `host` and/or `namespace` if they are present.
  - When `url` is a relative path reference it is prefixed with the adapter's
    `host` and/or `namespace`, whichever is present.  It is an error to call
    `queryURL` when `url` is a relative path reference and the adapter specifies
    neither `host` nor `namespace`.

- `options` additional options.  All are optional, as is the `options` object
  itself.

  - `options.method` defaults to `GET`.  The HTTP method to use.

  - `options.params` defaults to `null`.  The parameters to include, either in the URL (for `GET`
    requests) or request body (for others).

  - `options.cacheKey` defaults to `null`.  A string to uniquely identify this request.  `null` or `undefined` indicates the result should not be cached.

  - `options.reload` defaults to `false`.  If `true`, make a request even if an entry was found under
    `cacheKey`.  Do not resolve the returned promise until that request
    completes.

  - `options.backgroundReload`  defaults to `false`.  If `true`, make a request
    even if an entry was found under `cacheKey`.  If `true` and a cached entry
    was found, resolve the returned promise immediately with the cached entry
    and update the store when the request completes.

#### Caching

TODO: talk about cachekey

## Schema

## Serializer / Adapter

## Alternative Patterns

### DS.Model Computed Properties

### DS.Model Methods

### Saving

- minimum schema config

- querying resources
- relationships
- reference arrays
- schema docs
- differences (helpers vs cps &c.)


## Requirements

* ember@^2.14
* ember-data@^2.15


## Examples

## Contributing

### Installation

* `git clone <repository-url>` this repository
* `cd ember-m3`
* `yarn install`

### Running Tests

* `yarn run test` (Runs `ember try:each` to test your addon against multiple Ember versions)
* `ember test`
* `ember test --server`

### Building

* `ember build`

For more information on using ember-cli, visit [https://ember-cli.com/](https://ember-cli.com/).

[json-api:primary-data]: http://jsonapi.org/format/#document-top-level
