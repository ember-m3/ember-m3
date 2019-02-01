'use strict';

define('dummy/app', [
  'exports',
  'dummy/resolver',
  'ember-load-initializers',
  'dummy/config/environment',
], function(exports, _resolver, _emberLoadInitializers, _environment) {
  'use strict';

  Object.defineProperty(exports, '__esModule', {
    value: true,
  });

  var App = Ember.Application.extend({
    modulePrefix: _environment.default.modulePrefix,
    podModulePrefix: _environment.default.podModulePrefix,
    Resolver: _resolver.default,
  });

  (0, _emberLoadInitializers.default)(App, _environment.default.modulePrefix);

  exports.default = App;
});
define('dummy/components/welcome-page', [
  'exports',
  'ember-welcome-page/components/welcome-page',
], function(exports, _welcomePage) {
  'use strict';

  Object.defineProperty(exports, '__esModule', {
    value: true,
  });
  Object.defineProperty(exports, 'default', {
    enumerable: true,
    get: function() {
      return _welcomePage.default;
    },
  });
});
define('dummy/ember-m3/tests/addon.lint-test', [], function() {
  'use strict';

  QUnit.module('ESLint | addon');

  QUnit.test('addon/-private.js', function(assert) {
    assert.expect(1);
    assert.ok(true, 'addon/-private.js should pass ESLint\n\n');
  });

  QUnit.test('addon/factory.js', function(assert) {
    assert.expect(1);
    assert.ok(true, 'addon/factory.js should pass ESLint\n\n');
  });

  QUnit.test('addon/initializers/m3-store.js', function(assert) {
    assert.expect(1);
    assert.ok(true, 'addon/initializers/m3-store.js should pass ESLint\n\n');
  });

  QUnit.test('addon/m3-reference-array.js', function(assert) {
    assert.expect(1);
    assert.ok(true, 'addon/m3-reference-array.js should pass ESLint\n\n');
  });

  QUnit.test('addon/m3-tracked-array.js', function(assert) {
    assert.expect(1);
    assert.ok(true, 'addon/m3-tracked-array.js should pass ESLint\n\n');
  });

  QUnit.test('addon/model-data.js', function(assert) {
    assert.expect(1);
    assert.ok(true, 'addon/model-data.js should pass ESLint\n\n');
  });

  QUnit.test('addon/model.js', function(assert) {
    assert.expect(1);
    assert.ok(true, 'addon/model.js should pass ESLint\n\n');
  });

  QUnit.test('addon/query-array.js', function(assert) {
    assert.expect(1);
    assert.ok(true, 'addon/query-array.js should pass ESLint\n\n');
  });

  QUnit.test('addon/query-cache.js', function(assert) {
    assert.expect(1);
    assert.ok(true, 'addon/query-cache.js should pass ESLint\n\n');
  });

  QUnit.test('addon/record-array.js', function(assert) {
    assert.expect(1);
    assert.ok(true, 'addon/record-array.js should pass ESLint\n\n');
  });

  QUnit.test('addon/record-data.js', function(assert) {
    assert.expect(1);
    assert.ok(true, 'addon/record-data.js should pass ESLint\n\n');
  });

  QUnit.test('addon/resolve-attribute-util.js', function(assert) {
    assert.expect(1);
    assert.ok(true, 'addon/resolve-attribute-util.js should pass ESLint\n\n');
  });

  QUnit.test('addon/services/m3-schema-manager.js', function(assert) {
    assert.expect(1);
    assert.ok(true, 'addon/services/m3-schema-manager.js should pass ESLint\n\n');
  });

  QUnit.test('addon/services/m3-schema.js', function(assert) {
    assert.expect(1);
    assert.ok(true, 'addon/services/m3-schema.js should pass ESLint\n\n');
  });

  QUnit.test('addon/util.js', function(assert) {
    assert.expect(1);
    assert.ok(true, 'addon/util.js should pass ESLint\n\n');
  });

  QUnit.test('addon/utils/copy.js', function(assert) {
    assert.expect(1);
    assert.ok(true, 'addon/utils/copy.js should pass ESLint\n\n');
  });

  QUnit.test('addon/utils/resolve.js', function(assert) {
    assert.expect(1);
    assert.ok(true, 'addon/utils/resolve.js should pass ESLint\n\n');
  });
});
define('dummy/ember-m3/tests/app.lint-test', [], function() {
  'use strict';

  QUnit.module('ESLint | app');

  QUnit.test('app/initializers/m3-store.js', function(assert) {
    assert.expect(1);
    assert.ok(true, 'app/initializers/m3-store.js should pass ESLint\n\n');
  });

  QUnit.test('app/services/m3-schema-manager.js', function(assert) {
    assert.expect(1);
    assert.ok(true, 'app/services/m3-schema-manager.js should pass ESLint\n\n');
  });
});
define('dummy/helpers/month-of', ['exports'], function(exports) {
  'use strict';

  Object.defineProperty(exports, '__esModule', {
    value: true,
  });
  exports.monthOf = monthOf;

  var _slicedToArray = (function() {
    function sliceIterator(arr, i) {
      var _arr = [];
      var _n = true;
      var _d = false;
      var _e = undefined;

      try {
        for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) {
          _arr.push(_s.value);

          if (i && _arr.length === i) break;
        }
      } catch (err) {
        _d = true;
        _e = err;
      } finally {
        try {
          if (!_n && _i['return']) _i['return']();
        } finally {
          if (_d) throw _e;
        }
      }

      return _arr;
    }

    return function(arr, i) {
      if (Array.isArray(arr)) {
        return arr;
      } else if (Symbol.iterator in Object(arr)) {
        return sliceIterator(arr, i);
      } else {
        throw new TypeError('Invalid attempt to destructure non-iterable instance');
      }
    };
  })();

  function monthOf(params /*, hash*/) {
    var _params = _slicedToArray(params, 1),
      date = _params[0];

    return date && date.getMonth() + 1;
  }

  exports.default = Ember.Helper.helper(monthOf);
});
define('dummy/helpers/pluralize', ['exports', 'ember-inflector/lib/helpers/pluralize'], function(
  exports,
  _pluralize
) {
  'use strict';

  Object.defineProperty(exports, '__esModule', {
    value: true,
  });
  exports.default = _pluralize.default;
});
define('dummy/helpers/singularize', [
  'exports',
  'ember-inflector/lib/helpers/singularize',
], function(exports, _singularize) {
  'use strict';

  Object.defineProperty(exports, '__esModule', {
    value: true,
  });
  exports.default = _singularize.default;
});
define('dummy/initializers/container-debug-adapter', [
  'exports',
  'ember-resolver/resolvers/classic/container-debug-adapter',
], function(exports, _containerDebugAdapter) {
  'use strict';

  Object.defineProperty(exports, '__esModule', {
    value: true,
  });
  exports.default = {
    name: 'container-debug-adapter',

    initialize: function initialize() {
      var app = arguments[1] || arguments[0];

      app.register('container-debug-adapter:main', _containerDebugAdapter.default);
      app.inject('container-debug-adapter:main', 'namespace', 'application:main');
    },
  };
});
define('dummy/initializers/ember-data', [
  'exports',
  'ember-data/setup-container',
  'ember-data',
], function(exports, _setupContainer) {
  'use strict';

  Object.defineProperty(exports, '__esModule', {
    value: true,
  });
  exports.default = {
    name: 'ember-data',
    initialize: _setupContainer.default,
  };
});
define('dummy/initializers/export-application-global', [
  'exports',
  'dummy/config/environment',
], function(exports, _environment) {
  'use strict';

  Object.defineProperty(exports, '__esModule', {
    value: true,
  });
  exports.initialize = initialize;
  function initialize() {
    var application = arguments[1] || arguments[0];
    if (_environment.default.exportApplicationGlobal !== false) {
      var theGlobal;
      if (typeof window !== 'undefined') {
        theGlobal = window;
      } else if (typeof global !== 'undefined') {
        theGlobal = global;
      } else if (typeof self !== 'undefined') {
        theGlobal = self;
      } else {
        // no reasonable global, just bail
        return;
      }

      var value = _environment.default.exportApplicationGlobal;
      var globalName;

      if (typeof value === 'string') {
        globalName = value;
      } else {
        globalName = Ember.String.classify(_environment.default.modulePrefix);
      }

      if (!theGlobal[globalName]) {
        theGlobal[globalName] = application;

        application.reopen({
          willDestroy: function willDestroy() {
            this._super.apply(this, arguments);
            delete theGlobal[globalName];
          },
        });
      }
    }
  }

  exports.default = {
    name: 'export-application-global',

    initialize: initialize,
  };
});
define('dummy/initializers/m3-store', ['exports', 'ember-m3/initializers/m3-store'], function(
  exports,
  _m3Store
) {
  'use strict';

  Object.defineProperty(exports, '__esModule', {
    value: true,
  });
  Object.defineProperty(exports, 'default', {
    enumerable: true,
    get: function() {
      return _m3Store.default;
    },
  });
  Object.defineProperty(exports, 'initialize', {
    enumerable: true,
    get: function() {
      return _m3Store.initialize;
    },
  });
});
define('dummy/instance-initializers/ember-data', [
  'exports',
  'ember-data/initialize-store-service',
], function(exports, _initializeStoreService) {
  'use strict';

  Object.defineProperty(exports, '__esModule', {
    value: true,
  });
  exports.default = {
    name: 'ember-data',
    initialize: _initializeStoreService.default,
  };
});
define('dummy/resolver', ['exports', 'ember-resolver'], function(exports, _emberResolver) {
  'use strict';

  Object.defineProperty(exports, '__esModule', {
    value: true,
  });
  exports.default = _emberResolver.default;
});
define('dummy/router', ['exports', 'dummy/config/environment'], function(exports, _environment) {
  'use strict';

  Object.defineProperty(exports, '__esModule', {
    value: true,
  });

  var Router = Ember.Router.extend({
    location: _environment.default.locationType,
    rootURL: _environment.default.rootURL,
  });

  Router.map(function() {
    this.route('alt');
  });

  exports.default = Router;
});
define('dummy/routes/alt', ['exports'], function(exports) {
  'use strict';

  Object.defineProperty(exports, '__esModule', {
    value: true,
  });
  exports.default = Ember.Route.extend({
    model: function model() {
      return this.store.queryURL('/api1.json');
    },
  });
});
define('dummy/routes/index', ['exports'], function(exports) {
  'use strict';

  Object.defineProperty(exports, '__esModule', {
    value: true,
  });
  exports.default = Ember.Route.extend({
    init: function init() {
      this._super.apply(this, arguments);
      this.invocation = 0;
    },
    model: function model() {
      return this.store.queryURL('/api0.json');
    },

    actions: {
      updateData: function updateData() {
        var vol = this.invocation++ === 0 ? 'I' : Math.random();

        this.store.pushPayload('com.example.bookstore.book', {
          data: {
            id: 'isbn:9780760768570',
            type: 'com.example.bookstore.Book',
            attributes: {
              $type: 'com.example.bookstore.Book',
              name: 'Vol ' + vol + '. The Birth of Britain',
              author: 'urn:author:1',
              pubDate: 'April 2005',
              readerComments: ['urn:comment:1', 'urn:comment:2'],
            },
          },
        });
      },
      updateArray: function updateArray() {
        this.store.pushPayload('com.example.bookstore.ReaderComment', {
          data: {
            id: 'urn:comment:3',
            type: 'com.example.bookstore.Commenter',
            attributes: {
              commenter: {
                $type: 'com.example.bookstore.Commenter',
                name: 'Definitely a Different User',
                favouriteBook: 'isbn:9780760768570',
              },
              parts: [
                {
                  value: 'I really enjoyed this book',
                },
                {
                  value: 'quite a lot ([' + Math.random() + '])',
                },
                {
                  value: 'although my favourite is still Volume Ⅰ.',
                },
              ],
            },
          },
        });
      },
    },
  });
});
define('dummy/serializers/application', ['exports', 'ember-data'], function(exports, _emberData) {
  'use strict';

  Object.defineProperty(exports, '__esModule', {
    value: true,
  });
  exports.default = _emberData.default.JSONAPISerializer.extend({
    normalizeResponse: function normalizeResponse(
      store,
      primaryModelClass,
      payload /*, id, requestType */
    ) {
      return payload;
    },
    pushPayload: function pushPayload(store, payload) {
      return this.store.push(payload);
    },
  });
});
define('dummy/services/m3-schema-manager', [
  'exports',
  'ember-m3/services/m3-schema-manager',
], function(exports, _m3SchemaManager) {
  'use strict';

  Object.defineProperty(exports, '__esModule', {
    value: true,
  });
  Object.defineProperty(exports, 'default', {
    enumerable: true,
    get: function() {
      return _m3SchemaManager.default;
    },
  });
});
define('dummy/services/m3-schema', ['exports', 'ember-m3/services/m3-schema'], function(
  exports,
  _m3Schema
) {
  'use strict';

  Object.defineProperty(exports, '__esModule', {
    value: true,
  });

  var _typeof =
    typeof Symbol === 'function' && typeof Symbol.iterator === 'symbol'
      ? function(obj) {
          return typeof obj;
        }
      : function(obj) {
          return obj &&
            typeof Symbol === 'function' &&
            obj.constructor === Symbol &&
            obj !== Symbol.prototype
            ? 'symbol'
            : typeof obj;
        };

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError('Cannot call a class as a function');
    }
  }

  var _createClass = (function() {
    function defineProperties(target, props) {
      for (var i = 0; i < props.length; i++) {
        var descriptor = props[i];
        descriptor.enumerable = descriptor.enumerable || false;
        descriptor.configurable = true;
        if ('value' in descriptor) descriptor.writable = true;
        Object.defineProperty(target, descriptor.key, descriptor);
      }
    }

    return function(Constructor, protoProps, staticProps) {
      if (protoProps) defineProperties(Constructor.prototype, protoProps);
      if (staticProps) defineProperties(Constructor, staticProps);
      return Constructor;
    };
  })();

  function _possibleConstructorReturn(self, call) {
    if (!self) {
      throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
    }

    return call && (typeof call === 'object' || typeof call === 'function') ? call : self;
  }

  function _inherits(subClass, superClass) {
    if (typeof superClass !== 'function' && superClass !== null) {
      throw new TypeError(
        'Super expression must either be null or a function, not ' + typeof superClass
      );
    }

    subClass.prototype = Object.create(superClass && superClass.prototype, {
      constructor: {
        value: subClass,
        enumerable: false,
        writable: true,
        configurable: true,
      },
    });
    if (superClass)
      Object.setPrototypeOf
        ? Object.setPrototypeOf(subClass, superClass)
        : (subClass.__proto__ = superClass);
  }

  function dateTransform(value) {
    return new Date(Date.parse(value));
  }
  var BookStoreRegExp = /^com\.example\.bookstore\./;
  var ISBNRegExp = /^isbn:/;
  var URNRegExp = /^urn:/;

  var Schema = (function(_DefaultSchema) {
    _inherits(Schema, _DefaultSchema);

    function Schema() {
      _classCallCheck(this, Schema);

      return _possibleConstructorReturn(
        this,
        (Schema.__proto__ || Object.getPrototypeOf(Schema)).apply(this, arguments)
      );
    }

    _createClass(Schema, [
      {
        key: 'computeAttributeReference',
        value: function computeAttributeReference(key, value) {
          if (typeof value === 'string' && (ISBNRegExp.test(value) || URNRegExp.test(value))) {
            return {
              type: null,
              id: value,
            };
          }
        },
      },
      {
        key: 'includesModel',
        value: function includesModel(modelName) {
          return BookStoreRegExp.test(modelName);
        },
      },
      {
        key: 'computeNestedModel',
        value: function computeNestedModel(key, value) {
          if (
            (typeof value === 'undefined' ? 'undefined' : _typeof(value)) === 'object' &&
            value !== null &&
            typeof value.$type === 'string'
          ) {
            return {
              id: value.isbn,
              type: value.$type,
              attributes: value,
            };
          }
        },
      },
    ]);

    return Schema;
  })(_m3Schema.default);

  exports.default = Schema;

  Schema.prototype.models = {
    'com.example.bookstore.book': {
      transforms: {
        pubDate: dateTransform,
      },
    },
  };
});
define('dummy/templates/alt', ['exports'], function(exports) {
  'use strict';

  Object.defineProperty(exports, '__esModule', {
    value: true,
  });
  exports.default = Ember.HTMLBars.template({
    id: 'vcyjwlmp',
    block:
      '{"symbols":[],"statements":[[0,"name: "],[1,[20,["model","name"]],false],[0,"\\n"],[6,"br"],[7],[8],[0,"\\nTop Reviewer Name: "],[1,[20,["model","topReviewer","name"]],false],[0,"\\n"]],"hasEval":false}',
    meta: { moduleName: 'dummy/templates/alt.hbs' },
  });
});
define('dummy/templates/application', ['exports'], function(exports) {
  'use strict';

  Object.defineProperty(exports, '__esModule', {
    value: true,
  });
  exports.default = Ember.HTMLBars.template({
    id: 'X94uFd4i',
    block:
      '{"symbols":[],"statements":[[6,"h1"],[7],[0,"Application"],[8],[0,"\\n"],[6,"nav"],[7],[0,"\\n  "],[4,"link-to",["index"],null,{"statements":[[0,"api0.json"]],"parameters":[]},null],[0,"\\n  "],[4,"link-to",["alt"],null,{"statements":[[0,"api1.json"]],"parameters":[]},null],[0,"\\n"],[8],[0,"\\n\\n"],[6,"br"],[7],[8],[0,"\\n"],[6,"hr"],[7],[8],[0,"\\n"],[6,"br"],[7],[8],[0,"\\n\\n"],[1,[18,"outlet"],false],[0,"\\n"]],"hasEval":false}',
    meta: { moduleName: 'dummy/templates/application.hbs' },
  });
});
define('dummy/templates/index', ['exports'], function(exports) {
  'use strict';

  Object.defineProperty(exports, '__esModule', {
    value: true,
  });
  exports.default = Ember.HTMLBars.template({
    id: 'KW+oAbbw',
    block:
      '{"symbols":["book","comment","part","commenter"],"statements":[[0,"Name: "],[1,[20,["model","_internalModel","modelName"]],false],[6,"br"],[7],[8],[0,"\\n\\n"],[6,"button"],[9,"class","update-data"],[3,"action",[[19,0,[]],"updateData"],[["target"],[[19,0,["target"]]]]],[7],[0,"\\n  Update Data (via existing ED subsystem)\\n"],[8],[0,"\\n\\n"],[6,"button"],[9,"class","update-array"],[3,"action",[[19,0,[]],"updateArray"],[["target"],[[19,0,["target"]]]]],[7],[0,"\\n  Update Array(via existing ED subsystem)\\n"],[8],[0,"\\n\\n"],[6,"ul"],[9,"class","books"],[7],[0,"\\n"],[4,"each",[[20,["model","results"]]],null,{"statements":[[0,"  "],[6,"li"],[7],[0,"\\n    "],[1,[19,1,["_internalModel","modelName"]],false],[0,"\\n    "],[6,"br"],[7],[8],[0,"\\n    id: "],[6,"span"],[9,"class","id"],[7],[1,[19,1,["id"]],false],[8],[0,"\\n    "],[6,"ul"],[7],[0,"\\n      "],[6,"li"],[7],[0,"name: "],[6,"span"],[9,"class","name"],[7],[1,[19,1,["name"]],false],[8],[8],[0,"\\n      "],[6,"li"],[7],[0,"author: "],[6,"span"],[9,"class","author"],[7],[1,[19,1,["author","name"]],false],[8],[8],[0,"\\n      "],[6,"li"],[7],[0,"pubmonth: "],[6,"span"],[9,"class","pubmonth"],[7],[1,[25,"month-of",[[19,1,["pubDate"]]],null],false],[8],[8],[0,"\\n"],[4,"if",[[19,1,["readerComments"]]],null,{"statements":[[0,"        "],[6,"li"],[7],[0,"\\n          "],[6,"ul"],[9,"class","comments"],[7],[0,"\\n"],[4,"each",[[19,1,["readerComments"]]],null,{"statements":[[0,"            "],[6,"li"],[7],[0,"\\n              "],[1,[19,2,["_internalModel","modelName"]],false],[0,": "],[1,[19,2,["id"]],false],[6,"br"],[7],[8],[0,"\\n"],[4,"with",[[19,2,["commenter"]]],null,{"statements":[[0,"                "],[1,[19,4,["_internalModel","modelName"]],false],[0,": "],[1,[19,4,["id"]],false],[6,"br"],[7],[8],[0,"\\n                "],[1,[19,4,["name"]],false],[0,"\\n"],[4,"if",[[19,4,["favouriteBook"]]],null,{"statements":[[0,"                  ("],[6,"em"],[7],[0,"Favourite: ("],[1,[19,4,["favouriteBook","name"]],false],[0,")"],[8],[0,")\\n"]],"parameters":[]},null]],"parameters":[4]},null],[0,"              "],[6,"br"],[7],[8],[0,"\\n"],[4,"if",[[19,2,["body"]]],null,{"statements":[[0,"                "],[6,"span"],[9,"class","comment-body"],[7],[0,"\\n                  "],[1,[19,2,["body"]],false],[0,"\\n                "],[8],[0,"\\n              "]],"parameters":[]},{"statements":[[4,"if",[[19,2,["parts"]]],null,{"statements":[[0,"\\n                "],[6,"ul"],[9,"class","comment-parts"],[7],[0,"\\n"],[4,"each",[[19,2,["parts"]]],null,{"statements":[[0,"                  "],[6,"li"],[7],[1,[19,3,["value"]],false],[8],[0,"\\n"]],"parameters":[3]},null],[0,"                "],[8],[0,"\\n"]],"parameters":[]},null]],"parameters":[]}],[0,"              "],[6,"br"],[7],[8],[0,"\\n            "],[8],[0,"\\n"]],"parameters":[2]},null],[0,"          "],[8],[0,"\\n        "],[8],[0,"\\n"]],"parameters":[]},null],[0,"    "],[8],[0,"\\n  "],[8],[0,"\\n"]],"parameters":[1]},null],[8],[0,"\\n"],[1,[18,"outlet"],false],[0,"\\n"]],"hasEval":false}',
    meta: { moduleName: 'dummy/templates/index.hbs' },
  });
});
define('dummy/config/environment', [], function() {
  var prefix = 'dummy';
  try {
    var metaName = prefix + '/config/environment';
    var rawConfig = document.querySelector('meta[name="' + metaName + '"]').getAttribute('content');
    var config = JSON.parse(unescape(rawConfig));

    var exports = { default: config };

    Object.defineProperty(exports, '__esModule', { value: true });

    return exports;
  } catch (err) {
    throw new Error('Could not read config from meta tag with name "' + metaName + '".');
  }
});

if (!runningTests) {
  require('dummy/app')['default'].create({});
}

//# sourceMappingURL=dummy.map
