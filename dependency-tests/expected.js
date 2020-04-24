module.exports = function generate(versions) {
  return {
    // what happens when ember-m3 is dep of an addon (for that addon)
    // prints twice because dummy app and addon both see ember-m3 as a dep
    addons: {
      'addon-with-custom-data':
        `Detected @ember-data/model 3.16.4\n` +
        `Detected @ember-data/store 3.16.4\n` +
        `Detected ember-inflector 3.0.1\n` +
        `\t⚠️  ember-m3 is excluding its own copy of @ember-data/debug version ${versions.data} from the build\n` +
        `\t⚠️  ember-m3 is excluding its own copy of @ember-data/model version ${versions.data} from the build\n` +
        `\t⚠️  ember-m3 is excluding its own copy of @ember-data/store version ${versions.data} from the build\n` +
        `\t✅  including dependency ember-cli-babel\n` +
        `\t⚠️  ember-m3 is excluding its own copy of ember-inflector version ${versions.inflector} from the build\n` +
        `Detected @ember-data/model 3.16.4\n` +
        `Detected @ember-data/store 3.16.4\n` +
        `Detected ember-inflector 3.0.1\n` +
        `\t⚠️  ember-m3 is excluding its own copy of @ember-data/debug version ${versions.data} from the build\n` +
        `\t⚠️  ember-m3 is excluding its own copy of @ember-data/model version ${versions.data} from the build\n` +
        `\t⚠️  ember-m3 is excluding its own copy of @ember-data/store version ${versions.data} from the build\n` +
        `\t✅  including dependency ember-cli-babel\n` +
        `\t⚠️  ember-m3 is excluding its own copy of ember-inflector version ${versions.inflector} from the build`,
      'addon-with-full-data':
        `Detected ember-data 3.17.0\n` +
        `\t⚠️  ember-m3 is excluding its own copy of @ember-data/debug version ${versions.data} from the build\n` +
        `\t⚠️  ember-m3 is excluding its own copy of @ember-data/model version ${versions.data} from the build\n` +
        `\t⚠️  ember-m3 is excluding its own copy of @ember-data/store version ${versions.data} from the build\n` +
        `\t✅  including dependency ember-cli-babel\n` +
        `\t⚠️  ember-m3 is excluding its own copy of ember-inflector version ${versions.inflector} from the build\n` +
        `Detected ember-data 3.17.0\n` +
        `\t⚠️  ember-m3 is excluding its own copy of @ember-data/debug version ${versions.data} from the build\n` +
        `\t⚠️  ember-m3 is excluding its own copy of @ember-data/model version ${versions.data} from the build\n` +
        `\t⚠️  ember-m3 is excluding its own copy of @ember-data/store version ${versions.data} from the build\n` +
        `\t✅  including dependency ember-cli-babel\n` +
        `\t⚠️  ember-m3 is excluding its own copy of ember-inflector version ${versions.inflector} from the build`,
      'addon-with-no-data':
        `\t✅  including dependency @ember-data/debug because including all children\n` +
        `\t✅  including dependency @ember-data/model because including all children\n` +
        `\t✅  including dependency @ember-data/store because including all children\n` +
        `\t✅  including dependency ember-cli-babel because including all children\n` +
        `\t✅  including dependency ember-inflector because including all children\n` +
        `\t✅  including dependency @ember-data/debug because including all children\n` +
        `\t✅  including dependency @ember-data/model because including all children\n` +
        `\t✅  including dependency @ember-data/store because including all children\n` +
        `\t✅  including dependency ember-cli-babel because including all children\n` +
        `\t✅  including dependency ember-inflector because including all children`,
      'addon-with-same-data':
        `Detected @ember-data/model ${versions.data}\n` +
        `Detected @ember-data/store ${versions.data}\n` +
        `Detected ember-inflector ${versions.inflector}\n` +
        `\t⚠️  ember-m3 is excluding its own copy of @ember-data/debug version ${versions.data} from the build\n` +
        `\t⚠️  ember-m3 is excluding its own copy of @ember-data/model version ${versions.data} from the build\n` +
        `\t⚠️  ember-m3 is excluding its own copy of @ember-data/store version ${versions.data} from the build\n` +
        `\t✅  including dependency ember-cli-babel\n` +
        `\t⚠️  ember-m3 is excluding its own copy of ember-inflector version ${versions.inflector} from the build\n` +
        `Detected @ember-data/model ${versions.data}\n` +
        `Detected @ember-data/store ${versions.data}\n` +
        `Detected ember-inflector ${versions.inflector}\n` +
        `\t⚠️  ember-m3 is excluding its own copy of @ember-data/debug version ${versions.data} from the build\n` +
        `\t⚠️  ember-m3 is excluding its own copy of @ember-data/model version ${versions.data} from the build\n` +
        `\t⚠️  ember-m3 is excluding its own copy of @ember-data/store version ${versions.data} from the build\n` +
        `\t✅  including dependency ember-cli-babel\n` +
        `\t⚠️  ember-m3 is excluding its own copy of ember-inflector version ${versions.inflector} from the build`,
    },
    // what happens when ember-m3 is dep of an app
    apps: {
      'app-with-custom-data':
        `Detected @ember-data/model 3.16.4\n` +
        `Detected @ember-data/store 3.16.4\n` +
        `Detected ember-inflector 3.0.1\n` +
        `\t⚠️  ember-m3 is excluding its own copy of @ember-data/debug version ${versions.data} from the build\n` +
        `\t⚠️  ember-m3 is excluding its own copy of @ember-data/model version ${versions.data} from the build\n` +
        `\t⚠️  ember-m3 is excluding its own copy of @ember-data/store version ${versions.data} from the build\n` +
        `\t✅  including dependency ember-cli-babel\n` +
        `\t⚠️  ember-m3 is excluding its own copy of ember-inflector version ${versions.inflector} from the build`,
      'app-with-full-data':
        `Detected ember-data 3.16.4\n` +
        `\t⚠️  ember-m3 is excluding its own copy of @ember-data/debug version ${versions.data} from the build\n` +
        `\t⚠️  ember-m3 is excluding its own copy of @ember-data/model version ${versions.data} from the build\n` +
        `\t⚠️  ember-m3 is excluding its own copy of @ember-data/store version ${versions.data} from the build\n` +
        `\t✅  including dependency ember-cli-babel\n` +
        `\t⚠️  ember-m3 is excluding its own copy of ember-inflector version ${versions.inflector} from the build`,
      'app-with-no-data':
        `\t✅  including dependency @ember-data/debug because including all children\n` +
        `\t✅  including dependency @ember-data/model because including all children\n` +
        `\t✅  including dependency @ember-data/store because including all children\n` +
        `\t✅  including dependency ember-cli-babel because including all children\n` +
        `\t✅  including dependency ember-inflector because including all children`,
      'app-with-same-data':
        `Detected @ember-data/model ${versions.data}\n` +
        `Detected @ember-data/store ${versions.data}\n` +
        `Detected ember-inflector ${versions.inflector}\n` +
        `\t⚠️  ember-m3 is excluding its own copy of @ember-data/debug version ${versions.data} from the build\n` +
        `\t⚠️  ember-m3 is excluding its own copy of @ember-data/model version ${versions.data} from the build\n` +
        `\t⚠️  ember-m3 is excluding its own copy of @ember-data/store version ${versions.data} from the build\n` +
        `\t✅  including dependency ember-cli-babel\n` +
        `\t⚠️  ember-m3 is excluding its own copy of ember-inflector version ${versions.inflector} from the build`,
    },
    // what happens when ember-m3 is dep of an addon (for the consuming app of that addon)
    'apps-with-addons-with-m3': {
      'app-with-addon-with-custom-data':
        `Detected @ember-data/model 3.16.4\n` +
        `Detected @ember-data/store 3.16.4\n` +
        `Detected ember-inflector 3.0.1\n` +
        `\t⚠️  ember-m3 is excluding its own copy of @ember-data/debug version ${versions.data} from the build\n` +
        `\t⚠️  ember-m3 is excluding its own copy of @ember-data/model version ${versions.data} from the build\n` +
        `\t⚠️  ember-m3 is excluding its own copy of @ember-data/store version ${versions.data} from the build\n` +
        `\t✅  including dependency ember-cli-babel\n` +
        `\t⚠️  ember-m3 is excluding its own copy of ember-inflector version ${versions.inflector} from the build`,
      'app-with-addon-with-full-data':
        `Detected ember-data 3.17.0\n` +
        `\t⚠️  ember-m3 is excluding its own copy of @ember-data/debug version ${versions.data} from the build\n` +
        `\t⚠️  ember-m3 is excluding its own copy of @ember-data/model version ${versions.data} from the build\n` +
        `\t⚠️  ember-m3 is excluding its own copy of @ember-data/store version ${versions.data} from the build\n` +
        `\t✅  including dependency ember-cli-babel\n` +
        `\t⚠️  ember-m3 is excluding its own copy of ember-inflector version ${versions.inflector} from the build`,
      'app-with-addon-with-no-data':
        `\t✅  including dependency @ember-data/debug because including all children\n` +
        `\t✅  including dependency @ember-data/model because including all children\n` +
        `\t✅  including dependency @ember-data/store because including all children\n` +
        `\t✅  including dependency ember-cli-babel because including all children\n` +
        `\t✅  including dependency ember-inflector because including all children`,
      'app-with-addon-with-same-data':
        `Detected @ember-data/model ${versions.data}\n` +
        `Detected @ember-data/store ${versions.data}\n` +
        `Detected ember-inflector ${versions.inflector}\n` +
        `\t⚠️  ember-m3 is excluding its own copy of @ember-data/debug version ${versions.data} from the build\n` +
        `\t⚠️  ember-m3 is excluding its own copy of @ember-data/model version ${versions.data} from the build\n` +
        `\t⚠️  ember-m3 is excluding its own copy of @ember-data/store version ${versions.data} from the build\n` +
        `\t✅  including dependency ember-cli-babel\n` +
        `\t⚠️  ember-m3 is excluding its own copy of ember-inflector version ${versions.inflector} from the build`,
    },
    // what happens when a sibling addon brings ember-data or siblings bring ember-m3
    'highlander-apps': {
      'app-with-two-m3-but-single-version':
        `\t✅  including dependency @ember-data/debug because including all children\n` +
        `\t✅  including dependency @ember-data/model because including all children\n` +
        `\t✅  including dependency @ember-data/store because including all children\n` +
        `\t✅  including dependency ember-cli-babel because including all children\n` +
        `\t✅  including dependency ember-inflector because including all children\n` +
        `\t✅  including dependency @ember-data/debug because including all children\n` +
        `\t✅  including dependency @ember-data/model because including all children\n` +
        `\t✅  including dependency @ember-data/store because including all children\n` +
        `\t✅  including dependency ember-cli-babel because including all children\n` +
        `\t✅  including dependency ember-inflector because including all children`,
      'app-with-addon-with-custom-data':
        `Detected @ember-data/model 3.16.4\n` +
        `Detected @ember-data/store 3.16.4\n` +
        `Detected ember-inflector 3.0.1\n` +
        `\t⚠️  ember-m3 is excluding its own copy of @ember-data/debug version ${versions.data} from the build\n` +
        `\t⚠️  ember-m3 is excluding its own copy of @ember-data/model version ${versions.data} from the build\n` +
        `\t⚠️  ember-m3 is excluding its own copy of @ember-data/store version ${versions.data} from the build\n` +
        `\t✅  including dependency ember-cli-babel\n` +
        `\t⚠️  ember-m3 is excluding its own copy of ember-inflector version ${versions.inflector} from the build`,
      'app-with-addon-with-full-data':
        `Detected ember-data 3.17.0\n` +
        `\t⚠️  ember-m3 is excluding its own copy of @ember-data/debug version ${versions.data} from the build\n` +
        `\t⚠️  ember-m3 is excluding its own copy of @ember-data/model version ${versions.data} from the build\n` +
        `\t⚠️  ember-m3 is excluding its own copy of @ember-data/store version ${versions.data} from the build\n` +
        `\t✅  including dependency ember-cli-babel\n` +
        `\t⚠️  ember-m3 is excluding its own copy of ember-inflector version ${versions.inflector} from the build`,
      'app-with-addon-with-same-data':
        `Detected @ember-data/debug ${versions.data}\n` +
        `Detected @ember-data/model ${versions.data}\n` +
        `Detected @ember-data/store ${versions.data}\n` +
        `Detected ember-inflector ${versions.inflector}\n` +
        `\t⚠️  ember-m3 is excluding its own copy of @ember-data/debug version ${versions.data} from the build\n` +
        `\t⚠️  ember-m3 is excluding its own copy of @ember-data/model version ${versions.data} from the build\n` +
        `\t⚠️  ember-m3 is excluding its own copy of @ember-data/store version ${versions.data} from the build\n` +
        `\t✅  including dependency ember-cli-babel\n` +
        `\t⚠️  ember-m3 is excluding its own copy of ember-inflector version ${versions.inflector} from the build`,
    },
    'apps-with-errors': {
      'app-with-two-m3-versions': {
        throws: true,
        message: `Detected the presence of more than one version of ember-m3:\n\t - 1.0.2\n\t - ${versions.m3}`,
      },
      'app-with-two-data-v1': {
        throws: true,
        message: `All @ember-data/<pkg> packages must have matching versions. Found @ember-data/adapter "3.16.4" which does not match @ember-data/store's version of "3.17.0"`,
      },
      'app-with-two-data-v2': {
        throws: true,
        message: `All @ember-data/<pkg> packages must have matching versions. Found @ember-data/debug "3.17.0" which does not match @ember-data/store's version of "3.16.4"`,
      },
      'app-with-data-with-addon-with-data-v1': {
        throws: true,
        message: `ember-m3 "${versions.m3}" requires the peerDependency @ember-data/store to match the installed ember-data version "3.17.0". Found @ember-data/store "3.16.4".`,
      },
      'app-with-data-with-addon-with-data-v2': {
        throws: true,
        message: `ember-m3 "${versions.m3}" requires the peerDependency @ember-data/model to match the installed ember-data version "3.17.0". Found @ember-data/model "3.16.4".`,
      },
      'app-with-incomplete-data': {
        throws: true,
        message: `ember-m3 "${versions.m3}" requires the peerDependency @ember-data/model to be installed.`,
      },
    },
  };
};
