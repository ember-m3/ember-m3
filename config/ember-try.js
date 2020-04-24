'use strict';

// eslint-disable-next-line node/no-unpublished-require
const getChannelURL = require('ember-source-channel-url');

module.exports = function() {
  return Promise.all([
    getChannelURL('release'),
    getChannelURL('beta'),
    getChannelURL('canary'),
  ]).then(urls => {
    return {
      useYarn: true,
      scenarios: [
        {
          name: 'default',
          bower: {},
          npm: {
            dependencies: {
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
          name: 'ember-lts-3.8',
          npm: {
            devDependencies: {
              'ember-source': '~3.8.0',
            },
            dependencies: {
              'ember-data': '~3.8.0',
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
          name: 'ember-lts-3.12',
          npm: {
            devDependencies: {
              'ember-source': '~3.12.0',
            },
            dependencies: {
              'ember-data': '~3.12.0',
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
          name: 'ember-lts-3.16',
          npm: {
            devDependencies: {
              'ember-source': '~3.16.0',
              'ember-data': '~3.16.0',
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
          // EmberData 3.14 is the first version in which we allow
          // consumers to begin consuming individual packages
          name: 'ember-data-packages-3.14',
          npm: {
            devDependencies: {
              'ember-source': '~3.14.0',
            },
            dependencies: {
              'ember-data': null,
              '@ember-data/store': '~3.14.0',
              '@ember-data/debug': null, // available in 3.15
              '@ember-data/model': '~3.14.0', // not yet droppable (Errors)
              '@ember-data/serializer': null,
              '@ember-data/adapter': null,
              '@ember-data/record-data': null,
              'ember-inflector': '^3.0.1',
            },
          },
        },
        {
          name: 'ember-data-packages-latest',
          npm: {
            devDependencies: {
              'ember-source': 'latest',
            },
            dependencies: {
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
              'ember-source': 'latest',
            },
            dependencies: {
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
              'ember-source': 'latest',
            },
            dependencies: {
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
              'ember-source': '~3.14.3',
            },
            dependencies: {
              'ember-data': '~3.14.0',
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
          npm: {
            devDependencies: {
              'ember-source': urls[0],
            },
            dependencies: {
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
            },
            dependencies: {
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
            },
            dependencies: {
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
