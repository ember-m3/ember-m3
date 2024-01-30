'use strict';

module.exports = async function () {
  return {
    useYarn: true,
    scenarios: [
      {
        name: 'ember-data-lts-3-x',
        npm: {
          devDependencies: {
            'ember-source': '~3.28.12',
            'ember-data': '~3.28.13',
            '@ember-data/store': null,
            '@ember-data/debug': null,
            '@ember-data/model': null,
            '@ember-data/serializer': null,
            '@ember-data/adapter': null,
            '@ember-data/record-data': null,
            'ember-inflector': null,
          },
        },
      },
      {
        name: 'ember-data-3-x-source-4-lts',
        npm: {
          devDependencies: {
            'ember-source': '~4.12.0',
            'ember-data': '~3.28.13',
            '@ember-data/store': null,
            '@ember-data/debug': null,
            '@ember-data/model': null,
            '@ember-data/serializer': null,
            '@ember-data/adapter': null,
            '@ember-data/record-data': null,
            'ember-inflector': null,
          },
        },
      },
      {
        name: 'ember-data-3-x-source-4-8',
        npm: {
          devDependencies: {
            'ember-source': '~4.8.0',
            'ember-data': '~3.28.13',
            '@ember-data/store': null,
            '@ember-data/debug': null,
            '@ember-data/model': null,
            '@ember-data/serializer': null,
            '@ember-data/adapter': null,
            '@ember-data/record-data': null,
            'ember-inflector': null,
          },
        },
      },
      {
        name: 'ember-data-4-1',
        npm: {
          devDependencies: {
            'ember-data': '~4.1.0',
            '@ember-data/store': null,
            '@ember-data/debug': null,
            '@ember-data/model': null,
            '@ember-data/serializer': null,
            '@ember-data/adapter': null,
            '@ember-data/record-data': null,
            'ember-inflector': null,
          },
        },
      },
      {
        name: 'ember-lts',
        npm: {
          devDependencies: {
            'ember-source': '~4.12.0',
          },
        },
      },
      {
        name: 'ember-latest',
        npm: {
          devDependencies: {
            'ember-source': 'latest',
          },
        },
      },
      {
        name: 'ember-beta',
        npm: {
          devDependencies: {
            'ember-source': 'beta',
          },
        },
      },
      {
        name: 'ember-alpha',
        npm: {
          devDependencies: {
            'ember-source': 'alpha',
          },
        },
      },
      {
        name: 'ember-data-lts',
        npm: {
          devDependencies: {
            'ember-source': '~4.8.0',
            'ember-data': null,
            '@ember-data/store': '~4.8.0',
            '@ember-data/debug': '~4.8.0',
            '@ember-data/model': '~4.8.0',
            '@ember-data/serializer': null,
            '@ember-data/adapter': null,
            '@ember-data/record-data': null,
            'ember-inflector': '^3.0.1',
          },
        },
      },
      {
        name: 'ember-data-beta',
        npm: {
          devDependencies: {
            'ember-source': 'beta',
            'ember-data': null,
            '@ember-data/store': 'beta',
            '@ember-data/debug': 'beta',
            '@ember-data/model': 'beta',
            '@ember-data/serializer': null,
            '@ember-data/adapter': null,
            '@ember-data/record-data': null,
            'ember-inflector': '^3.0.1',
          },
        },
      },
      {
        name: 'ember-data-canary',
        npm: {
          devDependencies: {
            'ember-source': 'alpha',
            'ember-data': null,
            '@ember-data/store': 'canary',
            '@ember-data/debug': 'canary',
            '@ember-data/model': 'canary',
            '@ember-data/serializer': null,
            '@ember-data/adapter': null,
            '@ember-data/record-data': null,
            'ember-inflector': '^3.0.1',
          },
        },
      },
    ],
  };
};
