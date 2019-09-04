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
          name: 'ember-lts-3.8',
          npm: {
            devDependencies: {
              'ember-source': '~3.8.0',
              'ember-data': '~3.8.0',
            },
          },
        },
        {
          name: 'ember-lts-3.12',
          npm: {
            devDependencies: {
              'ember-source': '~3.12.0',
              'ember-data': '~3.12.0',
            },
          },
        },
        {
          name: 'release-channel',
          npm: {
            devDependencies: {
              'ember-source': urls[0],
              'ember-data': 'latest',
            },
          },
        },
        {
          name: 'beta-channel',
          npm: {
            devDependencies: {
              'ember-source': urls[1],
              'ember-data': 'beta',
            },
          },
        },
        {
          name: 'canary-channel',
          npm: {
            devDependencies: {
              'ember-source': urls[2],
              'ember-data': 'canary',
            },
          },
        },
      ],
    };
  });
};
