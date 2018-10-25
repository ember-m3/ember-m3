module.exports = {
  plugins: ['prettier'],
  extends: ['./.eslintrc.base.js', 'prettier'],
  rules: {
    'prettier/prettier': [
      'error',
      {
        singleQuote: true,
        trailingComma: 'es5',
        printWidth: 100,
      },
    ],
  },
};
