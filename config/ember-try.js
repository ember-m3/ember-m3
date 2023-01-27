'use strict';

// eslint-disable-next-line node/no-unpublished-require
const getChannelURL = require('ember-source-channel-url');

module.exports = async function () {
  return {
    useYarn: true,
    scenarios: [
      {
        name: 'ember-data-lts-3-x',
        npm: {
          devDependencies: {
            'ember-source': '~3.28.11',
            'ember-data': '~3.28.11',
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
        name: 'ember-lts-1',
        npm: {
          devDependencies: {
            'ember-source': '~4.0.0',
          },
        },
      },
      {
        name: 'ember-lts',
        npm: {
          devDependencies: {
            'ember-source': '~4.4.0',
          },
        },
      },
      {
        name: 'ember-release-1',
        npm: {
          devDependencies: {
            'ember-source': '~4.8.0',
          },
        },
      },
      {
        name: 'ember-release',
        npm: {
          devDependencies: {
            'ember-source': await getChannelURL('release'),
          },
        },
      },
      {
        name: 'ember-beta',
        npm: {
          devDependencies: {
            'ember-source': await getChannelURL('beta'),
          },
        },
      },
      {
        name: 'ember-canary',
        npm: {
          devDependencies: {
            'ember-source': await getChannelURL('canary'),
          },
        },
      },
      {
        name: 'ember-data-lts',
        npm: {
          devDependencies: {
            'ember-source': '~4.4.0',
            'ember-data': null,
            '@ember-data/store': '~4.4.0',
            '@ember-data/debug': null,
            '@ember-data/model': '~4.4.0',
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
            'ember-source': await getChannelURL('beta'),
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
            'ember-source': 'latest',
            'ember-data': null,
            '@ember-data/store': 'latest',
            '@ember-data/debug': null,
            '@ember-data/model': 'latest',
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
