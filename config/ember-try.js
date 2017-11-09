/* eslint-env node */
module.exports = {
	useYarn: true,
  scenarios: [
    {
      name: 'ember-lts-2.16',
      npm: {
        devDependencies: {
          'ember-source': '~2.16.2'
        }
      }
    },
    {
      name: 'ember-lts-2.12',
      npm: {
        devDependencies: {
          'ember-source': '~2.12.2'
        }
      }
    },
    {
      name: 'ember-release',
      npm: {
        devDependencies: {
          'ember-source': 'latest'
        }
      }
    },
    {
      name: 'ember-beta',
      npm: {
        devDependencies: {
          'ember-source': 'beta'
        }
      }
    },
    {
      name: 'ember-canary',
      npm: {
        devDependencies: {
          'ember-source': 'git:emberjs/ember.js'
        }
      }
    },
    {
      name: 'ember-default',
      npm: {
        devDependencies: {}
      }
    }
  ]
};
