module.exports = {
  root: true,
  parser: 'babel-eslint',
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: 'module',
    ecmaFeatures: {
      legacyDecorators: true,
    },
  },
  plugins: ['ember'],
  extends: ['eslint:recommended', 'plugin:ember/recommended'],
  env: {
    browser: true,
  },
  rules: {
    'ember/no-jquery': 'error',
  },
  overrides: [
    {
      files: [
        '.eslintrc.js',
        '.eslintrc.*.js',
        '.template-lintrc.js',
        '.commitlintrc.js',
        './ember-cli-build.js',
        './index.js',
        './testem.js',
        './blueprints/*/index.js',
        './config/**/*.js',
        './tests/dummy/config/**/*.js',
        'bin/**/*.js',
        'node-tests/**/*.js',
        'src/**/*.js',
      ],
      parserOptions: {
        sourceType: 'script',
        ecmaVersion: 2015,
      },
      env: {
        browser: false,
        node: true,
        es6: true,
      },
      plugins: ['node'],
      extends: 'plugin:node/recommended',
      rules: {
        // really we want to disable all the rules for plugin:ember/recommended but it's kinda ugly
        'ember/no-invalid-debug-function-arguments': 'off',
      },
    },
    {
      files: ['tests/**/*.js'],
      env: {
        embertest: true,
      },
      rules: {
        'ember/no-observers': 0,
      },
    },
  ],
};
