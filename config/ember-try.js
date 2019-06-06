'use strict';

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
          npm: {},
        },
        {
          name: 'ember-lts-3.4',
          npm: {
            devDependencies: {
              'ember-source': '~3.4.5',
            },
          },
        },
        {
          name: 'ember-lts-3.8',
          npm: {
            devDependencies: {
              'ember-source': '~3.8.0',
            },
          },
        },
        {
          name: 'legacy-model-data',
          npm: {
            devDependencies: {
              'ember-source': '~3.4.5',
              'ember-data': '3.5.0-beta.2',
            },
          },
        },
        {
          name: 'release-channel',
          npm: {
            devDependencies: {
              'ember-source': urls[0],
              'ember-data': 'emberjs/data#release',
            },
          },
        },
        {
          name: 'beta-channel',
          npm: {
            devDependencies: {
              'ember-source': urls[1],
              'ember-data': 'emberjs/data#beta',
            },
          },
        },
        {
          name: 'canary-channel',
          npm: {
            devDependencies: {
              'ember-source': urls[2],
              'ember-data': 'emberjs/data#master',
            },
          },
        },
      ],
    };
  });
};
