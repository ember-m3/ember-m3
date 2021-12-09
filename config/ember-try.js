'use strict';

// eslint-disable-next-line node/no-unpublished-require
const getChannelURL = require('ember-source-channel-url');

module.exports = function () {
  return Promise.all([
    getChannelURL('release'),
    getChannelURL('beta'),
    getChannelURL('canary'),
  ]).then((urls) => {
    return {
      useYarn: true,
      scenarios: [
        {
          name: 'default',
          bower: {},
          npm: {
            devDependencies: {
              'ember-data': 'latest',
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
          name: 'ember-lts-n-1',
          npm: {
            devDependencies: {
              'ember-source': '~3.24.0',
              'ember-data': '~3.24.0',
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
              'ember-source': '~3.28.0',
              'ember-data': '~3.28.0',
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
          name: 'ember-data-packages-latest',
          npm: {
            devDependencies: {
              // TODO: change this back to `latest` once Ember 4 compatibility has landed
              'ember-source': '^3.28.0',
              'ember-data': null,
              '@ember-data/store': 'latest',
              '@ember-data/debug': null, // available in 3.15
              '@ember-data/model': 'latest', // not yet droppable (Errors)
              '@ember-data/serializer': null,
              '@ember-data/adapter': null,
              '@ember-data/record-data': null,
              'ember-inflector': '^3.0.1',
            },
          },
        },
        {
          name: 'ember-data-packages-beta',
          npm: {
            devDependencies: {
              // TODO: change this back to `latest` once Ember 4 compatibility has landed
              'ember-source': '^3.28.0',
              'ember-data': null,
              '@ember-data/store': 'beta',
              '@ember-data/debug': 'beta',
              '@ember-data/model': 'beta', // not yet droppable (Errors)
              '@ember-data/serializer': null,
              '@ember-data/adapter': null,
              '@ember-data/record-data': null,
              'ember-inflector': '^3.0.1',
            },
          },
        },
        {
          name: 'ember-data-packages-canary',
          npm: {
            devDependencies: {
              // TODO: change this back to `latest` once Ember 4 compatibility has landed
              'ember-source': '^3.28.0',
              'ember-data': null,
              '@ember-data/store': 'canary',
              '@ember-data/debug': 'canary',
              '@ember-data/model': 'canary', // not yet droppable (Errors)
              '@ember-data/serializer': null,
              '@ember-data/adapter': null,
              '@ember-data/record-data': null,
              'ember-inflector': '^3.0.1',
            },
          },
        },
        {
          name: 'release-n-1',
          npm: {
            devDependencies: {
              'ember-source': '~3.28.0',
              'ember-data': '~3.28.0',
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
          name: 'release-channel',
          // TODO: Remove this when we land Ember 4 compatibility
          allowedToFail: true,
          npm: {
            devDependencies: {
              'ember-source': urls[0],
              'ember-data': 'latest',
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
          name: 'beta-channel',
          npm: {
            devDependencies: {
              'ember-source': urls[1],
              'ember-data': 'beta',
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
          name: 'canary-channel',
          npm: {
            devDependencies: {
              'ember-source': urls[2],
              'ember-data': 'canary',
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
      ],
    };
  });
};
