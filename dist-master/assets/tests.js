'use strict';

define('dummy/tests/acceptance/m3-test', [
  'qunit',
  'dummy/tests/helpers/module-for-acceptance',
  'dummy/tests/pages/index',
], function(_qunit, _moduleForAcceptance, _index) {
  'use strict';

  (0, _moduleForAcceptance.default)('acceptance/m3');

  (0, _qunit.test)('payloads can be rendered as m3 models', function(assert) {
    var page = new _index.default();

    page.visit();

    andThen(function() {
      assert.equal(currentURL(), '/', 'navigated to right page');

      assert.deepEqual(
        page.books().map(function(x) {
          return x.id();
        }),
        ['isbn:9780760768570', 'isbn:9780760768587', 'isbn:9780760768594', 'isbn:9780297609568'],
        'top-level collection ids rendered'
      );

      assert.deepEqual(
        page.books().map(function(x) {
          return x.authorName();
        }),
        ['Winston Churchill', 'Winston Churchill', 'Winston Churchill', 'Winston Churchill'],
        'able to read nested attributes from top-level referenced collection items'
      );

      assert.deepEqual(
        page.books().map(function(x) {
          return x.comments().map(function(x) {
            return x.body();
          });
        }),
        [['This book is great', 'I agree'], [], ['', 'Yup'], []],
        'able to read attributes through reference arrays'
      );

      assert.deepEqual(
        page.books().map(function(x) {
          return x.comments().map(function(x) {
            return x.parts();
          });
        }),
        [[[], []], [], [['Really enjoyed this book', 'A lot'], []], []],
        'able to read embedded arrays through reference arrays'
      );
    });
  });

  (0, _qunit.test)('m3 models can be updated', function(assert) {
    var page = new _index.default();

    page.visit();

    andThen(function() {
      assert.equal(currentURL(), '/', 'navigated to right page');

      assert.equal(page.books()[0].name(), 'The Birth of Britain');
    });

    click('button.update-data');

    andThen(function() {
      assert.equal(page.books()[0].name(), 'Vol I. The Birth of Britain');
    });
  });
});
define('dummy/tests/helpers/destroy-app', ['exports'], function(exports) {
  'use strict';

  Object.defineProperty(exports, '__esModule', {
    value: true,
  });
  exports.default = destroyApp;
  function destroyApp(application) {
    Ember.run(application, 'destroy');
  }
});
define('dummy/tests/helpers/module-for-acceptance', [
  'exports',
  'qunit',
  'dummy/tests/helpers/start-app',
  'dummy/tests/helpers/destroy-app',
], function(exports, _qunit, _startApp, _destroyApp) {
  'use strict';

  Object.defineProperty(exports, '__esModule', {
    value: true,
  });

  exports.default = function(name) {
    var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

    (0, _qunit.module)(name, {
      beforeEach: function beforeEach() {
        this.application = (0, _startApp.default)();

        if (options.beforeEach) {
          return options.beforeEach.apply(this, arguments);
        }
      },
      afterEach: function afterEach() {
        var _this = this;

        var afterEach = options.afterEach && options.afterEach.apply(this, arguments);
        return Ember.RSVP.resolve(afterEach).then(function() {
          return (0, _destroyApp.default)(_this.application);
        });
      },
    });
  };
});
define('dummy/tests/helpers/resolver', [
  'exports',
  'dummy/resolver',
  'dummy/config/environment',
], function(exports, _resolver, _environment) {
  'use strict';

  Object.defineProperty(exports, '__esModule', {
    value: true,
  });

  var resolver = _resolver.default.create({
    namespace: {
      modulePrefix: _environment.default.modulePrefix,
      podModulePrefix: _environment.default.podModulePrefix,
    },
  });

  exports.default = resolver;
});
define('dummy/tests/helpers/start-app', [
  'exports',
  'dummy/app',
  'dummy/config/environment',
], function(exports, _app, _environment) {
  'use strict';

  Object.defineProperty(exports, '__esModule', {
    value: true,
  });
  exports.default = startApp;
  function startApp(attrs) {
    var attributes = Ember.merge({}, _environment.default.APP);
    attributes = Ember.merge(attributes, attrs); // use defaults, but you can override;

    return Ember.run(function() {
      var application = _app.default.create(attributes);
      application.setupForTesting();
      application.injectTestHelpers();
      return application;
    });
  }
});
define('dummy/tests/helpers/stub-calls', ['exports', 'lodash'], function(exports, _lodash) {
  'use strict';

  Object.defineProperty(exports, '__esModule', {
    value: true,
  });
  exports.default = stubCalls;
  function stubCalls(stub) {
    return (0, _lodash.zip)(
      stub.thisValues.map(function(x) {
        return x + '';
      }),
      stub.args
    );
  }
});
define('dummy/tests/helpers/watch-property', ['exports', 'qunit'], function(exports, _qunit) {
  'use strict';

  Object.defineProperty(exports, '__esModule', {
    value: true,
  });
  exports.watchProperty = watchProperty;
  exports.watchProperties = watchProperties;

  /*
    Watches a property and increments a counter each time the property is invalidated.
  
    Returns an object with the following properties:
    - `count` - contains the number of times the property was invalidated
    - `unwatch` - a function to stop watching the property
  
    An example of how to use it:
    ```js
    test('that property has been invalidated', function(assert) {
      let subject = EmberObject.create();
      let watcher = watchProperty(subject, 'theProperty');
      subject.set('theProperty', 'newValue');
      assert.equal(watcher.count, 1, 'Expected `theProperty` to have been invalidated');
    });
    ```
   */
  function watchProperty(obj, propertyName) {
    var count = 0;

    function observe() {
      count++;
    }

    Ember.addObserver(obj, propertyName, observe);

    function unwatch() {
      Ember.removeObserver(obj, propertyName, observe);
    }

    return {
      get count() {
        return count;
      },
      unwatch: unwatch,
    };
  }

  /*
    Convenient function for watching multiple properties at once. It uses the
    same mechanism as `watchProperty` and returns an object with the following properties:
    - `counts` - a map from property name to the count of how many times the property was invalidated
    - `unwatch` - a function to stop watching the properties
  
    An example of how to use it:
  
    test('that properties have been invalidated', function(assert) {
      let subject = EmberObject.create();
      let watchers = watchProperties(subject, ['property1', 'property2']);
      subject.set('property1', 'newValue');
      subject.set('property2', 'newValue');
      assert.deepEqual(
        watchers.counts,
        {
          property1: 1,
          property2: 2,
        },
        'Expected `theProperty` to have been invalidated'
      );
    });
    ```
   */
  function watchProperties(obj, propertyNames) {
    var watchers = {};

    if (!Array.isArray(propertyNames)) {
      throw new Error(
        'Must call watchProperties with an array of propertyNames to watch, received ' +
          propertyNames
      );
    }

    for (var i = 0; i < propertyNames.length; i++) {
      var propertyName = propertyNames[i];

      if (watchers[propertyName] !== undefined) {
        throw new Error('Cannot watch the same property ' + propertyName + ' more than once');
      }

      watchers[propertyName] = watchProperty(obj, propertyName);
    }

    function unwatch() {
      propertyNames.forEach(function(propertyName) {
        watchers[propertyName].unwatch();
      });
    }

    return {
      get counts() {
        return propertyNames.reduce(function(result, prop) {
          result[prop] = watchers[prop].count;
          return result;
        }, {});
      },
      unwatch: unwatch,
    };
  }

  _qunit.default.assert.dirties = function assertDirties(options, updateMethodCallback, label) {
    var obj = options.object,
      property = options.property,
      count = options.count;

    count = typeof count === 'number' ? count : 1;
    var watcher = watchProperty(obj, property);
    updateMethodCallback();
    this.pushResult({
      result: watcher.count === count,
      actual: watcher.count,
      expected: count,
      message: label,
    });
    watcher.unwatch();
  };
});
define('dummy/tests/lint/app.lint-test', [], function() {
  'use strict';

  QUnit.module('ESLint | app');

  QUnit.test('app.js', function(assert) {
    assert.expect(1);
    assert.ok(true, 'app.js should pass ESLint\n\n');
  });

  QUnit.test('helpers/month-of.js', function(assert) {
    assert.expect(1);
    assert.ok(true, 'helpers/month-of.js should pass ESLint\n\n');
  });

  QUnit.test('resolver.js', function(assert) {
    assert.expect(1);
    assert.ok(true, 'resolver.js should pass ESLint\n\n');
  });

  QUnit.test('router.js', function(assert) {
    assert.expect(1);
    assert.ok(true, 'router.js should pass ESLint\n\n');
  });

  QUnit.test('routes/alt.js', function(assert) {
    assert.expect(1);
    assert.ok(true, 'routes/alt.js should pass ESLint\n\n');
  });

  QUnit.test('routes/index.js', function(assert) {
    assert.expect(1);
    assert.ok(true, 'routes/index.js should pass ESLint\n\n');
  });

  QUnit.test('serializers/application.js', function(assert) {
    assert.expect(1);
    assert.ok(true, 'serializers/application.js should pass ESLint\n\n');
  });

  QUnit.test('services/m3-schema.js', function(assert) {
    assert.expect(1);
    assert.ok(true, 'services/m3-schema.js should pass ESLint\n\n');
  });
});
define('dummy/tests/lint/tests.lint-test', [], function() {
  'use strict';

  QUnit.module('ESLint | tests');

  QUnit.test('acceptance/m3-test.js', function(assert) {
    assert.expect(1);
    assert.ok(true, 'acceptance/m3-test.js should pass ESLint\n\n');
  });

  QUnit.test('helpers/destroy-app.js', function(assert) {
    assert.expect(1);
    assert.ok(true, 'helpers/destroy-app.js should pass ESLint\n\n');
  });

  QUnit.test('helpers/module-for-acceptance.js', function(assert) {
    assert.expect(1);
    assert.ok(true, 'helpers/module-for-acceptance.js should pass ESLint\n\n');
  });

  QUnit.test('helpers/resolver.js', function(assert) {
    assert.expect(1);
    assert.ok(true, 'helpers/resolver.js should pass ESLint\n\n');
  });

  QUnit.test('helpers/start-app.js', function(assert) {
    assert.expect(1);
    assert.ok(true, 'helpers/start-app.js should pass ESLint\n\n');
  });

  QUnit.test('helpers/stub-calls.js', function(assert) {
    assert.expect(1);
    assert.ok(true, 'helpers/stub-calls.js should pass ESLint\n\n');
  });

  QUnit.test('helpers/watch-property.js', function(assert) {
    assert.expect(1);
    assert.ok(true, 'helpers/watch-property.js should pass ESLint\n\n');
  });

  QUnit.test('pages/index.js', function(assert) {
    assert.expect(1);
    assert.ok(true, 'pages/index.js should pass ESLint\n\n');
  });

  QUnit.test('test-helper.js', function(assert) {
    assert.expect(1);
    assert.ok(true, 'test-helper.js should pass ESLint\n\n');
  });

  QUnit.test('unit/initializers/m3-store-test.js', function(assert) {
    assert.expect(1);
    assert.ok(true, 'unit/initializers/m3-store-test.js should pass ESLint\n\n');
  });

  QUnit.test('unit/model-test.js', function(assert) {
    assert.expect(1);
    assert.ok(true, 'unit/model-test.js should pass ESLint\n\n');
  });

  QUnit.test('unit/model/api-test.js', function(assert) {
    assert.expect(1);
    assert.ok(true, 'unit/model/api-test.js should pass ESLint\n\n');
  });

  QUnit.test('unit/model/changed-attrs-test.js', function(assert) {
    assert.expect(1);
    assert.ok(true, 'unit/model/changed-attrs-test.js should pass ESLint\n\n');
  });

  QUnit.test('unit/model/dependent-keys-test.js', function(assert) {
    assert.expect(1);
    assert.ok(true, 'unit/model/dependent-keys-test.js should pass ESLint\n\n');
  });

  QUnit.test('unit/model/projections/changed-attrs-test.js', function(assert) {
    assert.expect(1);
    assert.ok(true, 'unit/model/projections/changed-attrs-test.js should pass ESLint\n\n');
  });

  QUnit.test('unit/model/projections/serialize-test.js', function(assert) {
    assert.expect(1);
    assert.ok(true, 'unit/model/projections/serialize-test.js should pass ESLint\n\n');
  });

  QUnit.test('unit/model/reference-array-test.js', function(assert) {
    assert.expect(1);
    assert.ok(true, 'unit/model/reference-array-test.js should pass ESLint\n\n');
  });

  QUnit.test('unit/model/saving-test.js', function(assert) {
    assert.expect(1);
    assert.ok(true, 'unit/model/saving-test.js should pass ESLint\n\n');
  });

  QUnit.test('unit/model/state-test.js', function(assert) {
    assert.expect(1);
    assert.ok(true, 'unit/model/state-test.js should pass ESLint\n\n');
  });

  QUnit.test('unit/model/tracked-array-test.js', function(assert) {
    assert.expect(1);
    assert.ok(true, 'unit/model/tracked-array-test.js should pass ESLint\n\n');
  });

  QUnit.test('unit/projection-test.js', function(assert) {
    assert.expect(1);
    assert.ok(true, 'unit/projection-test.js should pass ESLint\n\n');
  });

  QUnit.test('unit/query-array-test.js', function(assert) {
    assert.expect(1);
    assert.ok(true, 'unit/query-array-test.js should pass ESLint\n\n');
  });

  QUnit.test('unit/query-cache-test.js', function(assert) {
    assert.expect(1);
    assert.ok(true, 'unit/query-cache-test.js should pass ESLint\n\n');
  });

  QUnit.test('unit/record-array-test.js', function(assert) {
    assert.expect(1);
    assert.ok(true, 'unit/record-array-test.js should pass ESLint\n\n');
  });

  QUnit.test('unit/record-data-test.js', function(assert) {
    assert.expect(1);
    assert.ok(true, 'unit/record-data-test.js should pass ESLint\n\n');
  });

  QUnit.test('unit/schema-manager-test.js', function(assert) {
    assert.expect(1);
    assert.ok(true, 'unit/schema-manager-test.js should pass ESLint\n\n');
  });

  QUnit.test('unit/schema/is-resolved-test.js', function(assert) {
    assert.expect(1);
    assert.ok(true, 'unit/schema/is-resolved-test.js should pass ESLint\n\n');
  });

  QUnit.test('unit/store-test.js', function(assert) {
    assert.expect(1);
    assert.ok(true, 'unit/store-test.js should pass ESLint\n\n');
  });

  QUnit.test('unit/utils/copy-test.js', function(assert) {
    assert.expect(1);
    assert.ok(true, 'unit/utils/copy-test.js should pass ESLint\n\n');
  });
});
define('dummy/tests/pages/index', ['exports'], function(exports) {
  'use strict';

  Object.defineProperty(exports, '__esModule', {
    value: true,
  });

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

  var PageObject = (function() {
    function PageObject(_ref) {
      var scope = _ref.scope;

      _classCallCheck(this, PageObject);

      this.scope = scope;
    }

    _createClass(PageObject, [
      {
        key: '$',
        value: function $() {
          if (arguments.length > 0) {
            var _self$jQuery;

            return (_self$jQuery = self.jQuery(this.scope)).find.apply(_self$jQuery, arguments);
          } else {
            return self.jQuery(this.scope);
          }
        },
      },
    ]);

    return PageObject;
  })();

  var CommentOnPage = (function(_PageObject) {
    _inherits(CommentOnPage, _PageObject);

    function CommentOnPage() {
      _classCallCheck(this, CommentOnPage);

      return _possibleConstructorReturn(
        this,
        (CommentOnPage.__proto__ || Object.getPrototypeOf(CommentOnPage)).apply(this, arguments)
      );
    }

    _createClass(CommentOnPage, [
      {
        key: 'body',
        value: function body() {
          return this.$('.comment-body')
            .text()
            .replace(/\s+/g, ' ')
            .replace(/^\s*/, '')
            .replace(/\s*$/, '');
        },
      },
      {
        key: 'parts',
        value: function parts() {
          return this.$('.comment-parts li')
            .map(function(x, y) {
              return self.jQuery(y).text();
            })
            .toArray()
            .map(function(x) {
              return x
                .replace(/\s+/g, ' ')
                .replace(/^\s*/, '')
                .replace(/\s*$/, '');
            });
        },
      },
    ]);

    return CommentOnPage;
  })(PageObject);

  var BookOnPage = (function(_PageObject2) {
    _inherits(BookOnPage, _PageObject2);

    function BookOnPage() {
      _classCallCheck(this, BookOnPage);

      return _possibleConstructorReturn(
        this,
        (BookOnPage.__proto__ || Object.getPrototypeOf(BookOnPage)).apply(this, arguments)
      );
    }

    _createClass(BookOnPage, [
      {
        key: 'id',
        value: function id() {
          return this.$('.id').text();
        },
      },
      {
        key: 'name',
        value: function name() {
          return this.$('.name').text();
        },
      },
      {
        key: 'authorName',
        value: function authorName() {
          return this.$('.author').text();
        },
      },
      {
        key: 'pubMonth',
        value: function pubMonth() {
          return parseInt(this.$('.pubmonth').text(), 10);
        },
      },
      {
        key: 'comments',
        value: function comments() {
          return this.$('ul.comments > li')
            .toArray()
            .map(function(x) {
              return new CommentOnPage({ scope: x });
            });
        },
      },
    ]);

    return BookOnPage;
  })(PageObject);

  var IndexPage = (function(_PageObject3) {
    _inherits(IndexPage, _PageObject3);

    function IndexPage() {
      _classCallCheck(this, IndexPage);

      return _possibleConstructorReturn(
        this,
        (IndexPage.__proto__ || Object.getPrototypeOf(IndexPage)).call(this, {
          scope: '.ember-application',
        })
      );
    }

    _createClass(IndexPage, [
      {
        key: 'visit',
        value: (function(_visit) {
          function visit() {
            return _visit.apply(this, arguments);
          }

          visit.toString = function() {
            return _visit.toString();
          };

          return visit;
        })(function() {
          visit('/');
        }),
      },
      {
        key: 'books',
        value: function books() {
          return this.$('ul.books > li')
            .toArray()
            .map(function(x) {
              return new BookOnPage({ scope: x });
            });
        },
      },
    ]);

    return IndexPage;
  })(PageObject);

  exports.default = IndexPage;
});
define('dummy/tests/test-helper', [
  'dummy/tests/helpers/resolver',
  '@ember/test-helpers',
  'ember-qunit',
  'dummy/tests/helpers/watch-property',
], function(_resolver, _testHelpers, _emberQunit) {
  'use strict';

  (0, _testHelpers.setResolver)(_resolver.default);
  (0, _emberQunit.start)();
});
define('dummy/tests/unit/initializers/m3-store-test', [
  'qunit',
  'sinon',
  'ember-qunit',
  'lodash',
  'ember-m3/services/m3-schema',
  'ember-m3/factory',
  'ember-m3/initializers/m3-store',
], function(_qunit, _sinon, _emberQunit, _lodash, _m3Schema, _factory, _m3Store) {
  'use strict';

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

  (0, _qunit.module)('unit/initializers/m3-store', function(hooks) {
    (0, _emberQunit.setupTest)(hooks);

    hooks.beforeEach(function() {
      this.sinon = _sinon.default.createSandbox();

      this.owner.register(
        'service:m3-schema',
        (function(_DefaultSchema) {
          _inherits(TestSchema, _DefaultSchema);

          function TestSchema() {
            _classCallCheck(this, TestSchema);

            return _possibleConstructorReturn(
              this,
              (TestSchema.__proto__ || Object.getPrototypeOf(TestSchema)).apply(this, arguments)
            );
          }

          _createClass(TestSchema, [
            {
              key: 'includesModel',
              value: function includesModel(modelName) {
                return /^com.example.bookstore\./i.test(modelName);
              },
            },
          ]);

          return TestSchema;
        })(_m3Schema.default)
      );

      // this indirection is to work around false positives in
      // ember/avoid-leaking-state-in-ember-objects
      this.adapterForStub = this.sinon.stub();
      this.serializerForStub = this.sinon.stub();
      this.modelFactoryForStub = this.sinon.stub();
      var MockStore = Ember.Object.extend({
        adapterFor: this.adapterForStub,
        serializerFor: this.serializerForStub,
        _modelFactoryFor: this.modelFactoryForStub,
      });
      MockStore.toString = function() {
        return 'MockStore';
      };
      (0, _m3Store.extendStore)(MockStore);

      this.store = MockStore.create({
        // required because it cannot be injected in this case
        _schemaManager: this.owner.lookup('service:m3-schema-manager'),
      });
    });

    hooks.afterEach(function() {
      this.sinon.restore();
    });

    (0, _qunit.test)('it adds `store.queryURL`', function(assert) {
      assert.expect(2);

      assert.equal(_typeof(this.store.queryURL), 'function', 'queryURL added');
      this.sinon.stub(this.store._queryCache, 'queryURL').callsFake(function() {
        for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
          args[_key] = arguments[_key];
        }

        assert.deepEqual(
          [].concat(args),
          ['/some-data', { params: { a: '1' } }],
          'arguments are passed down to queryCache'
        );
      });

      this.store.queryURL('/some-data', { params: { a: '1' } });
    });

    (0, _qunit.test)('it adds `store.cacheURL`', function(assert) {
      assert.expect(1);
      assert.equal(_typeof(this.store.cacheURL), 'function', 'cacheURL added');
    });

    (0, _qunit.test)('it adds `store.unloadURL`', function(assert) {
      assert.expect(2);

      var cacheKey = 'uwot';

      assert.equal(_typeof(this.store.unloadURL), 'function', 'unloadURL added');
      this.sinon.stub(this.store._queryCache, 'unloadURL').callsFake(function() {
        for (var _len2 = arguments.length, args = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
          args[_key2] = arguments[_key2];
        }

        assert.deepEqual([].concat(args), [cacheKey], 'arguments are passed down to queryCache');
      });

      this.store.unloadURL(cacheKey);
    });

    (0, _qunit.test)('it adds `store.containsURL`', function(assert) {
      assert.expect(2);

      var cacheKey = 'uwot';

      assert.equal(_typeof(this.store.containsURL), 'function', 'containsURL added');
      this.sinon.stub(this.store._queryCache, 'contains').callsFake(function() {
        for (var _len3 = arguments.length, args = Array(_len3), _key3 = 0; _key3 < _len3; _key3++) {
          args[_key3] = arguments[_key3];
        }

        assert.deepEqual([].concat(args), [cacheKey], 'arguments are passed down to queryCache');
      });

      this.store.containsURL(cacheKey);
    });

    (0, _qunit.test)('uses the -ember-m3 adapter for schema-recognized types', function(assert) {
      this.store.adapterFor('non-matching-type');

      assert.deepEqual(
        (0, _lodash.zip)(
          this.adapterForStub.thisValues.map(function(x) {
            return x + '';
          }),
          this.adapterForStub.args
        ),
        [[this.store + '', ['non-matching-type']]],
        'non-matching types are passed through'
      );

      this.store.adapterFor('com.example.bookstore.Book');

      assert.deepEqual(
        (0, _lodash.zip)(
          this.adapterForStub.thisValues.map(function(x) {
            return x + '';
          }),
          this.adapterForStub.args
        ),
        [[this.store + '', ['non-matching-type']], [this.store + '', ['-ember-m3']]],
        'matching types use the -ember-m3 adapter'
      );
    });

    (0, _qunit.test)('uses the -ember-m3 serializer for schema-recognized types', function(assert) {
      this.store.serializerFor('non-matching-type');

      assert.deepEqual(
        (0, _lodash.zip)(
          this.serializerForStub.thisValues.map(function(x) {
            return x + '';
          }),
          this.serializerForStub.args
        ),
        [[this.store + '', ['non-matching-type']]],
        'non-matching types are passed through'
      );

      this.store.serializerFor('com.example.bookstore.Book');

      assert.deepEqual(
        (0, _lodash.zip)(
          this.serializerForStub.thisValues.map(function(x) {
            return x + '';
          }),
          this.serializerForStub.args
        ),
        [[this.store + '', ['non-matching-type']], [this.store + '', ['-ember-m3']]],
        'matching types use the -ember-m3 serializer'
      );
    });

    (0,
    _qunit.test)('uses the -ember-m3 model factory for schema-recognized types', function(assert) {
      this.store._modelFactoryFor('non-matching-type');

      assert.deepEqual(
        (0, _lodash.zip)(
          this.modelFactoryForStub.thisValues.map(function(x) {
            return x + '';
          }),
          this.modelFactoryForStub.args
        ),
        [[this.store + '', ['non-matching-type']]],
        'non-matching types are passed through'
      );

      assert.equal(
        this.store._modelFactoryFor('com.example.bookstore.Book'),
        _factory.default,
        'matching types return the M3 model factory'
      );

      assert.deepEqual(
        (0, _lodash.zip)(
          this.modelFactoryForStub.thisValues.map(function(x) {
            return x + '';
          }),
          this.modelFactoryForStub.args
        ),
        [[this.store + '', ['non-matching-type']]],
        'matching types do not require a call to super'
      );
    });
  });
});
define('dummy/tests/unit/model-test', [
  'qunit',
  'ember-qunit',
  'sinon',
  'ember-m3/-private',
  'ember-data',
  'lodash',
  'ember-m3/model',
  'ember-m3/services/m3-schema',
], function(_qunit, _emberQunit, _sinon, _private, _emberData, _lodash, _model, _m3Schema) {
  'use strict';

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

  var UrnWithTypeRegex = /^urn:([a-zA-Z.]+):(.*)/;
  var UrnWithoutTypeRegex = /^urn:(.*)/;

  (0, _qunit.module)('unit/model', function(hooks) {
    (0, _emberQunit.setupTest)(hooks);

    hooks.beforeEach(function() {
      this.sinon = _sinon.default.createSandbox();
      this.store = this.owner.lookup('service:store');

      this.Author = _emberData.default.Model.extend({
        name: _emberData.default.attr('string'),
        publishedBooks: _emberData.default.hasMany('com.example.bookstore.Book', {
          async: false,
        }),
      });
      this.Author.toString = function() {
        return 'Author';
      };
      this.owner.register('model:author', this.Author);

      var TestSchema = (function(_DefaultSchema) {
        _inherits(TestSchema, _DefaultSchema);

        function TestSchema() {
          _classCallCheck(this, TestSchema);

          return _possibleConstructorReturn(
            this,
            (TestSchema.__proto__ || Object.getPrototypeOf(TestSchema)).apply(this, arguments)
          );
        }

        _createClass(TestSchema, [
          {
            key: 'includesModel',
            value: function includesModel(modelName) {
              return /^com.example.bookstore\./i.test(modelName);
            },
          },
          {
            key: 'computeAttributeReference',
            value: function computeAttributeReference(key, value, modelName, schemaInterface) {
              if (value === undefined) {
                var refValue = schemaInterface.getAttr('*' + key);
                if (typeof refValue === 'string') {
                  return {
                    type: null,
                    id: refValue,
                  };
                } else if (Array.isArray(refValue)) {
                  return refValue.map(function(x) {
                    return {
                      type: null,
                      id: x,
                    };
                  });
                }
                return null;
              } else if (key === 'otherBooksInSeries') {
                return (value || []).map(function(id) {
                  return {
                    type: null,
                    id: id,
                  };
                });
              } else if (Array.isArray(value)) {
                return value.every(function(v) {
                  return typeof v === 'string' && /^isbn:/.test(v);
                })
                  ? value.map(function(id) {
                      return {
                        type: /^isbn:/.test(id) ? 'com.example.bookstore.Book' : null,
                        id: id,
                      };
                    })
                  : undefined;
              } else if (/^isbn:/.test(value)) {
                return {
                  id: value,
                  type: 'com.example.bookstore.Book',
                };
              } else if (UrnWithTypeRegex.test(value)) {
                var parts = UrnWithTypeRegex.exec(value);
                return {
                  type: parts[1],
                  id: parts[2],
                };
              } else if (UrnWithoutTypeRegex.test(value)) {
                return {
                  type: null,
                  id: value,
                };
              }
            },
          },
          {
            key: 'computeNestedModel',
            value: function computeNestedModel(key, value, modelName, data) {
              if (value === undefined) {
                value = data.getAttr(key + 'Embedded');
              }
              if (
                value &&
                (typeof value === 'undefined' ? 'undefined' : _typeof(value)) === 'object' &&
                value.constructor !== Date &&
                !Ember.isArray(value)
              ) {
                return {
                  type: value.type,
                  id: value.id,
                  attributes: value,
                };
              }
            },
          },
        ]);

        return TestSchema;
      })(_m3Schema.default);

      TestSchema.prototype.models = {
        'com.example.bookstore.book': {
          aliases: {
            title: 'name',
            cost: 'price',
            pub: 'publisher',
            releaseDate: 'pubDate',
            pb: 'paperback',
            hb: 'hardback',
          },
          defaults: {
            publisher: 'Penguin Classics',
            hardback: true,
            paperback: true,
            publishedIn: 'US',
          },
          transforms: {
            publisher: function publisher(value) {
              return value + ', of course';
            },
            pubDate: function pubDate(value) {
              return value === undefined ? undefined : new Date(Date.parse(value));
            },
          },
        },
        'com.example.bookstore.chapter': {
          defaults: {
            firstCharacterMentioned: 'Harry Potter',
          },
        },
      };
      this.owner.register('service:m3-schema', TestSchema);
    });

    hooks.afterEach(function() {
      this.sinon.restore();
    });

    (0, _qunit.test)('it appears as a model to ember data', function(assert) {
      assert.equal(_model.default.isModel, true, 'M3.isModel');
      assert.equal(_model.default.klass, _model.default, 'M3.klass');

      var klassAttrsMap = _model.default.attributes;
      assert.equal(_typeof(klassAttrsMap.has), 'function', 'M3.attributes.has()');
    });

    (0,
    _qunit.test)('.unknownProperty returns undefined for attributes not included in the payload', function(assert) {
      var _this2 = this;

      var model = Ember.run(function() {
        return _this2.store.push({
          data: {
            id: 'isbn:9780439708180',
            type: 'com.example.bookstore.Book',
            attributes: {
              title: "Harry Potter and the Sorcerer's Stone",
            },
          },
        });
      });

      assert.equal(Ember.get(model, 'title'), "Harry Potter and the Sorcerer's Stone");
      assert.equal(Ember.get(model, 'pubDate'), undefined);
    });

    (0,
    _qunit.test)('.unknownProperty and .setUnknownProperty work with non-schema objects when isModel is true (custom resolved value)', function(assert) {
      var _this3 = this;

      var model = Ember.run(function() {
        return _this3.store.push({
          data: {
            id: 'isbn:9780439708180',
            type: 'com.example.bookstore.Book',
            attributes: {
              title: "Harry Potter and the Sorcerer's Stone",
            },
          },
        });
      });

      assert.equal(Ember.get(model, 'title'), "Harry Potter and the Sorcerer's Stone");

      var LocalClass = Ember.Object.extend({
        address: Ember.computed('city', 'state', function() {
          return this.get('city') + ', ' + this.get('state');
        }),
      });

      LocalClass.isModel = true;

      var address = LocalClass.create({
        city: 'Oakland',
        state: 'CA',
      });

      Ember.run(function() {
        Ember.set(model, 'publisherLocation', address);
      });

      assert.ok(
        Ember.get(model, 'publisherLocation') === address,
        'We can access a non-schema property'
      );
      assert.equal(
        Ember.get(model, 'publisherLocation.city'),
        'Oakland',
        'We can access a nested non-schema property'
      );
      assert.equal(
        Ember.get(model, 'publisherLocation.address'),
        'Oakland, CA',
        'We can access a nested non-schema computed property'
      );
    });

    (0, _qunit.test)('.unknownProperty returns schema-transformed values', function(assert) {
      var _this4 = this;

      var model = Ember.run(function() {
        return _this4.store.push({
          data: {
            id: 'isbn:9780439708180',
            type: 'com.example.bookstore.Book',
            attributes: {
              pubDate: '01 September 1998',
            },
          },
        });
      });

      assert.equal(
        Ember.get(model, 'pubDate').getTime(),
        new Date(Date.parse('01 September 1998')).getTime()
      );
    });

    (0,
    _qunit.test)('.unknownProperty resolves id-matched values to external m3-models', function(assert) {
      var _this5 = this;

      var model = Ember.run(function() {
        return _this5.store.push({
          data: {
            id: 'isbn:9780439708180',
            type: 'com.example.bookstore.Book',
            attributes: {
              name: "Harry Potter and the Sorcerer's Stone",
              followedBy: 'isbn:9780439064873',
            },
          },
          included: [
            {
              id: 'isbn:9780439064873',
              type: 'com.example.bookstore.Book',
              attributes: {
                name: 'Harry Potter and the Chamber of Secrets',
              },
            },
          ],
        });
      });

      assert.equal(Ember.get(model, 'followedBy.name'), 'Harry Potter and the Chamber of Secrets');
      assert.equal(Ember.get(model, 'followedBy').constructor, _model.default);
    });

    (0,
    _qunit.test)('.unknownProperty resolves id-matched values to external m3-models of different types', function(assert) {
      var _this6 = this;

      var model = Ember.run(function() {
        return _this6.store.push({
          data: {
            id: 'isbn:9780439708180',
            type: 'com.example.bookstore.Book',
            attributes: {
              name: "Harry Potter and the Sorcerer's Stone",
              // type embedded in value
              firstChapter: 'urn:com.example.bookstore.Chapter:1',
              // no type, requires global m3 index
              lastChapter: 'urn:chapter17',
            },
          },
          included: [
            {
              id: '1',
              type: 'com.example.bookstore.Chapter',
              attributes: {
                name: 'The Boy Who Lived',
              },
            },
            {
              id: 'urn:chapter17',
              type: 'com.example.bookstore.Chapter',
              attributes: {
                name: 'The Man with Two Faces',
              },
            },
          ],
        });
      });

      assert.equal(Ember.get(model, 'firstChapter.name'), 'The Boy Who Lived', 'resolve with type');
      assert.equal(
        Ember.get(model, 'lastChapter.name'),
        'The Man with Two Faces',
        'resolve with global m3 index'
      );
    });

    (0, _qunit.test)('global m3 cache removes unloaded records', function(assert) {
      var _this7 = this;

      var model = Ember.run(function() {
        return _this7.store.push({
          data: {
            id: 'isbn:9780439708180',
            type: 'com.example.bookstore.Book',
            attributes: {
              name: "Harry Potter and the Sorcerer's Stone",
              // no type, requires global m3 index
              lastChapter: 'urn:chapter17',
            },
          },
          included: [
            {
              id: 'urn:chapter17',
              type: 'com.example.bookstore.Chapter',
              attributes: {
                name: 'The Man with Two Faces',
              },
            },
          ],
        });
      });

      Ember.run(function() {
        return _this7.store
          .peekRecord('com.example.bookstore.Chapter', 'urn:chapter17')
          .unloadRecord();
      });
      assert.equal(
        Ember.get(model, 'lastChapter'),
        null,
        'global m3 cache removed unloaded record'
      );
    });

    (0,
    _qunit.test)('.unknownProperty resolves id-matched values to external DS.models', function(assert) {
      var _this8 = this;

      var model = Ember.run(function() {
        return _this8.store.push({
          data: {
            id: 'isbn:9780439708180',
            type: 'com.example.bookstore.Book',
            attributes: {
              name: "Harry Potter and the Sorcerer's Stone",
              author: 'urn:author:3',
            },
          },
          included: [
            {
              id: '3',
              type: 'author',
              attributes: {
                name: 'JK Rowling',
              },
            },
          ],
        });
      });

      assert.equal(Ember.get(model, 'author.name'), 'JK Rowling');
      assert.equal(Ember.get(model, 'author').constructor, this.Author);
    });

    (0,
    _qunit.test)('.unknownProperty resolves nested-matched values as nested m3-models', function(assert) {
      var _this9 = this;

      var model = Ember.run(function() {
        return _this9.store.push({
          data: {
            id: 'isbn:9780439708180',
            type: 'com.example.bookstore.Book',
            attributes: {
              name: "Harry Potter and the Sorcerer's Stone",
              relatedToAuthor: {
                $type: 'com.example.bookstore.RelatedLink',
                value: 'urn:author:3',
                relation: 'She wrote it',
              },
              relatedToBook: {
                $type: 'com.example.bookstore.RelatedLink',
                value: 'isbn:9780439064873',
                relation: 'Next in series',
              },
            },
          },
          included: [
            {
              id: 'isbn:9780439064873',
              type: 'com.example.bookstore.Book',
              attributes: {
                name: 'Harry Potter and the Chamber of Secrets',
              },
            },
            {
              id: '3',
              type: 'author',
              attributes: {
                name: 'JK Rowling',
              },
            },
          ],
        });
      });

      assert.equal(Ember.get(model, 'relatedToAuthor.relation'), 'She wrote it');
      assert.equal(Ember.get(model, 'relatedToAuthor.value.name'), 'JK Rowling');
      assert.equal(Ember.get(model, 'relatedToAuthor.value').constructor, this.Author);
      assert.equal(Ember.get(model, 'relatedToBook.relation'), 'Next in series');
      assert.equal(
        Ember.get(model, 'relatedToBook.value.name'),
        'Harry Potter and the Chamber of Secrets'
      );
      assert.equal(Ember.get(model, 'relatedToBook.value').constructor, _model.default);
    });

    (0, _qunit.test)('.unknownProperty resolves arrays of nested-matched values', function(assert) {
      var _this10 = this;

      var model = Ember.run(function() {
        return _this10.store.push({
          data: {
            id: 'isbn:9780439708180',
            type: 'com.example.bookstore.Book',
            attributes: {
              name: "Harry Potter and the Sorcerer's Stone",
              chapters: [
                {
                  name: 'The Boy Who Lived',
                },
                {
                  name: 'The Vanishing Glass',
                },
              ],
            },
          },
        });
      });

      assert.deepEqual(
        Ember.get(model, 'chapters').map(function(x) {
          return Ember.get(x, 'name');
        }),
        ['The Boy Who Lived', 'The Vanishing Glass']
      );
    });

    (0,
    _qunit.test)('.unknownProperty resolves heterogenous arrays of m3-references, ds-references and nested objects', function(assert) {
      var _this11 = this;

      var model = Ember.run(function() {
        return _this11.store.push({
          data: {
            id: 'isbn:9780439708180',
            type: 'com.example.bookstore.Book',
            attributes: {
              name: "Harry Potter and the Sorcerer's Stone",
              relatedItems: [
                {
                  name: 'Chapter 1: The Boy Who Lived',
                },
                'isbn:9780439064873',
                'urn:author:3',
              ],
            },
          },
          included: [
            {
              id: 'isbn:9780439064873',
              type: 'com.example.bookstore.Book',
              attributes: {
                name: 'Harry Potter and the Chamber of Secrets',
              },
            },
            {
              id: '3',
              type: 'author',
              attributes: {
                name: 'JK Rowling',
              },
            },
          ],
        });
      });

      var relatedItems = Ember.get(model, 'relatedItems').content;
      assert.equal(relatedItems.length, 3, 'array has right length');
      assert.equal(
        Ember.get(relatedItems[0], 'name'),
        'Chapter 1: The Boy Who Lived',
        'array nested'
      );
      assert.equal(
        Ember.get(relatedItems[1], 'name'),
        'Harry Potter and the Chamber of Secrets',
        'array ref-to-m3'
      );
      assert.equal(Ember.get(relatedItems[2], 'name'), 'JK Rowling', 'array ref-to-ds.model');
    });

    (0, _qunit.test)('.unknownProperty supports default values', function(assert) {
      var _this12 = this;

      var model = Ember.run(function() {
        return _this12.store.push({
          data: {
            id: 'isbn:9780439708180',
            type: 'com.example.bookstore.Book',
            attributes: {
              name: "Harry Potter and the Sorcerer's Stone",
              publishedIn: 'UK',
            },
          },
        });
      });

      assert.equal(
        Ember.get(model, 'nothing'),
        undefined,
        'non-existent attribute returns undefind'
      );
      assert.equal(
        Ember.get(model, 'hardback'),
        true,
        'missing attribute with default returns default value'
      );
      assert.equal(Ember.get(model, 'publishedIn'), 'UK', 'specified attributes trump defaults');
    });

    (0, _qunit.test)('.unknownProperty supports alias values', function(assert) {
      var _this13 = this;

      var model = Ember.run(function() {
        return _this13.store.push({
          data: {
            id: 'isbn:9780439708180',
            type: 'com.example.bookstore.Book',
            attributes: {
              name: "Harry Potter and the Sorcerer's Stone",
              pubDate: 'September 1989',
            },
          },
        });
      });

      var sept1989 = new Date(Date.parse('September 1989')).getTime();

      assert.equal(
        Ember.get(model, 'title'),
        "Harry Potter and the Sorcerer's Stone",
        'alias to value present'
      );
      assert.equal(
        Ember.get(model, 'releaseDate').getTime(),
        sept1989,
        'alias to value present with transform'
      );
      assert.equal(
        Ember.get(model, 'title'),
        "Harry Potter and the Sorcerer's Stone",
        'alias to value present after caching'
      );
      assert.equal(Ember.get(model, 'cost'), undefined, 'alias to missing');
      assert.equal(Ember.get(model, 'hb'), true, 'alias to missing with default');

      Ember.run(function() {
        Ember.set(model, 'name', 'Harry Potter and the different title');
      });

      assert.equal(
        Ember.get(model, 'title'),
        'Harry Potter and the different title',
        'alias invalidated when dependent is changed'
      );
    });

    (0,
    _qunit.test)('schema can access other attributes when computing attribute references', function(assert) {
      var _this14 = this;

      var model = Ember.run(function() {
        return _this14.store.push({
          data: {
            id: 'isbn:9780439708180',
            type: 'com.example.bookstore.Book',
            attributes: {
              name: "Harry Potter and the Sorcerer's Stone",
              pubDate: 'September 1989',
              '*relatedBook': 'isbn:9780439358071',
              '*relatedBooks': ['isbn:9780439064873', 'isbn:9780439136365'],
            },
          },
          included: [
            {
              id: 'isbn:9780439064873',
              type: 'com.example.bookstore.Book',
              attributes: {
                name: 'Harry Potter and the Chamber of Secrets',
              },
            },
            {
              id: 'isbn:9780439136365',
              type: 'com.example.bookstore.Book',
              attributes: {
                name: 'Harry Potter and the Prisoner of Azkaban',
              },
            },
            {
              id: 'isbn:9780439358071',
              type: 'com.example.bookstore.Book',
              attributes: {
                name: 'Harry Potter and the Order of the Phoenix',
              },
            },
          ],
        });
      });
      assert.equal(
        Ember.get(model, 'relatedBook.name'),
        'Harry Potter and the Order of the Phoenix',
        'computing attribute reference'
      );
      assert.equal(Ember.get(model, 'relatedBook.pubDate'), undefined);
      assert.deepEqual(
        Ember.get(model, 'relatedBooks').map(function(b) {
          return Ember.get(b, 'name');
        }),
        ['Harry Potter and the Chamber of Secrets', 'Harry Potter and the Prisoner of Azkaban'],
        'compute attribute array reference'
      );
    });

    (0,
    _qunit.test)('schema can access other attributes when computing nested models', function(assert) {
      var _this15 = this;

      var model = Ember.run(function() {
        return _this15.store.push({
          data: {
            id: 'isbn:9780439708180',
            type: 'com.example.bookstore.Book',
            attributes: {
              name: "Harry Potter and the Sorcerer's Stone",
              nextChapterEmbedded: {
                name: 'The Boy Who Lived',
              },
            },
          },
        });
      });
      assert.equal(
        Ember.get(model, 'nextChapter.name'),
        'The Boy Who Lived',
        'computing nested model'
      );
    });

    (0,
    _qunit.test)('schema can return a different value for attribute array references', function(assert) {
      var _this16 = this;

      var model = Ember.run(function() {
        return _this16.store.push({
          data: {
            id: 'isbn:9780439708180',
            type: 'com.example.bookstore.Book',
            attributes: {
              name: "Harry Potter and the Sorcerer's Stone",
              pubDate: 'September 1989',
              '*otherBooksInSeries': ['isbn:9780439064873', 'isbn:9780439136365'],
            },
          },
          included: [
            {
              id: 'isbn:9780439064873',
              type: 'com.example.bookstore.Book',
              attributes: {
                name: 'Harry Potter and the Chamber of Secrets',
              },
            },
            {
              id: 'isbn:9780439136365',
              type: 'com.example.bookstore.Book',
              attributes: {
                name: 'Harry Potter and the Prisoner of Azkaban',
              },
            },
          ],
        });
      });
      var otherBooks = Ember.get(model, 'otherBooksInSeries');
      assert.deepEqual(
        otherBooks.map(function(b) {
          return Ember.get(b, 'name');
        }),
        ['Harry Potter and the Chamber of Secrets', 'Harry Potter and the Prisoner of Azkaban'],
        'attr array ref is array-like'
      );

      Ember.run(function() {
        Ember.set(model, 'otherBooksInSeries', [
          _this16.store.peekRecord('com.example.bookstore.Book', 'isbn:9780439064873'),
        ]);
      });

      // This is part of the special sauce of record arrays
      assert.deepEqual(
        otherBooks.map(function(b) {
          return Ember.get(b, 'name');
        }),
        ['Harry Potter and the Chamber of Secrets'],
        'array ref updated in place on set'
      );
    });

    (0,
    _qunit.test)('upon updating the data in store, attributes referring to keys ending with `Embedded` should update', function(assert) {
      var _this17 = this;

      var model = Ember.run(function() {
        return _this17.store.push({
          data: {
            id: 'isbn:9780439708180',
            type: 'com.example.bookstore.Book',
            attributes: {
              name: "Harry Potter and the Sorcerer's Stone",
              nextChapterEmbedded: {
                name: 'The Boy Who Lived',
              },
            },
          },
        });
      });

      var nextChapterName = Ember.get(model, 'nextChapter.name');
      assert.equal(nextChapterName, 'The Boy Who Lived');

      //Update record with new data
      Ember.run(function() {
        return _this17.store.push({
          data: {
            id: 'isbn:9780439708180',
            type: 'com.example.bookstore.Book',
            attributes: {
              name: "Harry Potter and the Sorcerer's Stone",
              nextChapterEmbedded: {
                name: 'The Vanishing Glass',
              },
            },
          },
        });
      });

      model = this.store.peekRecord('com.example.bookstore.Book', 'isbn:9780439708180');
      nextChapterName = Ember.get(model, 'nextChapter.name');

      assert.equal(
        nextChapterName,
        'The Vanishing Glass',
        'nested model attributes has been updated'
      );
    });

    (0, _qunit.test)('default values are not transformed', function(assert) {
      var _this18 = this;

      var model = Ember.run(function() {
        return _this18.store.push({
          data: {
            id: 'isbn:9780439708180',
            type: 'com.example.bookstore.Book',
          },
        });
      });

      assert.equal(
        Ember.get(model, 'publisher'),
        'Penguin Classics',
        'default value not transformed'
      );

      Ember.run(function() {
        return _this18.store.push({
          data: {
            id: 'isbn:9780439708180',
            type: 'com.example.bookstore.Book',
            attributes: {
              publisher: 'Harper Collins',
            },
          },
        });
      });

      assert.equal(
        Ember.get(model, 'publisher'),
        'Harper Collins, of course',
        'specified value transformed'
      );
    });

    (0, _qunit.test)('early set of an ID to a newly created records is allowed', function(assert) {
      var _this19 = this;

      var model = Ember.run(function() {
        return _this19.store.createRecord('com.example.bookstore.Book', {
          id: 'my-crazy-id',
        });
      });

      assert.equal(Ember.get(model, 'id'), 'my-crazy-id', 'init id property set');
    });

    (0,
    _qunit.test)('late set of an id for top-level models to a newly created records is not allowed', function(assert) {
      var _this20 = this;

      var model = Ember.run(function() {
        return _this20.store.createRecord('com.example.bookstore.Book', {
          name: 'Marlborough: His Life and Times',
        });
      });

      assert.throws(
        function() {
          Ember.set(model, 'id', 'my-crazy-id');
        },
        /You tried to set 'id' to 'my-crazy-id' for 'com.example.bookstore.book' but records can only set their ID by providing it to store.createRecord\(\)/,
        'error to set ID late'
      );
    });

    (0,
    _qunit.test)('late set of an id for nested models to a newly created records is allowed', function(assert) {
      var _this21 = this;

      var model = Ember.run(function() {
        return _this21.store.push({
          data: {
            id: 'isbn:9780439708180',
            type: 'com.example.bookstore.Book',
            attributes: {
              nextChapter: {
                name: 'The Boy Who Lived',
                nextChapter: {
                  name: 'The Vanishing Glass',
                },
              },
            },
          },
        });
      });

      assert.throws(
        function() {
          Ember.set(model, 'id', 'mutated-id');
        },
        /You tried to set 'id' to 'mutated-id' for 'com.example.bookstore.book' but records can only set their ID by providing it to store.createRecord\(\)/,
        'error to set ID late'
      );

      var nestedModel = Ember.get(model, 'nextChapter');
      Ember.set(nestedModel, 'id', 'mutated-id');

      assert.equal(Ember.get(nestedModel, 'id'), 'mutated-id'), 'able to set id of nested model';
    });

    // This is unspecified behaviour; unclear if we can do anything sane here
    // TODO: 'default values are not checked for reference arrays'

    (0,
    _qunit.test)('m3 models can be created with initial properties (init prop buffering)', function(assert) {
      var _this22 = this;

      var childModel = Ember.run(function() {
        return _this22.store.createRecord('com.example.bookstore.Book', {
          name: 'Fantastic Beasts and Where to Find Them',
          isbn: '978-0226106334',
        });
      });

      var model = Ember.run(function() {
        return _this22.store.createRecord('com.example.bookstore.Book', {
          name: 'Marlborough: His Life and Times',
          isbn: '978-0226106335',
          publisher: 'University Of Chicago Press',
          relatedBook: childModel,
        });
      });

      assert.equal(
        Ember.get(model, 'name'),
        'Marlborough: His Life and Times',
        'init property set'
      );
      assert.equal(Ember.get(model, 'isbn'), '978-0226106335', 'init property set');
      assert.equal(
        Ember.get(model, 'publisher'),
        'University Of Chicago Press, of course',
        'init property set'
      );
      assert.equal(Ember.get(model, 'relatedBook.isbn'), '978-0226106334', 'init property set');
      assert.equal(
        Ember.get(model, 'relatedBook.name'),
        'Fantastic Beasts and Where to Find Them',
        'init property set'
      );
    });

    (0,
    _qunit.test)('.setUnknownProperty updates data and clears simple attribute cache', function(assert) {
      var _this23 = this;

      var model = Ember.run(function() {
        return _this23.store.push({
          data: {
            id: 'isbn:9780760768570',
            type: 'com.example.bookstore.Book',
            attributes: {
              name: 'The Birth of Britain',
            },
          },
        });
      });

      assert.equal(Ember.get(model, 'title'), 'The Birth of Britain', 'initial - alias');
      assert.equal(Ember.get(model, 'name'), 'The Birth of Britain', 'initial - prop');

      Ember.run(function() {
        Ember.set(model, 'name', 'Vol. I');
      });

      assert.equal(Ember.get(model, 'title'), 'Vol. I', 'set prop - cached alias');
      assert.equal(Ember.get(model, 'name'), 'Vol. I', 'set prop - prop');

      assert.throws(
        function() {
          Ember.set(model, 'title', 'Volume I. The Birth of Britain');
        },
        /You tried to set 'title' to 'Volume I. The Birth of Britain', but 'title' is an alias in 'com.example.bookstore.book' and aliases are read-only/,
        'error to set an alias'
      );
    });

    (0, _qunit.test)('.setUnknownProperty triggers change events', function(assert) {
      var _this24 = this;

      var model = Ember.run(function() {
        return _this24.store.push({
          data: {
            id: 'isbn:9780439708180',
            type: 'com.example.bookstore.Book',
            attributes: {
              name: "Harry Potter and the Sorcerer's Stone",
              fans: 'lots',
            },
          },
        });
      });

      var propChanges = [];
      // TODO Convert this to use watch-property helper
      model.addObserver('fans', function(model, key) {
        propChanges.push([model + '', key]);
      });

      // observe alias
      // TODO Convert this to use watch-property helper
      model.addObserver('title', function(model, key) {
        propChanges.push([model + '', key]);
      });

      Ember.run(function() {
        Ember.set(model, 'fans', 'millions');
        // check that alias doesn't get prop changes when not requested
        Ember.set(model, 'name', 'First Book');
      });

      assert.deepEqual(
        propChanges,
        [[model + '', 'fans']],
        'change events trigger for direct props'
      );

      propChanges.splice(0, propChanges.length);
      assert.equal(Ember.get(model, 'title'), 'First Book', 'initialize alias');

      Ember.run(function() {
        Ember.set(model, 'name', 'Book 1');
      });

      assert.deepEqual(propChanges, [[model + '', 'title']], 'change events trigger for aliases');
    });

    (0,
    _qunit.test)('.setUnknownProperty sets attributes to given value for uncached values', function(assert) {
      var _this25 = this;

      var model = Ember.run(function() {
        return _this25.store.push({
          data: {
            id: 'isbn:9780439708180',
            type: 'com.example.bookstore.Book',
            attributes: {
              name: "Harry Potter and the Sorcerer's Stone",
              '*relatedBooks': ['isbn:9780439064873', 'isbn:9780439136365'],
              '*otherArray': [],
            },
          },
          included: [
            {
              id: 'isbn:9780439064873',
              type: 'com.example.bookstore.Book',
              attributes: {
                name: 'Harry Potter and the Chamber of Secrets',
              },
            },
            {
              id: 'isbn:9780439136365',
              type: 'com.example.bookstore.Book',
              attributes: {
                name: 'Harry Potter and the Prisoner of Azkaban',
              },
            },
          ],
        });
      });

      var relatedBooksRecordArray = Ember.get(model, 'relatedBooks');
      var relatedBooksPlainArray = relatedBooksRecordArray
        .map(function(b) {
          return Ember.get(b, 'id');
        })
        .map(function(isbn) {
          return _this25.store.peekRecord('com.example.bookstore.Book', isbn);
        });

      Ember.run(function() {
        return Ember.set(model, 'newPropRA', relatedBooksRecordArray);
      });
      Ember.run(function() {
        return Ember.set(model, 'newPropPA', relatedBooksPlainArray);
      });

      // it's up to the user to serialize these correctly for eg new records
      assert.equal(
        Ember.get(model, 'newPropRA'),
        relatedBooksRecordArray,
        'record array of refs have no special handling for uncached attributes'
      );
      // TODO: assert this does not go through compute attr ref but just uses the cached value
      assert.equal(
        Ember.get(model, 'newPropPA'),
        relatedBooksPlainArray,
        'array of refs have no special handling for uncached attributes'
      );
    });

    (0,
    _qunit.test)('.setUnknownProperty cache is not updated if the value is not resolved to a model', function(assert) {
      var _this26 = this;

      var model = Ember.run(function() {
        return _this26.store.push({
          data: {
            id: 'isbn:9780439708180',
            type: 'com.example.bookstore.Book',
            attributes: {
              name: "Harry Potter and the Sorcerer's Stone",
            },
          },
          included: [],
        });
      });

      Ember.run(function() {
        return Ember.set(model, 'nextChapter', {
          name: 'The Boy Who Lived',
          nextChapter: {
            name: 'The Vanishing Glass',
          },
        });
      });

      // cache is not updated upon set with the value is not resolved.
      assert.equal(
        model._cache['nextChapter'],
        undefined,
        'cache is not updated when value is not resolved'
      );

      // value is resolved upon invoking get
      var nextChapter = Ember.get(model, 'nextChapter');
      assert.ok(
        model._cache['nextChapter'].constructor.isModel,
        'cache is updated upon invoking get'
      );
      assert.strictEqual(
        Ember.get(model._cache, 'nextChapter'),
        nextChapter,
        'cache is updated upon invoking get'
      );
    });

    (0,
    _qunit.test)('.setUnknownProperty cache is removed upon setting a new value', function(assert) {
      var _this27 = this;

      var model = Ember.run(function() {
        return _this27.store.push({
          data: {
            id: 'isbn:9780439708180',
            type: 'com.example.bookstore.Book',
            attributes: {
              name: "Harry Potter and the Sorcerer's Stone",
            },
          },
          included: [],
        });
      });

      Ember.run(function() {
        return Ember.set(model, 'nextChapter', {
          name: 'The Boy Who Lived',
          nextChapter: {
            name: 'The Vanishing Glass',
          },
        });
      });

      // Testing if cache is removed upon setting new value
      var name = Ember.get(model, 'name');
      assert.equal(model._cache['name'], name, "cache is updated for key 'name'");
      // cache is removed upon set
      Ember.run(function() {
        return Ember.set(model, 'name', 'Harry Potter and the Chamber of Secrets');
      });
      assert.ok(
        model._cache['name'] === undefined,
        "cache is removed upon setting new value for key 'name'"
      );
    });

    (0,
    _qunit.test)('.setUnknownProperty child recordData is removed upon setting a new value', function(assert) {
      var _this28 = this;

      var model = Ember.run(function() {
        return _this28.store.push({
          data: {
            id: 'isbn:9780439708180',
            type: 'com.example.bookstore.Book',
            attributes: {
              name: "Harry Potter and the Sorcerer's Stone",
              nextChapter: {
                name: 'The Boy Who Lived',
              },
            },
          },
          included: [],
        });
      });

      // Testing if child recordData is removed upon setting new value
      var nextChapter = Ember.get(model, 'nextChapter');
      assert.equal(
        (0, _private.recordDataFor)(model).__childRecordDatas['nextChapter'].getAttr('name'),
        Ember.get(nextChapter, 'name'),
        'child recordData is created'
      );

      // Testing childRecordData is removed upon
      // setting a new value for nested model
      Ember.run(function() {
        return Ember.set(model, 'nextChapter', {
          name: 'The Vanishing Glass',
        });
      });

      assert.ok(
        (0, _private.recordDataFor)(model).__childRecordDatas['nextChapter'] === undefined,
        'child recordData is removed'
      );
      nextChapter = Ember.get(model, 'nextChapter');
      assert.equal(
        (0, _private.recordDataFor)(model).__childRecordDatas['nextChapter'].getAttr('name'),
        Ember.get(nextChapter, 'name'),
        'child recordData is updated with new value'
      );
    });

    (0,
    _qunit.test)('.setUnknownProperty cache is not updated if the value is an array of elements which are not resolved as models', function(assert) {
      var _this29 = this;

      var model = Ember.run(function() {
        return _this29.store.push({
          data: {
            id: 'isbn:9780439708180',
            type: 'com.example.bookstore.Book',
            attributes: {
              name: "Harry Potter and the Sorcerer's Stone",
              '*relatedBooks': [],
            },
          },
          included: [
            {
              id: 'isbn:9780439064873',
              type: 'com.example.bookstore.Book',
              attributes: {
                name: 'Harry Potter and the Chamber of Secrets',
              },
            },
            {
              id: 'isbn:9780439136365',
              type: 'com.example.bookstore.Book',
              attributes: {
                name: 'Harry Potter and the Prisoner of Azkaban',
              },
            },
          ],
        });
      });

      Ember.run(function() {
        return Ember.set(model, 'relatedBooks', ['isbn:9780439064873', 'isbn:9780439136365']);
      });
      // value in cache is removed
      // and not updated upon set with the value that is not resolved.
      assert.equal(
        model._cache['relatedBooks'],
        undefined,
        'cache is not updated when value is not resolved'
      );

      //Attribute is updated with unresolved values
      assert.deepEqual(
        (0, _private.recordDataFor)(model).__attributes['relatedBooks'],
        ['isbn:9780439064873', 'isbn:9780439136365'],
        'recordData attributes are updated with unresolved array'
      );

      // value is resolved upon invoking get
      Ember.get(model, 'relatedBooks');
      assert.ok(model._cache['relatedBooks'] !== undefined, 'cache is updated upon invoking get');
      assert.equal(
        Ember.get(model._cache['relatedBooks'].objectAt(0), 'name'),
        'Harry Potter and the Chamber of Secrets',
        'cache is updated upon invoking get'
      );
    });

    (0, _qunit.test)('.setUnknownProperty update cache if the value is resolved', function(assert) {
      var _this30 = this;

      var model = Ember.run(function() {
        return _this30.store.push({
          data: {
            id: 'isbn:9780439708180',
            type: 'com.example.bookstore.Book',
            attributes: {
              name: "Harry Potter and the Sorcerer's Stone",
              '*relatedBooks': ['isbn:9780439064873', 'isbn:9780439136365'],
              '*otherRecordArray': [],
            },
          },
          included: [
            {
              id: 'isbn:9780439064873',
              type: 'com.example.bookstore.Book',
              attributes: {
                name: 'Harry Potter and the Chamber of Secrets',
              },
            },
            {
              id: 'isbn:9780439136365',
              type: 'com.example.bookstore.Book',
              attributes: {
                name: 'Harry Potter and the Prisoner of Azkaban',
              },
            },
          ],
        });
      });

      var firstRelatedBook = Ember.get(model, 'relatedBooks.firstObject');
      Ember.run(function() {
        return Ember.set(model, 'firstRelatedBook', firstRelatedBook);
      });
      assert.strictEqual(
        Ember.get(model._cache, 'firstRelatedBook'),
        firstRelatedBook,
        'cahe is updated as soon as resolved value is set'
      );
    });

    (0, _qunit.skip)('DS.Models can have relationships into m3 models', function(assert) {
      var _this31 = this;

      var model = Ember.run(function() {
        return _this31.store.push({
          data: {
            id: '3',
            type: 'author',
            attributes: {
              name: 'JK Rowling',
            },
            relationships: {
              publishedBooks: {
                data: [
                  {
                    id: 'isbn:9780439708180',
                    // Ember-Data requires model-name normalized types in relationship portions of a jsonapi resource
                    type: 'com.example.bookstore.book',
                  },
                ],
              },
            },
          },

          included: [
            {
              id: 'isbn:9780439708180',
              type: 'com.example.bookstore.Book',
              attributes: {
                name: "Harry Potter and the Sorcerer's Stone",
              },
            },
          ],
        });
      });

      assert.equal(Ember.get(model, 'name'), 'JK Rowling', 'ds.model loaded');
      assert.equal(
        Ember.get(model, 'publishedBooks.firstObject.name'),
        "Harry Potter and the Sorcerer's Stone",
        'ds.model can access m3 model via relationship'
      );
    });

    (0, _qunit.test)('nested models are created lazily', function(assert) {
      var _this32 = this;

      var init = this.sinon.spy(_model.default.prototype, 'init');
      var model = Ember.run(function() {
        return _this32.store.push({
          data: {
            id: 'isbn:9780439708180',
            type: 'com.example.bookstore.Book',
            attributes: {
              nextChapter: {
                name: 'The Boy Who Lived',
                nextChapter: {
                  name: 'The Vanishing Glass',
                },
              },
            },
          },
        });
      });

      assert.equal(init.callCount, 1, 'initially only one model is created');

      model = Ember.run(function() {
        return _this32.store.push({
          data: {
            id: 'isbn:9780439708180',
            type: 'com.example.bookstore.Book',
            attributes: {
              nextChapter: {
                name: 'The Boy Who Lived',
                nextChapter: {
                  name: 'The Vanishing Glass',
                  nextChapter: {
                    name: 'The Letters from No One',
                  },
                },
              },
            },
          },
        });
      });

      assert.equal(init.callCount, 1, 'model changes do not reify nested models');

      assert.equal(Ember.get(model, 'nextChapter.name'), 'The Boy Who Lived');
      assert.equal(init.callCount, 2, 'nested model is created lazily');

      assert.equal(Ember.get(model, 'nextChapter.name'), 'The Boy Who Lived');
      assert.equal(init.callCount, 2, 'nested model is cached');

      assert.equal(Ember.get(model, 'nextChapter.nextChapter.name'), 'The Vanishing Glass');
      assert.equal(init.callCount, 3, 'doubly nested model is created lazily');

      assert.equal(Ember.get(model, 'nextChapter.nextChapter.name'), 'The Vanishing Glass');
      assert.equal(init.callCount, 3, 'doubly nested model is cached');
    });

    (0, _qunit.test)('nested models have normalized model names', function(assert) {
      var _this33 = this;

      var model = Ember.run(function() {
        return _this33.store.push({
          data: {
            id: 'isbn:9780439708180',
            type: 'com.example.bookstore.Book',
            attributes: {
              nextChapter: {
                name: 'The Boy Who Lived',
                type: 'com.example.bookstore.Chapter',
              },
            },
          },
        });
      });

      assert.equal(
        Ember.get(model, 'nextChapter._internalModel.modelName'),
        'com.example.bookstore.chapter',
        'nested models have normalized model names'
      );
    });

    (0,
    _qunit.test)('nested models with unnormalized model names can have defaults', function(assert) {
      var _this34 = this;

      var model = Ember.run(function() {
        return _this34.store.push({
          data: {
            id: 'isbn:9780439708180',
            type: 'com.example.bookstore.Book',
            attributes: {
              nextChapter: {
                name: 'The Boy Who Lived',
                type: 'com.example.bookstore.Chapter',
              },
            },
          },
        });
      });

      // This will only work if nested model names are normalized
      assert.equal(
        Ember.get(model, 'nextChapter.firstCharacterMentioned'),
        'Harry Potter',
        'nested models with non-normalized names can have defaults'
      );
    });

    (0, _qunit.test)('attribute property changes are properly detected', function(assert) {
      var _this35 = this;

      var propChange = this.sinon.spy(_model.default.prototype, 'notifyPropertyChange');
      var model = Ember.run(function() {
        return _this35.store.push({
          data: {
            id: 'isbn:9780439708180',
            type: 'com.example.bookstore.Book',
            attributes: {
              name: 'Harry Potter and hmm I forget the next bit',
            },
          },
        });
      });

      Ember.run(function() {
        return _this35.store.push({
          data: {
            id: 'isbn:9780439708180',
            type: 'com.example.bookstore.Book',
            attributes: {
              name: "Harry Potter and the Sorcerer's Stone",
            },
          },
        });
      });

      assert.deepEqual(
        (0, _lodash.zip)(
          propChange.thisValues.map(function(x) {
            return x + '';
          }),
          propChange.args
        ),
        [[model + '', ['name']]]
      );
    });

    (0, _qunit.test)('omitted attributes do not trigger changes', function(assert) {
      var _this36 = this;

      var propChange = this.sinon.spy(_model.default.prototype, 'notifyPropertyChange');

      var model = Ember.run(function() {
        return _this36.store.push({
          data: {
            id: 'isbn:9780439708180',
            type: 'com.example.bookstore.Book',
            attributes: {
              name: "Harry Potter and the Sorcerer's Stone",
              author: 'JK Rowling',
            },
          },
        });
      });

      assert.equal(
        Ember.get(model, 'name'),
        "Harry Potter and the Sorcerer's Stone",
        'name initially set'
      );

      Ember.run(function() {
        return _this36.store.push({
          data: {
            id: 'isbn:9780439708180',
            type: 'com.example.bookstore.Book',
            attributes: {
              author: 'JK Rowling',
            },
          },
        });
      });

      assert.strictEqual(
        Ember.get(model, 'name'),
        "Harry Potter and the Sorcerer's Stone",
        'omitted name is not treated as delete'
      );

      assert.deepEqual(
        (0, _lodash.zip)(
          propChange.thisValues.map(function(x) {
            return x + '';
          }),
          propChange.args
        ),
        [],
        'omitted attributes do not trigger changes'
      );
    });

    (0, _qunit.test)('null attributes are detected as changed', function(assert) {
      var _this37 = this;

      var propChange = this.sinon.spy(_model.default.prototype, 'notifyPropertyChange');

      var model = Ember.run(function() {
        return _this37.store.push({
          data: {
            id: 'isbn:9780439708180',
            type: 'com.example.bookstore.Book',
            attributes: {
              name: "Harry Potter and the Sorcerer's Stone",
              author: 'JK Rowling',
            },
          },
        });
      });

      Ember.run(function() {
        return _this37.store.push({
          data: {
            id: 'isbn:9780439708180',
            type: 'com.example.bookstore.Book',
            attributes: {
              name: null,
              author: 'JK Rowling',
            },
          },
        });
      });

      assert.deepEqual(
        (0, _lodash.zip)(
          propChange.thisValues.map(function(x) {
            return x + '';
          }),
          propChange.args
        ),
        [[model + '', ['name']]],
        'nulled attributes are treated as changed'
      );
    });

    (0,
    _qunit.test)('nulled attributes in nested models are detected as changed', function(assert) {
      var _this38 = this;

      var init = this.sinon.spy(_model.default.prototype, 'init');
      var propChange = this.sinon.spy(_model.default.prototype, 'notifyPropertyChange');

      var model = Ember.run(function() {
        return _this38.store.push({
          data: {
            id: 'isbn:9780439708180',
            type: 'com.example.bookstore.Book',
            attributes: {
              name: "Harry Potter and the Sorcerer's Stone",
              nextChapter: {
                id: 'ch1',
                name: 'The Boy Who Lived',
                number: 0,
                nextChapter: {
                  id: 'ch2',
                  name: 'The Vanishing Glass',
                  number: 1,
                },
              },
            },
          },
        });
      });

      assert.equal(init.callCount, 1, 'one model is initially created');
      assert.equal(propChange.callCount, 0, 'no property changes');

      var nested = Ember.get(model, 'nextChapter');
      var doubleNested = Ember.get(model, 'nextChapter.nextChapter');

      assert.equal(init.callCount, 3, 'models created lazily');

      assert.equal(Ember.get(nested, 'name'), 'The Boy Who Lived');
      assert.equal(Ember.get(doubleNested, 'name'), 'The Vanishing Glass');

      Ember.run(function() {
        return _this38.store.push({
          data: {
            id: 'isbn:9780439708180',
            type: 'com.example.bookstore.Book',
            attributes: {
              name: "Harry Potter and the Sorcerer's Stone",
              nextChapter: {
                id: 'ch1',
                name: null,
                number: 1,
                nextChapter: {
                  id: 'ch2',
                  name: null,
                  number: 2,
                },
              },
            },
          },
        });
      });

      assert.deepEqual(
        (0, _lodash.zip)(
          propChange.thisValues.map(function(x) {
            return x + '';
          }),
          propChange.args
        ),
        [
          [doubleNested + '', ['name']],
          [doubleNested + '', ['number']],
          [nested + '', ['name']],
          [nested + '', ['number']],
        ],
        'nulled attributes in nested models are detected as changed'
      );

      assert.equal(Ember.get(nested, 'number'), 1);
      assert.equal(Ember.get(nested, 'name'), null);
      assert.equal(Ember.get(doubleNested, 'number'), 2);
      assert.equal(Ember.get(doubleNested, 'name'), null);
    });

    (0,
    _qunit.test)('omitted attributes in nested models are not detected as changed', function(assert) {
      var _this39 = this;

      var propChange = this.sinon.spy(_model.default.prototype, 'notifyPropertyChange');

      var model = Ember.run(function() {
        return _this39.store.push({
          data: {
            id: 'isbn:9780439708180',
            type: 'com.example.bookstore.Book',
            attributes: {
              name: "Harry Potter and the Sorcerer's Stone",
              nextChapter: {
                id: 'ch1',
                name: 'The Boy Who Lived',
                number: 0,
                nextChapter: {
                  id: 'ch2',
                  name: 'The Vanishing Glass',
                  number: 1,
                },
              },
            },
          },
        });
      });

      assert.equal(propChange.callCount, 0, 'no property changes');

      var nested = Ember.get(model, 'nextChapter');
      var doubleNested = Ember.get(model, 'nextChapter.nextChapter');

      Ember.run(function() {
        return _this39.store.push({
          data: {
            id: 'isbn:9780439708180',
            type: 'com.example.bookstore.Book',
            attributes: {
              name: "Harry Potter and the Sorcerer's Stone",
              nextChapter: {
                id: 'ch1',
                number: 0,
                nextChapter: {
                  id: 'ch2',
                  number: 1,
                },
              },
            },
          },
        });
      });

      assert.deepEqual(
        (0, _lodash.zip)(
          propChange.thisValues.map(function(x) {
            return x + '';
          }),
          propChange.args
        ),
        [],
        'nulled attributes in nested models are detected as changed'
      );

      assert.equal(Ember.get(nested, 'number'), 0);
      assert.equal(Ember.get(nested, 'name'), 'The Boy Who Lived');
      assert.equal(Ember.get(doubleNested, 'number'), 1);
      assert.equal(Ember.get(doubleNested, 'name'), 'The Vanishing Glass');
    });

    (0, _qunit.test)('new attributes are treated as changed', function(assert) {
      var _this40 = this;

      var propChange = this.sinon.spy(_model.default.prototype, 'notifyPropertyChange');

      var model = Ember.run(function() {
        return _this40.store.push({
          data: {
            id: 'isbn:9780439708180',
            type: 'com.example.bookstore.Book',
            attributes: {
              name: "Harry Potter and the Sorcerer's Stone",
            },
          },
        });
      });

      assert.equal(Ember.get(model, 'name'), "Harry Potter and the Sorcerer's Stone");
      assert.equal(Ember.get(model, 'chapterCount'), undefined);

      Ember.run(function() {
        return _this40.store.push({
          data: {
            id: 'isbn:9780439708180',
            type: 'com.example.bookstore.Book',
            attributes: {
              name: "Harry Potter and the Sorcerer's Stone",
              chapterCount: 17,
            },
          },
        });
      });

      assert.deepEqual(
        (0, _lodash.zip)(
          propChange.thisValues.map(function(x) {
            return x + '';
          }),
          propChange.args
        ),
        [[model + '', ['chapterCount']]],
        'new attributes are treated as changes'
      );

      assert.equal(Ember.get(model, 'name'), "Harry Potter and the Sorcerer's Stone");
      assert.equal(Ember.get(model, 'chapterCount'), 17);
    });

    (0, _qunit.test)('new attributes in nested models are treated as changed', function(assert) {
      var _this41 = this;

      var propChange = this.sinon.spy(_model.default.prototype, 'notifyPropertyChange');

      var model = Ember.run(function() {
        return _this41.store.push({
          data: {
            id: 'isbn:9780439708180',
            type: 'com.example.bookstore.Book',
            attributes: {
              name: "Harry Potter and the Sorcerer's Stone",
              nextChapter: {
                name: 'The Boy Who Lived',
              },
            },
          },
        });
      });

      var nested = model.get('nextChapter');
      assert.equal(Ember.get(nested, 'name'), 'The Boy Who Lived');

      Ember.run(function() {
        return _this41.store.push({
          data: {
            id: 'isbn:9780439708180',
            type: 'com.example.bookstore.Book',
            attributes: {
              name: "Harry Potter and the Sorcerer's Stone",
              nextChapter: {
                name: 'The Boy Who Lived',
                number: 1,
              },
            },
          },
        });
      });

      assert.deepEqual(
        (0, _lodash.zip)(
          propChange.thisValues.map(function(x) {
            return x + '';
          }),
          propChange.args
        ),
        [[nested + '', ['number']]],
        'new attributes in nested models are treated as changes'
      );
    });

    (0, _qunit.test)('nested model attribute changes are properly detected', function(assert) {
      var _this42 = this;

      var init = this.sinon.spy(_model.default.prototype, 'init');
      var propChange = this.sinon.spy(_model.default.prototype, 'notifyPropertyChange');

      var model = Ember.run(function() {
        return _this42.store.push({
          data: {
            id: 'isbn:9780439708180',
            type: 'com.example.bookstore.Book',
            attributes: {
              name: "Harry Potter and the Sorcerer's Stone",
              number: 0,
              nextChapter: {
                name: 'The Boy Who whatever',
                number: 1,
                nextChapter: {
                  name: 'The Vanishing dunno',
                  number: 2,
                },
              },
            },
          },
        });
      });

      assert.equal(init.callCount, 1, 'one model is initially created');
      assert.equal(propChange.callCount, 0, 'no property changes');

      var nested = Ember.get(model, 'nextChapter');
      var doubleNested = Ember.get(model, 'nextChapter.nextChapter');

      assert.equal(init.callCount, 3, 'models created lazily');

      assert.equal(Ember.get(nested, 'name'), 'The Boy Who whatever', 'get nested.name');
      assert.equal(
        Ember.get(doubleNested, 'name'),
        'The Vanishing dunno',
        'get nested.nested.name'
      );

      Ember.run(function() {
        return _this42.store.push({
          data: {
            id: 'isbn:9780439708180',
            type: 'com.example.bookstore.Book',
            attributes: {
              name: "Harry Potter and the Sorcerer's Stone",
              number: 0,
              nextChapter: {
                name: 'The Boy Who Lived',
                number: 1,
                nextChapter: {
                  name: 'The Vanishing Glass',
                  number: 2,
                },
              },
            },
          },
        });
      });

      assert.deepEqual(
        (0, _lodash.zip)(
          propChange.thisValues.map(function(x) {
            return x + '';
          }),
          propChange.args
        ),
        [[nested + '', ['name']], [doubleNested + '', ['name']]],
        'property changes are called for changed attributes on nested models, but not for unchanged attributes'
      );
    });

    (0, _qunit.test)('nested model updates null -> model', function(assert) {
      var _this43 = this;

      var init = this.sinon.spy(_model.default.prototype, 'init');
      var propChange = this.sinon.spy(_model.default.prototype, 'notifyPropertyChange');

      var model = Ember.run(function() {
        return _this43.store.push({
          data: {
            id: 'isbn:9780439708180',
            type: 'com.example.bookstore.Book',
            attributes: {
              name: "Harry Potter and the Sorcerer's Stone",
            },
          },
        });
      });

      assert.equal(
        Ember.get(model, 'name'),
        "Harry Potter and the Sorcerer's Stone",
        'property get as expected'
      );
      assert.equal(init.callCount, 1, 'one model is initially created');

      Ember.run(function() {
        return _this43.store.push({
          data: {
            id: 'isbn:9780439708180',
            type: 'com.example.bookstore.Book',
            attributes: {
              name: "Harry Potter and the Sorcerer's Stone",
              nextChapter: {
                name: 'The Boy Who Lived',
              },
            },
          },
        });
      });

      assert.equal(init.callCount, 1, 'nested models are not eaagerly created from changes');
      assert.deepEqual(
        (0, _lodash.zip)(
          propChange.thisValues.map(function(x) {
            return x + '';
          }),
          propChange.args
        ),
        [[model + '', ['nextChapter']]],
        'nested model from null is treated as a change'
      );

      assert.equal(
        Ember.get(model, 'nextChapter.name'),
        'The Boy Who Lived',
        'nested model attrs set'
      );
      assert.equal(init.callCount, 2, 'nested models are lazily created');
    });

    (0, _qunit.test)('nested model updates primitive -> model', function(assert) {
      var _this44 = this;

      var init = this.sinon.spy(_model.default.prototype, 'init');
      var propChange = this.sinon.spy(_model.default.prototype, 'notifyPropertyChange');

      var model = Ember.run(function() {
        return _this44.store.push({
          data: {
            id: 'isbn:9780439708180',
            type: 'com.example.bookstore.Book',
            attributes: {
              name: "Harry Potter and the Sorcerer's Stone",
              nextChapter: 'The Boy Who Lived',
            },
          },
        });
      });

      assert.equal(
        Ember.get(model, 'name'),
        "Harry Potter and the Sorcerer's Stone",
        'get model.property'
      );
      assert.equal(Ember.get(model, 'nextChapter'), 'The Boy Who Lived', 'get model.nested');
      assert.equal(init.callCount, 1, 'one model is initially created');

      Ember.run(function() {
        return _this44.store.push({
          data: {
            id: 'isbn:9780439708180',
            type: 'com.example.bookstore.Book',
            attributes: {
              name: "Harry Potter and the Sorcerer's Stone",
              nextChapter: {
                name: 'The Boy Who Lived',
              },
            },
          },
        });
      });

      assert.equal(init.callCount, 1, 'nested models are not eaagerly created from changes');
      assert.deepEqual(
        (0, _lodash.zip)(
          propChange.thisValues.map(function(x) {
            return x + '';
          }),
          propChange.args
        ),
        [[model + '', ['nextChapter']]],
        'nested model from null is treated as a change'
      );

      assert.equal(
        Ember.get(model, 'nextChapter.name'),
        'The Boy Who Lived',
        'get model.nested.name'
      );
      assert.equal(init.callCount, 2, 'nested models are lazily created');
    });

    (0, _qunit.test)('nested model updates model -> null (model reified)', function(assert) {
      var _this45 = this;

      var init = this.sinon.spy(_model.default.prototype, 'init');
      var propChange = this.sinon.spy(_model.default.prototype, 'notifyPropertyChange');

      var model = Ember.run(function() {
        return _this45.store.push({
          data: {
            id: 'isbn:9780439708180',
            type: 'com.example.bookstore.Book',
            attributes: {
              name: "Harry Potter and the Sorcerer's Stone",
              nextChapter: {
                name: 'The Boy Who Lived',
              },
            },
          },
        });
      });

      assert.equal(Ember.get(model, 'nextChapter.name'), 'The Boy Who Lived', 'get model.nested');
      assert.equal(init.callCount, 2, 'nested models created');

      Ember.run(function() {
        return _this45.store.push({
          data: {
            id: 'isbn:9780439708180',
            type: 'com.example.bookstore.Book',
            attributes: {
              name: "Harry Potter and the Sorcerer's Stone",
              nextChapter: null,
            },
          },
        });
      });

      assert.equal(init.callCount, 2, 'no additional models created');
      assert.deepEqual(
        (0, _lodash.zip)(
          propChange.thisValues.map(function(x) {
            return x + '';
          }),
          propChange.args
        ),
        [[model + '', ['nextChapter']]],
        'nested model -> null is a change'
      );

      assert.equal(Ember.get(model, 'nextChapter.name'), undefined, 'nested model cleared');
    });

    (0, _qunit.test)('nested model updates model -> primitive', function(assert) {
      var _this46 = this;

      var init = this.sinon.spy(_model.default.prototype, 'init');
      var propChange = this.sinon.spy(_model.default.prototype, 'notifyPropertyChange');

      var model = Ember.run(function() {
        return _this46.store.push({
          data: {
            id: 'isbn:9780439708180',
            type: 'com.example.bookstore.Book',
            attributes: {
              name: "Harry Potter and the Sorcerer's Stone",
              nextChapter: {
                name: 'The Boy Who Lived',
              },
            },
          },
        });
      });

      assert.equal(Ember.get(model, 'nextChapter.name'), 'The Boy Who Lived', 'get model.nested');
      assert.equal(init.callCount, 2, 'nested models created');

      Ember.run(function() {
        return _this46.store.push({
          data: {
            id: 'isbn:9780439708180',
            type: 'com.example.bookstore.Book',
            attributes: {
              name: "Harry Potter and the Sorcerer's Stone",
              nextChapter: 'The Boy Who Lived',
            },
          },
        });
      });

      assert.equal(init.callCount, 2, 'no additional models created');
      assert.deepEqual(
        (0, _lodash.zip)(
          propChange.thisValues.map(function(x) {
            return x + '';
          }),
          propChange.args
        ),
        [[model + '', ['nextChapter']]],
        'nested model -> primitive is a change'
      );

      assert.equal(
        Ember.get(model, 'nextChapter'),
        'The Boy Who Lived',
        'nested model -> primitive'
      );
    });

    (0, _qunit.test)('nested model updates model -> null (model inert)', function(assert) {
      var _this47 = this;

      var init = this.sinon.spy(_model.default.prototype, 'init');
      var propChange = this.sinon.spy(_model.default.prototype, 'notifyPropertyChange');

      var model = Ember.run(function() {
        return _this47.store.push({
          data: {
            id: 'isbn:9780439708180',
            type: 'com.example.bookstore.Book',
            attributes: {
              name: "Harry Potter and the Sorcerer's Stone",
              nextChapter: {
                name: 'The Boy Who Lived',
              },
            },
          },
        });
      });

      assert.equal(init.callCount, 1, 'one model initially created');

      Ember.run(function() {
        return _this47.store.push({
          data: {
            id: 'isbn:9780439708180',
            type: 'com.example.bookstore.Book',
            attributes: {
              name: "Harry Potter and the Sorcerer's Stone",
              nextChapter: null,
            },
          },
        });
      });

      assert.equal(init.callCount, 1, 'no additional models created');
      assert.deepEqual(
        (0, _lodash.zip)(
          propChange.thisValues.map(function(x) {
            return x + '';
          }),
          propChange.args
        ),
        [[model + '', ['nextChapter']]],
        'nested model -> null is a change'
      );

      assert.equal(Ember.get(model, 'nextChapter.name'), undefined, 'nested model not set');
      assert.equal(init.callCount, 1, 'no additional models created');
    });

    (0,
    _qunit.test)('nested model updates with no changes except changed type (reified)', function(assert) {
      var _this48 = this;

      var init = this.sinon.spy(_model.default.prototype, 'init');
      var propChange = this.sinon.spy(_model.default.prototype, 'notifyPropertyChange');

      var model = Ember.run(function() {
        return _this48.store.push({
          data: {
            id: 'isbn:9780439708180',
            type: 'com.example.bookstore.Book',
            attributes: {
              name: "Harry Potter and the Sorcerer's Stone",
              nextPart: {
                name: 'The Boy Who Lived',
                number: 1,
                type: 'com.example.bookstore.Chapter',
              },
            },
          },
        });
      });

      Ember.get(model, 'nextPart');

      assert.equal(init.callCount, 2, 'two models are created initially');

      Ember.run(function() {
        return _this48.store.push({
          data: {
            id: 'isbn:9780439708180',
            type: 'com.example.bookstore.Book',
            attributes: {
              name: "Harry Potter and the Sorcerer's Stone",
              nextPart: {
                name: 'The Boy Who Lived',
                number: 1,
                type: 'com.example.bookstore.Prologue',
              },
            },
          },
        });
      });

      Ember.get(model, 'nextPart');

      assert.equal(init.callCount, 3, 'new model has been created for the update');
      assert.deepEqual(
        (0, _lodash.zip)(
          propChange.thisValues.map(function(x) {
            return x + '';
          }),
          propChange.args
        ),
        [[model + '', ['nextPart']]],
        'nested model change has been triggered if type has changed'
      );
    });

    (0, _qunit.test)('nested model updates with no changes except id (reified)', function(assert) {
      var _this49 = this;

      var init = this.sinon.spy(_model.default.prototype, 'init');
      var propChange = this.sinon.spy(_model.default.prototype, 'notifyPropertyChange');

      var model = Ember.run(function() {
        return _this49.store.push({
          data: {
            id: 'isbn:9780439708180',
            type: 'com.example.bookstore.Book',
            attributes: {
              name: "Harry Potter and the Sorcerer's Stone",
              nextChapter: {
                id: 1,
                name: 'The Boy Who Lived',
                type: 'com.example.bookstore.Chapter',
              },
            },
          },
        });
      });

      Ember.get(model, 'nextChapter');

      assert.equal(init.callCount, 2, 'two models are created initially');

      Ember.run(function() {
        return _this49.store.push({
          data: {
            id: 'isbn:9780439708180',
            type: 'com.example.bookstore.Book',
            attributes: {
              name: "Harry Potter and the Sorcerer's Stone",
              nextChapter: {
                id: 2,
                name: 'The Boy Who Lived',
                type: 'com.example.bookstore.Chapter',
              },
            },
          },
        });
      });

      Ember.get(model, 'nextChapter');

      assert.equal(init.callCount, 3, 'new model has been created for the update');
      assert.deepEqual(
        (0, _lodash.zip)(
          propChange.thisValues.map(function(x) {
            return x + '';
          }),
          propChange.args
        ),
        [[model + '', ['nextChapter']]],
        'nested model change has been triggered if id has changed'
      );
    });

    (0,
    _qunit.test)('nested model updates with no changes and id = null (reified)', function(assert) {
      var _this50 = this;

      var init = this.sinon.spy(_model.default.prototype, 'init');
      var propChange = this.sinon.spy(_model.default.prototype, 'notifyPropertyChange');

      var model = Ember.run(function() {
        return _this50.store.push({
          data: {
            id: 'isbn:9780439708180',
            type: 'com.example.bookstore.Book',
            attributes: {
              name: "Harry Potter and the Sorcerer's Stone",
              nextChapter: {
                id: null,
                name: 'The Boy Who Lived',
                type: 'com.example.bookstore.Chapter',
              },
            },
          },
        });
      });

      Ember.get(model, 'nextChapter');

      assert.equal(init.callCount, 2, 'two models are created initially');

      Ember.run(function() {
        return _this50.store.push({
          data: {
            id: 'isbn:9780439708180',
            type: 'com.example.bookstore.Book',
            attributes: {
              name: "Harry Potter and the Sorcerer's Stone",
              nextChapter: {
                id: null,
                name: 'The Boy Who Lived',
                type: 'com.example.bookstore.Chapter',
              },
            },
          },
        });
      });

      Ember.get(model, 'nextChapter');

      assert.equal(init.callCount, 2, 'no new models should be created');
      assert.deepEqual(
        (0, _lodash.zip)(
          propChange.thisValues.map(function(x) {
            return x + '';
          }),
          propChange.args
        ),
        [],
        'no property change should be triggered'
      );
    });
    (0, _qunit.test)('nested model updates with no changes (model inert)', function(assert) {
      var _this51 = this;

      var init = this.sinon.spy(_model.default.prototype, 'init');
      var propChange = this.sinon.spy(_model.default.prototype, 'notifyPropertyChange');

      var model = Ember.run(function() {
        return _this51.store.push({
          data: {
            id: 'isbn:9780439708180',
            type: 'com.example.bookstore.Book',
            attributes: {
              name: "Harry Potter and the Sorcerer's Stone",
              nextChapter: {
                name: 'The Boy Who Lived',
                number: 1,
              },
            },
          },
        });
      });

      assert.equal(init.callCount, 1, 'one model initially created');

      Ember.run(function() {
        return _this51.store.push({
          data: {
            id: 'isbn:9780439708180',
            type: 'com.example.bookstore.Book',
            attributes: {
              name: "Harry Potter and the Sorcerer's Stone",
              nextChapter: {
                name: 'The Boy Who Lived',
                number: 1,
              },
            },
          },
        });
      });

      assert.equal(init.callCount, 1, 'no additional models created');
      assert.deepEqual(
        (0, _lodash.zip)(
          propChange.thisValues.map(function(x) {
            return x + '';
          }),
          propChange.args
        ),
        [[model + '', ['nextChapter']]],
        'nested pojo -> pojo change is not triggered if the values are the same'
      );
    });

    (0, _qunit.test)('nested model updates with no changes (model reifed)', function(assert) {
      var _this52 = this;

      var init = this.sinon.spy(_model.default.prototype, 'init');
      var propChange = this.sinon.spy(_model.default.prototype, 'notifyPropertyChange');

      var model = Ember.run(function() {
        return _this52.store.push({
          data: {
            id: 'isbn:9780439708180',
            type: 'com.example.bookstore.Book',
            attributes: {
              name: "Harry Potter and the Sorcerer's Stone",
              nextChapter: {
                name: 'The Boy Who Lived',
                number: 1,
              },
            },
          },
        });
      });

      // trigger nested model creation
      Ember.get(model, 'nextChapter.name');

      assert.equal(init.callCount, 2, 'one nested model initially created');

      Ember.run(function() {
        return _this52.store.push({
          data: {
            id: 'isbn:9780439708180',
            type: 'com.example.bookstore.Book',
            attributes: {
              name: "Harry Potter and the Sorcerer's Stone",
              nextChapter: {
                name: 'The Boy Who Lived',
                number: 1,
              },
            },
          },
        });
      });

      assert.equal(init.callCount, 2, 'no additional models created');
      assert.deepEqual(
        (0, _lodash.zip)(
          propChange.thisValues.map(function(x) {
            return x + '';
          }),
          propChange.args
        ),
        [],
        'nested pojo -> pojo change is not triggered if the values are the same and the nested model is reified'
      );
    });

    (0, _qunit.test)('nested array attribute changes are properly detected', function(assert) {
      var _this53 = this;

      var init = this.sinon.spy(_model.default.prototype, 'init');
      var propChange = this.sinon.spy(_model.default.prototype, 'notifyPropertyChange');

      var model = Ember.run(function() {
        return _this53.store.push({
          data: {
            id: 'isbn:9780439708180',
            type: 'com.example.bookstore.Book',
            attributes: {
              name: "Harry Potter and the Sorcerer's Stone",
              chapters: [
                {
                  name: 'The Boy Who Lived',
                },
                {
                  name: 'The Vanishing Glass',
                },
              ],
            },
          },
        });
      });

      var childModel = Ember.get(model, 'chapters')[1];
      assert.equal(init.callCount, 3, 'nested models in arrays are eagerly reified');

      Ember.run(function() {
        return _this53.store.push({
          data: {
            id: 'isbn:9780439708180',
            type: 'com.example.bookstore.Book',
            attributes: {
              name: "Harry Potter and the Sorcerer's Stone",
              chapters: [
                {
                  name: 'The Boy Who Lived',
                },
                {
                  name: 'The Vanishing Glass',
                },
              ],
            },
          },
        });
      });

      assert.equal(init.callCount, 3, 'no additional models created');
      assert.deepEqual(
        (0, _lodash.zip)(
          propChange.thisValues.map(function(x) {
            return x + '';
          }),
          propChange.args
        ),
        [[model + '', ['chapters']]],
        'nested array -> array change even if the values are deep equal'
      );

      assert.notEqual(
        Ember.get(model, 'chapters').content[1],
        childModel,
        'previous nested models in arrays are not re-used'
      );
      assert.equal(init.callCount, 5, 'nested models in arrays are not re-used');
    });

    (0,
    _qunit.test)(".serialize serializers with the user's -ember-m3 serializer", function(assert) {
      var _this54 = this;

      assert.expect(4);

      this.owner.register(
        'serializer:-ember-m3',
        Ember.Object.extend({
          serialize: function serialize(snapshot, options) {
            assert.deepEqual(
              options,
              { some: 'options' },
              'options are passed through to serialize'
            );
            assert.equal(snapshot.attr('name'), 'The Winds of Winter', 'attr - name');
            assert.equal(
              snapshot.attr('estimatedPubDate'),
              'January 2622',
              'attr - estimatedPubDate'
            );

            var eachAttrCBCalls = [];
            snapshot.eachAttribute(function(key) {
              return eachAttrCBCalls.push(key);
            });

            assert.deepEqual(
              eachAttrCBCalls.sort(),
              ['estimatedPubDate', 'name', 'newAttr'],
              'eachAttribute iterates each attribute'
            );
          },
        })
      );

      var model = Ember.run(function() {
        return _this54.store.push({
          data: {
            id: 1,
            type: 'com.example.bookstore.Book',
            attributes: {
              name: 'The Winds of Winter',
              estimatedPubDate: 'January 2622',
            },
          },
        });
      });

      Ember.run(function() {
        Ember.set(model, 'newAttr', 'newAttrValue');
      });

      return model.serialize({ some: 'options' });
    });

    (0, _qunit.test)('.unloadRecord works', function(assert) {
      var _this55 = this;

      var model = Ember.run(function() {
        return _this55.store.push({
          data: {
            id: 1,
            type: 'com.example.bookstore.Book',
            attributes: {
              name: 'The Winds of Winter',
            },
          },
        });
      });

      assert.equal(
        this.store.hasRecordForId('com.example.bookstore.book', '1'),
        true,
        'record in identity map'
      );
      Ember.run(function() {
        return model.unloadRecord();
      });
      assert.equal(
        this.store.hasRecordForId('com.example.bookstore.book', '1'),
        false,
        'gone from identity map'
      );
    });

    (0, _qunit.test)('.unloadRecord updates reference record arrays', function(assert) {
      var _this56 = this;

      var model = Ember.run(function() {
        return _this56.store.push({
          data: {
            id: 'isbn:9780439708180',
            type: 'com.example.bookstore.Book',
            attributes: {
              name: "Harry Potter and the Sorcerer's Stone",
              pubDate: 'September 1989',
              '*relatedBooks': ['isbn:9780439064873', 'isbn:9780439136365'],
            },
          },
          included: [
            {
              id: 'isbn:9780439064873',
              type: 'com.example.bookstore.Book',
              attributes: {
                name: 'Harry Potter and the Chamber of Secrets',
              },
            },
            {
              id: 'isbn:9780439136365',
              type: 'com.example.bookstore.Book',
              attributes: {
                name: 'Harry Potter and the Prisoner of Azkaban',
              },
            },
            {
              id: 'isbn:9780439358071',
              type: 'com.example.bookstore.Book',
              attributes: {
                name: 'Harry Potter and the Order of the Phoenix',
              },
            },
          ],
        });
      });

      var bookAlreadyInArray = this.store.peekRecord(
        'com.example.bookstore.Book',
        'isbn:9780439064873'
      );
      var existingBookNotInArray = this.store.peekRecord(
        'com.example.bookstore.Book',
        'isbn:9780439358071'
      );
      var newBook = Ember.run(function() {
        return _this56.store.createRecord('com.example.bookstore.Book', {
          name: 'Harry Potter and the M3 RecordArray management',
        });
      });

      assert.deepEqual(
        model.get('relatedBooks').mapBy('name'),
        ['Harry Potter and the Chamber of Secrets', 'Harry Potter and the Prisoner of Azkaban'],
        'initial state as expected'
      );

      Ember.run(function() {
        return bookAlreadyInArray.unloadRecord();
      });
      assert.deepEqual(
        model.get('relatedBooks').mapBy('name'),
        ['Harry Potter and the Prisoner of Azkaban'],
        'existing record in array unloaded'
      );

      Ember.run(function() {
        return model.get('relatedBooks').pushObject(existingBookNotInArray);
      });
      assert.deepEqual(
        model.get('relatedBooks').mapBy('name'),
        ['Harry Potter and the Prisoner of Azkaban', 'Harry Potter and the Order of the Phoenix'],
        'existing record added to array'
      );

      Ember.run(function() {
        return existingBookNotInArray.unloadRecord();
      });
      assert.deepEqual(
        model.get('relatedBooks').mapBy('name'),
        ['Harry Potter and the Prisoner of Azkaban'],
        'existing record not initially in array unloaded'
      );

      Ember.run(function() {
        return model.get('relatedBooks').pushObject(newBook);
      });
      assert.deepEqual(
        model.get('relatedBooks').mapBy('name'),
        [
          'Harry Potter and the Prisoner of Azkaban',
          'Harry Potter and the M3 RecordArray management',
        ],
        'new record added to array'
      );

      Ember.run(function() {
        newBook.deleteRecord();
        newBook.unloadRecord();
      });
      assert.deepEqual(
        model.get('relatedBooks').mapBy('name'),
        ['Harry Potter and the Prisoner of Azkaban'],
        'new record destroyed'
      );
    });

    (0, _qunit.test)('.unloadRecord on a nested model warns and does not error', function(assert) {
      var _this57 = this;

      var model = Ember.run(function() {
        return _this57.store.push({
          data: {
            id: '1',
            type: 'com.example.bookstore.Book',
            attributes: {
              name: 'The Winds of Winter',
              relatedToAuthor: {
                id: 'urn:author:2',
                type: 'com.example.bookstore.RelatedLink',
                relation: 'Presumptive author',
              },
            },
          },
        });
      });

      var nestedModel = model.get('relatedToAuthor');

      assert.equal(
        this.store.hasRecordForId('com.example.bookstore.book', '1'),
        true,
        'record in identity map'
      );
      assert.equal(
        this.store.hasRecordForId('com.example.bookstore.RelatedLink', 'urn:author:2'),
        false,
        'nested record do not appear in identity map'
      );

      // This is how to assert via workmanw/ember-qunit-assert-helpers but this
      // helper does not prevent the warning from hitting the console
      //
      // assert.expectNoWarning();
      // nestedModel.unloadRecord();
      // assert.expectWarning(`Nested models cannot be directly unloaded.  Perhaps you meant to unload the top level model, 'com.example.bookstore.book:1'`);

      var warnSpy = this.sinon.stub(Ember, 'warn');
      nestedModel.unloadRecord();
      assert.deepEqual(
        (0, _lodash.zip)(
          warnSpy.thisValues.map(function(x) {
            return x + '';
          }),
          warnSpy.args
        ),
        [
          [
            'Ember',
            [
              "Nested models cannot be directly unloaded.  Perhaps you meant to unload the top level model, 'com.example.bookstore.book:1'",
              false,
              { id: 'ember-m3.nested-model-unloadRecord' },
            ],
          ],
        ]
      );
      assert.equal(
        this.store.hasRecordForId('com.example.bookstore.book', '1'),
        true,
        '"unloading" nested model has no effect on either it or parent model'
      );
    });

    (0, _qunit.test)('store.findRecord', function(assert) {
      var _this58 = this;

      assert.expect(5);

      this.owner.register(
        'adapter:-ember-m3',
        Ember.Object.extend({
          findRecord: function findRecord(store, modelClass, id, snapshot) {
            // TODO: this is annoying but name normalization means we get the wrong
            // model name in snapshots.  Should fix this upstream by dropping name
            // normalization.  See #11
            assert.equal(snapshot.modelName, 'com.example.bookstore.book', 'snapshot.modelName');
            assert.equal(modelClass, _model.default);
            assert.equal(id, 'isbn:9780439708180', 'findRecord(id)');

            return Ember.RSVP.Promise.resolve({
              data: {
                id: 'isbn:9780439708180',
                type: 'com.example.bookstore.Book',
              },
            });
          },
        })
      );

      return Ember.run(function() {
        return _this58.store
          .findRecord('com.example.bookstore.Book', 'isbn:9780439708180')
          .then(function(model) {
            assert.equal(model.get('id'), 'isbn:9780439708180', 'model.id');
            assert.equal(model.constructor, _model.default, 'model.constructor');
          });
      });
    });

    (0, _qunit.test)('store.deleteRecord', function(assert) {
      var _this59 = this;

      var model = Ember.run(function() {
        return _this59.store.push({
          data: {
            id: 'isbn:9780439708180',
            type: 'com.example.bookstore.Book',
          },
        });
      });

      assert.equal(
        this.store.hasRecordForId('com.example.bookstore.Book', 'isbn:9780439708180'),
        true,
        'model present'
      );
      Ember.run(function() {
        _this59.store.deleteRecord(model);
        _this59.store.unloadRecord(model);
      });
      assert.equal(
        this.store.hasRecordForId('com.example.bookstore.Book', 'isbn:9780439708180'),
        false,
        'model gone'
      );

      assert.equal(model.get('isDestroyed'), true, 'model.isDestroyed');
    });

    (0, _qunit.test)('store.findAll', function(assert) {
      var _this60 = this;

      assert.expect(4);

      this.owner.register(
        'adapter:-ember-m3',
        Ember.Object.extend({
          shouldReloadAll: function shouldReloadAll() {
            return true;
          },
          findAll: function findAll(store, modelClass) {
            assert.equal(modelClass, _model.default);

            return Ember.RSVP.Promise.resolve({
              data: [
                {
                  id: 'isbn:9780439708180',
                  type: 'com.example.bookstore.book',
                },
                {
                  id: 'isbn:9780439064873',
                  type: 'com.example.bookstore.book',
                },
              ],
            });
          },
        })
      );

      return Ember.run(function() {
        return _this60.store.findAll('com.example.bookstore.book').then(function(models) {
          assert.deepEqual(
            models.mapBy('id'),
            ['isbn:9780439708180', 'isbn:9780439064873'],
            'models.[id]'
          );
          assert.deepEqual(
            models.mapBy('constructor'),
            [_model.default, _model.default],
            'models.[constructor]'
          );

          _this60.store.push({
            data: {
              id: 'isbn:9780439136365',
              type: 'com.example.bookstore.book',
            },
          });

          assert.deepEqual(
            models.mapBy('id'),
            ['isbn:9780439708180', 'isbn:9780439064873'],
            'models.[id]'
          );
        });
      });
    });

    (0, _qunit.test)('store.query', function(assert) {
      var _this61 = this;

      assert.expect(5);

      this.owner.register(
        'adapter:-ember-m3',
        Ember.Object.extend({
          shouldReloadAll: function shouldReloadAll() {
            return true;
          },
          query: function query(store, modelClass, _query /*, recordArray */) {
            assert.equal(modelClass, _model.default, 'modelClass arg');
            assert.deepEqual(_query, { author: 'JK Rowling' }, 'query arg');

            return Ember.RSVP.Promise.resolve({
              data: [
                {
                  id: 'isbn:9780439708180',
                  type: 'com.example.bookstore.book',
                },
                {
                  id: 'isbn:9780439064873',
                  type: 'com.example.bookstore.book',
                },
              ],
            });
          },
        })
      );

      return Ember.run(function() {
        return _this61.store
          .query('com.example.bookstore.book', { author: 'JK Rowling' })
          .then(function(models) {
            assert.deepEqual(
              models.mapBy('id'),
              ['isbn:9780439708180', 'isbn:9780439064873'],
              'models.[id]'
            );
            assert.deepEqual(
              models.mapBy('constructor'),
              [_model.default, _model.default],
              'models.[constructor]'
            );

            _this61.store.push({
              data: {
                id: 'isbn:9780439136365',
                type: 'com.example.bookstore.book',
              },
            });

            assert.deepEqual(
              models.mapBy('id'),
              ['isbn:9780439708180', 'isbn:9780439064873'],
              'models.[id]'
            );
          });
      });
    });

    (0, _qunit.test)('store.queryRecord', function(assert) {
      var _this62 = this;

      assert.expect(4);

      this.owner.register(
        'adapter:-ember-m3',
        Ember.Object.extend({
          shouldReloadAll: function shouldReloadAll() {
            return true;
          },
          queryRecord: function queryRecord(store, modelClass, query) {
            assert.equal(modelClass, _model.default, 'modelClass arg');
            assert.deepEqual(query, { author: 'JK Rowling' }, 'query arg');

            return Ember.RSVP.Promise.resolve({
              data: {
                id: 'isbn:9780439708180',
                type: 'com.example.bookstore.book',
              },
            });
          },
        })
      );

      return Ember.run(function() {
        return _this62.store
          .queryRecord('com.example.bookstore.book', { author: 'JK Rowling' })
          .then(function(model) {
            assert.equal(model.get('id'), 'isbn:9780439708180', 'model.id');
            assert.equal(model.constructor, _model.default, 'model.constructor');
          });
      });
    });

    (0, _qunit.test)('store.unloadRecord', function(assert) {
      var _this63 = this;

      Ember.run(function() {
        _this63.store.push({
          data: {
            id: 'isbn:9780439136365',
            type: 'com.example.bookstore.book',
          },
        });

        assert.equal(
          _this63.store.hasRecordForId('com.example.bookstore.book', 'isbn:9780439136365'),
          true,
          'book in store'
        );
        var model = _this63.store.peekRecord('com.example.bookstore.book', 'isbn:9780439136365');
        _this63.store.unloadRecord(model);
      });

      assert.equal(
        this.store.hasRecordForId('com.example.bookstore.book', 'isbn:9780439136365'),
        false,
        'book unloaded'
      );
    });

    (0, _qunit.test)('store.getReference', function(assert) {
      var _this64 = this;

      assert.expect(10);

      this.owner.register(
        'adapter:-ember-m3',
        Ember.Object.extend({
          findRecord: function findRecord(store, modelClass, id, snapshot) {
            assert.equal(snapshot.modelName, 'com.example.bookstore.book', 'snapshot.modelName');
            assert.equal(modelClass, _model.default);
            assert.equal(id, 'isbn:9780439708180', 'findRecord(id)');

            return Ember.RSVP.Promise.resolve({
              data: {
                id: 'isbn:9780439708180',
                type: 'com.example.bookstore.Book',
              },
            });
          },
        })
      );

      Ember.run(function() {
        var ref = _this64.store.getReference('com.example.bookstore.book', 'isbn:9780439708180');

        return ref
          .load()
          .then(function(model) {
            assert.deepEqual(model.get('id'), 'isbn:9780439708180', 'ref.load(x => x.id)');
            assert.deepEqual(model.constructor, _model.default, 'ref.load(x => x.constructor)');

            return ref.reload();
          })
          .then(function(model) {
            assert.deepEqual(model.get('id'), 'isbn:9780439708180', 'ref.reload(x => x.id)');
            assert.deepEqual(model.constructor, _model.default, 'ref.reload(x => x.constructor)');
          });
      });
    });

    (0, _qunit.test)('store.hasRecordForId', function(assert) {
      var _this65 = this;

      return Ember.run(function() {
        _this65.store.push({
          data: {
            id: 'isbn:9780439708180',
            type: 'com.example.bookstore.Book',
          },
        });

        assert.equal(
          _this65.store.hasRecordForId('com.example.bookstore.Book', 'isbn:9780439708180'),
          true,
          'store has model'
        );
        assert.equal(
          _this65.store.hasRecordForId('com.example.bookstore.Book', 'isbn:12345'),
          false,
          'store does not have model'
        );
      });
    });

    (0, _qunit.test)('store.modelFor', function(assert) {
      var bookModel = this.store.modelFor('com.example.bookstore.Book');
      var chapterModel = this.store.modelFor('com.example.bookstore.Chapter');
      var authorModel = this.store.modelFor('author');

      assert.equal(authorModel, this.Author, 'modelFor DS.Model');
      assert.equal(bookModel, _model.default, 'modelFor schema-matching');
      assert.equal(chapterModel, _model.default, 'modelFor other schema-matching');
    });

    (0, _qunit.test)('store.peekAll', function(assert) {
      var _this66 = this;

      Ember.run(function() {
        _this66.store.push({
          data: [
            {
              id: 'isbn:9780439708180',
              type: 'com.example.bookstore.Book',
            },
            {
              id: 'isbn:9780439064873',
              type: 'com.example.bookstore.Book',
            },
          ],
        });
      });

      var models = this.store.peekAll('com.example.bookstore.Book');
      assert.deepEqual(
        models.mapBy('id'),
        ['isbn:9780439708180', 'isbn:9780439064873'],
        'store.peekAll().[id]'
      );

      Ember.run(function() {
        _this66.store.push({
          data: {
            id: 'isbn:9780439136365',
            type: 'com.example.bookstore.Book',
          },
        });
      });

      assert.deepEqual(
        models.mapBy('id'),
        ['isbn:9780439708180', 'isbn:9780439064873', 'isbn:9780439136365'],
        'peekAll.[id] live updates'
      );

      Ember.run(function() {
        _this66.store.createRecord('com.example.bookstore.Book', {
          name: 'A History of the English Speaking Peoples Volume I',
        });
      });

      assert.equal(
        models.get('lastObject.name'),
        'A History of the English Speaking Peoples Volume I',
        'peekAll.[prop] live updates'
      );

      // TODO: batch by cacheKeyForType
    });

    (0, _qunit.test)('store.peekAll - grouped by model name', function(assert) {
      var _this67 = this;

      Ember.run(function() {
        _this67.store.push({
          data: [
            {
              id: 'isbn:9780439708180',
              type: 'com.example.bookstore.Book',
            },
            {
              id: 'isbn:9780439708180/chapter/1',
              type: 'com.example.bookstore.Chapter',
            },
            {
              id: 'isbn:9780439064873',
              type: 'com.example.bookstore.Book',
            },
            {
              id: 'isbn:9780439708180/chapter/2',
              type: 'com.example.bookstore.Chapter',
            },
          ],
        });
      });

      var books = this.store.peekAll('com.example.bookstore.Book');
      var chapters = this.store.peekAll('com.example.bookstore.Chapter');

      assert.deepEqual(
        books.mapBy('id'),
        ['isbn:9780439708180', 'isbn:9780439064873'],
        'store.peekAll().[id]'
      );
      assert.deepEqual(
        chapters.mapBy('id'),
        ['isbn:9780439708180/chapter/1', 'isbn:9780439708180/chapter/2'],
        'store.peekAll groups by modelName'
      );
    });

    (0, _qunit.test)('store.peekRecord', function(assert) {
      var _this68 = this;

      Ember.run(function() {
        _this68.store.push({
          data: [
            {
              id: 'isbn:9780439708180',
              type: 'com.example.bookstore.Book',
            },
            {
              id: 'isbn:9780439708180/chapter/1',
              type: 'com.example.bookstore.Chapter',
            },
            {
              id: 'isbn:9780439064873',
              type: 'com.example.bookstore.Book',
            },
            {
              id: 'isbn:9780439708180/chapter/2',
              type: 'com.example.bookstore.Chapter',
            },
          ],
        });
      });

      assert.equal(
        Ember.get(this.store.peekRecord('com.example.bookstore.Book', 'isbn:9780439708180'), 'id'),
        'isbn:9780439708180'
      );
      assert.equal(
        Ember.get(this.store.peekRecord('com.example.bookstore.Book', 'isbn:9780439064873'), 'id'),
        'isbn:9780439064873'
      );
      assert.equal(
        this.store.peekRecord('com.example.bookstore.Book', 'isbn:9780439708180/chapter/1'),
        null
      );
      assert.equal(
        this.store.peekRecord('com.example.bookstore.Book', 'isbn:9780439708180/chapter/2'),
        null
      );

      assert.equal(
        Ember.get(
          this.store.peekRecord('com.example.bookstore.Chapter', 'isbn:9780439708180/chapter/1'),
          'id'
        ),
        'isbn:9780439708180/chapter/1'
      );
      assert.equal(
        Ember.get(
          this.store.peekRecord('com.example.bookstore.Chapter', 'isbn:9780439708180/chapter/2'),
          'id'
        ),
        'isbn:9780439708180/chapter/2'
      );
      assert.equal(
        this.store.peekRecord('com.example.bookstore.Chapter', 'isbn:9780439708180'),
        null
      );
      assert.equal(
        this.store.peekRecord('com.example.bookstore.Chapter', 'isbn:9780439064873'),
        null
      );
    });

    (0, _qunit.test)('store.hasRecordForId', function(assert) {
      var _this69 = this;

      Ember.run(function() {
        _this69.store.push({
          data: [
            {
              id: 'isbn:9780439708180',
              type: 'com.example.bookstore.Book',
            },
            {
              id: 'isbn:9780439708180/chapter/1',
              type: 'com.example.bookstore.Chapter',
            },
            {
              id: 'isbn:9780439064873',
              type: 'com.example.bookstore.Book',
            },
            {
              id: 'isbn:9780439708180/chapter/2',
              type: 'com.example.bookstore.Chapter',
            },
          ],
        });
      });

      assert.equal(
        this.store.hasRecordForId('com.example.bookstore.Book', 'isbn:9780439708180'),
        true
      );
      assert.equal(
        this.store.hasRecordForId('com.example.bookstore.Book', 'isbn:9780439064873'),
        true
      );
      assert.equal(
        this.store.hasRecordForId('com.example.bookstore.Book', 'isbn:9780439708180/chapter/1'),
        false
      );
      assert.equal(
        this.store.hasRecordForId('com.example.bookstore.Book', 'isbn:9780439708180/chapter/2'),
        false
      );

      assert.equal(
        this.store.hasRecordForId('com.example.bookstore.Chapter', 'isbn:9780439708180'),
        false
      );
      assert.equal(
        this.store.hasRecordForId('com.example.bookstore.Chapter', 'isbn:9780439064873'),
        false
      );
      assert.equal(
        this.store.hasRecordForId('com.example.bookstore.Chapter', 'isbn:9780439708180/chapter/1'),
        true
      );
      assert.equal(
        this.store.hasRecordForId('com.example.bookstore.Chapter', 'isbn:9780439708180/chapter/2'),
        true
      );
    });

    (0, _qunit.test)('errors is intialized upon creation of the record', function(assert) {
      var _this70 = this;

      var model = Ember.run(function() {
        return _this70.store.push({
          data: {
            id: 'isbn:9780439708180',
            type: 'com.example.bookstore.Book',
            attributes: {
              name: "Harry Potter and the Sorcerer's Stone",
            },
          },
          included: [],
        });
      });

      // Testing errors is getting set and is an instance
      // of DS.Errors
      var errors = Ember.get(model, 'errors');
      assert.ok(errors);
      assert.ok(errors instanceof _emberData.default.Errors);
    });

    (0,
    _qunit.test)('.save errors getting updated via the store and removed upon setting a new value', function(assert) {
      var _this71 = this;

      assert.expect(10);

      var modelName = 'com.example.bookstore.Book';
      this.owner.register(
        'adapter:-ember-m3',
        Ember.Object.extend({
          updateRecord: function updateRecord(store, type, snapshot) {
            assert.equal(snapshot.record.get('isSaving'), true, 'record is saving');
            return Ember.RSVP.Promise.reject(
              new _emberData.default.InvalidError([
                {
                  source: 'estimatedPubDate',
                  detail: 'Please enter valid estimated publish date',
                },
                {
                  source: 'name',
                  detail: 'Please enter valid name',
                },
              ])
            );
          },
        })
      );

      this.owner.register(
        'serializer:-ember-m3',
        Ember.Object.extend({
          extractErrors: function extractErrors(store, typeClass, payload, id) {
            if (
              payload &&
              (typeof payload === 'undefined' ? 'undefined' : _typeof(payload)) === 'object' &&
              payload.errors
            ) {
              var record = store.peekRecord(modelName, id);
              payload.errors.forEach(function(error) {
                if (error.source) {
                  var errorField = error.source;
                  record.get('errors').add(errorField, error.detail);
                }
              });
            }
          },
        })
      );

      var model = Ember.run(function() {
        return _this71.store.push({
          data: {
            id: 1,
            type: modelName,
            attributes: {
              name: 'The Winds of Winter',
              estimatedPubDate: 'January 2622',
            },
          },
        });
      });

      assert.equal(model.get('isSaving'), false, 'initially model not saving');

      Ember.run(function() {
        model.set('estimatedPubDate', '_invalidEstimatedPublishDate');
      });

      // Testing client validation errors getting
      // set upon getting validation errors from API
      return Ember.run(function() {
        return model.save().catch(function() {
          assert.equal(model.get('isSaving'), false, 'model done saving');
          assert.equal(Ember.get(model, 'errors.length'), 2, 'validation errors set');

          var error = Ember.get(model, 'errors.estimatedPubDate');
          assert.ok(Ember.get(model, 'isValid') === false, 'model is not valid');
          assert.equal(
            Ember.get(error, 'firstObject.message'),
            'Please enter valid estimated publish date',
            'error is available'
          );

          //Testing remove errors upon setting a new value
          Ember.run(function() {
            return Ember.set(model, 'estimatedPubDate', 'January 2621');
          });
          assert.equal(
            Ember.get(model, 'errors.length'),
            1,
            'error is removed upon setting new value'
          );
          assert.ok(Ember.get(model, 'isValid') === false, 'model is still not valid');

          Ember.run(function() {
            return Ember.set(model, 'name', 'valid name');
          });
          assert.equal(
            Ember.get(model, 'errors.length'),
            0,
            'error is removed upon setting new value'
          );
          assert.ok(Ember.get(model, 'isValid') === true, 'model is now valid');
        });
      });
    });
  });
});
define('dummy/tests/unit/model/api-test', [
  'qunit',
  'ember-qunit',
  'ember-m3/services/m3-schema',
], function(_qunit, _emberQunit, _m3Schema) {
  'use strict';

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

  (0, _qunit.module)('unit/model/api', function(hooks) {
    (0, _emberQunit.setupTest)(hooks);

    hooks.beforeEach(function() {
      this.store = this.owner.lookup('service:store');

      var TestSchema = (function(_DefaultSchema) {
        _inherits(TestSchema, _DefaultSchema);

        function TestSchema() {
          _classCallCheck(this, TestSchema);

          return _possibleConstructorReturn(
            this,
            (TestSchema.__proto__ || Object.getPrototypeOf(TestSchema)).apply(this, arguments)
          );
        }

        _createClass(TestSchema, [
          {
            key: 'includesModel',
            value: function includesModel() {
              return true;
            },
          },
        ]);

        return TestSchema;
      })(_m3Schema.default);

      this.owner.register('service:m3-schema', TestSchema);
    });

    (0, _qunit.test)('changing an id is not allowed, per ember data', function(assert) {
      this.store.push({
        data: {
          id: 1,
          type: 'com.example.Book',
          attributes: {
            name: 'The Storm Before the Storm',
          },
        },
      });

      var record = this.store.peekRecord('com.example.Book', 1);
      assert.throws(function() {
        record.set('id', 24601);
      }, 'wat');
    });

    (0, _qunit.test)('setting an id to itself is allowed', function(assert) {
      this.store.push({
        data: {
          id: 1,
          type: 'com.example.Book',
          attributes: {
            name: 'The Storm Before the Storm',
          },
        },
      });

      var record = this.store.peekRecord('com.example.Book', 1);
      record.set('id', '1');

      assert.equal(record.id, '1');
    });
  });
});
define('dummy/tests/unit/model/changed-attrs-test', [
  'qunit',
  'ember-qunit',
  'ember-m3/model',
  'ember-m3/record-array',
  'ember-m3/services/m3-schema',
  'ember-m3/-private',
], function(_qunit, _emberQunit, _model, _recordArray, _m3Schema, _private) {
  'use strict';

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

  (0, _qunit.module)('unit/model/changed-attrs', function(hooks) {
    (0, _emberQunit.setupTest)(hooks);

    hooks.beforeEach(function() {
      this.store = this.owner.lookup('service:store');

      var TestSchema = (function(_DefaultSchema) {
        _inherits(TestSchema, _DefaultSchema);

        function TestSchema() {
          _classCallCheck(this, TestSchema);

          return _possibleConstructorReturn(
            this,
            (TestSchema.__proto__ || Object.getPrototypeOf(TestSchema)).apply(this, arguments)
          );
        }

        _createClass(TestSchema, [
          {
            key: 'includesModel',
            value: function includesModel() {
              return true;
            },
          },
          {
            key: 'computeAttributeReference',
            value: function computeAttributeReference(key, value, modelName, schemaInterface) {
              var refValue = schemaInterface.getAttr('*' + key);
              if (typeof refValue === 'string') {
                return {
                  type: null,
                  id: refValue,
                };
              } else if (Array.isArray(refValue)) {
                return refValue.map(function(x) {
                  return {
                    type: null,
                    id: x,
                  };
                });
              }
              return null;
            },
          },
          {
            key: 'computeNestedModel',
            value: function computeNestedModel(key, value) {
              if (
                value &&
                (typeof value === 'undefined' ? 'undefined' : _typeof(value)) === 'object' &&
                value.constructor !== Date &&
                !Ember.isArray(value)
              ) {
                return {
                  type: value.type,
                  id: value.id,
                  attributes: value,
                };
              }
            },
          },
        ]);

        return TestSchema;
      })(_m3Schema.default);

      this.owner.register('service:m3-schema', TestSchema);
    });

    (0, _qunit.test)('.changedAttributes returns the dirty attributes', function(assert) {
      var _this2 = this;

      var model = Ember.run(function() {
        return _this2.store.push({
          data: {
            id: 1,
            type: 'com.example.bookstore.Book',
            attributes: {
              name: 'The Winds of Winter',
              author: 'George R. R. Martin',
              rating: 10,
              expectedPubDate: 'never',
            },
          },
        });
      });
      assert.ok(!model.get('isDirty'), 'model currently not dirty');
      assert.equal(
        model._internalModel.currentState.stateName,
        'root.loaded.saved',
        'model.state loaded.saved'
      );
      Ember.run(function() {
        model.set('name', 'Alice in Wonderland');
        model.set('rating', null);
        model.set('expectedPubDate', undefined);
      });
      assert.ok(model.get('isDirty'), 'model is dirty as new values are set on the model');
      assert.equal(
        model._internalModel.currentState.stateName,
        'root.loaded.updated.uncommitted',
        'model state is updated.uncommitted'
      );
      assert.deepEqual(
        model.changedAttributes(),
        {
          name: ['The Winds of Winter', 'Alice in Wonderland'],
          rating: [10, null],
          expectedPubDate: ['never', undefined],
        },
        'changed attributes should be return as changed'
      );
    });

    (0, _qunit.test)('nested models can report their own changed attributes', function(assert) {
      var _this3 = this;

      var model = Ember.run(function() {
        return _this3.store.push({
          data: {
            id: 1,
            type: 'com.example.bookstore.Book',
            attributes: {
              name: 'The Winds of Winter',
              rating: {
                avg: 10,
              },
            },
          },
        });
      });
      model.set('rating.avg', 11);
      assert.deepEqual(model.get('rating').changedAttributes(), {
        avg: [10, 11],
      });
    });

    (0,
    _qunit.test)('.changedAttributes returns nested dirty attributes within an object', function(assert) {
      var _this4 = this;

      var model = Ember.run(function() {
        return _this4.store.push({
          data: {
            id: 'isbn:9780439708180',
            type: 'com.example.bookstore.Book',
            attributes: {
              name: "Harry Potter and the Sorcerer's Stone",
              number: 0,
              nextChapter: {
                name: 'The Boy Who whatever',
                number: 1,
                nextChapter: {
                  name: 'The Vanishing dunno',
                  number: 2,
                },
              },
              authorNotes: {
                value: 'this book should sell well',
              },
            },
          },
        });
      });

      var nested = Ember.get(model, 'nextChapter');
      var doubleNested = Ember.get(nested, 'nextChapter');

      assert.deepEqual(model.changedAttributes(), {}, 'initially no attributes are changed');
      assert.ok(!model.get('isDirty'), 'model currently not dirty');
      assert.equal(
        model._internalModel.currentState.stateName,
        'root.loaded.saved',
        'model.state loaded.saved'
      );

      Ember.run(function() {
        Ember.set(model, 'name', 'secret book name');
        Ember.set(model, 'newAttr', 'a wild attribute appears!');
      });

      assert.deepEqual(
        model.changedAttributes(),
        {
          name: ["Harry Potter and the Sorcerer's Stone", 'secret book name'],
          newAttr: [undefined, 'a wild attribute appears!'],
        },
        'initially no attributes are changed'
      );

      Ember.run(function() {
        Ember.set(nested, 'name', 'a new chapter name');
        Ember.set(nested, 'newAttr', 'first chapter; new attr!');
        Ember.set(doubleNested, 'number', 24601);
        Ember.set(doubleNested, 'anotherNewAttr', 'another new attr!');
        Ember.set(model, 'authorNotes', { text: 'this book will definitely sell well' });
      });

      assert.deepEqual(
        model.changedAttributes(),
        {
          name: ["Harry Potter and the Sorcerer's Stone", 'secret book name'],
          newAttr: [undefined, 'a wild attribute appears!'],
          nextChapter: {
            name: ['The Boy Who whatever', 'a new chapter name'],
            newAttr: [undefined, 'first chapter; new attr!'],
            nextChapter: {
              number: [2, 24601],
              anotherNewAttr: [undefined, 'another new attr!'],
            },
          },
          authorNotes: [
            { value: 'this book should sell well' },
            { text: 'this book will definitely sell well' },
          ],
        },
        'only changed attributes in nested models are included'
      );
      assert.ok(model.get('isDirty'), 'model is dirty as new values are set on the model');
      assert.equal(
        model._internalModel.currentState.stateName,
        'root.loaded.updated.uncommitted',
        'model state is updated.uncommitted'
      );
    });

    (0,
    _qunit.test)('.changedAttributes returns [ undefined, object ] for newly created nested models', function(assert) {
      var _this5 = this;

      assert.expect(2);

      var model = Ember.run(function() {
        return _this5.store.push({
          data: {
            id: 1,
            type: 'com.example.bookstore.Book',
            attributes: {
              estimatedPubDate: 'January 2622',
            },
          },
        });
      });

      model.set('author', { name: 'Chris' });
      var author = model.get('author');

      assert.deepEqual(
        author.changedAttributes(),
        { name: [undefined, 'Chris'] },
        'Changed attributes for the nested model is correct'
      );
      assert.deepEqual(
        model.changedAttributes(),
        { author: [undefined, { name: [undefined, 'Chris'] }] },
        'Changed attributes for the parent model is correct'
      );
    });

    (0,
    _qunit.test)('.changedAttributes returns [ null, object ] for nested models that were previously set to null by the server', function(assert) {
      var _this6 = this;

      assert.expect(2);

      var model = Ember.run(function() {
        return _this6.store.push({
          data: {
            id: 1,
            type: 'com.example.bookstore.Book',
            attributes: {
              author: null,
              estimatedPubDate: 'January 2622',
            },
          },
        });
      });

      model.set('author', { name: 'Chris' });
      var author = model.get('author');
      assert.deepEqual(
        author.changedAttributes(),
        { name: [undefined, 'Chris'] },
        'Changed attributes for the nested model is correct'
      );
      assert.deepEqual(
        model.changedAttributes(),
        { author: [null, { name: [undefined, 'Chris'] }] },
        'Changed attributes for the parent model is correct'
      );
    });

    (0,
    _qunit.test)('.changedAttributes returns dirty attributes for arrays of primitive values', function(assert) {
      var _this7 = this;

      var model = Ember.run(function() {
        return _this7.store.push({
          data: {
            id: 1,
            type: 'com.example.bookstore.Book',
            attributes: {
              name: 'The Winds of Winter',
              author: 'George R. R. Martin',
              chapters: ['Windy eh', 'I guess winter was coming after all'],
            },
          },
        });
      });
      assert.ok(!model.get('isDirty'), 'model currently not dirty');
      assert.equal(
        model._internalModel.currentState.stateName,
        'root.loaded.saved',
        'model.state loaded.saved'
      );

      Ember.run(function() {
        Ember.set(model, 'chapters', ['so windy', 'winter winter']);
      });

      assert.deepEqual(
        model.changedAttributes(),
        {
          chapters: [
            ['Windy eh', 'I guess winter was coming after all'],
            ['so windy', 'winter winter'],
          ],
        },
        '.changedAttributes returns changed arrays'
      );
      assert.ok(model.get('isDirty'), 'model is dirty as new values are set on the model');
      assert.equal(
        model._internalModel.currentState.stateName,
        'root.loaded.updated.uncommitted',
        'model state is updated.uncommitted'
      );
    });

    (0,
    _qunit.test)('.changedAttributes returns dirty attributes for arrays of primitive values upon updating the array', function(assert) {
      var _this8 = this;

      var model = Ember.run(function() {
        return _this8.store.push({
          data: {
            id: 1,
            type: 'com.example.bookstore.Book',
            attributes: {
              name: 'The Winds of Winter',
              author: 'George R. R. Martin',
              chapters: ['Windy eh', 'I guess winter was coming after all'],
            },
          },
        });
      });
      assert.ok(!model.get('isDirty'), 'model currently not dirty');
      assert.equal(
        model._internalModel.currentState.stateName,
        'root.loaded.saved',
        'model.state loaded.saved'
      );

      // Pushing simple value to array
      var chapters = model.get('chapters');
      Ember.run(function() {
        chapters.pushObject('New Chapter');
      });

      assert.deepEqual(
        model.changedAttributes(),
        {
          chapters: [
            ['Windy eh', 'I guess winter was coming after all'],
            ['Windy eh', 'I guess winter was coming after all', 'New Chapter'],
          ],
        },
        '.changedAttributes returns changed arrays'
      );

      // Pushing simple value to array
      Ember.run(function() {
        chapters.pushObject({
          name: 'Windy eh new',
          number: 1,
        });
      });

      assert.ok(chapters.get('lastObject') instanceof _model.default);
      assert.equal(
        chapters.get('lastObject').get('name'),
        'Windy eh new',
        'new embedded model has right attrs'
      );
      assert.equal(
        chapters.get('lastObject').get('number'),
        1,
        'new embedded model has right attrs'
      );

      // Model is dirty
      assert.ok(model.get('isDirty'), 'model is dirty as new values are set on the model');
      assert.equal(
        model._internalModel.currentState.stateName,
        'root.loaded.updated.uncommitted',
        'model state is updated.uncommitted'
      );
    });

    (0,
    _qunit.test)('.changedAttributes returns dirty attributes for record array upon updating the array', function(assert) {
      var _this9 = this;

      var model = Ember.run(function() {
        return _this9.store.push({
          data: {
            id: 'isbn:9780439708180',
            type: 'com.example.bookstore.Book',
            attributes: {
              name: "Harry Potter and the Sorcerer's Stone",
              '*relatedBooks': ['isbn:9780439064873', 'isbn:9780439136365'],
              '*otherRecordArray': [],
            },
          },
          included: [
            {
              id: 'isbn:9780439064873',
              type: 'com.example.bookstore.Book',
              attributes: {
                name: 'Harry Potter and the Chamber of Secrets',
              },
            },
            {
              id: 'isbn:9780439136365',
              type: 'com.example.bookstore.Book',
              attributes: {
                name: 'Harry Potter and the Prisoner of Azkaban',
              },
            },
          ],
        });
      });

      var otherRecordArray = Ember.get(model, 'otherRecordArray');

      assert.ok(!model.get('isDirty'), 'model currently not dirty');
      assert.equal(
        model._internalModel.currentState.stateName,
        'root.loaded.saved',
        'model.state loaded.saved'
      );

      // Pushing simple value to array
      Ember.run(function() {
        otherRecordArray.pushObject(
          _this9.store.peekRecord('com.example.bookstore.Book', 'isbn:9780439064873')
        );
      });

      assert.ok(
        Ember.get(model.changedAttributes(), 'otherRecordArray'),
        '.changedAttributes returns changed record arrays'
      );

      assert.ok(
        Ember.get(model.changedAttributes(), 'otherRecordArray')[1] instanceof _recordArray.default,
        '.changedAttributes returns changed record arrays and data is instance of RecordArray'
      );

      // Model is dirty
      assert.ok(model.get('isDirty'), 'model is dirty as new values are set on the model');
      assert.equal(
        model._internalModel.currentState.stateName,
        'root.loaded.updated.uncommitted',
        'model state is updated.uncommitted'
      );
    });

    (0,
    _qunit.test)('.changedAttributes returns nested dirty attributes within arrays of nested models', function(assert) {
      var _this10 = this;

      var model = Ember.run(function() {
        return _this10.store.push({
          data: {
            id: 1,
            type: 'com.example.bookstore.Book',
            attributes: {
              name: 'The Winds of Winter',
              author: 'George R. R. Martin',
              chapters: [
                {
                  name: 'Windy eh',
                  number: 1,
                },
                {
                  name: 'I guess winter was coming after all',
                  number: 2,
                },
              ],
              notes: [{ value: 'Unsure if this book will ever be published' }],
            },
          },
        });
      });

      var nestedModels = Ember.get(model, 'chapters');
      Ember.set(nestedModels.get('firstObject'), 'name', 'super windy');

      assert.deepEqual(
        model.changedAttributes(),
        {
          chapters: [
            {
              name: ['Windy eh', 'super windy'],
            },
            undefined,
          ],
        },
        '.changedAttributes returns nested dirty attributes within arrays of nested models'
      );
    });

    (0, _qunit.test)('.rollbackAttributes resets state from dirty (uncached)', function(assert) {
      var _this11 = this;

      var model = Ember.run(function() {
        return _this11.store.push({
          data: {
            id: 1,
            type: 'com.example.bookstore.Book',
            attributes: {
              name: 'The Winds of Winter',
            },
          },
        });
      });

      Ember.run(function() {
        model.set('name', 'Some other book');
      });
      assert.ok(model.get('isDirty'), 'model is dirty as new values are set on the model');
      assert.equal(
        model._internalModel.currentState.stateName,
        'root.loaded.updated.uncommitted',
        'model state is updated.uncommitted'
      );

      Ember.run(function() {
        model.rollbackAttributes();
      });

      assert.ok(!model.get('isDirty'), 'model currently not dirty');
      assert.equal(
        model._internalModel.currentState.stateName,
        'root.loaded.saved',
        'after rolling back model.state loaded.saved'
      );
      assert.equal(
        Ember.get(model, 'name'),
        'The Winds of Winter',
        'rollbackAttributes reverts changes to the record'
      );
    });

    (0, _qunit.test)('.rollbackAttributes resets state from dirty (cached)', function(assert) {
      var _this12 = this;

      var model = Ember.run(function() {
        return _this12.store.push({
          data: {
            id: 1,
            type: 'com.example.bookstore.Book',
            attributes: {
              name: 'The Winds of Winter',
            },
          },
        });
      });

      Ember.run(function() {
        model.set('name', 'Some other book');
        // cache new value in resolution cache
        assert.equal(
          Ember.get(model, 'name'),
          'Some other book',
          'value is set correctly (and cached)'
        );

        model.rollbackAttributes();
      });

      assert.equal(
        Ember.get(model, 'currentState.stateName'),
        'root.loaded.saved',
        'after rolling back model.state loaded.saved'
      );
      assert.equal(
        Ember.get(model, 'name'),
        'The Winds of Winter',
        'rollbackAttributes reverts changes to the record'
      );
    });

    (0, _qunit.test)('.rollbackAttributes rolls back nested dirty attributes', function(assert) {
      var _this13 = this;

      var model = Ember.run(function() {
        return _this13.store.push({
          data: {
            id: 1,
            type: 'com.example.bookstore.Book',
            attributes: {
              name: 'The Winds of Winter',
              nextChapter: {
                name: 'The first chapter',
              },
            },
          },
        });
      });

      Ember.set(model, 'nextChapter.name', 'The beginning');
      assert.equal(
        Ember.get(model, 'nextChapter.name'),
        'The beginning',
        'nested model attribute changed'
      );

      model.rollbackAttributes();

      assert.equal(
        Ember.get(model, 'nextChapter.name'),
        'The first chapter',
        'rollbackAttributes reverts changes to the nested model'
      );

      assert.deepEqual(
        model.changedAttributes(),
        {},
        'after rollback, there are no changed attriutes'
      );
    });

    (0,
    _qunit.test)('.rollbackAttributes rolls back nested dirty attributes after a rejected save', function(assert) {
      var _this14 = this;

      this.owner.register(
        'adapter:-ember-m3',
        Ember.Object.extend({
          updateRecord: function updateRecord() {
            return Ember.RSVP.Promise.reject();
          },
        })
      );
      var model = Ember.run(function() {
        return _this14.store.push({
          data: {
            id: 1,
            type: 'com.example.bookstore.Book',
            attributes: {
              name: 'The Winds of Winter',
              nextChapter: {
                name: 'The first chapter',
              },
            },
          },
        });
      });

      Ember.set(model, 'nextChapter.name', 'The beginning');
      assert.equal(
        Ember.get(model, 'nextChapter.name'),
        'The beginning',
        'nested model attribute changed'
      );

      return Ember.run(function() {
        return model.save();
      }).then(
        function(value) {
          throw new Error('unexpected promise fulfillment with value ' + value);
        },
        function() {
          model.rollbackAttributes();

          assert.equal(
            Ember.get(model, 'nextChapter.name'),
            'The first chapter',
            'rollbackAttributes reverts changes to the nested model'
          );

          assert.deepEqual(
            model.changedAttributes(),
            {},
            'after rollback, there are no changed attriutes'
          );
        }
      );
    });

    (0,
    _qunit.test)('updates from .save do not overwrite attributes  or nested attributes set after .save is called', function(assert) {
      var _this15 = this;

      this.owner.register(
        'adapter:-ember-m3',
        Ember.Object.extend({
          updateRecord: function updateRecord() {
            return Ember.RSVP.Promise.resolve({
              data: {
                id: 1,
                type: 'com.example.bookstore.Book',
                attributes: {
                  name: "Harry Potter and the Sorcerer's Stone",
                  author: 'J. K. Rowling',
                  nextChapter: {
                    name: 'The Boy Who Lived',
                    number: 1,
                    nextChapter: {
                      name: 'The Vanishing Glass',
                      number: 2,
                    },
                  },
                },
              },
            });
          },
        })
      );
      var model = Ember.run(function() {
        return _this15.store.push({
          data: {
            id: 1,
            type: 'com.example.bookstore.Book',
            attributes: {
              name: 'The Winds of Winter',
              author: 'George R. R. Martin',
              nextChapter: {
                name: 'Windy eh',
                number: 1,
                nextChapter: {
                  name: 'I guess winter was coming after all',
                  number: 2,
                },
              },
            },
          },
        });
      });
      var nestedModel = Ember.get(model, 'nextChapter');
      var doubleNested = Ember.get(model, 'nextChapter.nextChapter');

      Ember.run(function() {
        Ember.set(model, 'name', 'Alice in Wonderland');
        Ember.set(nestedModel, 'name', 'There must be some first chapter');
        Ember.set(doubleNested, 'name', 'Likely there is a second chapter as well');
      });

      return Ember.run(function() {
        var savePromise = model.save();

        Ember.set(model, 'author', 'Lewis Carroll');
        Ember.set(nestedModel, 'number', 6);
        Ember.set(doubleNested, 'number', 24601);

        return savePromise.then(function() {
          assert.equal(
            Ember.get(model, 'author'),
            'Lewis Carroll',
            'the author was set after save, should not be updated'
          );
          assert.equal(
            Ember.get(model, 'name'),
            "Harry Potter and the Sorcerer's Stone",
            'the name of the book is updated from the save'
          );

          assert.equal(
            Ember.get(nestedModel, 'number'),
            6,
            'the author was set after save, should not be updated'
          );
          assert.equal(
            Ember.get(nestedModel, 'name'),
            'The Boy Who Lived',
            'the name of the first chapter is updated from the save'
          );

          assert.equal(
            Ember.get(doubleNested, 'number'),
            24601,
            'the author was set after save, should not be updated'
          );
          assert.equal(
            Ember.get(doubleNested, 'name'),
            'The Vanishing Glass',
            'the name of the second chapter is updated from the save'
          );
        });
      });
    });

    (0,
    _qunit.test)('updates from .save clear changed attributes in nested models within arrays', function(assert) {
      var _this16 = this;

      this.owner.register(
        'adapter:-ember-m3',
        Ember.Object.extend({
          updateRecord: function updateRecord() {
            return Ember.RSVP.Promise.resolve({
              data: {
                id: 1,
                type: 'com.example.bookstore.Book',
                attributes: {
                  name: "Harry Potter and the Sorcerer's Stone",
                  author: 'J. K. Rowling',
                  chapters: [
                    {
                      name: 'The Boy Who Lived',
                      number: 1,
                    },
                    {
                      name: 'The Vanishing Glass',
                      number: 2,
                    },
                  ],
                },
              },
            });
          },
        })
      );
      var model = Ember.run(function() {
        return _this16.store.push({
          data: {
            id: 1,
            type: 'com.example.bookstore.Book',
            attributes: {
              name: 'The Winds of Winter',
              author: 'George R. R. Martin',
              chapters: [
                {
                  name: 'Windy eh',
                  number: 1,
                },
                {
                  name: 'I guess winter was coming after all',
                  number: 2,
                },
              ],
            },
          },
        });
      });

      var nestedModels = Ember.get(model, 'chapters');
      Ember.set(nestedModels.get('firstObject'), 'name', 'super windy');

      assert.deepEqual(
        Ember.get(model, 'chapters').map(function(m) {
          return Ember.get(m, 'name');
        }),
        ['super windy', 'I guess winter was coming after all'],
        'initially properties reflect locally changed attributes'
      );

      return Ember.run(function() {
        var savePromise = model.save();

        Ember.set(nestedModels.get('firstObject'), 'name', 'sooooooo super windy');

        return savePromise.then(function() {
          assert.deepEqual(
            Ember.get(model, 'chapters').map(function(m) {
              return Ember.get(m, 'name');
            }),
            ['The Boy Who Lived', 'The Vanishing Glass'],
            'local changes to nested models within arrays are not preserved after adapter commit'
          );
        });
      });
    });

    (0,
    _qunit.test)('local nested model within non-array updates without server payload', function(assert) {
      var _this17 = this;

      this.owner.register(
        'adapter:-ember-m3',
        Ember.Object.extend({
          updateRecord: function updateRecord() {
            return Ember.RSVP.Promise.resolve();
          },
        })
      );

      var model = Ember.run(function() {
        return _this17.store.push({
          data: {
            id: 1,
            type: 'com.example.bookstore.Book',
            attributes: {
              name: 'The Winds of Winter',
              author: 'George R. R. Martin',
              rating: 10,
              expectedPubDate: 'never',
              nextChapter: {
                name: 'Chapter 1',
                number: 1,
                nextChapter: {
                  name: 'Chapter 2',
                  nunmber: 2,
                },
              },
            },
          },
        });
      });

      var doubleNestedModel = Ember.get(model, 'nextChapter.nextChapter');
      Ember.set(doubleNestedModel, 'name', 'Chapter 3');
      return Ember.run(function() {
        return model.save().then(function(data) {
          assert.deepEqual((0, _private.recordDataFor)(data)._data, {
            name: 'The Winds of Winter',
            author: 'George R. R. Martin',
            rating: 10,
            expectedPubDate: 'never',
            nextChapter: {
              name: 'Chapter 1',
              number: 1,
              nextChapter: {
                name: 'Chapter 3',
                nunmber: 2,
              },
            },
          });
          doubleNestedModel = Ember.get(data, 'nextChapter.nextChapter');
          assert.deepEqual(
            doubleNestedModel.changedAttributes(),
            {},
            'doubleNestedModel has no changedAttributes'
          );
          assert.deepEqual(data.changedAttributes(), {}, 'changedAttributes is empty');
        });
      });
    });

    (0,
    _qunit.test)('local nested model within array updates without server payload', function(assert) {
      var _this18 = this;

      this.owner.register(
        'adapter:-ember-m3',
        Ember.Object.extend({
          updateRecord: function updateRecord() {
            return Ember.RSVP.Promise.resolve();
          },
        })
      );

      var model = Ember.run(function() {
        return _this18.store.push({
          data: {
            id: 1,
            type: 'com.example.bookstore.Book',
            attributes: {
              name: 'The Winds of Winter',
              author: 'George R. R. Martin',
              rating: 10,
              expectedPubDate: 'never',
              chapters: [
                {
                  name: 'Windy eh',
                  number: 1,
                },
                {
                  name: 'I guess winter was coming after all',
                  number: 2,
                },
              ],
            },
          },
        });
      });

      var nestedModels = Ember.get(model, 'chapters');
      Ember.set(nestedModels.get('firstObject'), 'name', 'super windy');
      return Ember.run(function() {
        return model.save().then(function(data) {
          assert.deepEqual((0, _private.recordDataFor)(data)._data, {
            name: 'The Winds of Winter',
            author: 'George R. R. Martin',
            rating: 10,
            expectedPubDate: 'never',
            chapters: [
              {
                name: 'super windy',
                number: 1,
              },
              {
                name: 'I guess winter was coming after all',
                number: 2,
              },
            ],
          });
          assert.deepEqual(data.changedAttributes(), {}, 'changedAttributes is empty');
        });
      });
    });

    (0,
    _qunit.test)('local nested model within non-array updates overriden by server payload', function(assert) {
      var _this19 = this;

      this.owner.register(
        'adapter:-ember-m3',
        Ember.Object.extend({
          updateRecord: function updateRecord() {
            return Ember.RSVP.Promise.resolve({
              data: {
                id: 1,
                type: 'com.example.bookstore.Book',
                attributes: {
                  name: 'The Winds of Winter',
                  author: 'George R. R. Martin',
                  rating: 10,
                  expectedPubDate: 'never',
                  nextChapter: {
                    name: 'Chapter 3',
                    number: 1,
                    nextChapter: {
                      name: 'Chapter 4',
                    },
                  },
                },
              },
            });
          },
        })
      );

      var model = Ember.run(function() {
        return _this19.store.push({
          data: {
            id: 1,
            type: 'com.example.bookstore.Book',
            attributes: {
              name: 'The Winds of Winter',
              author: 'George R. R. Martin',
              rating: 10,
              expectedPubDate: 'never',
              nextChapter: {
                name: 'Chapter 1',
                number: 1,
                nextChapter: {
                  name: 'Chapter 2',
                  number: 2,
                },
              },
            },
          },
        });
      });

      var doubleNestedModel = Ember.get(model, 'nextChapter.nextChapter');
      Ember.set(doubleNestedModel, 'name', 'Chapter 3');
      return Ember.run(function() {
        return model.save().then(function(data) {
          assert.deepEqual((0, _private.recordDataFor)(data)._data, {
            name: 'The Winds of Winter',
            author: 'George R. R. Martin',
            rating: 10,
            expectedPubDate: 'never',
            nextChapter: {
              name: 'Chapter 3',
              number: 1,
              nextChapter: {
                name: 'Chapter 4',
                number: 2,
              },
            },
          });
          doubleNestedModel = Ember.get(data, 'nextChapter.nextChapter');
          assert.deepEqual(
            doubleNestedModel.changedAttributes(),
            {},
            'doubleNestedModel has no changedAttributes'
          );
          assert.deepEqual(data.changedAttributes(), {}, 'changedAttributes is empty');
        });
      });
    });

    (0,
    _qunit.test)('local nested model within array updates overriden by server payload', function(assert) {
      var _this20 = this;

      this.owner.register(
        'adapter:-ember-m3',
        Ember.Object.extend({
          updateRecord: function updateRecord() {
            return Ember.RSVP.Promise.resolve({
              data: {
                id: 1,
                type: 'com.example.bookstore.Book',
                attributes: {
                  name: 'The Winds of Winter',
                  author: 'George R. R. Martin',
                  rating: 10,
                  expectedPubDate: 'never',
                  chapters: [
                    {
                      name: 'Chapter 4',
                      number: 1,
                    },
                  ],
                },
              },
            });
          },
        })
      );

      var model = Ember.run(function() {
        return _this20.store.push({
          data: {
            id: 1,
            type: 'com.example.bookstore.Book',
            attributes: {
              name: 'The Winds of Winter',
              author: 'George R. R. Martin',
              rating: 10,
              expectedPubDate: 'never',
              chapters: [
                {
                  name: 'Chapter 1',
                  number: 1,
                },
                {
                  name: 'Chapter 2',
                  number: 2,
                },
              ],
            },
          },
        });
      });

      var nestedModel = Ember.get(model, 'chapters');
      Ember.set(nestedModel.get('firstObject'), 'name', 'super windy');
      return Ember.run(function() {
        return model.save().then(function(data) {
          assert.deepEqual((0, _private.recordDataFor)(data)._data, {
            name: 'The Winds of Winter',
            author: 'George R. R. Martin',
            rating: 10,
            expectedPubDate: 'never',
            chapters: [
              {
                name: 'Chapter 4',
                number: 1,
              },
            ],
          });
          assert.deepEqual(data.changedAttributes(), {}, 'changedAttributes is empty');
        });
      });
    });

    (0,
    _qunit.test)('partial update from server and local changes for nested models within non-array', function(assert) {
      var _this21 = this;

      this.owner.register(
        'adapter:-ember-m3',
        Ember.Object.extend({
          updateRecord: function updateRecord() {
            return Ember.RSVP.Promise.resolve({
              data: {
                id: 'isbn:9780439708180',
                type: 'com.example.bookstore.Book',
                attributes: {
                  name: "Harry Potter and the Sorcerer's Stone",
                  number: 0,
                  nextChapter: {
                    name: 'The Boy Who whatever',
                    number: 1,
                  },
                  authorNotes: {
                    value: 'this book should sell well',
                  },
                },
              },
            });
          },
        })
      );

      var model = Ember.run(function() {
        return _this21.store.push({
          data: {
            id: 'isbn:9780439708180',
            type: 'com.example.bookstore.Book',
            attributes: {
              name: "Harry Potter and the Sorcerer's Stone",
              number: 0,
              nextChapter: {
                name: 'The Boy Who whatever',
                number: 1,
                nextChapter: {
                  name: 'The Vanishing dunno',
                  number: 2,
                },
              },
              authorNotes: {
                value: 'this book should sell well',
              },
            },
          },
        });
      });

      var doubleNestedModel = Ember.get(model, 'nextChapter.nextChapter');
      Ember.set(doubleNestedModel, 'name', 'The Vanishing Boy');
      return Ember.run(function() {
        return model.save().then(function(data) {
          assert.deepEqual((0, _private.recordDataFor)(data)._data, {
            name: "Harry Potter and the Sorcerer's Stone",
            number: 0,
            nextChapter: {
              name: 'The Boy Who whatever',
              number: 1,
              nextChapter: {
                name: 'The Vanishing Boy',
                number: 2,
              },
            },
            authorNotes: {
              value: 'this book should sell well',
            },
          });
          doubleNestedModel = Ember.get(data, 'nextChapter.nextChapter');
          assert.deepEqual(
            doubleNestedModel.changedAttributes(),
            {},
            'doubleNestedModel has no changedAttributes'
          );
          assert.deepEqual(data.changedAttributes(), {}, 'changedAttributes is empty');
        });
      });
    });

    (0,
    _qunit.test)('partial update from server and local changes for nested models within array', function(assert) {
      var _this22 = this;

      this.owner.register(
        'adapter:-ember-m3',
        Ember.Object.extend({
          updateRecord: function updateRecord() {
            return Ember.RSVP.Promise.resolve({
              data: {
                id: 'isbn:9780439708180',
                type: 'com.example.bookstore.Book',
                attributes: {
                  name: "Harry Potter and the Sorcerer's Stone",
                  number: 0,
                  nextChapter: {
                    number: 1,
                    characters: [
                      {
                        name: 'Voldemort',
                        number: 2,
                      },
                    ],
                  },
                  authorNotes: {
                    value: 'this book should sell well',
                  },
                },
              },
            });
          },
        })
      );

      var model = Ember.run(function() {
        return _this22.store.push({
          data: {
            id: 'isbn:9780439708180',
            type: 'com.example.bookstore.Book',
            attributes: {
              name: "Harry Potter and the Sorcerer's Stone",
              number: 0,
              nextChapter: {
                name: 'The Boy Who whatever',
                number: 1,
                characters: [
                  {
                    name: 'Harry Potter',
                    number: 2,
                  },
                  {
                    name: 'Ron',
                    number: 3,
                  },
                ],
              },
              authorNotes: {
                value: 'this book should sell well',
              },
            },
          },
        });
      });

      var nestedModel = Ember.get(model, 'nextChapter');
      var doubleNestedModel = Ember.get(nestedModel, 'characters');
      Ember.run(function() {
        Ember.set(nestedModel, 'name', 'The Boy Who Lived');
        Ember.set(doubleNestedModel.get('firstObject'), 'name', 'Professor Snape');
      });

      return Ember.run(function() {
        return model.save().then(function(data) {
          assert.deepEqual((0, _private.recordDataFor)(data)._data, {
            name: "Harry Potter and the Sorcerer's Stone",
            number: 0,
            nextChapter: {
              name: 'The Boy Who Lived',
              number: 1,
              characters: [
                {
                  name: 'Voldemort',
                  number: 2,
                },
              ],
            },
            authorNotes: {
              value: 'this book should sell well',
            },
          });
          nestedModel = Ember.get(data, 'nextChapter');
          doubleNestedModel = Ember.get(nestedModel, 'characters');
          assert.deepEqual(
            nestedModel.changedAttributes(),
            {},
            'nestedModel has no changedAttributes'
          );
          assert.deepEqual(
            doubleNestedModel.get('firstObject').changedAttributes(),
            {},
            'doubleNestedModel has no changedAttributes'
          );
          assert.deepEqual(data.changedAttributes(), {}, 'changedAttributes is empty');
        });
      });
    });
  });
});
define('dummy/tests/unit/model/dependent-keys-test', [
  'sinon',
  'qunit',
  'ember-qunit',
  'ember-m3/services/m3-schema',
], function(_sinon, _qunit, _emberQunit, _m3Schema) {
  'use strict';

  var _get = function get(object, property, receiver) {
    if (object === null) object = Function.prototype;
    var desc = Object.getOwnPropertyDescriptor(object, property);

    if (desc === undefined) {
      var parent = Object.getPrototypeOf(object);

      if (parent === null) {
        return undefined;
      } else {
        return get(parent, property, receiver);
      }
    } else if ('value' in desc) {
      return desc.value;
    } else {
      var getter = desc.get;

      if (getter === undefined) {
        return undefined;
      }

      return getter.call(receiver);
    }
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

  var TestSchema = (function(_DefaultSchema) {
    _inherits(TestSchema, _DefaultSchema);

    function TestSchema() {
      _classCallCheck(this, TestSchema);

      return _possibleConstructorReturn(
        this,
        (TestSchema.__proto__ || Object.getPrototypeOf(TestSchema)).apply(this, arguments)
      );
    }

    _createClass(TestSchema, [
      {
        key: 'includesModel',
        value: function includesModel(modelName) {
          return /^com.example.bookstore\./i.test(modelName);
        },
      },
      {
        key: 'computeAttributeReference',
        value: function computeAttributeReference(key, value, modelName, schemaInterface) {
          var refValue = schemaInterface.getAttr('*' + key);
          if (refValue !== undefined) {
            if (Array.isArray(refValue)) {
              return refValue.map(function(id) {
                return { id: id, type: null };
              });
            } else {
              return {
                id: refValue,
                type: null,
              };
            }
          }
        },
      },
    ]);

    return TestSchema;
  })(_m3Schema.default);

  (0, _qunit.module)('unit/model/dependent-keys', function(hooks) {
    (0, _emberQunit.setupTest)(hooks);

    hooks.beforeEach(function() {
      this.sinon = _sinon.default.createSandbox();
      this.store = this.owner.lookup('service:store');

      this.owner.register('service:m3-schema', TestSchema);
    });

    (0,
    _qunit.test)('when new payloads invalidate properties, their dependent properties are invalidated', function(assert) {
      var _this2 = this;

      var model = Ember.run(function() {
        return _this2.store.push({
          data: {
            id: 'isbn:9780439708180',
            type: 'com.example.bookstore.Book',
            attributes: {
              name: "Harry Potter and the Sorcerer's Stone",
              pubDate: 'September 1989',
              '*relatedBooks': ['isbn:9780439358079'],
              '*otherBooksInSeries': ['isbn:9780439358071', 'isbn:9780439136365'],
            },
          },
          included: [
            {
              id: 'isbn:9780439358071',
              type: 'com.example.bookstore.Book',
              attributes: {
                name: 'Harry Potter and the Chamber of Secrets',
              },
            },
            {
              id: 'isbn:9780439136365',
              type: 'com.example.bookstore.Book',
              attributes: {
                name: 'Harry Potter and the Prisoner of Azkaban',
              },
            },
            {
              id: 'isbn:9780439358079',
              type: 'com.example.bookstore.Book',
              attributes: {
                name: 'Fantastic Beasts and Where to Find Them',
              },
            },
          ],
        });
      });

      var otherBooks = Ember.get(model, 'otherBooksInSeries');
      var relatedBooks = Ember.get(model, 'relatedBooks');
      assert.deepEqual(
        otherBooks.map(function(b) {
          return Ember.get(b, 'name');
        }),
        ['Harry Potter and the Chamber of Secrets', 'Harry Potter and the Prisoner of Azkaban'],
        'attr array ref is array-like'
      );
      assert.deepEqual(
        relatedBooks.map(function(b) {
          return Ember.get(b, 'name');
        }),
        ['Fantastic Beasts and Where to Find Them'],
        'attr array ref is array-like'
      );

      //Update record with new data
      Ember.run(function() {
        return _this2.store.push({
          data: {
            id: 'isbn:9780439708180',
            type: 'com.example.bookstore.Book',
            attributes: {
              name: "Harry Potter and the Sorcerer's Stone",
              pubDate: 'September 1989',
              '*relatedBooks': ['isbn:9780439358080'],
              '*otherBooksInSeries': ['isbn:9780439064878', 'isbn:9780439064879'],
            },
          },
          included: [
            {
              id: 'isbn:9780439064878',
              type: 'com.example.bookstore.Book',
              attributes: {
                name: 'Harry Potter and the Goblet of Fire',
              },
            },
            {
              id: 'isbn:9780439064879',
              type: 'com.example.bookstore.Book',
              attributes: {
                name: 'Harry Potter and the Order of the Phoenix',
              },
            },
            {
              id: 'isbn:9780439358080',
              type: 'com.example.bookstore.Book',
              attributes: {
                name: 'Fantastic Beasts and Where to Find Them 2',
              },
            },
          ],
        });
      });

      model = this.store.peekRecord('com.example.bookstore.Book', 'isbn:9780439708180');
      otherBooks = Ember.get(model, 'otherBooksInSeries');
      relatedBooks = Ember.get(model, 'relatedBooks');
      assert.deepEqual(
        otherBooks.map(function(b) {
          return Ember.get(b, 'name');
        }),
        ['Harry Potter and the Goblet of Fire', 'Harry Potter and the Order of the Phoenix'],
        'attr ref is updated upon reload'
      );
      assert.deepEqual(
        relatedBooks.map(function(b) {
          return Ember.get(b, 'name');
        }),
        ['Fantastic Beasts and Where to Find Them 2'],
        'attr array is updated upon reload'
      );
    });

    (0,
    _qunit.test)('properties requested in computeAttributeRef are treated as dependent even when initially absent', function(assert) {
      var _this3 = this;

      var model = Ember.run(function() {
        return _this3.store.push({
          data: {
            id: 'isbn:9780439708180',
            type: 'com.example.bookstore.Book',
            attributes: {
              name: "Harry Potter and the Sorcerer's Stone",
              pubDate: 'September 1989',
              relatedBooks: [],
            },
          },
        });
      });

      assert.equal(
        Ember.get(model, 'relatedBooks.length'),
        0,
        'initially relatedBooks is an empty array'
      );

      Ember.run(function() {
        return _this3.store.push({
          data: {
            id: 'isbn:9780439708180',
            type: 'com.example.bookstore.Book',
            attributes: {
              '*relatedBooks': ['isbn:9780439358080'],
            },
          },
          included: [
            {
              id: 'isbn:9780439358080',
              type: 'com.example.bookstore.Book',
              attributes: {
                name: 'Fantastic Beasts and Where to Find Them',
              },
            },
          ],
        });
      });

      assert.deepEqual(
        Ember.get(model, 'relatedBooks').mapBy('name'),
        ['Fantastic Beasts and Where to Find Them'],
        'relatedBooks is invalidated when *relatedBooks changes'
      );
    });

    (0,
    _qunit.test)('Accessing a property twice while resolving it does not cause errors', function(assert) {
      var _this5 = this;

      assert.expect(5);

      this.owner.register(
        'service:m3-schema',
        (function(_TestSchema) {
          _inherits(SelfReferencingSchema, _TestSchema);

          function SelfReferencingSchema() {
            _classCallCheck(this, SelfReferencingSchema);

            return _possibleConstructorReturn(
              this,
              (
                SelfReferencingSchema.__proto__ || Object.getPrototypeOf(SelfReferencingSchema)
              ).apply(this, arguments)
            );
          }

          _createClass(SelfReferencingSchema, [
            {
              key: 'computeAttributeReference',
              value: function computeAttributeReference(key, value, modelName, schemaInterface) {
                var selfKey = schemaInterface.getAttr('' + key);
                assert.ok(selfKey, 'can lookup itself');
                return _get(
                  SelfReferencingSchema.prototype.__proto__ ||
                    Object.getPrototypeOf(SelfReferencingSchema.prototype),
                  'computeAttributeReference',
                  this
                ).call(this, key, value, modelName, schemaInterface);
              },
            },
          ]);

          return SelfReferencingSchema;
        })(TestSchema)
      );
      var model = Ember.run(function() {
        return _this5.store.push({
          data: {
            id: 'isbn:9780439708180',
            type: 'com.example.bookstore.Book',
            attributes: {
              name: "Harry Potter and the Sorcerer's Stone",
              pubDate: 'September 1989',
              relatedBooks: [],
            },
          },
        });
      });

      assert.equal(
        Ember.get(model, 'relatedBooks.length'),
        0,
        'initially relatedBooks is an empty array'
      );

      Ember.run(function() {
        return _this5.store.push({
          data: {
            id: 'isbn:9780439708180',
            type: 'com.example.bookstore.Book',
            attributes: {
              '*relatedBooks': ['isbn:9780439358080'],
            },
          },
          included: [
            {
              id: 'isbn:9780439358080',
              type: 'com.example.bookstore.Book',
              attributes: {
                name: 'Fantastic Beasts and Where to Find Them',
              },
            },
          ],
        });
      });

      assert.deepEqual(
        Ember.get(model, 'relatedBooks').mapBy('name'),
        ['Fantastic Beasts and Where to Find Them'],
        'relatedBooks is invalidated when *relatedBooks changes'
      );
    });
  });
});
define('dummy/tests/unit/model/projections/changed-attrs-test', [
  'qunit',
  'ember-qunit',
  'ember-m3/services/m3-schema',
], function(_qunit, _emberQunit, _m3Schema) {
  'use strict';

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

  (0, _qunit.module)('unit/model/projections/changed-attrs', function(hooks) {
    (0, _emberQunit.setupTest)(hooks);

    hooks.beforeEach(function() {
      this.store = this.owner.lookup('service:store');

      this.owner.register(
        'service:m3-schema',
        (function(_DefaultSchema) {
          _inherits(TestSchema, _DefaultSchema);

          function TestSchema() {
            _classCallCheck(this, TestSchema);

            return _possibleConstructorReturn(
              this,
              (TestSchema.__proto__ || Object.getPrototypeOf(TestSchema)).apply(this, arguments)
            );
          }

          _createClass(TestSchema, [
            {
              key: 'includesModel',
              value: function includesModel() {
                return true;
              },
            },
            {
              key: 'computeNestedModel',
              value: function computeNestedModel(key, value) {
                if (
                  value !== null &&
                  (typeof value === 'undefined' ? 'undefined' : _typeof(value)) === 'object'
                ) {
                  return { id: key, type: value.type, attributes: value };
                }
              },
            },
            {
              key: 'computeBaseModelName',
              value: function computeBaseModelName(modelName) {
                return ['com.bookstore.projected-book', 'com.bookstore.excerpt-book'].includes(
                  modelName
                )
                  ? 'com.bookstore.book'
                  : null;
              },
            },
          ]);

          return TestSchema;
        })(_m3Schema.default)
      );
    });

    (0,
    _qunit.test)('setting a dirty nested model (on projection) to null has correct changed attrs', function(assert) {
      this.store.push({
        data: [
          {
            id: 'urn:book:1',
            type: 'com.bookstore.Book',
            attributes: {
              title: 'A History of the English Speaking Peoples Vol I',
              randomChapter: {
                position: 2,
                title: 'Not actually a chapter in this book',
              },
            },
          },
          {
            id: 'urn:book:1',
            type: 'com.bookstore.ProjectedBook',
          },
        ],
      });

      var projectedRecord = this.store.peekRecord('com.bookstore.ProjectedBook', 'urn:book:1');

      assert.equal(
        projectedRecord.get('randomChapter.position'),
        2,
        'read properties from nested models'
      );
      assert.equal(
        projectedRecord.get('randomChapter.title'),
        'Not actually a chapter in this book',
        'read properties from nested models'
      );

      // ensure the nested model itself has some changed attributes
      projectedRecord.set('randomChapter.position', 3);
      projectedRecord.set('randomChapter', null);

      assert.strictEqual(
        projectedRecord.get('randomChapter'),
        null,
        'nested model is cleared on projection'
      );

      assert.deepEqual(
        projectedRecord.changedAttributes(),
        {
          randomChapter: [
            {
              position: 2,
              title: 'Not actually a chapter in this book',
            },
            null,
          ],
        },
        'changed attributes is correct'
      );
    });
  });
});
define('dummy/tests/unit/model/projections/serialize-test', [
  'ember-qunit',
  'ember-m3/services/m3-schema',
], function(_emberQunit, _m3Schema) {
  'use strict';

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

  (0, _emberQunit.module)('unit/model/projections/serialize', function(hooks) {
    (0, _emberQunit.setupTest)(hooks);

    hooks.beforeEach(function() {
      this.store = this.owner.lookup('service:store');

      var TestSchema = (function(_DefaultSchema) {
        _inherits(TestSchema, _DefaultSchema);

        function TestSchema() {
          _classCallCheck(this, TestSchema);

          return _possibleConstructorReturn(
            this,
            (TestSchema.__proto__ || Object.getPrototypeOf(TestSchema)).apply(this, arguments)
          );
        }

        _createClass(TestSchema, [
          {
            key: 'includesModel',
            value: function includesModel() {
              return true;
            },
          },
          {
            key: 'computeNestedModel',
            value: function computeNestedModel(key, value, modelName, schemaInterface) {
              if (key === 'author' && /\.proj\./.test(modelName)) {
                return {
                  attributes: {
                    id: schemaInterface.getAttr('id'),
                    name: 'JK Rowling',
                  },
                };
              }
            },
          },
          {
            key: 'computeBaseModelName',
            value: function computeBaseModelName(modelName) {
              var modelSchema = this.models[modelName];

              if (modelSchema) {
                return modelSchema.baseType;
              }
            },
          },
        ]);

        return TestSchema;
      })(_m3Schema.default);

      TestSchema.prototype.models = {
        'com.example.bookstore.proj.book-with-author': {
          baseType: 'com.example.bookstore.book',
        },
        'com.example.bookstore.proj.book-with-only-author': {
          baseType: 'com.example.bookstore.book',
          attributes: ['author', 'authorId'],
        },
      };
      this.owner.register('service:m3-schema', TestSchema);
    });

    (0, _emberQunit.test)('projectionModel.eachAttribute defers to base model', function(assert) {
      var _this2 = this;

      Ember.run(function() {
        return _this2.store.push({
          data: {
            id: 'isbn:9780439708180',
            type: 'com.example.bookstore.book',
            attributes: {
              name: "Harry Potter and the Sorcerer's Stone",
              authorId: 'author:1',
            },
          },
          included: [
            {
              id: 'isbn:9780439708180',
              type: 'com.example.bookstore.proj.book-with-author',
              attributes: {},
            },
          ],
        });
      });

      var bookWithAuthor = this.store.peekRecord(
        'com.example.bookstore.proj.BookWithAuthor',
        'isbn:9780439708180'
      );

      assert.deepEqual(
        Ember.get(bookWithAuthor, 'author.name'),
        'JK Rowling',
        'projected model has extra fields that depend on base model'
      );

      this.owner.register(
        'serializer:-ember-m3',
        (function(_EmberObject) {
          _inherits(TestSerializer, _EmberObject);

          function TestSerializer() {
            _classCallCheck(this, TestSerializer);

            return _possibleConstructorReturn(
              this,
              (TestSerializer.__proto__ || Object.getPrototypeOf(TestSerializer)).apply(
                this,
                arguments
              )
            );
          }

          _createClass(TestSerializer, [
            {
              key: 'serialize',
              value: function serialize(snapshot) {
                var attrsIterated = [];
                snapshot.eachAttribute(function(key) {
                  return attrsIterated.push(key);
                });

                assert.deepEqual(
                  attrsIterated.sort(),
                  ['authorId', 'name'],
                  'when attributes is absent, keys(data) is iterated'
                );
              },
            },
          ]);

          return TestSerializer;
        })(Ember.Object)
      );

      bookWithAuthor.serialize();
    });
  });
});
define('dummy/tests/unit/model/reference-array-test', [
  'qunit',
  'ember-qunit',
  'ember-m3/services/m3-schema',
  'ember-m3/m3-reference-array',
], function(_qunit, _emberQunit, _m3Schema, _m3ReferenceArray) {
  'use strict';

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

  function _resolve(urn) {
    var id = urn;
    var type = null;

    if (/^isbn/i.test(urn)) {
      type = 'com.example.bookstore.Book';
    }

    return {
      id: id,
      type: type,
    };
  }

  (0, _qunit.module)('unit/model/reference-array', function(hooks) {
    (0, _emberQunit.setupTest)(hooks);

    hooks.beforeEach(function() {
      this.owner.register(
        'service:m3-schema',
        (function(_DefaultSchema) {
          _inherits(TestSchema, _DefaultSchema);

          function TestSchema() {
            _classCallCheck(this, TestSchema);

            return _possibleConstructorReturn(
              this,
              (TestSchema.__proto__ || Object.getPrototypeOf(TestSchema)).apply(this, arguments)
            );
          }

          _createClass(TestSchema, [
            {
              key: 'includesModel',
              value: function includesModel(modelName) {
                return /^com.example.bookstore\./i.test(modelName);
              },
            },
            {
              key: 'computeAttributeReference',
              value: function computeAttributeReference(key, value, modelName, schemaInterface) {
                var refValue = schemaInterface.getAttr('*' + key);
                if (Ember.isArray(refValue)) {
                  return refValue.map(_resolve);
                }

                if (refValue !== undefined) {
                  return _resolve(refValue);
                }
              },
            },
          ]);

          return TestSchema;
        })(_m3Schema.default)
      );
      this.store = this.owner.lookup('service:store');
    });

    (0, _qunit.test)('.unknownProperty resolves arrays of id-matched values', function(assert) {
      var _this2 = this;

      var model = Ember.run(function() {
        return _this2.store.push({
          data: {
            id: 'isbn:9780439708180',
            type: 'com.example.bookstore.Book',
            attributes: {
              name: "Harry Potter and the Sorcerer's Stone",
              '*relatedBooks': ['isbn:9780439064873', 'isbn:9780439136365'],
            },
          },
          included: [
            {
              id: 'isbn:9780439064873',
              type: 'com.example.bookstore.Book',
              attributes: {
                name: 'Harry Potter and the Chamber of Secrets',
              },
            },
            {
              id: 'isbn:9780439136365',
              type: 'com.example.bookstore.Book',
              attributes: {
                name: 'Harry Potter and the Prisoner of Azkaban',
              },
            },
          ],
        });
      });

      assert.ok(
        Ember.get(model, 'relatedBooks') instanceof _m3ReferenceArray.default,
        'resolved arrays are reference arrays'
      );
      assert.deepEqual(
        Ember.get(model, 'relatedBooks').map(function(x) {
          return Ember.get(x, 'name');
        }),
        ['Harry Potter and the Chamber of Secrets', 'Harry Potter and the Prisoner of Azkaban']
      );
    });

    (0,
    _qunit.test)('.unknownProperty resolves arrays of id-matched values against the global cache', function(assert) {
      var _this3 = this;

      var model = Ember.run(function() {
        return _this3.store.push({
          data: {
            id: 'isbn:9780439708180',
            type: 'com.example.bookstore.Book',
            attributes: {
              name: "Harry Potter and the Sorcerer's Stone",
              '*relatedBooks': ['urn:isbn9780439064873', 'urn:isbn9780439136365'],
            },
          },
          included: [
            {
              id: 'urn:isbn9780439064873',
              type: 'com.example.bookstore.Book',
              attributes: {
                name: 'Harry Potter and the Chamber of Secrets',
              },
            },
            {
              id: 'urn:isbn9780439136365',
              type: 'com.example.bookstore.Book',
              attributes: {
                name: 'Harry Potter and the Prisoner of Azkaban',
              },
            },
          ],
        });
      });

      assert.ok(
        Ember.get(model, 'relatedBooks') instanceof _m3ReferenceArray.default,
        'resolved arrays are reference arrays'
      );
      assert.deepEqual(
        Ember.get(model, 'relatedBooks').map(function(x) {
          return Ember.get(x, 'name');
        }),
        ['Harry Potter and the Chamber of Secrets', 'Harry Potter and the Prisoner of Azkaban']
      );
    });

    (0, _qunit.test)('.unknownProperty resolves reference arrays', function(assert) {
      var _this4 = this;

      var model = Ember.run(function() {
        return _this4.store.push({
          data: {
            id: 'isbn:9780439708180',
            type: 'com.example.bookstore.Book',
            attributes: {
              name: "Harry Potter and the Sorcerer's Stone",
              '*otherBooksInSeries': ['isbn:9780439064873', 'isbn:9780439136365'],
            },
          },
          included: [
            {
              id: 'isbn:9780439064873',
              type: 'com.example.bookstore.Book',
              attributes: {
                name: 'Harry Potter and the Chamber of Secrets',
              },
            },
            {
              id: 'isbn:9780439136365',
              type: 'com.example.bookstore.Book',
              attributes: {
                name: 'Harry Potter and the Prisoner of Azkaban',
              },
            },
            {
              id: 'isbn:9780439139601',
              type: 'com.example.bookstore.Book',
              attributes: {
                name: 'Harry Potter and the Goblet of Fire',
              },
            },
          ],
        });
      });

      var otherBooksInSeries = Ember.get(model, 'otherBooksInSeries');
      // so far just like a normal array of references
      assert.deepEqual(
        otherBooksInSeries.mapBy('id'),
        ['isbn:9780439064873', 'isbn:9780439136365'],
        'ref array looks up the referenced objects'
      );

      var chamberOfSecrets = this.store.peekRecord(
        'com.example.bookstore.Book',
        'isbn:9780439064873'
      );
      var gobletOfFire = this.store.peekRecord('com.example.bookstore.Book', 'isbn:9780439139601');
      Ember.run(function() {
        model.set('otherBooksInSeries', [chamberOfSecrets, gobletOfFire]);
      });
      assert.deepEqual(
        Ember.get(model, 'otherBooksInSeries').mapBy('id'),
        ['isbn:9780439064873', 'isbn:9780439139601'],
        'ref arrays update on set'
      );
      assert.deepEqual(
        otherBooksInSeries.mapBy('id'),
        ['isbn:9780439064873', 'isbn:9780439139601'],
        'ref arrays can be "set" like DS.hasMany'
      );

      // Need to rollback to detect the changes from the server
      model.rollbackAttributes();

      Ember.run(function() {
        _this4.store.push({
          data: {
            id: 'isbn:9780439708180',
            type: 'com.example.bookstore.Book',
            attributes: {
              name: "Harry Potter and the Sorcerer's Stone",
              '*otherBooksInSeries': ['isbn:9780439136365', 'isbn:9780439358071'],
            },
          },
          included: [
            {
              id: 'isbn:9780439358071',
              type: 'com.example.bookstore.Book',
              attributes: {
                name: 'Harry Potter and the Order of the Phoenix',
              },
            },
          ],
        });
      });

      assert.deepEqual(
        Ember.get(model, 'otherBooksInSeries').mapBy('id'),
        ['isbn:9780439136365', 'isbn:9780439358071'],
        'ref array properties update from server'
      );
      assert.deepEqual(
        otherBooksInSeries.mapBy('id'),
        ['isbn:9780439136365', 'isbn:9780439358071'],
        'ref arrays update in-place; treated like RecordArrays'
      );
    });

    (0,
    _qunit.test)('reference arrays act like record arrays - deleted records removed', function(assert) {
      var _this5 = this;

      this.owner.register(
        'adapter:-ember-m3',
        Ember.Object.extend({
          deleteRecord: function deleteRecord() {
            return Ember.RSVP.resolve();
          },
        })
      );
      var model = Ember.run(function() {
        return _this5.store.push({
          data: {
            id: 'isbn:9780439708180',
            type: 'com.example.bookstore.Book',
            attributes: {
              name: "Harry Potter and the Sorcerer's Stone",
              '*otherBooksInSeries': ['isbn:9780439064873', 'isbn:9780439136365'],
            },
          },
          included: [
            {
              id: 'isbn:9780439064873',
              type: 'com.example.bookstore.Book',
              attributes: {
                name: 'Harry Potter and the Chamber of Secrets',
              },
            },
            {
              id: 'isbn:9780439136365',
              type: 'com.example.bookstore.Book',
              attributes: {
                name: 'Harry Potter and the Prisoner of Azkaban',
              },
            },
          ],
        });
      });

      var otherBooks = void 0;

      return Ember.run(function() {
        otherBooks = Ember.get(model, 'otherBooksInSeries');
        assert.deepEqual(
          otherBooks.mapBy('id'),
          ['isbn:9780439064873', 'isbn:9780439136365'],
          'reference array initially resolved'
        );

        return otherBooks.objectAt(0).destroyRecord();
      }).then(function() {
        assert.strictEqual(
          Ember.get(model, 'otherBooksInSeries'),
          otherBooks,
          'record array re-used'
        );
        assert.deepEqual(
          otherBooks.mapBy('id'),
          ['isbn:9780439136365'],
          'destroyed model removed from existing record arrays'
        );
      });
    });

    (0,
    _qunit.test)('.setUnknownProperty updates cached RecordArrays in-place for given arrays and RecordArrays', function(assert) {
      var _this6 = this;

      var model = Ember.run(function() {
        return _this6.store.push({
          data: {
            id: 'isbn:9780439708180',
            type: 'com.example.bookstore.Book',
            attributes: {
              name: "Harry Potter and the Sorcerer's Stone",
              '*relatedBooks': ['isbn:9780439064873', 'isbn:9780439136365'],
              '*otherRecordArray': [],
            },
          },
          included: [
            {
              id: 'isbn:9780439064873',
              type: 'com.example.bookstore.Book',
              attributes: {
                name: 'Harry Potter and the Chamber of Secrets',
              },
            },
            {
              id: 'isbn:9780439136365',
              type: 'com.example.bookstore.Book',
              attributes: {
                name: 'Harry Potter and the Prisoner of Azkaban',
              },
            },
          ],
        });
      });

      var relatedBooksRecordArray = Ember.get(model, 'relatedBooks');
      var otherRecordArray = Ember.get(model, 'otherRecordArray');
      var relatedBooksPlainArray = [
        this.store.peekRecord('com.example.bookstore.Book', 'isbn:9780439136365'),
      ];

      assert.deepEqual(
        relatedBooksRecordArray.map(function(b) {
          return Ember.get(b, 'id');
        }),
        ['isbn:9780439064873', 'isbn:9780439136365'],
        'initially record array has the server-provided values'
      );

      Ember.run(function() {
        return Ember.set(model, 'relatedBooks', relatedBooksPlainArray);
      });
      assert.deepEqual(
        Ember.get(model, 'relatedBooks').map(function(b) {
          return Ember.get(b, 'id');
        }),
        ['isbn:9780439136365'],
        'existing attr record array is updated in-place from plain array'
      );
      assert.strictEqual(
        Ember.get(model, 'relatedBooks'),
        relatedBooksRecordArray,
        'initial record array is re-used from plain array'
      );

      Ember.run(function() {
        return Ember.set(model, 'relatedBooks', otherRecordArray);
      });
      assert.deepEqual(
        Ember.get(model, 'relatedBooks').map(function(b) {
          return Ember.get(b, 'id');
        }),
        [],
        'existing attr record array is updated in-place from record array'
      );
      assert.strictEqual(
        Ember.get(model, 'relatedBooks'),
        relatedBooksRecordArray,
        'initial record array is re-used from record array'
      );

      Ember.run(function() {
        return Ember.set(model, 'newRecordArray', relatedBooksRecordArray);
      });
      Ember.run(function() {
        otherRecordArray.pushObject(
          _this6.store.peekRecord('com.example.bookstore.Book', 'isbn:9780439064873')
        );
      });
      Ember.run(function() {
        return Ember.set(model, 'newRecordArray', otherRecordArray);
      });
      assert.deepEqual(
        Ember.get(model, 'newRecordArray').map(function(b) {
          return Ember.get(b, 'id');
        }),
        ['isbn:9780439064873'],
        'new attr record array is updated in place once cached'
      );
      assert.strictEqual(
        Ember.get(model, 'newRecordArray'),
        relatedBooksRecordArray,
        'new attr record array is re-used once cached'
      );
    });

    (0, _qunit.test)('M3RecordArray has length as a property', function(assert) {
      var _this7 = this;

      var model = Ember.run(function() {
        return _this7.store.push({
          data: {
            id: 'isbn:9780439708180',
            type: 'com.example.bookstore.Book',
            attributes: {
              name: "Harry Potter and the Sorcerer's Stone",
              '*relatedBooks': ['isbn:9780439064873', 'isbn:9780439136365'],
              '*otherRecordArray': [],
            },
          },
          included: [
            {
              id: 'isbn:9780439064873',
              type: 'com.example.bookstore.Book',
              attributes: {
                name: 'Harry Potter and the Chamber of Secrets',
              },
            },
            {
              id: 'isbn:9780439136365',
              type: 'com.example.bookstore.Book',
              attributes: {
                name: 'Harry Potter and the Prisoner of Azkaban',
              },
            },
          ],
        });
      });

      var relatedBooks = Ember.get(model, 'relatedBooks');
      assert.equal(
        relatedBooks.length,
        2,
        'M3RecordArray instance returns array length upon just checking length property'
      );
    });

    (0, _qunit.test)('reference array payload can update to undefined', function(assert) {
      var _this8 = this;

      var model = Ember.run(function() {
        return _this8.store.push({
          data: {
            id: 'isbn:9780439708180',
            type: 'com.example.bookstore.Book',
            attributes: {
              name: "Harry Potter and the Sorcerer's Stone",
              '*relatedBooks': ['isbn:9780439064873', 'isbn:9780439136365'],
            },
          },
          included: [
            {
              id: 'isbn:9780439064873',
              type: 'com.example.bookstore.Book',
              attributes: {
                name: 'Harry Potter and the Chamber of Secrets',
              },
            },
            {
              id: 'isbn:9780439136365',
              type: 'com.example.bookstore.Book',
              attributes: {
                name: 'Harry Potter and the Prisoner of Azkaban',
              },
            },
          ],
        });
      });

      assert.deepEqual(
        Ember.get(model, 'relatedBooks').map(function(x) {
          return Ember.get(x, 'name');
        }),
        ['Harry Potter and the Chamber of Secrets', 'Harry Potter and the Prisoner of Azkaban']
      );

      Ember.run(function() {
        _this8.store.push({
          data: {
            id: 'isbn:9780439708180',
            type: 'com.example.bookstore.Book',
            attributes: {
              name: "Harry Potter and the Sorcerer's Stone",
              '*relatedBooks': undefined,
            },
          },
        });
      });

      assert.deepEqual(
        Ember.get(model, 'relatedBooks').map(function(x) {
          return Ember.get(x, 'name');
        }),
        [],
        'array empty'
      );
    });

    (0,
    _qunit.test)('updated reference arrays resolve their new references lazily when using the global cache', function(assert) {
      var _this9 = this;

      var model = Ember.run(function() {
        // use obj instead of urn here so `_resolve` puts us in global cache
        // rather than knowing the type from the id
        return _this9.store.push({
          data: {
            id: 'obj:9780439708180',
            type: 'com.example.bookstore.Book',
            attributes: {
              name: "Harry Potter and the Sorcerer's Stone",
              '*relatedBooks': [],
            },
          },
          included: [],
        });
      });

      var relatedBooks = model.get('relatedBooks');
      assert.deepEqual(relatedBooks.mapBy('id'), [], 'record array instantiated');

      Ember.run(function() {
        _this9.store.push({
          data: {
            id: 'record:1',
            type: 'com.example.bookstore.Unrelated',
          },
          included: [
            {
              id: 'obj:9780439708180',
              type: 'com.example.bookstore.Book',
              attributes: {
                name: "Harry Potter and the Sorcerer's Stone",
                '*relatedBooks': ['obj:9780439064873', 'obj:9780439136365'],
              },
            },
            {
              id: 'obj:9780439064873',
              type: 'com.example.bookstore.Book',
              attributes: {
                name: 'Harry Potter and the Chamber of Secrets',
              },
            },
            {
              id: 'obj:9780439136365',
              type: 'com.example.bookstore.Book',
              attributes: {
                name: 'Harry Potter and the Prisoner of Azkaban',
              },
            },
          ],
        });
      });

      assert.deepEqual(
        relatedBooks.mapBy('id'),
        ['obj:9780439064873', 'obj:9780439136365'],
        'record array updates references lazily'
      );
    });

    // TODO: add support instead for a missing ref hook #254
    (0, _qunit.test)('reference arrays can point to nonexistant records', function(assert) {
      var _this10 = this;

      var model = Ember.run(function() {
        // use obj instead of urn here so `_resolve` puts us in global cache
        // rather than knowing the type from the id
        return _this10.store.push({
          data: {
            id: 'obj:9780439708180',
            type: 'com.example.bookstore.Book',
            attributes: {
              name: "Harry Potter and the Sorcerer's Stone",
              '*relatedBooks': [],
            },
          },
          included: [],
        });
      });

      var relatedBooks = model.get('relatedBooks');
      assert.deepEqual(relatedBooks.mapBy('id'), [], 'record array instantiated');

      Ember.run(function() {
        _this10.store.push({
          data: {
            id: 'record:1',
            type: 'com.example.bookstore.Unrelated',
          },
          included: [
            {
              id: 'obj:9780439708180',
              type: 'com.example.bookstore.Book',
              attributes: {
                name: "Harry Potter and the Sorcerer's Stone",
                '*relatedBooks': ['obj:9780439064873', 'obj:9780439136365'],
              },
            },
          ],
        });
      });

      assert.deepEqual(relatedBooks.toArray(), [null, null], 'record arrays can point to null');
    });
  });
});
define('dummy/tests/unit/model/saving-test', [
  'qunit',
  'ember-qunit',
  'ember-m3/-private',
  'ember-m3/services/m3-schema',
], function(_qunit, _emberQunit, _private, _m3Schema) {
  'use strict';

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

  (0, _qunit.module)('unit/model/saving', function(hooks) {
    (0, _emberQunit.setupTest)(hooks);

    hooks.beforeEach(function() {
      this.owner.register(
        'service:m3-schema',
        (function(_DefaultSchema) {
          _inherits(TestSchema, _DefaultSchema);

          function TestSchema() {
            _classCallCheck(this, TestSchema);

            return _possibleConstructorReturn(
              this,
              (TestSchema.__proto__ || Object.getPrototypeOf(TestSchema)).apply(this, arguments)
            );
          }

          _createClass(TestSchema, [
            {
              key: 'includesModel',
              value: function includesModel(modelName) {
                return /^com.example.bookstore\./i.test(modelName);
              },
            },
            {
              key: 'computeNestedModel',
              value: function computeNestedModel(key, value /*, modelName, schemaInterface */) {
                if (
                  value !== undefined &&
                  (typeof value === 'undefined' ? 'undefined' : _typeof(value)) === 'object'
                ) {
                  return {
                    attributes: value,
                  };
                }
              },
            },
          ]);

          return TestSchema;
        })(_m3Schema.default)
      );
      this.store = this.owner.lookup('service:store');
    });

    (0, _qunit.test)('.save saves via the store', function(assert) {
      var _this2 = this;

      assert.expect(4);

      this.owner.register(
        'adapter:-ember-m3',
        (function() {
          function TestAdapter() {
            _classCallCheck(this, TestAdapter);
          }

          _createClass(
            TestAdapter,
            [
              {
                key: 'updateRecord',
                value: function updateRecord(store, type, snapshot) {
                  assert.equal(snapshot.record.get('isSaving'), true, 'record is saving');
                  return Promise.resolve({
                    data: {
                      id: 1,
                      type: 'com.example.bookstore.Book',
                      attributes: {
                        name: 'The Winds of Winter',
                        estimatedRating: '11/10',
                      },
                    },
                  });
                },
              },
            ],
            [
              {
                key: 'create',
                value: function create() {
                  return new (Function.prototype.bind.apply(
                    TestAdapter,
                    [null].concat(Array.prototype.slice.call(arguments))
                  ))();
                },
              },
            ]
          );

          return TestAdapter;
        })()
      );

      var record = Ember.run(function() {
        return _this2.store.push({
          data: {
            id: 1,
            type: 'com.example.bookstore.Book',
            attributes: {
              name: 'The Winds of Winter',
              estimatedPubDate: 'January 2622',
            },
          },
        });
      });

      assert.equal(record.get('isSaving'), false, 'initially record not saving');

      return Ember.run(function() {
        record.set('estimatedPubDate', '2231?');

        return record.save().then(function() {
          assert.equal(record.get('isSaving'), false, 'record done saving');
          assert.deepEqual(
            (0, _private.recordDataFor)(record)._data,
            {
              name: 'The Winds of Winter',
              estimatedRating: '11/10',
              estimatedPubDate: '2231?',
            },
            'data post save resolve'
          );
        });
      });
    });

    (0, _qunit.test)('.save disallows saving embedded models', function(assert) {
      var _this3 = this;

      assert.expect(1);

      this.owner.register(
        'adapter:-ember-m3',
        (function() {
          function TestAdapter() {
            _classCallCheck(this, TestAdapter);
          }

          _createClass(
            TestAdapter,
            [
              {
                key: 'updateRecord',
                value: function updateRecord() {
                  assert.ok(false, 'Adapter updateRecord should not be invoked');
                },
              },
            ],
            [
              {
                key: 'create',
                value: function create() {
                  return new (Function.prototype.bind.apply(
                    TestAdapter,
                    [null].concat(Array.prototype.slice.call(arguments))
                  ))();
                },
              },
            ]
          );

          return TestAdapter;
        })()
      );

      var record = Ember.run(function() {
          return _this3.store.push({
            data: {
              id: 1,
              type: 'com.example.bookstore.Book',
              attributes: {
                author: {
                  name: 'George R. R. Martin',
                },
                name: 'The Winds of Winter',
                estimatedPubDate: 'January 2622',
              },
            },
          });
        }),
        author = record.get('author');

      assert.throws(function() {
        return author.save();
      }, /Nested models cannot be directly saved. Perhaps you meant to save the top level model, 'com.example.bookstore.book:1'/);
    });

    (0,
    _qunit.test)('.reload calls findRecord with reload: true and passes adapterOptions', function(assert) {
      var _this4 = this;

      assert.expect(3);

      this.owner.register(
        'adapter:-ember-m3',
        (function() {
          function TestAdapter() {
            _classCallCheck(this, TestAdapter);
          }

          _createClass(
            TestAdapter,
            [
              {
                key: 'findRecord',
                value: function findRecord(store, type, id, snapshot) {
                  // TODO: this is annoying but name normalization means we get the wrong
                  // model name in snapshots. See #11
                  assert.equal(
                    snapshot.modelName,
                    'com.example.bookstore.book',
                    'snapshot.modelName'
                  );
                  assert.equal(id, '1', 'findRecord(id)');
                  var adapterOptions = snapshot.adapterOptions;

                  assert.deepEqual(
                    adapterOptions,
                    {
                      doAdapterThings: true,
                    },
                    'adapterOptions passed to adapter from record.reload'
                  );

                  return Promise.resolve({
                    data: {
                      id: '1',
                      type: 'com.example.bookstore.Book',
                      attributes: {
                        name: 'The Winds of Winter',
                      },
                    },
                  });
                },
              },
            ],
            [
              {
                key: 'create',
                value: function create() {
                  return new (Function.prototype.bind.apply(
                    TestAdapter,
                    [null].concat(Array.prototype.slice.call(arguments))
                  ))();
                },
              },
            ]
          );

          return TestAdapter;
        })()
      );

      var record = Ember.run(function() {
        return _this4.store.push({
          data: {
            id: '1',
            type: 'com.example.bookstore.book',
            attributes: {
              name: 'The Winds of Winter',
            },
          },
        });
      });

      return Ember.run(function() {
        return record.reload({ adapterOptions: { doAdapterThings: true } });
      });
    });

    (0, _qunit.test)('.deleteRecord works', function(assert) {
      var _this5 = this;

      assert.expect(2);

      this.owner.register(
        'adapter:-ember-m3',
        (function() {
          function TestAdapter() {
            _classCallCheck(this, TestAdapter);
          }

          _createClass(
            TestAdapter,
            [
              {
                key: 'deteRecord',
                value: function deteRecord() {
                  assert.ok(false, 'Did not make it to adapter');
                },
              },
            ],
            [
              {
                key: 'create',
                value: function create() {
                  return new (Function.prototype.bind.apply(
                    TestAdapter,
                    [null].concat(Array.prototype.slice.call(arguments))
                  ))();
                },
              },
            ]
          );

          return TestAdapter;
        })()
      );

      var record = Ember.run(function() {
        return _this5.store.push({
          data: {
            id: 1,
            type: 'com.example.bookstore.Book',
            attributes: {
              name: 'The Winds of Winter',
            },
          },
        });
      });

      assert.equal(record.get('isDeleted'), false, 'not initially deleted');
      record.deleteRecord();
      assert.equal(record.get('isDeleted'), true, 'record deleted');
    });

    (0, _qunit.test)('.destroyRecord works for existing records', function(assert) {
      var _this6 = this;

      assert.expect(4);

      this.owner.register(
        'adapter:-ember-m3',
        (function() {
          function TestAdapter() {
            _classCallCheck(this, TestAdapter);
          }

          _createClass(
            TestAdapter,
            [
              {
                key: 'deleteRecord',
                value: function deleteRecord(store, type, snapshot) {
                  assert.equal(snapshot.record.get('isDeleted'), true, 'record is deleted');
                  return Promise.resolve();
                },
              },
            ],
            [
              {
                key: 'create',
                value: function create() {
                  return new (Function.prototype.bind.apply(
                    TestAdapter,
                    [null].concat(Array.prototype.slice.call(arguments))
                  ))();
                },
              },
            ]
          );

          return TestAdapter;
        })()
      );

      var record = Ember.run(function() {
        return _this6.store.push({
          data: {
            id: 1,
            type: 'com.example.bookstore.Book',
            attributes: {
              name: 'The Winds of Winter',
            },
          },
        });
      });

      assert.equal(
        this.store.hasRecordForId('com.example.bookstore.book', '1'),
        true,
        'record in identity map'
      );
      assert.equal(record.get('isDeleted'), false, 'not initially deleted');
      return Ember.run(function() {
        return record
          .destroyRecord()
          .then(function() {
            return record.unloadRecord();
          })
          .then(function() {
            assert.equal(
              _this6.store.hasRecordForId('com.example.bookstore.book', '1'),
              false,
              'gone from identity map'
            );
          });
      });
    });

    (0, _qunit.test)('.destroyRecord works for new records', function(assert) {
      assert.expect(2);

      this.owner.register(
        'adapter:-ember-m3',
        (function() {
          function TestAdapter() {
            _classCallCheck(this, TestAdapter);
          }

          _createClass(
            TestAdapter,
            [
              {
                key: 'deleteRecord',
                value: function deleteRecord() /* store, type, snapshot */ {
                  assert.ok(false, 'destroying new records does not cause an API call');
                  return Promise.reject();
                },
              },
            ],
            [
              {
                key: 'create',
                value: function create() {
                  return new (Function.prototype.bind.apply(
                    TestAdapter,
                    [null].concat(Array.prototype.slice.call(arguments))
                  ))();
                },
              },
            ]
          );

          return TestAdapter;
        })()
      );

      var record = this.store.createRecord('com.example.bookstore.Book', {
        title: 'The Storm Before the Storm',
      });

      assert.equal(record.get('isDeleted'), false, 'not initially deleted');

      return Ember.run(function() {
        return record.destroyRecord().then(function() {
          assert.equal(record.get('isDeleted'), true, 'record.isDeleted');
        });
      });
    });
  });
});
define('dummy/tests/unit/model/state-test', [
  'qunit',
  'ember-qunit',
  'ember-m3/services/m3-schema',
], function(_qunit, _emberQunit, _m3Schema) {
  'use strict';

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

  (0, _qunit.module)('unit/model/state', function(hooks) {
    (0, _emberQunit.setupTest)(hooks);

    hooks.beforeEach(function() {
      this.store = this.owner.lookup('service:store');

      var TestSchema = (function(_DefaultSchema) {
        _inherits(TestSchema, _DefaultSchema);

        function TestSchema() {
          _classCallCheck(this, TestSchema);

          return _possibleConstructorReturn(
            this,
            (TestSchema.__proto__ || Object.getPrototypeOf(TestSchema)).apply(this, arguments)
          );
        }

        _createClass(TestSchema, [
          {
            key: 'includesModel',
            value: function includesModel() {
              return true;
            },
          },
          {
            key: 'computeAttributeReference',
            value: function computeAttributeReference(key, value, modelName, schemaInterface) {
              var refValue = schemaInterface.getAttr('*' + key);
              if (typeof refValue === 'string') {
                return {
                  type: null,
                  id: refValue,
                };
              } else if (Array.isArray(refValue)) {
                return refValue.map(function(x) {
                  return {
                    type: null,
                    id: x,
                  };
                });
              }
              return null;
            },
          },
          {
            key: 'computeNestedModel',
            value: function computeNestedModel(key, value) {
              if (
                value &&
                (typeof value === 'undefined' ? 'undefined' : _typeof(value)) === 'object' &&
                value.constructor !== Date &&
                !Ember.isArray(value)
              ) {
                return {
                  type: value.type,
                  id: value.id,
                  attributes: value,
                };
              }
            },
          },
        ]);

        return TestSchema;
      })(_m3Schema.default);

      this.owner.register('service:m3-schema', TestSchema);
    });

    (0, _qunit.skip)('isEmpty', function() {});
    (0, _qunit.skip)('isLoading', function() {});
    (0, _qunit.skip)('isLoaded', function() {});
    (0, _qunit.skip)('isSaving', function() {});
    (0, _qunit.skip)('isDeleted', function() {});
    (0, _qunit.skip)('isValid', function() {});

    (0, _qunit.test)('isNew', function(assert) {
      var _this2 = this;

      var existingRecord = Ember.run(function() {
        return _this2.store.push({
          data: {
            id: 1,
            type: 'com.example.bookstore.Book',
            attributes: {
              title: 'The Storm Before the Storm',
              author: 'Mike Duncan',
            },
          },
        });
      });

      assert.equal(existingRecord.get('isNew'), false, 'existingRecord.isNew');

      existingRecord.deleteRecord();

      assert.equal(existingRecord.get('isDirty'), true, 'existingRecor.delete() -> isDirty');

      var newRecord = this.store.createRecord('com.example.bookstore.Book', {
        title: 'Something is Going On',
        author: 'Just Some Friendly Guy',
      });

      assert.equal(newRecord.get('isNew'), true, 'newRecord.isNew');

      newRecord.deleteRecord();

      assert.equal(newRecord.get('isDirty'), false, 'newRecord.delete() -> isDirty');
    });

    (0, _qunit.test)('isDirty', function(assert) {
      var _this3 = this;

      var record = Ember.run(function() {
        return _this3.store.push({
          data: {
            id: 1,
            type: 'com.example.bookstore.Book',
            attributes: {
              name: 'The Winds of Winter',
              author: 'George R. R. Martin',
              rating: {
                avg: 10,
              },
            },
          },
        });
      });

      assert.equal(record.get('isDirty'), false, 'record not dirty');
      assert.equal(record.get('rating.isDirty'), false, 'nested record not dirty');

      record.set('author', 'Nobody yet');

      assert.equal(record.get('isDirty'), true, 'record dirty');
      assert.equal(
        record.get('rating.isDirty'),
        true,
        'nested record shares dirty state with parent'
      );

      record.rollbackAttributes();

      assert.equal(record.get('isDirty'), false, 'record no longer dirty');
      assert.equal(record.get('rating.isDirty'), false, 'nested record no longer dirty');

      record.set('rating.avg', 11);

      assert.equal(record.get('isDirty'), true, 'record shares state with nested record');
      assert.equal(record.get('rating.isDirty'), true, 'nested record dirty');
    });
  });
});
define('dummy/tests/unit/model/tracked-array-test', [
  'sinon',
  'qunit',
  'ember-qunit',
  'ember-m3/m3-tracked-array',
  'ember-m3/services/m3-schema',
], function(_sinon, _qunit, _emberQunit, _m3TrackedArray, _m3Schema) {
  'use strict';

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

  (0, _qunit.module)('unit/model/tracked-array', function(hooks) {
    (0, _emberQunit.setupTest)(hooks);

    hooks.beforeEach(function() {
      this.sinon = _sinon.default.createSandbox();
      this.owner.register(
        'service:m3-schema',
        (function(_DefaultSchema) {
          _inherits(TestSchema, _DefaultSchema);

          function TestSchema() {
            _classCallCheck(this, TestSchema);

            return _possibleConstructorReturn(
              this,
              (TestSchema.__proto__ || Object.getPrototypeOf(TestSchema)).apply(this, arguments)
            );
          }

          _createClass(TestSchema, [
            {
              key: 'includesModel',
              value: function includesModel(modelName) {
                return /^com.example.bookstore\./i.test(modelName);
              },
            },
            {
              key: 'computeNestedModel',
              value: function computeNestedModel(key, value /*, modelName, schemaInterface */) {
                if (
                  (typeof value === 'undefined' ? 'undefined' : _typeof(value)) === 'object' &&
                  value !== null &&
                  !Array.isArray(value)
                ) {
                  return {
                    attributes: value,
                  };
                }
              },
            },
          ]);

          return TestSchema;
        })(_m3Schema.default)
      );

      this.store = this.owner.lookup('service:store');
    });

    (0, _qunit.test)('tracked, non-reference, arrays resolve new values', function(assert) {
      var _this2 = this;

      var model = Ember.run(function() {
        return _this2.store.push({
          data: {
            id: 'isbn:9780439708180',
            type: 'com.example.bookstore.Book',
            attributes: {
              name: "Harry Potter and the Sorcerer's Stone",
              chapters: [
                {
                  name: 'The Boy Who Lived',
                },
                2,
              ],
            },
          },
        });
      });

      var chapters = model.get('chapters');
      assert.equal(
        chapters instanceof _m3TrackedArray.default,
        true,
        'chapters is a tracked array'
      );

      var chapter1 = chapters.objectAt(0);
      assert.equal(chapter1.constructor.isModel, true, 'chapters has resolved values');
      assert.equal(
        chapter1.get('name'),
        'The Boy Who Lived',
        "chapters's embedded records can resolve values"
      );

      assert.equal(
        chapters.objectAt(1),
        2,
        'chapters is a heterogenous mix of resolved and unresolved values'
      );

      Ember.run(function() {
        return chapters.pushObject(3);
      });
      assert.equal(chapters.objectAt(2), 3, "chapters accepts new values that don't resolve");

      Ember.run(function() {
        return chapters.pushObject({ name: 'The Vanishing Glass' });
      });

      var chapter2 = chapters.objectAt(3);
      assert.equal(chapter2.constructor.isModel, true, 'new values can be resolved');
      assert.equal(
        Ember.get(chapter2, 'name'),
        'The Vanishing Glass',
        'new values can be resolved'
      );
    });

    (0,
    _qunit.test)('tracked nested array, non-reference, arrays resolve new values', function(assert) {
      var _this3 = this;

      var model = Ember.run(function() {
        return _this3.store.push({
          data: {
            id: 'isbn:9780439708180',
            type: 'com.example.bookstore.Book',
            attributes: {
              name: "Harry Potter and the Sorcerer's Stone",
              chapters: [
                {
                  name: 'The Boy Who Lived',
                },
              ],
            },
          },
        });
      });

      var chapters = model.get('chapters');
      assert.equal(
        chapters instanceof _m3TrackedArray.default,
        true,
        'chapters is a tracked array'
      );

      var chapter1 = chapters.objectAt(0);
      assert.equal(chapter1.constructor.isModel, true, 'chapters has resolved values');
      assert.equal(
        chapter1.get('name'),
        'The Boy Who Lived',
        "chapters's embedded records can resolve values"
      );

      Ember.run(function() {
        return chapters.pushObject({ name: 'The Vanishing Glass' });
      });

      var chapter2 = chapters.objectAt(1);
      assert.equal(chapter2.constructor.isModel, true, 'new values can be resolved');
      assert.equal(
        Ember.get(chapter2, 'name'),
        'The Vanishing Glass',
        'new values can be resolved'
      );

      //Remove object
      Ember.run(function() {
        return chapters.shiftObject();
      });
      assert.equal(chapters.length, 1, 'Item is removed');
      chapter1 = chapters.objectAt(0);
      assert.equal(chapter1.constructor.isModel, true, 'chapters has resolved values');
      assert.equal(
        Ember.get(chapter1, 'name'),
        'The Vanishing Glass',
        'First item is removed from the array'
      );

      //Push new object
      Ember.run(function() {
        return chapters.pushObject({ name: 'The Vanishing Glass Pt. 2' });
      });
      assert.equal(chapters.length, 2, 'Item is pushed at the end');
      var chapter3 = chapters.objectAt(1);
      assert.equal(chapter3.constructor.isModel, true, 'new values can be resolved');
      assert.equal(
        Ember.get(chapter3, 'name'),
        'The Vanishing Glass Pt. 2',
        'new values can be resolved'
      );

      //unshit object
      Ember.run(function() {
        return chapters.unshiftObject({ name: 'The Boy Who Lived' });
      });
      chapter1 = chapters.objectAt(0);
      assert.equal(chapters.length, 3, 'Item is removed');
      assert.equal(chapter1.constructor.isModel, true, 'chapters has resolved values');
      assert.equal(chapter1.get('name'), 'The Boy Who Lived', 'added record at the start');
    });

    (0,
    _qunit.test)('unloaded records are automatically removed from tracked arrays', function(assert) {
      var _this4 = this;

      var model = Ember.run(function() {
        return _this4.store.push({
          data: {
            id: 'isbn:9780439708180',
            type: 'com.example.bookstore.Book',
            attributes: {
              name: "Harry Potter and the Sorcerer's Stone",
              chapters: [],
            },
          },
          included: [
            {
              id: 'isbn:9780439708180:chapter:1',
              type: 'com.example.bookstore.Chapter',
              attributes: {
                name: 'The Boy Who Lived',
              },
            },
            {
              id: 'isbn:9780439708180:chapter:2',
              type: 'com.example.bookstore.Chapter',
              attributes: {
                name: 'The Vanishing Glass',
              },
            },
          ],
        });
      });

      var chapter1 = this.store.peekRecord(
        'com.example.bookstore.Chapter',
        'isbn:9780439708180:chapter:1'
      );
      var chapter2 = this.store.peekRecord(
        'com.example.bookstore.Chapter',
        'isbn:9780439708180:chapter:2'
      );
      var chapters = model.get('chapters');

      Ember.run(function() {
        return chapters.pushObject(chapter1);
      });
      Ember.run(function() {
        return chapters.pushObject(chapter2);
      });

      assert.deepEqual(
        chapters.mapBy('name'),
        ['The Boy Who Lived', 'The Vanishing Glass'],
        'records are added to tracked arrays'
      );

      Ember.run(function() {
        return chapter2.unloadRecord();
      });

      assert.deepEqual(
        chapters.mapBy('name'),
        ['The Boy Who Lived'],
        'unloaded records are removed from tracked arrays'
      );
    });

    (0, _qunit.test)('embedded models can be added to tracked arrays', function(assert) {
      var _this5 = this;

      this.schema = this.owner.lookup('service:m3-schema');
      this.sinon.spy(this.schema, 'setAttribute');

      var _EmberRun = Ember.run(function() {
          return _this5.store.push({
            data: [
              {
                id: 'isbn:9780439708180',
                type: 'com.example.bookstore.Book',
                attributes: {
                  name: "Harry Potter and the Sorcerer's Stone",
                  chapters: [
                    {
                      name: 'The Boy Who Lived',
                    },
                  ],
                },
              },
              {
                id: 'urn:isbn9780439064873',
                type: 'com.example.bookstore.Book',
                attributes: {
                  name: 'Harry Potter and the Chamber of Secrets',
                  chapters: [
                    {
                      name: 'The Worst Birthday',
                    },
                  ],
                },
              },
            ],
          });
        }),
        _EmberRun2 = _slicedToArray(_EmberRun, 2),
        book1 = _EmberRun2[0],
        book2 = _EmberRun2[1];

      var book1Chapter1 = book1.get('chapters').objectAt(0);
      var book2Chapter1 = book2.get('chapters').objectAt(0);
      book2.get('chapters').pushObject(book1Chapter1);

      assert.equal(this.schema.setAttribute.callCount, 1, 'setAttribute called once');
      assert.deepEqual(this.schema.setAttribute.lastCall.args.slice(0, -1), [
        // model name is "normalized"
        'com.example.bookstore.book',
        'chapters',
        [book2Chapter1, book1Chapter1],
      ]);

      assert.deepEqual(
        book1.get('chapters').mapBy('name'),
        ['The Boy Who Lived'],
        'book1 chapters correct'
      );
      assert.deepEqual(
        book2.get('chapters').mapBy('name'),
        ['The Worst Birthday', 'The Boy Who Lived'],
        'book2 chapters correct'
      );

      assert.strictEqual(
        book1.get('chapters').objectAt(0),
        book2.get('chapters').objectAt(1),
        'embedded model can be shared between tracked arrays'
      );
    });
  });
});
define('dummy/tests/unit/projection-test', [
  'qunit',
  'ember-qunit',
  'ember-m3/model',
  'dummy/tests/helpers/watch-property',
  'ember-m3/services/m3-schema',
], function(_qunit, _emberQunit, _model, _watchProperty, _m3Schema) {
  'use strict';

  function _defineProperty(obj, key, value) {
    if (key in obj) {
      Object.defineProperty(obj, key, {
        value: value,
        enumerable: true,
        configurable: true,
        writable: true,
      });
    } else {
      obj[key] = value;
    }

    return obj;
  }

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

  /*
    Ember Data currently dasherizes modelNames for use within the store, in these tests
    payloads given to the store use non-normalized modelNames while schemas and
    anything which accesses a model's modelName uses the normalized (dasherized) version.
   */
  var BOOK_CLASS_PATH = 'com.example.bookstore.Book';
  var NORM_BOOK_CLASS_PATH = 'com.example.bookstore.book';
  var BOOK_EXCERPT_PROJECTION_CLASS_PATH = 'com.example.bookstore.projection.BookExcerpt';
  var NORM_BOOK_EXCERPT_PROJECTION_CLASS_PATH = 'com.example.bookstore.projection.book-excerpt';
  var BOOK_PREVIEW_PROJECTION_CLASS_PATH = 'com.example.bookstore.projection.BookPreview';
  var NORM_BOOK_PREVIEW_PROJECTION_CLASS_PATH = 'com.example.bookstore.projection.book-preview';
  var PROJECTED_AUTHOR_CLASS = 'com.example.bookstore.projectedType.ProjectedAuthor';
  var NORM_PROJECTED_AUTHOR_CLASS = 'com.example.bookstore.projected-type.projected-author';
  var PUBLISHER_CLASS = 'com.example.bookstore.Publisher';
  var NORM_PUBLISHER_CLASS = 'com.example.bookstore.publisher';
  var PROJECTED_PUBLISHER_CLASS = 'com.example.bookstore.projectedType.ProjectedPublisher';
  var NORM_PROJECTED_PUBLISHER_CLASS = 'com.example.bookstore.projected-type.projected-publisher';

  (0, _qunit.module)('unit/projection', function(hooks) {
    (0, _emberQunit.setupTest)(hooks);

    hooks.beforeEach(function() {
      var _TestSchema$prototype;

      this.store = this.owner.lookup('service:store');

      var TestSchema = (function(_DefaultSchema) {
        _inherits(TestSchema, _DefaultSchema);

        function TestSchema() {
          _classCallCheck(this, TestSchema);

          return _possibleConstructorReturn(
            this,
            (TestSchema.__proto__ || Object.getPrototypeOf(TestSchema)).apply(this, arguments)
          );
        }

        _createClass(TestSchema, [
          {
            key: 'includesModel',
            value: function includesModel(modelName) {
              return /^com\.example\.bookstore\./i.test(modelName);
            },
          },
          {
            key: 'computeAttributeReference',
            value: function computeAttributeReference(key, value, modelName) {
              var _this2 = this;

              if (/^isbn:/.test(value)) {
                return {
                  id: value,
                  type: BOOK_CLASS_PATH,
                };
              } else if (/^urn:([^:]+):(.*)/.test(value)) {
                var parts = /^urn:([^:]+):(.*)/.exec(value);
                var type = parts[1];
                var modelSchema = this.models[modelName];

                if (
                  modelSchema &&
                  modelSchema.attributesTypes &&
                  modelSchema.attributesTypes[key]
                ) {
                  type = modelSchema.attributesTypes[key];
                }
                return {
                  type: type,
                  id: parts[2],
                };
              } else if (Array.isArray(value)) {
                return value
                  .map(function(v) {
                    var type = null;
                    var modelSchema = _this2.models[modelName];

                    if (
                      modelSchema &&
                      modelSchema.attributesTypes &&
                      modelSchema.attributesTypes[key]
                    ) {
                      type = modelSchema.attributesTypes[key];
                    }

                    return {
                      type: type,
                      id: Ember.get(v, 'id'),
                    };
                  })
                  .filter(Boolean);
              }
            },
          },
          {
            key: 'computeNestedModel',
            value: function computeNestedModel(key, value, modelName) {
              if (
                !value ||
                (typeof value === 'undefined' ? 'undefined' : _typeof(value)) !== 'object' ||
                value.constructor === Date
              ) {
                return null;
              }
              var valueType = value.type;
              var modelSchema = this.models[modelName];
              if (modelSchema && modelSchema.attributesTypes && modelSchema.attributesTypes[key]) {
                valueType = modelSchema.attributesTypes[key];
              }
              return {
                type: valueType,
                id: value.id,
                attributes: value,
              };
            },
          },
          {
            key: 'computeBaseModelName',
            value: function computeBaseModelName(modelName) {
              var schema = this.models[modelName];

              if (schema !== undefined) {
                return schema.baseType;
              }
            },
          },
        ]);

        return TestSchema;
      })(_m3Schema.default);

      TestSchema.prototype.models = ((_TestSchema$prototype = {}),
      _defineProperty(_TestSchema$prototype, NORM_BOOK_CLASS_PATH, {}),
      _defineProperty(_TestSchema$prototype, NORM_BOOK_EXCERPT_PROJECTION_CLASS_PATH, {
        baseType: BOOK_CLASS_PATH,
        attributes: ['title', 'author', 'year', 'publisher'],
      }),
      _defineProperty(_TestSchema$prototype, NORM_BOOK_PREVIEW_PROJECTION_CLASS_PATH, {
        baseType: BOOK_CLASS_PATH,
        attributesTypes: {
          publisher: PROJECTED_PUBLISHER_CLASS,
          author: PROJECTED_AUTHOR_CLASS,
          otherBooksInSeries: BOOK_PREVIEW_PROJECTION_CLASS_PATH,
        },
        // if you want to project an embedded model then it must have a type
        //  computedEmbeddedType
        attributes: ['title', 'author', 'chapter-1', 'year', 'publisher', 'otherBooksInSeries'],
      }),
      _defineProperty(_TestSchema$prototype, NORM_PUBLISHER_CLASS, {}),
      _defineProperty(_TestSchema$prototype, NORM_PROJECTED_AUTHOR_CLASS, {
        attributes: ['location', 'name'],
      }),
      _defineProperty(_TestSchema$prototype, NORM_PROJECTED_PUBLISHER_CLASS, {
        baseType: PUBLISHER_CLASS,
        attributes: ['location', 'name'],
      }),
      _TestSchema$prototype);
      this.owner.register('service:m3-schema', TestSchema);
      this.schemaManager = this.owner.lookup('service:m3-schema-manager');
    });

    (0, _qunit.module)('cache consistency', function() {
      (0,
      _qunit.test)('store.peekRecord() will only return a projection or base-record if it has been fetched', function(assert) {
        assert.expect(4);

        var UNFETCHED_PROJECTION_ID = 'isbn:9780439708180';
        var FETCHED_PROJECTION_ID = 'isbn:9780439708181';
        var store = this.store;

        /*
          populate the store with a starting state of
           a base-record for the UNFETCHED_PROJECTION_ID and a projected-record
           for the FETCHED_PROJECTION_ID
           remember:
            the FETCHED_PROJECTION_ID is the unfetched base-record
            the UNFETCHED_PROJECTION_ID is the already fetched base-record
          */
        Ember.run(function() {
          store.push({
            data: {
              type: BOOK_CLASS_PATH,
              id: UNFETCHED_PROJECTION_ID,
              attributes: {
                title: 'Carry On! Mr. Bowditch',
              },
            },
          });
          store.push({
            data: {
              type: BOOK_EXCERPT_PROJECTION_CLASS_PATH,
              id: FETCHED_PROJECTION_ID,
              attributes: {
                title: "Mr. Popper's Penguins",
              },
            },
          });
        });

        var projection = store.peekRecord(
          BOOK_EXCERPT_PROJECTION_CLASS_PATH,
          UNFETCHED_PROJECTION_ID
        );

        assert.equal(
          projection,
          null,
          'The unfetched projection with a fetched base-record is unfound by peekRecord()'
        );

        projection = store.peekRecord(BOOK_EXCERPT_PROJECTION_CLASS_PATH, FETCHED_PROJECTION_ID);
        assert.ok(
          projection instanceof _model.default,
          'The fetched projection is found by peekRecord()'
        );

        var record = store.peekRecord(BOOK_CLASS_PATH, UNFETCHED_PROJECTION_ID);
        assert.ok(
          record instanceof _model.default,
          'The fetched base-record is found by peekRecord()'
        );

        record = store.peekRecord(BOOK_CLASS_PATH, FETCHED_PROJECTION_ID);

        assert.equal(
          record,
          null,
          'The unfetched base-record with a fetched projection is unfound by peekRecord()'
        );
      });

      (0,
      _qunit.test)('store.findRecord() will only fetch a projection or base-model if it has not been fetched previously', function(assert) {
        assert.expect(12);

        var UNFETCHED_PROJECTION_ID = 'isbn:9780439708180';
        var FETCHED_PROJECTION_ID = 'isbn:9780439708181';
        var store = this.store;

        var expectedFindRecordModelName = void 0;
        var trueFindRecordModelName = void 0;
        var expectedFindRecordId = void 0;
        var findRecordCallCount = 0;

        this.owner.register(
          'adapter:-ember-m3',
          Ember.Object.extend({
            findRecord: function findRecord(store, modelClass, id, snapshot) {
              findRecordCallCount++;
              assert.equal(
                snapshot.modelName,
                expectedFindRecordModelName,
                'findRecord snapshot has the correct modelName'
              );
              assert.equal(id, expectedFindRecordId, 'findRecord received the correct id');

              return Ember.RSVP.Promise.resolve({
                data: {
                  id: expectedFindRecordId,
                  type: trueFindRecordModelName,
                  attributes: {
                    title: 'Carry on! Mr. Bowditch',
                  },
                },
              });
            },
            shouldReloadRecord: function shouldReloadRecord() {
              return false;
            },
            shouldBackgroundReloadRecord: function shouldBackgroundReloadRecord() {
              return false;
            },
          })
        );

        /*
          populate the store with a starting state of
           a base-record for the UNFETCHED_PROJECTION_ID and a projected-record
           for the FETCHED_PROJECTION_ID
           remember:
            the FETCHED_PROJECTION_ID is the unfetched base-record
            the UNFETCHED_PROJECTION_ID is the already fetched base-record
          */
        Ember.run(function() {
          store.push({
            data: {
              type: BOOK_CLASS_PATH,
              id: UNFETCHED_PROJECTION_ID,
              attributes: {
                title: 'Carry On! Mr. Bowditch',
              },
            },
          });
          store.push({
            data: {
              type: BOOK_EXCERPT_PROJECTION_CLASS_PATH,
              id: FETCHED_PROJECTION_ID,
              attributes: {
                title: "Mr. Popper's Penguins",
              },
            },
          });
        });

        /*
          Setup findRecord params for projection requests
           remember:
            the FETCHED_PROJECTION_ID is the unfetched base-record
            the UNFETCHED_PROJECTION_ID is the already fetched base-record
         */
        findRecordCallCount = 0;
        expectedFindRecordModelName = NORM_BOOK_EXCERPT_PROJECTION_CLASS_PATH;
        trueFindRecordModelName = BOOK_EXCERPT_PROJECTION_CLASS_PATH;
        expectedFindRecordId = UNFETCHED_PROJECTION_ID;

        Ember.run(function() {
          store
            .findRecord(BOOK_EXCERPT_PROJECTION_CLASS_PATH, FETCHED_PROJECTION_ID)
            .then(function(model) {
              assert.equal(
                Ember.get(model, 'id'),
                FETCHED_PROJECTION_ID,
                'we retrieved the already fetched the model'
              );
              assert.equal(findRecordCallCount, 0, 'We did not re-fetch');
            });
        });

        Ember.run(function() {
          store
            .findRecord(BOOK_EXCERPT_PROJECTION_CLASS_PATH, UNFETCHED_PROJECTION_ID)
            .then(function(model) {
              assert.equal(Ember.get(model, 'id'), UNFETCHED_PROJECTION_ID, 'we fetched the model');
              assert.equal(findRecordCallCount, 1, 'We made a single request');
            });
        });

        /*
          Setup findRecord params for base-record requests,
           remember:
            the FETCHED_PROJECTION_ID is the unfetched base-record
            the UNFETCHED_PROJECTION_ID is the already fetched base-record
        */
        findRecordCallCount = 0;
        expectedFindRecordModelName = NORM_BOOK_CLASS_PATH;
        trueFindRecordModelName = BOOK_CLASS_PATH;
        expectedFindRecordId = FETCHED_PROJECTION_ID;

        Ember.run(function() {
          store.findRecord(BOOK_CLASS_PATH, UNFETCHED_PROJECTION_ID).then(function(model) {
            assert.equal(
              Ember.get(model, 'id'),
              UNFETCHED_PROJECTION_ID,
              'we retrieved the already fetched the model'
            );
            assert.equal(findRecordCallCount, 0, 'We did not re-fetch');
          });
        });

        Ember.run(function() {
          store.findRecord(BOOK_CLASS_PATH, FETCHED_PROJECTION_ID).then(function(model) {
            assert.equal(Ember.get(model, 'id'), FETCHED_PROJECTION_ID, 'we fetched the model');
            assert.equal(findRecordCallCount, 1, 'We made a single request');
          });
        });
      });

      (0, _qunit.test)('store.peekAll() will not return partial records', function(assert) {
        var store = this.store;

        Ember.run(function() {
          // push a base type
          store.push({
            data: {
              id: '1',
              type: BOOK_CLASS_PATH,
              attributes: {
                title: 'Hello World',
              },
            },
          });

          // push a correspnding projection to ensure it does not change
          // the state of a pre-existing base model
          store.push({
            data: {
              id: '1',
              type: BOOK_EXCERPT_PROJECTION_CLASS_PATH,
              attributes: {
                title: 'Hello World',
              },
            },
          });

          // push the projection with non-existing base
          store.push({
            data: {
              id: '2',
              type: BOOK_EXCERPT_PROJECTION_CLASS_PATH,
              attributes: {
                title: 'Goodnight Moon',
              },
            },
          });
        });

        var recordArray = store.peekAll(BOOK_CLASS_PATH);

        assert.equal(Ember.get(recordArray, 'length'), 1, 'We only find one record');
        assert.equal(Ember.get(recordArray.objectAt(0), 'id'), '1', 'We find the expected record');
      });

      (0,
      _qunit.test)('Projections proxy whitelisted attributes to a base-record', function(assert) {
        var store = this.store;

        var BOOK_ID = 'isbn:9780439708181';
        var BOOK_TITLE = 'Adventures in Wonderland';
        var BOOK_AUTHOR = 'Lewis Carroll';
        var BOOK_DESCRIPTION = "Don't get rabbit holed!";

        var baseRecord = void 0;
        var projectedRecord = void 0;

        Ember.run(function() {
          // intentionally missing 'title'
          baseRecord = store.push({
            data: {
              id: BOOK_ID,
              type: BOOK_CLASS_PATH,
              attributes: {
                author: BOOK_AUTHOR,
                description: BOOK_DESCRIPTION, // description is not whitelisted
              },
            },
          });

          // intentionally missing 'author'
          projectedRecord = store.push({
            data: {
              id: BOOK_ID,
              type: BOOK_EXCERPT_PROJECTION_CLASS_PATH,
              attributes: {
                title: BOOK_TITLE,
              },
            },
          });
        });

        assert.equal(Ember.get(baseRecord, 'id'), BOOK_ID, 'base-record has the proper id');
        assert.equal(Ember.get(baseRecord, 'author'), BOOK_AUTHOR, 'base-record has author');
        assert.equal(Ember.get(baseRecord, 'title'), BOOK_TITLE, 'base-record has title');
        assert.equal(
          Ember.get(baseRecord, 'description'),
          BOOK_DESCRIPTION,
          'base-record has description'
        );

        assert.equal(
          Ember.get(projectedRecord, 'id'),
          BOOK_ID,
          'projected-record has the proper id'
        );
        assert.equal(
          Ember.get(projectedRecord, 'author'),
          BOOK_AUTHOR,
          'projected-record has author'
        );
        assert.equal(Ember.get(projectedRecord, 'title'), BOOK_TITLE, 'projected-record has title');
        assert.equal(
          Ember.get(projectedRecord, 'description'),
          undefined,
          'projected-record has no description as it is not whitelisted'
        );
      });
    });

    (0,
    _qunit.test)('Updating an embedded object property to null can still be updated again', function(assert) {
      var BOOK_ID = 'isbn:9780439708181';
      var AUTHOR_NAME = 'Lewis Carroll';
      var NEW_AUTHOR_NAME = 'J.K. Rowling';

      var store = this.store;

      var baseRecord = void 0;
      var projectedExcerpt = void 0;

      Ember.run(function() {
        baseRecord = store.push({
          data: {
            id: BOOK_ID,
            type: BOOK_CLASS_PATH,
            attributes: {
              author: {
                name: AUTHOR_NAME,
              },
            },
          },
        });

        projectedExcerpt = store.push({
          data: {
            id: BOOK_ID,
            type: BOOK_EXCERPT_PROJECTION_CLASS_PATH,
            attributes: {},
          },
        });
      });

      // force nested model to be created
      projectedExcerpt.get('author');

      // reset author to null
      Ember.run(function() {
        store.push({
          data: {
            id: BOOK_ID,
            type: BOOK_EXCERPT_PROJECTION_CLASS_PATH,
            attributes: {
              author: null,
            },
          },
        });
      });

      // update author again
      Ember.run(function() {
        store.push({
          data: {
            id: BOOK_ID,
            type: BOOK_EXCERPT_PROJECTION_CLASS_PATH,
            attributes: {
              author: {
                name: NEW_AUTHOR_NAME,
              },
            },
          },
        });
      });

      assert.equal(
        Ember.get(baseRecord, 'author.name'),
        NEW_AUTHOR_NAME,
        'base-record has the correct author.name'
      );
      assert.equal(
        Ember.get(projectedExcerpt, 'author.name'),
        NEW_AUTHOR_NAME,
        'excerpt has the correct author.name'
      );
    });

    (0, _qunit.module)('property notifications on top-level attributes', function(hooks) {
      /*
        All of the tests in this module MUST implement the following:
         # TOP LEVEL ATTRIBUTES
         - updates TITLE and CHAPTER
        - DOES NOT update YEAR
         Tests may optionally update DESCRIPTION but must assert the state
        of baseRecord on their own in this case.
       */

      // properties for use for initial state
      var BOOK_ID = 'isbn:9780439708181';
      var BOOK_TITLE = 'Adventures in Wonderland';
      var BOOK_YEAR = '1865';
      var BOOK_DESCRIPTION = "Don't get rabbit holed!";

      // properties for use post-patch
      var NEW_CHAPTER_TEXT = 'So we began again.';
      var NEW_TITLE = 'Through the Looking Glass';
      var NEW_DESCRIPTION = 'Crazy Town';

      hooks.beforeEach(function(assert) {
        var store = this.store;

        var baseRecord = void 0;
        var projectedExcerpt = void 0;
        var projectedPreview = void 0;

        Ember.run(function() {
          baseRecord = store.push({
            data: {
              id: BOOK_ID,
              type: BOOK_CLASS_PATH,
              attributes: {
                title: BOOK_TITLE,
                year: BOOK_YEAR,
                description: BOOK_DESCRIPTION, // description is not whitelisted
              },
            },
          });

          projectedExcerpt = store.push({
            data: {
              id: BOOK_ID,
              type: BOOK_EXCERPT_PROJECTION_CLASS_PATH,
              attributes: {},
            },
          });

          projectedPreview = store.push({
            data: {
              id: BOOK_ID,
              type: BOOK_PREVIEW_PROJECTION_CLASS_PATH,
              attributes: {},
            },
          });
        });

        this.records = {
          baseRecord: baseRecord,
          projectedExcerpt: projectedExcerpt,
          projectedPreview: projectedPreview,
        };

        var watchedProperties = ['title', 'description', 'chapter-1', 'year'];
        var baseRecordWatcher = (0, _watchProperty.watchProperties)(baseRecord, watchedProperties);
        var excerptWatcher = (0, _watchProperty.watchProperties)(
          projectedExcerpt,
          watchedProperties
        );
        var previewWatcher = (0, _watchProperty.watchProperties)(
          projectedPreview,
          watchedProperties
        );

        this.watchers = {
          baseRecordWatcher: baseRecordWatcher,
          excerptWatcher: excerptWatcher,
          previewWatcher: previewWatcher,
        };

        // a whitelisted property
        assert.equal(
          Ember.get(baseRecord, 'title'),
          BOOK_TITLE,
          'base-record has the correct title'
        );
        assert.equal(
          Ember.get(projectedExcerpt, 'title'),
          BOOK_TITLE,
          'excerpt has the correct title'
        );
        assert.equal(
          Ember.get(projectedPreview, 'title'),
          BOOK_TITLE,
          'preview has the correct title'
        );

        // a non-whitelisted property
        assert.equal(
          Ember.get(baseRecord, 'description'),
          BOOK_DESCRIPTION,
          'base-record has the correct description'
        );
        assert.equal(
          Ember.get(projectedExcerpt, 'description'),
          undefined,
          'excerpt has no description since it is not whitelisted'
        );
        assert.equal(
          Ember.get(projectedPreview, 'description'),
          undefined,
          'preview has no description since it is not whitelisted'
        );

        // an absent property
        assert.equal(Ember.get(baseRecord, 'chapter-1'), undefined, 'base-record has no chapter-1');
        assert.equal(
          Ember.get(projectedExcerpt, 'chapter-1'),
          undefined,
          'excerpt has no chapter-1'
        );
        assert.equal(
          Ember.get(projectedPreview, 'chapter-1'),
          undefined,
          'preview has no chapter-1'
        );

        // a whitelisted property that won't be updated
        assert.equal(Ember.get(baseRecord, 'year'), BOOK_YEAR, 'base-record has the correct year');
        assert.equal(
          Ember.get(projectedExcerpt, 'year'),
          BOOK_YEAR,
          'excerpt has the correct year'
        );
        assert.equal(
          Ember.get(projectedPreview, 'year'),
          BOOK_YEAR,
          'preview has the correct year'
        );

        assert.deepEqual(
          baseRecordWatcher.counts,
          { title: 0, description: 0, 'chapter-1': 0, year: 0 },
          'Initial baseRecord state'
        );

        assert.deepEqual(
          excerptWatcher.counts,
          { title: 0, description: 0, 'chapter-1': 0, year: 0 },
          'Initial excerpt state'
        );

        assert.deepEqual(
          previewWatcher.counts,
          { title: 0, description: 0, 'chapter-1': 0, year: 0 },
          'Initial preview state'
        );
      });

      hooks.afterEach(function(assert) {
        var _watchers = this.watchers,
          baseRecordWatcher = _watchers.baseRecordWatcher,
          excerptWatcher = _watchers.excerptWatcher,
          previewWatcher = _watchers.previewWatcher;
        var _records = this.records,
          baseRecord = _records.baseRecord,
          projectedExcerpt = _records.projectedExcerpt,
          projectedPreview = _records.projectedPreview;

        assert.deepEqual(
          baseRecordWatcher.counts,
          { title: 1, 'chapter-1': 1, year: 0, description: baseRecordWatcher.counts.description },
          'Final baseRecord state'
        );

        assert.deepEqual(
          excerptWatcher.counts,
          { title: 1, description: 0, 'chapter-1': 0, year: 0 },
          'Final excerpt state'
        );

        assert.deepEqual(
          previewWatcher.counts,
          { title: 1, description: 0, 'chapter-1': 1, year: 0 },
          'Final preview state'
        );

        baseRecordWatcher.unwatch();
        excerptWatcher.unwatch();
        previewWatcher.unwatch();

        // set to an existing property
        assert.equal(
          Ember.get(baseRecord, 'title'),
          NEW_TITLE,
          'base-record has the correct title'
        );
        assert.equal(
          Ember.get(projectedExcerpt, 'title'),
          NEW_TITLE,
          'excerpt has the correct title'
        );
        assert.equal(
          Ember.get(projectedPreview, 'title'),
          NEW_TITLE,
          'preview has the correct title'
        );

        // set to a previously absent property
        assert.equal(
          Ember.get(baseRecord, 'chapter-1'),
          NEW_CHAPTER_TEXT,
          'base-record has the correct chapter-1'
        );
        assert.equal(
          Ember.get(projectedExcerpt, 'chapter-1'),
          undefined,
          'excerpt has the correct chapter-1'
        );
        assert.equal(
          Ember.get(projectedPreview, 'chapter-1'),
          NEW_CHAPTER_TEXT,
          'preview has the correct chapter-1'
        );

        // a whitelisted non-updated property
        assert.equal(Ember.get(baseRecord, 'year'), BOOK_YEAR, 'base-record has the correct year');
        assert.equal(
          Ember.get(projectedExcerpt, 'year'),
          BOOK_YEAR,
          'excerpt has the correct year'
        );
        assert.equal(
          Ember.get(projectedPreview, 'year'),
          BOOK_YEAR,
          'preview has the correct year'
        );

        // a non-whitelisted property
        assert.equal(
          Ember.get(projectedExcerpt, 'description'),
          undefined,
          'excerpt has no description since it is not whitelisted'
        );
        assert.equal(
          Ember.get(projectedPreview, 'description'),
          undefined,
          'preview has no description since it is not whitelisted'
        );

        this.watchers = null;
        this.records = null;
      });

      (0, _qunit.test)('Setting on the base-record updates projections', function(assert) {
        var baseRecord = this.records.baseRecord;

        Ember.run(function() {
          Ember.set(baseRecord, 'chapter-1', NEW_CHAPTER_TEXT);
          Ember.set(baseRecord, 'title', NEW_TITLE);
          Ember.set(baseRecord, 'description', NEW_DESCRIPTION);
        });

        var baseRecordWatcher = this.watchers.baseRecordWatcher;

        var baseCounts = baseRecordWatcher.counts;

        assert.equal(
          baseCounts.description,
          1,
          'Afterwards we have dirtied baseRecord.description'
        );
        assert.equal(
          Ember.get(baseRecord, 'description'),
          NEW_DESCRIPTION,
          'base-record has the correct description'
        );
      });

      (0, _qunit.test)('Updating the base-record updates projections', function(assert) {
        var store = this.store;
        var baseRecord = this.records.baseRecord;

        Ember.run(function() {
          store.push({
            data: {
              id: BOOK_ID,
              type: BOOK_CLASS_PATH,
              attributes: {
                title: NEW_TITLE,
                'chapter-1': NEW_CHAPTER_TEXT,
                description: NEW_DESCRIPTION,
              },
            },
          });
        });

        var baseRecordWatcher = this.watchers.baseRecordWatcher;

        var baseCounts = baseRecordWatcher.counts;

        assert.equal(
          baseCounts.description,
          1,
          'Afterwards we have dirtied baseRecord.description'
        );
        assert.equal(
          Ember.get(baseRecord, 'description'),
          NEW_DESCRIPTION,
          'base-record has the correct description'
        );
      });

      (0,
      _qunit.test)('Setting a projection updates the base-record and other projections', function(assert) {
        var preview = this.records.projectedPreview;
        var baseRecord = this.records.baseRecord;

        Ember.run(function() {
          Ember.set(preview, 'chapter-1', NEW_CHAPTER_TEXT);
          Ember.set(preview, 'title', NEW_TITLE);
        });

        Ember.run(function() {
          assert.throws(
            function() {
              Ember.set(preview, 'description', NEW_DESCRIPTION);
            },
            /whitelist/gi,
            'Setting a non-whitelisted property throws an error'
          );
        });
        assert.equal(
          this.watchers.baseRecordWatcher.counts.description,
          0,
          'Afterwards we have not dirtied baseRecord.description'
        );
        assert.equal(
          Ember.get(baseRecord, 'description'),
          BOOK_DESCRIPTION,
          'base-record has the correct description'
        );
      });

      (0,
      _qunit.test)('Updating a projection updates the base-record and other projections', function(assert) {
        var baseRecord = this.records.baseRecord;
        var store = this.store;

        Ember.run(function() {
          store.push({
            data: {
              id: BOOK_ID,
              type: BOOK_EXCERPT_PROJECTION_CLASS_PATH,
              attributes: {
                title: NEW_TITLE,
                'chapter-1': NEW_CHAPTER_TEXT,
              },
            },
          });
        });

        assert.equal(
          this.watchers.baseRecordWatcher.counts.description,
          0,
          'Afterwards we have not dirtied baseRecord.description'
        );
        assert.equal(
          Ember.get(baseRecord, 'description'),
          BOOK_DESCRIPTION,
          'base-record has the correct description'
        );
      });
    });

    (0, _qunit.module)('property notifications on embedded objects', function(hooks) {
      /*
        All of the tests in this module MUST implement the following:
         # EMBEDDED OBJECT 'author'
         - DOES NOT update NAME
        - DOES update LOCATION
         AUTHOR is embedded on EXCERPT
        LOCATION and NAME are projected on PREVIEW but AGE is not.
         Tests may optionally update AGE but must assert the state
          of watchers and values for baseRecord and excerpt on their
          own in this case.
       */

      // properties for use for initial state
      var BOOK_ID = 'isbn:9780439708181';
      var AUTHOR_NAME = 'Lewis Carroll';
      var AUTHOR_LOCATION = 'Earth';
      var AUTHOR_AGE = 'old';

      // properties for use post-patch
      var NEW_AUTHOR_LOCATION = 'Sky';
      var NEW_AUTHOR_AGE = 'wise';

      hooks.beforeEach(function(assert) {
        var store = this.store;

        var baseRecord = void 0;
        var projectedExcerpt = void 0;
        var projectedPreview = void 0;

        Ember.run(function() {
          baseRecord = store.push({
            data: {
              id: BOOK_ID,
              type: BOOK_CLASS_PATH,
              attributes: {
                author: {
                  name: AUTHOR_NAME,
                  location: AUTHOR_LOCATION,
                  age: AUTHOR_AGE,
                },
              },
            },
          });

          projectedExcerpt = store.push({
            data: {
              id: BOOK_ID,
              type: BOOK_EXCERPT_PROJECTION_CLASS_PATH,
              attributes: {},
            },
          });

          projectedPreview = store.push({
            data: {
              id: BOOK_ID,
              type: BOOK_PREVIEW_PROJECTION_CLASS_PATH,
              attributes: {},
            },
          });
        });

        this.records = {
          baseRecord: baseRecord,
          projectedExcerpt: projectedExcerpt,
          projectedPreview: projectedPreview,
        };

        var watchedProperties = ['author', 'author.name', 'author.age', 'author.location'];
        var baseRecordWatcher = (0, _watchProperty.watchProperties)(baseRecord, watchedProperties);
        var excerptWatcher = (0, _watchProperty.watchProperties)(
          projectedExcerpt,
          watchedProperties
        );
        var previewWatcher = (0, _watchProperty.watchProperties)(
          projectedPreview,
          watchedProperties
        );

        this.watchers = {
          baseRecordWatcher: baseRecordWatcher,
          excerptWatcher: excerptWatcher,
          previewWatcher: previewWatcher,
        };

        // an embedded whitelisted property
        assert.equal(
          Ember.get(baseRecord, 'author.location'),
          AUTHOR_LOCATION,
          'base-record has the correct author.location'
        );
        assert.equal(
          Ember.get(projectedExcerpt, 'author.location'),
          AUTHOR_LOCATION,
          'excerpt has the correct author.location'
        );
        assert.equal(
          Ember.get(projectedPreview, 'author.location'),
          AUTHOR_LOCATION,
          'preview has the correct author.location'
        );

        // an embedded non-whitelisted property
        assert.equal(
          Ember.get(baseRecord, 'author.age'),
          AUTHOR_AGE,
          'base-record has the correct author.age'
        );
        assert.equal(
          Ember.get(projectedExcerpt, 'author.age'),
          AUTHOR_AGE,
          'excerpt has the correct author.age'
        );
        assert.equal(
          Ember.get(projectedPreview, 'author.age'),
          undefined,
          'preview has the correct author.age'
        );

        // an embedded whitelisted property that won't be updated
        assert.equal(
          Ember.get(baseRecord, 'author.name'),
          AUTHOR_NAME,
          'base-record has the correct author.name'
        );
        assert.equal(
          Ember.get(projectedExcerpt, 'author.name'),
          AUTHOR_NAME,
          'excerpt has the correct author.name'
        );
        assert.equal(
          Ember.get(projectedPreview, 'author.name'),
          AUTHOR_NAME,
          'preview has the correct author.name'
        );

        assert.deepEqual(
          baseRecordWatcher.counts,
          { author: 0, 'author.name': 0, 'author.location': 0, 'author.age': 0 },
          'Initial baseRecord state'
        );

        assert.deepEqual(
          excerptWatcher.counts,
          { author: 0, 'author.name': 0, 'author.location': 0, 'author.age': 0 },
          'Initial excerpt state'
        );

        assert.deepEqual(
          previewWatcher.counts,
          { author: 0, 'author.name': 0, 'author.location': 0, 'author.age': 0 },
          'Initial preview state'
        );
      });

      hooks.afterEach(function(assert) {
        var _watchers2 = this.watchers,
          baseRecordWatcher = _watchers2.baseRecordWatcher,
          excerptWatcher = _watchers2.excerptWatcher,
          previewWatcher = _watchers2.previewWatcher;
        var _records2 = this.records,
          baseRecord = _records2.baseRecord,
          projectedExcerpt = _records2.projectedExcerpt,
          projectedPreview = _records2.projectedPreview;

        assert.deepEqual(
          baseRecordWatcher.counts,
          {
            author: 0,
            'author.name': 0,
            'author.location': 1,
            'author.age': baseRecordWatcher.counts['author.age'],
          },
          'Final baseRecord state'
        );

        assert.deepEqual(
          excerptWatcher.counts,
          {
            author: 0,
            'author.name': 0,
            'author.location': 1,
            'author.age': excerptWatcher.counts['author.age'],
          },
          'Final excerpt state'
        );

        assert.deepEqual(
          previewWatcher.counts,
          { author: 0, 'author.name': 0, 'author.location': 1, 'author.age': 0 },
          'Final preview state'
        );

        baseRecordWatcher.unwatch();
        excerptWatcher.unwatch();
        previewWatcher.unwatch();

        // an embedded whitelisted property
        assert.equal(
          Ember.get(baseRecord, 'author.location'),
          NEW_AUTHOR_LOCATION,
          'base-record has the correct author.location'
        );
        assert.equal(
          Ember.get(projectedExcerpt, 'author.location'),
          NEW_AUTHOR_LOCATION,
          'excerpt has the correct author.location'
        );
        assert.equal(
          Ember.get(projectedPreview, 'author.location'),
          NEW_AUTHOR_LOCATION,
          'preview has the correct author.location'
        );

        // an embedded non-whitelisted property
        assert.equal(
          Ember.get(projectedPreview, 'author.age'),
          undefined,
          'preview has the correct author.age'
        );

        // an embedded whitelisted property that won't be updated
        assert.equal(
          Ember.get(baseRecord, 'author.name'),
          AUTHOR_NAME,
          'base-record has the correct author.name'
        );
        assert.equal(
          Ember.get(projectedExcerpt, 'author.name'),
          AUTHOR_NAME,
          'excerpt has the correct author.name'
        );
        assert.equal(
          Ember.get(projectedPreview, 'author.name'),
          AUTHOR_NAME,
          'preview has the correct author.name'
        );

        this.watchers = null;
        this.records = null;
      });

      (0,
      _qunit.test)('Setting an embedded object property on the base-record updates the value for projections', function(assert) {
        var _records3 = this.records,
          baseRecord = _records3.baseRecord,
          projectedExcerpt = _records3.projectedExcerpt;

        Ember.run(function() {
          Ember.set(baseRecord, 'author.location', NEW_AUTHOR_LOCATION);
          Ember.set(baseRecord, 'author.age', NEW_AUTHOR_AGE);
        });

        var _watchers3 = this.watchers,
          baseRecordWatcher = _watchers3.baseRecordWatcher,
          excerptWatcher = _watchers3.excerptWatcher;

        var baseCounts = baseRecordWatcher.counts;
        var excerptCounts = excerptWatcher.counts;

        assert.equal(baseCounts['author.age'], 1, 'Afterwards we have dirtied excerpt.author.age');
        assert.equal(
          excerptCounts['author.age'],
          1,
          'Afterwards we have dirtied excerpt.author.age'
        );
        assert.equal(
          Ember.get(baseRecord, 'author.age'),
          NEW_AUTHOR_AGE,
          'base-record has the correct author.age'
        );
        assert.equal(
          Ember.get(projectedExcerpt, 'author.age'),
          NEW_AUTHOR_AGE,
          'excerpt has the correct author.age'
        );
      });

      (0,
      _qunit.test)('Updating an embedded object property on the base-record updates the value for projections', function(assert) {
        var store = this.store;
        var _records4 = this.records,
          baseRecord = _records4.baseRecord,
          projectedExcerpt = _records4.projectedExcerpt;

        Ember.run(function() {
          store.push({
            data: {
              id: BOOK_ID,
              type: BOOK_CLASS_PATH,
              attributes: {
                author: {
                  location: NEW_AUTHOR_LOCATION,
                  age: NEW_AUTHOR_AGE,
                },
              },
            },
          });
        });

        var _watchers4 = this.watchers,
          baseRecordWatcher = _watchers4.baseRecordWatcher,
          excerptWatcher = _watchers4.excerptWatcher;

        var baseCounts = baseRecordWatcher.counts;
        var excerptCounts = excerptWatcher.counts;

        assert.equal(baseCounts['author.age'], 1, 'Afterwards we have dirtied excerpt.author.age');
        assert.equal(
          excerptCounts['author.age'],
          1,
          'Afterwards we have dirtied excerpt.author.age'
        );
        assert.equal(
          Ember.get(baseRecord, 'author.age'),
          NEW_AUTHOR_AGE,
          'base-record has the correct author.age'
        );
        assert.equal(
          Ember.get(projectedExcerpt, 'author.age'),
          NEW_AUTHOR_AGE,
          'excerpt has the correct author.age'
        );
      });

      (0,
      _qunit.test)('Setting an embedded object property on a projection updates the base-record and other projections', function(assert) {
        var _records5 = this.records,
          baseRecord = _records5.baseRecord,
          projectedExcerpt = _records5.projectedExcerpt;
        var _watchers5 = this.watchers,
          baseRecordWatcher = _watchers5.baseRecordWatcher,
          excerptWatcher = _watchers5.excerptWatcher;

        Ember.run(function() {
          Ember.set(projectedExcerpt, 'author.location', NEW_AUTHOR_LOCATION);
          Ember.set(projectedExcerpt, 'author.age', NEW_AUTHOR_AGE);
        });

        var baseCounts = baseRecordWatcher.counts;
        var excerptCounts = excerptWatcher.counts;

        assert.equal(baseCounts['author.age'], 1, 'Afterwards we have dirtied excerpt.author.age');
        assert.equal(
          excerptCounts['author.age'],
          1,
          'Afterwards we have dirtied excerpt.author.age'
        );
        assert.equal(
          Ember.get(baseRecord, 'author.age'),
          NEW_AUTHOR_AGE,
          'base-record has the correct author.age'
        );
        assert.equal(
          Ember.get(projectedExcerpt, 'author.age'),
          NEW_AUTHOR_AGE,
          'excerpt has the correct author.age'
        );
      });

      (0,
      _qunit.test)('Setting an embedded object property on a nested projection updates the base-record and other projections', function(assert) {
        var _records6 = this.records,
          baseRecord = _records6.baseRecord,
          projectedExcerpt = _records6.projectedExcerpt,
          projectedPreview = _records6.projectedPreview;

        Ember.run(function() {
          Ember.set(projectedPreview, 'author.location', NEW_AUTHOR_LOCATION);
        });

        Ember.run(function() {
          assert.throws(
            function() {
              Ember.set(projectedPreview, 'author.age', NEW_AUTHOR_AGE);
            },
            /whitelist/gi,
            'Setting a non-whitelisted property on a projection over an embedded object throws an error'
          );
        });

        var _watchers6 = this.watchers,
          baseRecordWatcher = _watchers6.baseRecordWatcher,
          excerptWatcher = _watchers6.excerptWatcher;

        var baseCounts = baseRecordWatcher.counts;
        var excerptCounts = excerptWatcher.counts;

        assert.equal(
          baseCounts['author.age'],
          0,
          'Afterwards we have not dirtied excerpt.author.age'
        );
        assert.equal(
          excerptCounts['author.age'],
          0,
          'Afterwards we have not dirtied excerpt.author.age'
        );
        assert.equal(
          Ember.get(baseRecord, 'author.age'),
          AUTHOR_AGE,
          'base-record has the correct author.age'
        );
        assert.equal(
          Ember.get(projectedExcerpt, 'author.age'),
          AUTHOR_AGE,
          'excerpt has the correct author.age'
        );
      });

      (0,
      _qunit.test)('Updating an embedded object property on a projection updates the base-record and other projections', function(assert) {
        var store = this.store;
        var _records7 = this.records,
          baseRecord = _records7.baseRecord,
          projectedExcerpt = _records7.projectedExcerpt;

        Ember.run(function() {
          store.push({
            data: {
              id: BOOK_ID,
              type: BOOK_EXCERPT_PROJECTION_CLASS_PATH,
              attributes: {
                author: {
                  location: NEW_AUTHOR_LOCATION,
                  age: NEW_AUTHOR_AGE,
                },
              },
            },
          });
        });

        var _watchers7 = this.watchers,
          baseRecordWatcher = _watchers7.baseRecordWatcher,
          excerptWatcher = _watchers7.excerptWatcher;

        var baseCounts = baseRecordWatcher.counts;
        var excerptCounts = excerptWatcher.counts;

        assert.equal(baseCounts['author.age'], 1, 'Afterwards we have dirtied excerpt.author.age');
        assert.equal(
          excerptCounts['author.age'],
          1,
          'Afterwards we have dirtied excerpt.author.age'
        );
        assert.equal(
          Ember.get(baseRecord, 'author.age'),
          NEW_AUTHOR_AGE,
          'base-record has the correct author.age'
        );
        assert.equal(
          Ember.get(projectedExcerpt, 'author.age'),
          NEW_AUTHOR_AGE,
          'excerpt has the correct author.age'
        );
      });

      (0,
      _qunit.test)('Updating an embedded object property on a nested projection updates the base-record and other projections', function(assert) {
        var store = this.store;
        var _records8 = this.records,
          baseRecord = _records8.baseRecord,
          projectedExcerpt = _records8.projectedExcerpt;

        Ember.run(function() {
          store.push({
            data: {
              id: BOOK_ID,
              type: BOOK_PREVIEW_PROJECTION_CLASS_PATH,
              attributes: {
                author: {
                  location: NEW_AUTHOR_LOCATION,
                },
              },
            },
          });
        });

        var _watchers8 = this.watchers,
          baseRecordWatcher = _watchers8.baseRecordWatcher,
          excerptWatcher = _watchers8.excerptWatcher;

        var baseCounts = baseRecordWatcher.counts;
        var excerptCounts = excerptWatcher.counts;

        assert.equal(
          baseCounts['author.age'],
          0,
          'Afterwards we have not dirtied excerpt.author.age'
        );
        assert.equal(
          excerptCounts['author.age'],
          0,
          'Afterwards we have not dirtied excerpt.author.age'
        );
        assert.equal(
          Ember.get(baseRecord, 'author.age'),
          AUTHOR_AGE,
          'base-record has the correct author.age'
        );
        assert.equal(
          Ember.get(projectedExcerpt, 'author.age'),
          AUTHOR_AGE,
          'excerpt has the correct author.age'
        );
      });
    });

    (0, _qunit.module)('property notifications on resolved objects', function(hooks) {
      /*
        All of the tests in this module MUST implement the following:
         # RESOLVED RECORD 'publisher'
         - DOES NOT update NAME
        - DOES update LOCATION
         Tests may optionally update OWNER but must assert the state
          of watchers and values for baseRecord and excerpt on their
          own in this case.
       */

      // properties for use for initial state
      var BOOK_ID = 'isbn:9780439708181';
      // TODO is this valid? we won't have a real ID yeah?
      var PUBLISHER_ID = 'publisher-abc123';
      var PUBLISHER_URN = 'urn:' + PUBLISHER_CLASS + ':' + PUBLISHER_ID;
      var PUBLISHER_NAME = 'MACMILLAN';
      var PUBLISHER_LOCATION = 'Isle of Arran, Scotland';
      var PUBLISHER_OWNER = 'Daniel and Alexander Macmillan';

      // properties for use post-patch
      var NEW_PUBLISHER_LOCATION = 'London, England';
      var NEW_PUBLISHER_OWNER = 'Holtzbrinck Publishing Group';

      hooks.beforeEach(function(assert) {
        var store = this.store;

        var baseRecord = void 0;
        var projectedExcerpt = void 0;
        var projectedPreview = void 0;

        Ember.run(function() {
          baseRecord = store.push({
            data: {
              id: BOOK_ID,
              type: BOOK_CLASS_PATH,
              attributes: {
                publisher: PUBLISHER_URN,
              },
            },
            included: [
              {
                id: PUBLISHER_ID,
                type: PUBLISHER_CLASS,
                attributes: {
                  name: PUBLISHER_NAME,
                  location: PUBLISHER_LOCATION,
                  owner: PUBLISHER_OWNER,
                },
              },
              {
                id: PUBLISHER_ID,
                type: PROJECTED_PUBLISHER_CLASS,
                attributes: {},
              },
            ],
          });

          projectedExcerpt = store.push({
            data: {
              id: BOOK_ID,
              type: BOOK_EXCERPT_PROJECTION_CLASS_PATH,
              attributes: {},
            },
          });

          projectedPreview = store.push({
            data: {
              id: BOOK_ID,
              type: BOOK_PREVIEW_PROJECTION_CLASS_PATH,
              attributes: {},
            },
          });
        });

        this.records = {
          baseRecord: baseRecord,
          projectedExcerpt: projectedExcerpt,
          projectedPreview: projectedPreview,
        };

        var watchedProperties = [
          'publisher',
          'publisher.name',
          'publisher.location',
          'publisher.owner',
        ];
        var baseRecordWatcher = (0, _watchProperty.watchProperties)(baseRecord, watchedProperties);
        var excerptWatcher = (0, _watchProperty.watchProperties)(
          projectedExcerpt,
          watchedProperties
        );
        var previewWatcher = (0, _watchProperty.watchProperties)(
          projectedPreview,
          watchedProperties
        );

        this.watchers = {
          baseRecordWatcher: baseRecordWatcher,
          excerptWatcher: excerptWatcher,
          previewWatcher: previewWatcher,
        };

        // a whitelisted non-updated nested model value
        assert.equal(
          Ember.get(baseRecord, 'publisher.name'),
          PUBLISHER_NAME,
          'base-record has the correct publisher.name'
        );
        assert.equal(
          Ember.get(projectedExcerpt, 'publisher.name'),
          PUBLISHER_NAME,
          'excerpt has the correct publisher.name'
        );
        assert.equal(
          Ember.get(projectedPreview, 'publisher.name'),
          PUBLISHER_NAME,
          'preview has the correct publisher.name'
        );

        // a whitelisted updated nested model value
        assert.equal(
          Ember.get(baseRecord, 'publisher.location'),
          PUBLISHER_LOCATION,
          'base-record has the correct publisher.location'
        );
        assert.equal(
          Ember.get(projectedExcerpt, 'publisher.location'),
          PUBLISHER_LOCATION,
          'excerpt has the correct publisher.location'
        );
        assert.equal(
          Ember.get(projectedPreview, 'publisher.location'),
          PUBLISHER_LOCATION,
          'preview has the correct publisher.location'
        );

        // a non-whitelisted updated nested model value
        assert.equal(
          Ember.get(baseRecord, 'publisher.owner'),
          PUBLISHER_OWNER,
          'base-record has the correct publisher.owner'
        );
        assert.equal(
          Ember.get(projectedExcerpt, 'publisher.owner'),
          PUBLISHER_OWNER,
          'excerpt has the correct publisher.owner'
        );
        assert.equal(
          Ember.get(projectedPreview, 'publisher.owner'),
          undefined,
          'preview has the correct publisher.owner'
        );

        assert.deepEqual(
          baseRecordWatcher.counts,
          { publisher: 0, 'publisher.name': 0, 'publisher.owner': 0, 'publisher.location': 0 },
          'Initial baseRecord state'
        );

        assert.deepEqual(
          excerptWatcher.counts,
          { publisher: 0, 'publisher.name': 0, 'publisher.owner': 0, 'publisher.location': 0 },
          'Initial excerpt state'
        );

        assert.deepEqual(
          previewWatcher.counts,
          { publisher: 0, 'publisher.name': 0, 'publisher.owner': 0, 'publisher.location': 0 },
          'Initial preview state'
        );
      });

      hooks.afterEach(function(assert) {
        var _watchers9 = this.watchers,
          baseRecordWatcher = _watchers9.baseRecordWatcher,
          excerptWatcher = _watchers9.excerptWatcher,
          previewWatcher = _watchers9.previewWatcher;
        var _records9 = this.records,
          baseRecord = _records9.baseRecord,
          projectedExcerpt = _records9.projectedExcerpt,
          projectedPreview = _records9.projectedPreview;

        assert.deepEqual(
          baseRecordWatcher.counts,
          {
            publisher: 0,
            'publisher.name': 0,
            'publisher.location': 1,
            'publisher.owner': baseRecordWatcher.counts['publisher.owner'],
          },
          'Final baseRecord state'
        );

        assert.deepEqual(
          excerptWatcher.counts,
          {
            publisher: 0,
            'publisher.name': 0,
            'publisher.location': 1,
            'publisher.owner': excerptWatcher.counts['publisher.owner'],
          },
          'Final excerpt state'
        );

        assert.deepEqual(
          previewWatcher.counts,
          { publisher: 0, 'publisher.name': 0, 'publisher.owner': 0, 'publisher.location': 1 },
          'Final preview state'
        );

        baseRecordWatcher.unwatch();
        excerptWatcher.unwatch();
        previewWatcher.unwatch();

        // a whitelisted non-updated nested model value
        assert.equal(
          Ember.get(baseRecord, 'publisher.name'),
          PUBLISHER_NAME,
          'base-record has the correct publisher.name'
        );
        assert.equal(
          Ember.get(projectedExcerpt, 'publisher.name'),
          PUBLISHER_NAME,
          'excerpt has the correct publisher.name'
        );
        assert.equal(
          Ember.get(projectedPreview, 'publisher.name'),
          PUBLISHER_NAME,
          'preview has the correct publisher.name'
        );

        // a whitelisted updated nested model value
        assert.equal(
          Ember.get(baseRecord, 'publisher.location'),
          NEW_PUBLISHER_LOCATION,
          'base-record has the correct publisher.location'
        );
        assert.equal(
          Ember.get(projectedExcerpt, 'publisher.location'),
          NEW_PUBLISHER_LOCATION,
          'excerpt has the correct publisher.location'
        );
        assert.equal(
          Ember.get(projectedPreview, 'publisher.location'),
          NEW_PUBLISHER_LOCATION,
          'preview has the correct publisher.location'
        );

        // a non-whitelisted updated nested model value
        assert.equal(
          Ember.get(projectedPreview, 'publisher.owner'),
          undefined,
          'preview has the correct publisher.owner'
        );

        this.watchers = null;
        this.records = null;
      });

      (0,
      _qunit.test)('Setting a resolution property via the base-record updates projections and nested projections', function(assert) {
        var _records10 = this.records,
          baseRecord = _records10.baseRecord,
          projectedExcerpt = _records10.projectedExcerpt;

        Ember.run(function() {
          Ember.set(baseRecord, 'publisher.location', NEW_PUBLISHER_LOCATION);
          Ember.set(baseRecord, 'publisher.owner', NEW_PUBLISHER_OWNER);
        });

        var _watchers10 = this.watchers,
          baseRecordWatcher = _watchers10.baseRecordWatcher,
          excerptWatcher = _watchers10.excerptWatcher;

        var baseCounts = baseRecordWatcher.counts;
        var excerptCounts = excerptWatcher.counts;

        assert.equal(
          baseCounts['publisher.owner'],
          1,
          'Afterwards we have dirtied baseRecord.description'
        );
        assert.equal(
          excerptCounts['publisher.owner'],
          1,
          'Afterwards we have dirtied baseRecord.description'
        );
        assert.equal(
          Ember.get(baseRecord, 'publisher.owner'),
          NEW_PUBLISHER_OWNER,
          'base-record has the correct publisher.owner'
        );
        assert.equal(
          Ember.get(projectedExcerpt, 'publisher.owner'),
          NEW_PUBLISHER_OWNER,
          'excerpt has the correct publisher.owner'
        );
      });

      (0,
      _qunit.test)('Updating a resolution property via the base-record updates projections and nested projections', function(assert) {
        var store = this.store;
        var _records11 = this.records,
          baseRecord = _records11.baseRecord,
          projectedExcerpt = _records11.projectedExcerpt;

        Ember.run(function() {
          store.push({
            data: {
              id: BOOK_ID,
              type: BOOK_CLASS_PATH,
              attributes: {},
            },
            included: [
              {
                id: PUBLISHER_ID,
                type: PUBLISHER_CLASS,
                attributes: {
                  location: NEW_PUBLISHER_LOCATION,
                  owner: NEW_PUBLISHER_OWNER,
                },
              },
            ],
          });
        });

        var _watchers11 = this.watchers,
          baseRecordWatcher = _watchers11.baseRecordWatcher,
          excerptWatcher = _watchers11.excerptWatcher;

        var baseCounts = baseRecordWatcher.counts;
        var excerptCounts = excerptWatcher.counts;

        assert.equal(
          baseCounts['publisher.owner'],
          1,
          'Afterwards we have dirtied baseRecord.description'
        );
        assert.equal(
          excerptCounts['publisher.owner'],
          1,
          'Afterwards we have dirtied baseRecord.description'
        );
        assert.equal(
          Ember.get(baseRecord, 'publisher.owner'),
          NEW_PUBLISHER_OWNER,
          'base-record has the correct publisher.owner'
        );
        assert.equal(
          Ember.get(projectedExcerpt, 'publisher.owner'),
          NEW_PUBLISHER_OWNER,
          'excerpt has the correct publisher.owner'
        );
      });

      (0,
      _qunit.test)('Setting a resolution property via a projection updates the base-record, other projections and nested projections', function(assert) {
        var _records12 = this.records,
          baseRecord = _records12.baseRecord,
          projectedExcerpt = _records12.projectedExcerpt;

        Ember.run(function() {
          Ember.set(projectedExcerpt, 'publisher.location', NEW_PUBLISHER_LOCATION);
          Ember.set(projectedExcerpt, 'publisher.owner', NEW_PUBLISHER_OWNER);
        });

        var _watchers12 = this.watchers,
          baseRecordWatcher = _watchers12.baseRecordWatcher,
          excerptWatcher = _watchers12.excerptWatcher;

        var baseCounts = baseRecordWatcher.counts;
        var excerptCounts = excerptWatcher.counts;

        assert.equal(
          baseCounts['publisher.owner'],
          1,
          'Afterwards we have dirtied baseRecord.publisher.owner'
        );
        assert.equal(
          excerptCounts['publisher.owner'],
          1,
          'Afterwards we have dirtied baseRecord.publisher.owner'
        );
        assert.equal(
          Ember.get(baseRecord, 'publisher.owner'),
          NEW_PUBLISHER_OWNER,
          'base-record has the correct publisher.owner'
        );
        assert.equal(
          Ember.get(projectedExcerpt, 'publisher.owner'),
          NEW_PUBLISHER_OWNER,
          'excerpt has the correct publisher.owner'
        );
      });

      (0,
      _qunit.test)('Setting a resolution property via a nested projection updates the base-record and other projections', function(assert) {
        var _records13 = this.records,
          baseRecord = _records13.baseRecord,
          projectedExcerpt = _records13.projectedExcerpt,
          projectedPreview = _records13.projectedPreview;

        Ember.run(function() {
          Ember.set(projectedPreview, 'publisher.location', NEW_PUBLISHER_LOCATION);
        });

        Ember.run(function() {
          assert.throws(
            function() {
              Ember.set(projectedPreview, 'publisher.owner', NEW_PUBLISHER_OWNER);
            },
            /whitelist/gi,
            'Setting a non-whitelisted property on a projection over a resolved record throws an error'
          );
        });

        var _watchers13 = this.watchers,
          baseRecordWatcher = _watchers13.baseRecordWatcher,
          excerptWatcher = _watchers13.excerptWatcher;

        var baseCounts = baseRecordWatcher.counts;
        var excerptCounts = excerptWatcher.counts;

        assert.equal(
          baseCounts['publisher.owner'],
          0,
          'Afterwards we have not dirtied baseRecord.publisher.owner'
        );
        assert.equal(
          excerptCounts['publisher.owner'],
          0,
          'Afterwards we have not  dirtied baseRecord.publisher.owner'
        );
        assert.equal(
          Ember.get(baseRecord, 'publisher.owner'),
          PUBLISHER_OWNER,
          'base-record has the correct publisher.owner'
        );
        assert.equal(
          Ember.get(projectedExcerpt, 'publisher.owner'),
          PUBLISHER_OWNER,
          'excerpt has the correct publisher.owner'
        );
      });

      (0,
      _qunit.test)('Updating a resolution property via a projection updates the base-record, other projections and nested projections', function(assert) {
        var store = this.store;
        var _records14 = this.records,
          baseRecord = _records14.baseRecord,
          projectedExcerpt = _records14.projectedExcerpt;

        Ember.run(function() {
          store.push({
            data: {
              id: PUBLISHER_ID,
              type: PROJECTED_PUBLISHER_CLASS,
              attributes: {
                location: NEW_PUBLISHER_LOCATION,
                owner: NEW_PUBLISHER_OWNER,
              },
            },
          });
        });

        var _watchers14 = this.watchers,
          baseRecordWatcher = _watchers14.baseRecordWatcher,
          excerptWatcher = _watchers14.excerptWatcher;

        var baseCounts = baseRecordWatcher.counts;
        var excerptCounts = excerptWatcher.counts;

        assert.equal(
          baseCounts['publisher.owner'],
          1,
          'Afterwards we have dirtied baseRecord.description'
        );
        assert.equal(
          excerptCounts['publisher.owner'],
          1,
          'Afterwards we have dirtied baseRecord.description'
        );
        assert.equal(
          Ember.get(baseRecord, 'publisher.owner'),
          NEW_PUBLISHER_OWNER,
          'base-record has the correct publisher.owner'
        );
        assert.equal(
          Ember.get(projectedExcerpt, 'publisher.owner'),
          NEW_PUBLISHER_OWNER,
          'excerpt has the correct publisher.owner'
        );
      });

      (0,
      _qunit.test)('Updating a resolution property via a nested projection updates the base-record, other projections', function(assert) {
        var store = this.store;
        var _records15 = this.records,
          baseRecord = _records15.baseRecord,
          projectedExcerpt = _records15.projectedExcerpt;

        Ember.run(function() {
          store.push({
            data: {
              id: BOOK_ID,
              type: BOOK_EXCERPT_PROJECTION_CLASS_PATH,
              attributes: {
                publisher: PUBLISHER_URN,
              },
            },
            included: [
              {
                id: PUBLISHER_ID,
                type: PROJECTED_PUBLISHER_CLASS,
                attributes: {
                  location: NEW_PUBLISHER_LOCATION,
                },
              },
            ],
          });
        });

        var _watchers15 = this.watchers,
          baseRecordWatcher = _watchers15.baseRecordWatcher,
          excerptWatcher = _watchers15.excerptWatcher;

        var baseCounts = baseRecordWatcher.counts;
        var excerptCounts = excerptWatcher.counts;

        assert.equal(
          baseCounts['publisher.owner'],
          0,
          'Afterwards we have not dirtied baseRecord.publisher.owner'
        );
        assert.equal(
          excerptCounts['publisher.owner'],
          0,
          'Afterwards we have not  dirtied baseRecord.publisher.owner'
        );
        assert.equal(
          Ember.get(baseRecord, 'publisher.owner'),
          PUBLISHER_OWNER,
          'base-record has the correct publisher.owner'
        );
        assert.equal(
          Ember.get(projectedExcerpt, 'publisher.owner'),
          PUBLISHER_OWNER,
          'excerpt has the correct publisher.owner'
        );
      });
    });

    (0, _qunit.module)('Update projection property with resolved value', function(hooks) {
      // properties for use for initial state
      var BOOK_ID = 'isbn:9780439708181';
      var PUBLISHER_ID = 'publisher-abc123';
      var PUBLISHER_ID_NEW = 'publisher-abc123_new';
      var PUBLISHER_URN = 'urn:' + PUBLISHER_CLASS + ':' + PUBLISHER_ID;

      // intial old values
      var PUBLISHER_NAME = 'MACMILLAN';
      var PUBLISHER_LOCATION = 'Isle of Arran, Scotland';
      var PUBLISHER_OWNER = 'Daniel and Alexander Macmillan';

      // properties for use post-patch
      var NEW_PUBLISHER_NAME = 'MACMILLAN NEW';
      var NEW_PUBLISHER_LOCATION = 'London, England';
      var NEW_PUBLISHER_OWNER = 'Holtzbrinck Publishing Group';
      var NEW_PUBLISHER_URN = 'urn:' + PUBLISHER_CLASS + ':' + PUBLISHER_ID_NEW;

      hooks.beforeEach(function() {
        //Adding .setAttribute hook in schema
        this.schemaManager.get('schema').setAttribute = function(
          modelName,
          attr,
          value,
          schemaInterface
        ) {
          var baseModelName = this.computeBaseModelName(modelName);
          if (
            baseModelName &&
            attr === 'publisher' &&
            value &&
            value.constructor &&
            value.constructor.isModel
          ) {
            schemaInterface.setAttr(attr, NEW_PUBLISHER_URN);
            return;
          }

          schemaInterface.setAttr(attr, value);
        };

        var store = this.store;

        var baseRecord = void 0;
        var projectedExcerpt = void 0;
        var projectedPreview = void 0;

        Ember.run(function() {
          baseRecord = store.push({
            data: {
              id: BOOK_ID,
              type: BOOK_CLASS_PATH,
              attributes: {
                publisher: PUBLISHER_URN,
              },
            },
            included: [
              {
                id: PUBLISHER_ID,
                type: PUBLISHER_CLASS,
                attributes: {
                  name: PUBLISHER_NAME,
                  location: PUBLISHER_LOCATION,
                  owner: PUBLISHER_OWNER,
                },
              },
              {
                id: PUBLISHER_ID,
                type: PROJECTED_PUBLISHER_CLASS,
                attributes: {},
              },
            ],
          });

          projectedExcerpt = store.push({
            data: {
              id: BOOK_ID,
              type: BOOK_EXCERPT_PROJECTION_CLASS_PATH,
              attributes: {},
            },
          });

          projectedPreview = store.push({
            data: {
              id: BOOK_ID,
              type: BOOK_PREVIEW_PROJECTION_CLASS_PATH,
              attributes: {},
            },
          });
        });

        this.records = {
          baseRecord: baseRecord,
          projectedExcerpt: projectedExcerpt,
          projectedPreview: projectedPreview,
        };
      });

      (0,
      _qunit.test)('Updating property to another resolved value updates the base-record, other projections with new URN information using schema hook .setAttribute', function(assert) {
        var store = this.store;
        var _records16 = this.records,
          baseRecord = _records16.baseRecord,
          projectedExcerpt = _records16.projectedExcerpt,
          projectedPreview = _records16.projectedPreview;

        Ember.run(function() {
          store.push({
            data: {
              id: BOOK_ID,
              type: BOOK_EXCERPT_PROJECTION_CLASS_PATH,
              attributes: {
                publisher: PUBLISHER_URN,
              },
            },
            included: [
              {
                id: PUBLISHER_ID,
                type: PROJECTED_PUBLISHER_CLASS,
                attributes: {
                  location: PUBLISHER_LOCATION,
                },
              },
            ],
          });

          store.push({
            data: {
              id: BOOK_ID,
              type: BOOK_PREVIEW_PROJECTION_CLASS_PATH,
              attributes: {
                publisher: PUBLISHER_URN,
              },
            },
            included: [
              {
                id: PUBLISHER_ID,
                type: PROJECTED_PUBLISHER_CLASS,
                attributes: {
                  name: PUBLISHER_NAME,
                  loaction: PUBLISHER_LOCATION,
                },
              },
            ],
          });

          // New publisher record
          store.push({
            data: {
              id: PUBLISHER_ID_NEW,
              type: PUBLISHER_CLASS,
              attributes: {
                name: NEW_PUBLISHER_NAME,
                location: NEW_PUBLISHER_LOCATION,
                owner: NEW_PUBLISHER_OWNER,
              },
            },
          });
        });

        var newProjectedPublisherRecord = Ember.run(function() {
          return store.push({
            data: {
              id: PUBLISHER_ID_NEW,
              type: PROJECTED_PUBLISHER_CLASS,
              attributes: {
                location: NEW_PUBLISHER_LOCATION,
              },
            },
          });
        });

        // Value not changed in projection before setting new resolved value
        assert.equal(
          projectedPreview.get('publisher.id'),
          PUBLISHER_ID,
          'publisher.id is not updated'
        );

        assert.equal(
          projectedPreview.get('publisher.location'),
          PUBLISHER_LOCATION,
          'publisher location is not updated'
        );

        assert.equal(
          projectedPreview.get('publisher.name'),
          PUBLISHER_NAME,
          'publisher Name is not updated'
        );

        // Value not changed in base record before setting new resolved value
        assert.equal(baseRecord.get('publisher.id'), PUBLISHER_ID, 'publisher.id is not updated');

        assert.equal(
          baseRecord.get('publisher.location'),
          PUBLISHER_LOCATION,
          'publisher location is not updated'
        );

        assert.equal(
          baseRecord.get('publisher.owner'),
          PUBLISHER_OWNER,
          'publisher Owner is not updated'
        );

        assert.equal(
          baseRecord.get('publisher.name'),
          PUBLISHER_NAME,
          'publisher Name is not updated'
        );

        // Set Resolved value
        Ember.run(function() {
          Ember.set(projectedExcerpt, 'publisher', newProjectedPublisherRecord);
        });

        // Value changed in projection after setting to new resolved value
        assert.equal(
          projectedPreview.get('publisher.id'),
          PUBLISHER_ID_NEW,
          'publisher.id is updated'
        );

        assert.equal(
          projectedPreview.get('publisher.location'),
          NEW_PUBLISHER_LOCATION,
          'publisher location is updated'
        );

        assert.equal(
          projectedPreview.get('publisher.name'),
          NEW_PUBLISHER_NAME,
          'publisher Name is updated'
        );

        // Value changed in base record after setting to new resolved value
        assert.equal(baseRecord.get('publisher.id'), PUBLISHER_ID_NEW, 'publisher.id is updated');

        assert.equal(
          baseRecord.get('publisher.location'),
          NEW_PUBLISHER_LOCATION,
          'publisher location is updated'
        );

        assert.equal(
          baseRecord.get('publisher.owner'),
          NEW_PUBLISHER_OWNER,
          'publisher Owner is updated'
        );

        assert.equal(
          baseRecord.get('publisher.name'),
          NEW_PUBLISHER_NAME,
          'publisher Name is updated'
        );
      });

      (0,
      _qunit.test)('Updating a reference array will update the array in the projection and the base record', function(assert) {
        var store = this.store;

        var OTHER_BOOK_ID = 'isbn:8888';
        var projectedPreview = void 0;
        var otherProjectedPreview = void 0;

        Ember.run(function() {
          // Base record for projectedPreview
          store.push({
            data: {
              id: BOOK_ID,
              type: BOOK_CLASS_PATH,
              attributes: {
                otherBooksInSeries: [],
              },
            },
          });

          // Base record for otherProjectedPreview
          store.push({
            data: {
              id: OTHER_BOOK_ID,
              type: BOOK_CLASS_PATH,
              attributes: {
                otherBooksInSeries: [],
              },
            },
          });

          projectedPreview = store.push({
            data: {
              id: BOOK_ID,
              type: BOOK_PREVIEW_PROJECTION_CLASS_PATH,
              attributes: {
                otherBooksInSeries: [],
              },
            },
          });

          otherProjectedPreview = store.push({
            data: {
              id: OTHER_BOOK_ID,
              type: BOOK_PREVIEW_PROJECTION_CLASS_PATH,
              attributes: {
                otherBooksInSeries: [],
              },
            },
          });
        });

        assert.deepEqual(
          Ember.get(projectedPreview, 'otherBooksInSeries').map(function(book) {
            return Ember.get(book, 'id');
          }),
          [],
          'Initial set of otherBookInSeries should be empty before mutating'
        );

        Ember.run(function() {
          Ember.get(projectedPreview, 'otherBooksInSeries').replace(0, 1, [otherProjectedPreview]);
        });

        assert.deepEqual(
          Ember.get(projectedPreview, 'otherBooksInSeries').map(function(book) {
            return Ember.get(book, 'id');
          }),
          [OTHER_BOOK_ID],
          'Changes to otherBooksInSeries references should be reflected after mutation'
        );
      });
    });

    (0,
    _qunit.skip)("Updates to a projection's non-whitelisted attributes do not cause a projection to be dirtied", function() {});

    (0, _qunit.module)('unloading/deleting records', function(hooks) {
      var BOOK_ID = 'isbn:123';
      var OTHER_BOOK_ID = 'isbn:456';
      var OTHER_BOOK_URN = 'urn:' + NORM_BOOK_CLASS_PATH + ':' + OTHER_BOOK_ID;
      var BOOK_TITLE = 'Alice in Wonderland';

      hooks.beforeEach(function() {
        var store = this.store;

        this.owner.register(
          'adapter:-ember-m3',
          Ember.Object.extend({
            deleteRecord: function deleteRecord() {
              return Ember.RSVP.Promise.resolve();
            },
          })
        );

        var baseRecord = Ember.run(function() {
          return store.push({
            data: {
              id: BOOK_ID,
              type: BOOK_CLASS_PATH,
              attributes: {
                title: BOOK_TITLE,
                otherBooksInSeries: [OTHER_BOOK_URN],
              },
            },
          });
        });

        var projectedPreview = Ember.run(function() {
          return store.push({
            data: {
              id: BOOK_ID,
              type: BOOK_PREVIEW_PROJECTION_CLASS_PATH,
              attributes: {},
            },
          });
        });

        var projectedExcerpt = Ember.run(function() {
          return store.push({
            data: {
              id: BOOK_ID,
              type: BOOK_EXCERPT_PROJECTION_CLASS_PATH,
              attributes: {},
            },
          });
        });

        this.records = {
          baseRecord: baseRecord,
          projectedPreview: projectedPreview,
          projectedExcerpt: projectedExcerpt,
        };
      });

      (0, _qunit.skip)('Deleting the base-record also deletes the projections', function(assert) {
        var _records17 = this.records,
          baseRecord = _records17.baseRecord,
          projectedPreview = _records17.projectedPreview;

        baseRecord.deleteRecord();

        assert.equal(
          Ember.get(projectedPreview, 'isDeleted'),
          true,
          'Expected projection record to be deleted as well'
        );
        assert.equal(
          Ember.get(projectedPreview, 'isDirty'),
          true,
          'Expected projection record to be marked as dirty as well'
        );

        Ember.run(function() {
          baseRecord.save().then(function() {
            assert.equal(
              Ember.get(projectedPreview, 'isDeleted'),
              true,
              'Expected the projection record to stay deleted'
            );
            assert.equal(
              Ember.get(projectedPreview, 'isDirty'),
              false,
              'Expected the projection record to have been committed'
            );
          });
        });
      });

      (0, _qunit.skip)('Deleting the projection also deletes the base-record', function(assert) {
        var _records18 = this.records,
          baseRecord = _records18.baseRecord,
          projectedPreview = _records18.projectedPreview,
          projectedExcerpt = _records18.projectedExcerpt;

        projectedPreview.deleteRecord();

        assert.equal(
          Ember.get(baseRecord, 'isDeleted'),
          true,
          'Expected the base record to be deleted as well'
        );
        assert.equal(
          Ember.get(baseRecord, 'isDirty'),
          true,
          'Expected the base record to be marked as dirty as well'
        );
        assert.equal(
          Ember.get(projectedExcerpt, 'isDeleted'),
          true,
          'Expected the other projection record to be deleted as well'
        );
        assert.equal(
          Ember.get(projectedExcerpt, 'isDirty'),
          true,
          'Expected the other projection record to be marked as dirty as well'
        );

        Ember.run(function() {
          projectedPreview.save().then(function() {
            assert.equal(
              Ember.get(baseRecord, 'isDeleted'),
              true,
              'Expected the base record to stay deleted'
            );
            assert.equal(
              Ember.get(baseRecord, 'isDirty'),
              false,
              'Expected the base record to have been committed'
            );
            assert.equal(
              Ember.get(projectedExcerpt, 'isDeleted'),
              true,
              'Expected the other projection record to stay deleted'
            );
            assert.equal(
              Ember.get(projectedExcerpt, 'isDirty'),
              false,
              'Expected the other projection record to have been committed'
            );
          });
        });
      });

      (0,
      _qunit.test)('Unloading a projection does not unload the base-record and other projections', function(assert) {
        var _records19 = this.records,
          baseRecord = _records19.baseRecord,
          projectedPreview = _records19.projectedPreview,
          projectedExcerpt = _records19.projectedExcerpt;

        Ember.run(function() {
          projectedPreview.unloadRecord();
        });

        // projectedPreview has been unloaded
        assert.equal(this.store.hasRecordForId(BOOK_PREVIEW_PROJECTION_CLASS_PATH, BOOK_ID), false);
        assert.equal(Ember.get(projectedPreview, 'isDestroyed'), true);

        // baseRecord is still around
        assert.equal(this.store.hasRecordForId(BOOK_CLASS_PATH, BOOK_ID), true);
        assert.equal(Ember.get(baseRecord, 'isDestroyed'), false);
        // TODO How can we check whether the underlying structure were not destroyed in the case of unload
        // Functionality can continue to work even in case of a bug
        assert.equal(Ember.get(baseRecord, '_internalModel.isDestroyed'), false);
        assert.equal(Ember.get(baseRecord, 'title'), BOOK_TITLE);

        // projectedExcerpt is still arond
        assert.equal(this.store.hasRecordForId(BOOK_EXCERPT_PROJECTION_CLASS_PATH, BOOK_ID), true);
        assert.equal(Ember.get(projectedExcerpt, 'isDestroyed'), false);
        assert.equal(Ember.get(projectedExcerpt, '_internalModel.isDestroyed'), false);
        assert.equal(Ember.get(projectedExcerpt, 'title'), BOOK_TITLE);
      });

      (0,
      _qunit.test)('Unloading the base-record does not unload the projection', function(assert) {
        var _records20 = this.records,
          baseRecord = _records20.baseRecord,
          projectedPreview = _records20.projectedPreview;

        Ember.run(function() {
          baseRecord.unloadRecord();
        });

        // baseRecord has been unloaded
        assert.equal(this.store.hasRecordForId(BOOK_CLASS_PATH, BOOK_ID), false);
        assert.equal(Ember.get(baseRecord, 'isDestroyed'), true);

        // projectedPreview is still around
        assert.equal(this.store.hasRecordForId(BOOK_PREVIEW_PROJECTION_CLASS_PATH, BOOK_ID), true);
        assert.equal(Ember.get(projectedPreview, 'isDestroyed'), false);
        // TODO How can we check whether the underlying structure were not destroyed in the case of unload
        // Functionality can continue to work even in case of a bug
        assert.equal(Ember.get(projectedPreview, '_internalModel.isDestroyed'), false);
        assert.equal(Ember.get(projectedPreview, 'title'), BOOK_TITLE);
      });

      (0,
      _qunit.skip)('Unloading a record removes it from record arrays, which have reference to it', function(assert) {
        var _this3 = this;

        // we need additional records to be able to resolve the references
        Ember.run(function() {
          _this3.store.push({
            data: {
              id: OTHER_BOOK_ID,
              type: BOOK_CLASS_PATH,
              attributes: {},
            },
          });
        });

        Ember.run(function() {
          _this3.store.push({
            data: {
              id: OTHER_BOOK_ID,
              type: BOOK_PREVIEW_PROJECTION_CLASS_PATH,
            },
          });
        });

        var _records21 = this.records,
          baseModel = _records21.baseModel,
          projectedPreview = _records21.projectedPreview;

        // load the record arrays
        var booksInSeriesBase = Ember.get(baseModel, 'otherBooksInSeries');
        var booksInSeriesProjectedPreview = Ember.get(projectedPreview, 'otherBooksInSeries');
        var otherProjectedPreview = Ember.get(booksInSeriesProjectedPreview, 'firstObject');

        // precondition
        assert.equal(
          Ember.get(booksInSeriesBase, 'length'),
          1,
          'Expected otherBooksInSeries length to be one for base'
        );
        assert.equal(
          Ember.get(booksInSeriesProjectedPreview, 'length'),
          1,
          'Expected otherBooksInSeries length to be one for projected preview'
        );

        // unload a projection referenced in a record array
        Ember.run(function() {
          otherProjectedPreview.unloadRecord();
        });

        assert.equal(
          Ember.get(booksInSeriesBase, 'length'),
          1,
          'Expected otherBooksInSeries length to be unchanged for base'
        );
        assert.equal(
          Ember.get(booksInSeriesProjectedPreview, 'length'),
          1,
          'Expected otherBooksInSeries length to be unchanged for projected preview'
        );
        assert.equal(
          booksInSeriesProjectedPreview.getObjectAt(0),
          null,
          'Expected the projected preview to have been replaced with null in the record array'
        );
        assert.notEqual(
          Ember.get(booksInSeriesBase, 'firstObject.isDestroyed'),
          true,
          'Expected record in otherBooksInSeries for base to not have been destroyed'
        );
      });

      (0,
      _qunit.skip)('Projection list is cleaned up after all projections have been unloaded', function() {});
    });

    (0, _qunit.module)('creating/updating projections', function() /*hooks*/ {
      var BOOK_ID = 'isbn:123';
      var BOOK_TITLE_1 = 'Alice in Wonderland';
      var BOOK_TITLE_2 = 'Alice Through the Looking Glass';
      var BOOK_CHAPTER_1 = 'Down the Rabbit-Hole';
      var BOOK_CHAPTER_2 = 'Looking-Glass House';
      var BOOK_AUTHOR_NAME_1 = 'Lewis Carol';
      var BOOK_AUTHOR_NAME_2 = 'J.K. Rowling';

      (0,
      _qunit.test)('independently created projections of the same base-type but no ID do not share their data', function(assert) {
        var _this4 = this;

        var projectedPreview = Ember.run(function() {
          return _this4.store.createRecord(BOOK_PREVIEW_PROJECTION_CLASS_PATH, {
            title: BOOK_TITLE_1,
          });
        });
        var projectedExcerpt = Ember.run(function() {
          return _this4.store.createRecord(BOOK_EXCERPT_PROJECTION_CLASS_PATH, {
            title: BOOK_TITLE_2,
          });
        });

        assert.equal(
          Ember.get(projectedPreview, 'title'),
          BOOK_TITLE_1,
          'Expected title of preview projection to be correct'
        );
        assert.equal(
          Ember.get(projectedExcerpt, 'title'),
          BOOK_TITLE_2,
          'Expected title of excerpt projection to be correct'
        );
      });

      (0,
      _qunit.test)('independently created projections of the same projection-type but no ID do not share their data', function(assert) {
        var _this5 = this;

        var projectedPreview1 = Ember.run(function() {
          return _this5.store.createRecord(BOOK_PREVIEW_PROJECTION_CLASS_PATH, {
            title: BOOK_TITLE_1,
          });
        });
        var projectedPreview2 = Ember.run(function() {
          return _this5.store.createRecord(BOOK_PREVIEW_PROJECTION_CLASS_PATH, {
            title: BOOK_TITLE_2,
          });
        });

        assert.equal(
          Ember.get(projectedPreview1, 'title'),
          BOOK_TITLE_1,
          'Expected title of preview projection to be correct'
        );
        assert.equal(
          Ember.get(projectedPreview2, 'title'),
          BOOK_TITLE_2,
          'Expected title of the second preview projection to be correct'
        );
      });

      (0,
      _qunit.test)('independently created projections of the same base-type and ID share their data', function(assert) {
        var _this6 = this;

        var projectedPreview = Ember.run(function() {
          return _this6.store.createRecord(BOOK_PREVIEW_PROJECTION_CLASS_PATH, {
            id: BOOK_ID,
            title: BOOK_TITLE_1,
          });
        });
        var projectedExcerpt = Ember.run(function() {
          return _this6.store.createRecord(BOOK_EXCERPT_PROJECTION_CLASS_PATH, {
            id: BOOK_ID,
            title: BOOK_TITLE_2,
          });
        });

        assert.equal(
          Ember.get(projectedPreview, 'title'),
          BOOK_TITLE_2,
          'Expected title of preview projection to be correct'
        );
        assert.equal(
          Ember.get(projectedExcerpt, 'title'),
          BOOK_TITLE_2,
          'Expected title of excerpt projection to be correct'
        );

        Ember.run(function() {
          Ember.set(projectedExcerpt, 'title', BOOK_TITLE_1);
        });

        assert.equal(
          Ember.get(projectedPreview, 'title'),
          BOOK_TITLE_1,
          'Expected title of preview projection to be updated'
        );
        assert.equal(
          Ember.get(projectedExcerpt, 'title'),
          BOOK_TITLE_1,
          'Expected title of excerpt projection to be updated'
        );
      });

      (0,
      _qunit.test)('independently creating projections of the same projection-type and ID is not allowed', function(assert) {
        var _this7 = this;

        Ember.run(function() {
          _this7.store.createRecord(BOOK_PREVIEW_PROJECTION_CLASS_PATH, {
            id: BOOK_ID,
          });
          assert.expectAssertion(
            function() {
              _this7.store.createRecord(BOOK_PREVIEW_PROJECTION_CLASS_PATH, {
                id: BOOK_ID,
              });
            },
            /has already been used/,
            'Expected create record for same projection and ID to throw an error'
          );
        });
      });

      (0, _qunit.test)('can create and save a projection', function(assert) {
        var _this8 = this;

        var createRecordCalls = 0;

        this.owner.register(
          'adapter:-ember-m3',
          Ember.Object.extend({
            createRecord: function createRecord(store, type, snapshot) {
              createRecordCalls++;
              // some assertions
              assert.equal(
                Ember.get(snapshot, 'modelName'),
                NORM_BOOK_PREVIEW_PROJECTION_CLASS_PATH,
                'Expected createRecord to be called for the projection type'
              );

              return Ember.RSVP.Promise.resolve({
                data: {
                  id: BOOK_ID,
                  type: BOOK_PREVIEW_PROJECTION_CLASS_PATH,
                  attributes: {},
                },
              });
            },
          })
        );

        var projectedPreview = Ember.run(function() {
          var record = _this8.store.createRecord(BOOK_PREVIEW_PROJECTION_CLASS_PATH, {
            title: BOOK_TITLE_1,
          });
          record.save();
          return record;
        });

        assert.equal(
          Ember.get(projectedPreview, 'isNew'),
          false,
          'Expected the projection to be marked as saved'
        );
        assert.equal(
          Ember.get(projectedPreview, 'id'),
          BOOK_ID,
          'Expected the new record to have picked up the returned ID'
        );
        assert.equal(
          createRecordCalls,
          1,
          'Expected `createRecord` to have been called exactly once.'
        );
      });

      (0, _qunit.test)('new projections are correctly cached after save', function(assert) {
        var _this9 = this;

        this.owner.register(
          'adapter:-ember-m3',
          Ember.Object.extend({
            createRecord: function createRecord() {
              return Ember.RSVP.Promise.resolve({
                data: {
                  id: BOOK_ID,
                  type: BOOK_PREVIEW_PROJECTION_CLASS_PATH,
                  attributes: {},
                },
              });
            },
          })
        );

        var projectedPreview = Ember.run(function() {
          var record = _this9.store.createRecord(BOOK_PREVIEW_PROJECTION_CLASS_PATH, {
            title: BOOK_TITLE_1,
          });
          record.save();
          return record;
        });

        var peekedPreview = Ember.run(function() {
          return _this9.store.peekRecord(BOOK_PREVIEW_PROJECTION_CLASS_PATH, BOOK_ID);
        });

        assert.equal(
          Ember.get(peekedPreview, 'title'),
          BOOK_TITLE_1,
          'Empty attributes in the save response preserved our in-flight attributes'
        );
        assert.ok(
          projectedPreview === peekedPreview,
          'Expected the new preview projection to be in the cache after save'
        );
      });

      (0, _qunit.test)('newly created and saved projections can receive updates', function(assert) {
        var _this10 = this;

        this.owner.register(
          'adapter:-ember-m3',
          Ember.Object.extend({
            createRecord: function createRecord() {
              return Ember.RSVP.Promise.resolve({
                data: {
                  id: BOOK_ID,
                  type: BOOK_PREVIEW_PROJECTION_CLASS_PATH,
                  attributes: {},
                },
              });
            },
          })
        );

        var projectedPreview = Ember.run(function() {
          var record = _this10.store.createRecord(BOOK_PREVIEW_PROJECTION_CLASS_PATH, {
            title: BOOK_TITLE_1,
            author: {
              name: BOOK_AUTHOR_NAME_1,
            },
          });

          // reify the nested model
          Ember.get(record, 'author.name');

          record.save();
          return record;
        });

        // instead of involving adapter, just push the data and check things were correctly updated
        Ember.run(function() {
          _this10.store.push({
            data: {
              id: BOOK_ID,
              type: BOOK_EXCERPT_PROJECTION_CLASS_PATH,
              attributes: {
                title: BOOK_TITLE_2,
                author: {
                  name: BOOK_AUTHOR_NAME_2,
                },
              },
            },
          });
        });

        assert.equal(
          Ember.get(projectedPreview, 'title'),
          BOOK_TITLE_2,
          'Expected preview projection to have received updated title'
        );
        assert.equal(
          Ember.get(projectedPreview, 'author.name'),
          BOOK_AUTHOR_NAME_2,
          'Expected preview projection to have received updated author.name'
        );
      });

      (0,
      _qunit.skip)('we cannot create a new projection when existing recordData exists', function(assert) {
        var _this11 = this;

        // pre-populate the store with a different projection and base-data for the ID we will attempt to create.
        Ember.run(function() {
          _this11.store.push({
            data: {
              id: BOOK_ID,
              type: BOOK_EXCERPT_PROJECTION_CLASS_PATH,
              attributes: {
                title: BOOK_TITLE_2,
              },
            },
          });
        });

        // we want to test this but we may tweak the error thrown once we actually implement.
        assert.throws(
          function() {
            _this11.store.createRecord(BOOK_PREVIEW_PROJECTION_CLASS_PATH, {
              id: BOOK_ID,
              title: BOOK_TITLE_1,
            });
          },
          /You cannot create a new projection for a pre-existing record/,
          '[TODO UPDATE THIS ASSERT] We throw the right assertion.'
        );
      });

      (0,
      _qunit.test)('.changedAttributes on a projection returns all changed properties', function(assert) {
        var _this12 = this;

        var projectedExcerpt = Ember.run(function() {
          return _this12.store.push({
            data: {
              id: BOOK_ID,
              type: BOOK_EXCERPT_PROJECTION_CLASS_PATH,
              attributes: {
                title: BOOK_TITLE_1,
                author: {
                  name: BOOK_AUTHOR_NAME_1,
                },
              },
            },
          });
        });
        var projectedPreview = Ember.run(function() {
          return _this12.store.push({
            data: {
              id: BOOK_ID,
              type: BOOK_PREVIEW_PROJECTION_CLASS_PATH,
              attributes: {},
            },
          });
        });

        Ember.run(function() {
          Ember.set(projectedPreview, 'title', BOOK_TITLE_2);
          Ember.set(projectedPreview, 'author.name', BOOK_AUTHOR_NAME_2);
        });

        assert.deepEqual(
          projectedExcerpt.changedAttributes(),
          {
            title: [BOOK_TITLE_1, BOOK_TITLE_2],
            author: {
              name: [BOOK_AUTHOR_NAME_1, BOOK_AUTHOR_NAME_2],
            },
          },
          'Expected changed attributes to be correctly returned'
        );
      });

      (0,
      _qunit.test)('.rollbackAttributes on a projection sets the model attributes back to its original state', function(assert) {
        var _this13 = this;

        var projectedExcerpt = Ember.run(function() {
          return _this13.store.push({
            data: {
              id: BOOK_ID,
              type: BOOK_EXCERPT_PROJECTION_CLASS_PATH,
              attributes: {
                title: BOOK_TITLE_1,
                author: {
                  name: BOOK_AUTHOR_NAME_1,
                },
              },
            },
          });
        });
        Ember.run(function() {
          _this13.store.push({
            data: {
              id: BOOK_ID,
              type: BOOK_CLASS_PATH,
              attributes: {
                title: BOOK_TITLE_1,
              },
            },
          });
        });

        assert.notOk(
          projectedExcerpt.get('isDirty'),
          'The projection should not be dirty on its initial state'
        );
        assert.deepEqual(
          projectedExcerpt.changedAttributes(),
          {},
          'The projection should not have changed attributes on its initial state'
        );
        Ember.run(function() {
          Ember.set(projectedExcerpt, 'title', BOOK_TITLE_2);
        });
        assert.ok(
          projectedExcerpt.get('isDirty'),
          'The projection should be dirty after mutating its state'
        );
        assert.deepEqual(
          projectedExcerpt.changedAttributes(),
          {
            title: [BOOK_TITLE_1, BOOK_TITLE_2],
          },
          'The projection title was registered as a changed attribute after it was mutated'
        );

        projectedExcerpt.rollbackAttributes();
        assert.notOk(
          projectedExcerpt.get('isDirty'),
          'The projection should not be dirty after rolling back its attributes'
        );
        assert.deepEqual(
          projectedExcerpt.changedAttributes(),
          {},
          'The projection attributes went back to their original state after calling rollbackAttributes'
        );
      });

      (0,
      _qunit.test)('.isDirty on a projection is true after updating its state', function(assert) {
        var _this14 = this;

        var projectedExcerpt = Ember.run(function() {
          return _this14.store.push({
            data: {
              id: BOOK_ID,
              type: BOOK_EXCERPT_PROJECTION_CLASS_PATH,
              attributes: {
                title: BOOK_TITLE_1,
                author: {
                  name: BOOK_AUTHOR_NAME_1,
                },
              },
            },
          });
        });
        // Base record
        Ember.run(function() {
          _this14.store.push({
            data: {
              id: BOOK_ID,
              type: BOOK_CLASS_PATH,
              attributes: {
                title: BOOK_TITLE_1,
              },
            },
          });
        });

        assert.notOk(
          projectedExcerpt.get('isDirty'),
          'The projection should not be dirty on its initial state'
        );
        Ember.run(function() {
          Ember.set(projectedExcerpt, 'title', BOOK_TITLE_2);
        });
        assert.ok(
          projectedExcerpt.get('isDirty'),
          'The projection should be dirty after mutating its state'
        );
      });

      (0,
      _qunit.skip)('update and save of a projection does not touch non-whitelisted properties', function(assert) {
        var _this15 = this;

        var updateRecordCalls = 0;
        this.owner.register(
          'adapter:-ember-m3',
          Ember.Object.extend({
            updateRecord: function updateRecord(store, type, snapshot) {
              updateRecordCalls++;

              assert.equal(
                Ember.get(snapshot, 'modelName'),
                BOOK_EXCERPT_PROJECTION_CLASS_PATH,
                'Expected update request to be made for the projection'
              );

              return Ember.RSVP.Promise.resolve();
            },
          })
        );

        var baseModel = Ember.run(function() {
          return _this15.store.push({
            data: {
              id: BOOK_ID,
              type: BOOK_CLASS_PATH,
              attributes: {
                title: BOOK_TITLE_1,
                chapter: BOOK_CHAPTER_1,
              },
            },
          });
        });
        var projectedExcerpt = Ember.run(function() {
          return _this15.store.push({
            data: {
              id: BOOK_ID,
              type: BOOK_EXCERPT_PROJECTION_CLASS_PATH,
              attributes: {},
            },
          });
        });

        Ember.run(function() {
          Ember.set(baseModel, 'title', BOOK_TITLE_2);
          Ember.set(baseModel, 'chapter-1', BOOK_CHAPTER_2);
        });

        assert.equal(
          Ember.get(projectedExcerpt, '_internalModel.currentState.isDirty'),
          true,
          'Expected projection to be made dirty'
        );
        assert.equal(
          Ember.get(baseModel, '_internalModel.currentState.isDirty'),
          true,
          'Expected base model to be made dirty'
        );

        Ember.run(function() {
          projectedExcerpt.save();
        });

        assert.equal(updateRecordCalls, 1, 'Expected one updateRecord call to be made');
        assert.equal(
          Ember.get(projectedExcerpt, '_internalModel.currentState.isDirty'),
          false,
          'The projection should have been saved'
        );
        assert.equal(
          Ember.get(baseModel, '_internalModel.currentState.isDirty'),
          true,
          'The base model should still be dirty'
        );
      });
    });

    (0, _qunit.skip)('eachAttribute returns only white-listed properties', function() {});
    (0, _qunit.skip)('Creating a projection with an unloaded schema', function() {});
    (0, _qunit.skip)('Finding a projection with an unloaded schema', function() {});
    (0,
    _qunit.skip)('fetched schemas must be complete (projected types must also be included)', function() {});
  });
});
define('dummy/tests/unit/query-array-test', [
  'qunit',
  'ember-qunit',
  'ember-m3/query-array',
], function(_qunit, _emberQunit, _queryArray) {
  'use strict';

  function _asyncToGenerator(fn) {
    return function() {
      var gen = fn.apply(this, arguments);
      return new Promise(function(resolve, reject) {
        function step(key, arg) {
          try {
            var info = gen[key](arg);
            var value = info.value;
          } catch (error) {
            reject(error);
            return;
          }

          if (info.done) {
            resolve(value);
          } else {
            return Promise.resolve(value).then(
              function(value) {
                step('next', value);
              },
              function(err) {
                step('throw', err);
              }
            );
          }
        }

        return step('next');
      });
    };
  }

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

  (0, _qunit.module)('unit/query-array', function(hooks) {
    (0, _emberQunit.setupTest)(hooks);

    hooks.beforeEach(function() {
      this.store = this.owner.lookup('service:store');
      this.queryCache = new ((function() {
        function MockQueryCache() {
          _classCallCheck(this, MockQueryCache);
        }

        _createClass(MockQueryCache, [
          {
            key: 'queryURL',
            value: function queryURL() {
              var _this = this;

              return new Promise(function(resolve, reject) {
                _this.resolve = resolve;
                _this.reject = reject;
              });
            },
          },
        ]);

        return MockQueryCache;
      })())();

      this.createRecordArray = function() {
        var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

        return new _queryArray.default(
          Object.assign(
            {
              store: this.store,
              queryCache: this.queryCache,
              query: 'query',
            },
            options
          )
        );
      };
    });

    (0, _qunit.test)(
      'flags',
      (function() {
        var _ref = _asyncToGenerator(
          /*#__PURE__*/ regeneratorRuntime.mark(function _callee(assert) {
            var recordArray, updatePromise;
            return regeneratorRuntime.wrap(
              function _callee$(_context) {
                while (1) {
                  switch ((_context.prev = _context.next)) {
                    case 0:
                      recordArray = this.createRecordArray();

                      assert.equal(recordArray.get('isLoaded'), true, 'isLoaded initially true');
                      assert.equal(
                        recordArray.get('isUpdating'),
                        false,
                        'isUpdating initially false'
                      );

                      updatePromise = recordArray.update();

                      assert.equal(
                        recordArray.get('isLoaded'),
                        false,
                        'isLoaded false while loading'
                      );
                      assert.equal(
                        recordArray.get('isUpdating'),
                        true,
                        'isUpdating true while loading'
                      );

                      this.queryCache.resolve();
                      _context.next = 9;
                      return updatePromise;

                    case 9:
                      assert.equal(
                        recordArray.get('isLoaded'),
                        true,
                        'isLoaded true after loading resolved'
                      );
                      assert.equal(
                        recordArray.get('isUpdating'),
                        false,
                        'isUpdating false after loading resolved'
                      );

                      updatePromise = recordArray.update();
                      assert.equal(
                        recordArray.get('isLoaded'),
                        false,
                        'isLoaded false while loading again'
                      );
                      assert.equal(
                        recordArray.get('isUpdating'),
                        true,
                        'isUpdating true while loading again'
                      );

                      this.queryCache.reject('reasons');
                      _context.prev = 15;
                      _context.next = 18;
                      return updatePromise;

                    case 18:
                      assert.ok(false, 'promise rejects');
                      _context.next = 24;
                      break;

                    case 21:
                      _context.prev = 21;
                      _context.t0 = _context['catch'](15);

                      assert.equal(
                        _context.t0,
                        'reasons',
                        'promise rejected for what we can only presume to be reasons'
                      );

                    case 24:
                      assert.equal(
                        recordArray.get('isLoaded'),
                        true,
                        'isLoaded true after loading rejected'
                      );
                      assert.equal(
                        recordArray.get('isUpdating'),
                        false,
                        'isUpdating false after loading rejected'
                      );

                    case 26:
                    case 'end':
                      return _context.stop();
                  }
                }
              },
              _callee,
              this,
              [[15, 21]]
            );
          })
        );

        return function(_x2) {
          return _ref.apply(this, arguments);
        };
      })()
    );

    (0, _qunit.test)('QueryArray requires a query', function(assert) {
      var queryArray = new _queryArray.default();

      assert.throws(function() {
        queryArray.update();
      }, /QueryArray requires a query property/);
    });
  });
});
define('dummy/tests/unit/query-cache-test', [
  'qunit',
  'ember-qunit',
  'sinon',
  'dummy/tests/helpers/stub-calls',
  'ember-data',
  'ember-m3/model',
  'ember-m3/services/m3-schema',
], function(_qunit, _emberQunit, _sinon, _stubCalls, _emberData, _model, _m3Schema) {
  'use strict';

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

  var Serializer = _emberData.default.Serializer;

  (0, _qunit.module)('unit/query-cache', function(hooks) {
    (0, _emberQunit.setupTest)(hooks);

    hooks.beforeEach(function() {
      this.sinon = _sinon.default.createSandbox();

      this.owner.register(
        'service:m3-schema',
        (function(_DefaultSchema) {
          _inherits(TestSchema, _DefaultSchema);

          function TestSchema() {
            _classCallCheck(this, TestSchema);

            return _possibleConstructorReturn(
              this,
              (TestSchema.__proto__ || Object.getPrototypeOf(TestSchema)).apply(this, arguments)
            );
          }

          _createClass(TestSchema, [
            {
              key: 'includesModel',
              value: function includesModel(modelName) {
                return modelName !== 'application';
              },
            },
          ]);

          return TestSchema;
        })(_m3Schema.default)
      );

      this.store = this.owner.lookup('service:store');
      this.adapter = this.store.adapterFor('application');

      this.queryCache = this.store._queryCache;
      this.adapterAjax = this.sinon.stub(this.adapter, 'ajax').returns(Ember.RSVP.resolve());
    }),
      hooks.afterEach(function() {
        this.sinon.restore();
      });

    (0, _qunit.test)('.queryURL uses adapter.ajax to send requests', function(assert) {
      var _this2 = this;

      assert.equal(this.adapterAjax.callCount, 0, 'initial callCount 0');

      this.adapterAjax.returns(
        Ember.RSVP.resolve({
          data: {
            id: 1,
            type: 'my-type',
          },
        })
      );

      this.queryCache._buildUrl = this.sinon.stub().returns('/the-url');

      return this.queryCache.queryURL('/uwot').then(function() {
        assert.deepEqual(
          (0, _stubCalls.default)(_this2.queryCache._buildUrl),
          [[_this2.queryCache + '', ['/uwot']]],
          'adapter.ajax called with right args'
        );

        assert.deepEqual(
          (0, _stubCalls.default)(_this2.adapterAjax),
          [[_this2.adapter + '', ['/the-url', 'GET', {}]]],
          'adapter.ajax called with right args'
        );
      });
    });

    (0, _qunit.test)('._buildUrl uses the adapter host if no host in the URL', function(assert) {
      this.adapter.host = 'http://library.gg';

      assert.equal(this.queryCache._buildUrl('books/123'), 'http://library.gg/books/123');
      assert.equal(this.queryCache._buildUrl('/books/123'), 'http://library.gg/books/123');

      this.adapter.host = 'http://library.gg:81';

      assert.equal(this.queryCache._buildUrl('books/123'), 'http://library.gg:81/books/123');
      assert.equal(this.queryCache._buildUrl('/books/123'), 'http://library.gg:81/books/123');

      this.adapter.host = 'https://library.gg:81';

      assert.equal(this.queryCache._buildUrl('books/123'), 'https://library.gg:81/books/123');
      assert.equal(this.queryCache._buildUrl('/books/123'), 'https://library.gg:81/books/123');

      this.adapter.host = '//library.gg';

      assert.equal(this.queryCache._buildUrl('books/123'), '//library.gg/books/123');
      assert.equal(this.queryCache._buildUrl('/books/123'), '//library.gg/books/123');

      this.adapter.host = '//library.gg:81';

      assert.equal(this.queryCache._buildUrl('books/123'), '//library.gg:81/books/123');
      assert.equal(this.queryCache._buildUrl('/books/123'), '//library.gg:81/books/123');
    });

    (0, _qunit.test)('._buildUrl ignores adapter host if host is specified', function(assert) {
      this.adapter.host = 'http://foodcourt.gg';

      assert.equal(
        this.queryCache._buildUrl('http://library.gg/books/123'),
        'http://library.gg/books/123'
      );
    });

    (0,
    _qunit.test)('._buildUrl passes absolute paths through if adapter has no host', function(assert) {
      this.adapter.host = undefined;

      assert.equal(this.queryCache._buildUrl('/books/123'), '/books/123');

      // host: '/' is treated as an empty host by ember data
      this.adapter.host = '/';

      assert.equal(this.queryCache._buildUrl('/books/123'), '/books/123');
    });

    (0,
    _qunit.test)('._buildUrl uses the adapter namespace if the URL is relative', function(assert) {
      this.adapter.namespace = 'api/v1';

      // ember-data implicitly converts namespaces to absolute paths, so preserve
      // those semantics here
      assert.equal(this.queryCache._buildUrl('books/123'), '/api/v1/books/123');

      this.adapter.namespace = '/api/v1';

      assert.equal(this.queryCache._buildUrl('books/123'), '/api/v1/books/123');
    });

    (0,
    _qunit.test)('._buildUrl does not include adapter namespace if the path is absolute', function(assert) {
      this.adapter.namespace = '/api/v1';

      assert.equal(this.queryCache._buildUrl('/books/123'), '/books/123');
    });

    (0,
    _qunit.test)('._buildUrl uses the adapter host and namespace for relative paths', function(assert) {
      this.adapter.host = 'http://library.gg';
      this.adapter.namespace = '/api/v1';

      assert.equal(this.queryCache._buildUrl('books/123'), 'http://library.gg/api/v1/books/123');
      assert.equal(this.queryCache._buildUrl('/books/123'), 'http://library.gg/books/123');
    });

    (0,
    _qunit.test)('_buildUrl throws for relative paths if no host or namespace is provided', function(assert) {
      var _this3 = this;

      this.adapter.host = undefined;
      this.adapter.namespace = undefined;

      assert.throws(function() {
        _this3.queryCache._buildUrl('books/123');
      }, "store.queryURL('books/123') is invalid.  Absolute paths are required.  Either add a 'host' or 'namespace' property to your -ember-m3 adapter or call 'queryURL' with an absolute path.");
    });

    (0, _qunit.test)('.queryURL can accept params', function(assert) {
      var _this4 = this;

      assert.equal(this.adapterAjax.callCount, 0, 'initial callCount 0');

      this.adapterAjax.returns(
        Ember.RSVP.resolve({
          data: {
            id: 1,
            type: 'my-type',
          },
        })
      );

      return this.queryCache.queryURL('/uwot', { params: { param: 'value' } }).then(function() {
        assert.deepEqual(
          (0, _stubCalls.default)(_this4.adapterAjax),
          [[_this4.adapter + '', ['/uwot', 'GET', { data: { param: 'value' } }]]],
          'adapter.ajax called with right args'
        );
      });
    });

    (0, _qunit.test)('.queryURL can accept a method', function(assert) {
      var _this5 = this;

      assert.equal(this.adapterAjax.callCount, 0, 'initial callCount 0');

      this.adapterAjax.returns(
        Ember.RSVP.resolve({
          data: {
            id: 1,
            type: 'my-type',
          },
        })
      );

      return this.queryCache.queryURL('/uwot', { method: 'POST' }).then(function() {
        assert.deepEqual(
          (0, _stubCalls.default)(_this5.adapterAjax),
          [[_this5.adapter + '', ['/uwot', 'POST', {}]]],
          'adapter.ajax called with right args'
        );
      });
    });

    (0, _qunit.test)('a custom -ember-m3 adapter can be registered', function(assert) {
      var payload = {
        data: {
          id: 1,
          type: 'my-type',
        },
      };
      var customAdapter = Ember.Object.create({
        ajax: this.sinon.stub().returns(Ember.RSVP.resolve(payload)),
        defaultSerializer: '-default',
        toString: function toString() {
          return 'my-adapter';
        },
        destroy: function destroy() {},
      });
      this.owner.register('adapter:-ember-m3', customAdapter, {
        singleton: true,
        instantiate: false,
      });

      return this.queryCache.queryURL('/uwot').then(function() {
        assert.deepEqual(
          (0, _stubCalls.default)(customAdapter.ajax),
          [['my-adapter', ['/uwot', 'GET', {}]]],
          'adapter.ajax called with right args'
        );
      });
    });

    (0, _qunit.test)('a custom -ember-m3 serializer can be registered', function(assert) {
      assert.expect(4);

      var payload = {
        data: {
          id: 1,
          type: 'my-type',
        },
      };
      var customSerializer = Ember.Object.create({
        normalizeResponse: function normalizeResponse(
          store,
          modelClass,
          rawPayload,
          cacheKey,
          requestType
        ) {
          assert.equal(modelClass, _model.default, 'model is passed to normalizeResponse');
          assert.deepEqual(rawPayload, payload, 'payload is passed to normalizeResponse');
          assert.strictEqual(cacheKey, null, 'cacheKey is passed to normalizeResponse');
          assert.equal(requestType, 'queryURL', 'requestTypis passss normalizeResponse');

          return payload;
        },
      });

      this.owner.register('serializer:-ember-m3', customSerializer, {
        singleton: true,
        instantiate: false,
      });

      this.adapterAjax.returns(Ember.RSVP.resolve(payload));

      return this.queryCache.queryURL('/uwot');
    });

    (0, _qunit.test)('.queryURL can resolve with individual models', function(assert) {
      var payload = {
        data: {
          id: 1,
          type: 'something-or-other',
          attributes: {},
        },
      };

      this.adapterAjax.returns(Ember.RSVP.resolve(payload));

      return this.queryCache.queryURL('/uwot').then(function(fulfilledValue) {
        assert.equal(fulfilledValue.constructor, _model.default);
        assert.equal(fulfilledValue.get('id'), 1);
      });
    });

    (0, _qunit.test)('.queryURL can resolve with a record array of models', function(assert) {
      var payload = {
        data: [
          {
            id: 1,
            type: 'something-or-other',
            attributes: {},
          },
          {
            id: 2,
            type: 'something-or-other',
            attributes: {},
          },
        ],
      };

      this.adapterAjax.returns(Ember.RSVP.resolve(payload));

      return this.queryCache.queryURL('/uwot').then(function(fulfilledValue) {
        assert.deepEqual(
          fulfilledValue.toArray().map(function(x) {
            return x.id;
          }),
          ['1', '2']
        );
      });
    });

    (0,
    _qunit.test)('.queryURL resolves with record arrays that have unloaded records removed', function(assert) {
      var _this6 = this;

      var payload = {
        data: [
          {
            id: 1,
            type: 'something-or-other',
            attributes: {},
          },
          {
            id: 2,
            type: 'something-or-other',
            attributes: {},
          },
        ],
      };

      this.adapterAjax.returns(Ember.RSVP.resolve(payload));

      return this.queryCache
        .queryURL('/uwot')
        .then(function(fulfilledValue) {
          assert.deepEqual(
            fulfilledValue.toArray().map(function(x) {
              return x.id;
            }),
            ['1', '2']
          );

          Ember.run(function() {
            return fulfilledValue.objectAt(0).unloadRecord();
          });
          assert.deepEqual(
            fulfilledValue.toArray().map(function(x) {
              return x.id;
            }),
            ['2']
          );

          var newRecord = _this6.store.createRecord('something', { id: '3' });
          fulfilledValue.pushObject(newRecord);

          assert.deepEqual(
            fulfilledValue.toArray().map(function(x) {
              return x.id;
            }),
            ['2', '3']
          );

          Ember.run(function() {
            newRecord.deleteRecord();
            newRecord.unloadRecord();
          });

          return fulfilledValue;
        })
        .then(function(fulfilledValue) {
          assert.deepEqual(
            fulfilledValue.toArray().map(function(x) {
              return x.id;
            }),
            ['2']
          );
        });
    });

    (0, _qunit.test)('.queryURL caches its results when given a cacheKey', function(assert) {
      var _this7 = this;

      var firstPayload = {
        data: {
          id: 1,
          type: 'something-or-other',
          attributes: {},
        },
      };
      var secondPayload = {
        data: {
          id: 2,
          type: 'something-or-other',
          attributes: {},
        },
      };
      this.adapterAjax.returns(Ember.RSVP.resolve(firstPayload));

      var options = { cacheKey: 'uwot' };

      return this.queryCache
        .queryURL('/uwot', options)
        .then(function(model) {
          assert.equal(model.id, 1, 'the returned promise fulfills with the model');
        })
        .then(function() {
          _this7.adapterAjax.returns(Ember.RSVP.resolve(secondPayload));
          var cachedResult = _this7.queryCache.queryURL('/uwot', options);
          assert.equal(
            _typeof(cachedResult.then),
            'function',
            'cached values are returned as thenables'
          );
          return cachedResult;
        })
        .then(function(model) {
          assert.equal(model.id, 1, 'the returned promise fulfills with the model');
          assert.equal(
            _this7.adapterAjax.callCount,
            1,
            'adapter.ajax is not called again (cache hit)'
          );
        });
    });

    (0,
    _qunit.test)('.queryURL does not cache results when not given a cacheKey', function(assert) {
      var _this8 = this;

      var firstPayload = {
        data: {
          id: 1,
          type: 'something-or-other',
          attributes: {},
        },
      };
      var secondPayload = {
        data: {
          id: 2,
          type: 'something-or-other',
          attributes: {},
        },
      };
      this.adapterAjax.returns(Ember.RSVP.resolve(firstPayload));

      return this.queryCache
        .queryURL('/uwot')
        .then(function(model) {
          assert.equal(model.id, 1, 'the returned promise fulfills with the model');
        })
        .then(function() {
          _this8.adapterAjax.returns(Ember.RSVP.resolve(secondPayload));
          return _this8.queryCache.queryURL('/uwot');
        })
        .then(function(model) {
          assert.equal(model.id, 2, 'the returned promise fulfills with the model');
          assert.equal(_this8.adapterAjax.callCount, 2, 'adapter.ajax is called again');
        });
    });

    (0, _qunit.test)('queryURL skips the cache when reload: true', function(assert) {
      var _this9 = this;

      var firstPayload = {
        data: {
          id: 1,
          type: 'something-or-other',
          attributes: { name: 'first' },
        },
      };
      var secondPayload = {
        data: {
          id: 2,
          type: 'something-or-other',
          attributes: { name: 'subsequent' },
        },
      };
      this.adapterAjax.returns(Ember.RSVP.resolve(firstPayload));

      var cacheKey = 'uwot';

      return this.queryCache
        .queryURL('/uwot', { cacheKey: cacheKey })
        .then(function(model) {
          assert.equal(model.id, 1, 'the returned promise fulfills with the model');
          assert.equal(model.get('name'), 'first', 'first value is returned');
        })
        .then(function() {
          _this9.adapterAjax.returns(Ember.RSVP.resolve(secondPayload));
          return _this9.queryCache.queryURL('/uwot', { cacheKey: cacheKey, reload: true });
        })
        .then(function(model) {
          assert.equal(model.id, 2, 'the returned promise fulfills with the model');
          assert.equal(model.get('name'), 'subsequent', 'the second value is returned');
          assert.equal(_this9.adapterAjax.callCount, 2, 'adapter.ajax is called again');
        });
    });

    (0,
    _qunit.test)('queryURL returns the cached result but still updates when backgroundReload: true', function(assert) {
      var _this10 = this;

      var firstPayload = {
        data: {
          id: 1,
          type: 'something-or-other',
          attributes: {
            name: 'sally',
          },
        },
      };
      var secondPayload = {
        data: {
          id: 1,
          type: 'something-or-other',
          attributes: {
            name: 'sandy',
          },
        },
      };
      var deferredBackgroundReload = Ember.RSVP.defer();
      this.adapterAjax.returns(Ember.RSVP.resolve(firstPayload));

      var cacheKey = 'uwot';

      return this.queryCache
        .queryURL('/uwot', { cacheKey: cacheKey })
        .then(function(model) {
          assert.equal(model.get('name'), 'sally', 'the returned promise fulfills with the model');
        })
        .then(function() {
          _this10.adapterAjax.returns(deferredBackgroundReload.promise);
          return _this10.queryCache.queryURL('/uwot', {
            cacheKey: cacheKey,
            backgroundReload: true,
          });
        })
        .then(function(model) {
          assert.equal(
            model.get('name'),
            'sally',
            'the returned promise fulfills with the cached model'
          );
          assert.equal(_this10.adapterAjax.callCount, 2, 'adapter.ajax is called again');

          deferredBackgroundReload.resolve(secondPayload);
          return deferredBackgroundReload.promise.then(function() {
            assert.equal(
              model.get('name'),
              'sandy',
              'the internal model is asynchronously updated'
            );
          });
        });
    });

    (0,
    _qunit.test)('the cache entry for a single model is invalidated when that model is unloaded', function(assert) {
      var _this11 = this;

      var firstPayload = {
        data: {
          id: 1,
          type: 'my-type',
          attributes: {},
        },
      };
      var secondPayload = {
        data: {
          id: 2,
          type: 'my-other-type',
          attributes: {},
        },
      };

      this.adapterAjax.returns(Ember.RSVP.resolve(firstPayload));

      var options = { cacheKey: 'uwot' };

      return this.queryCache
        .queryURL('/uwot', options)
        .then(function(model) {
          assert.equal(model.id, '1', 'the returned promise fulfills with the model');
          model.unloadRecord();
        })
        .then(function() {
          _this11.adapterAjax.returns(Ember.RSVP.resolve(secondPayload));
          return _this11.queryCache.queryURL('/uwot', options);
        })
        .then(function(model) {
          assert.equal(model.id, '2', 'cache is cleared when model is unloaded');
          assert.equal(_this11.adapterAjax.callCount, 2, 'adapter.ajax is called again');
        })
        .then(function() {
          return _this11.queryCache.queryURL('/uwot', options);
        })
        .then(function(model) {
          assert.equal(model.id, '2', 'cache can be used after being cleared');
          assert.equal(_this11.adapterAjax.callCount, 2, 'adapter.ajax is not called again');
        });
    });

    (0,
    _qunit.test)('the cache entry for an array of models is invalidated when any model is unloaded', function(assert) {
      var _this12 = this;

      var firstPayload = {
        data: [
          {
            id: 1,
            type: 'my-type',
            attributes: {},
          },
          {
            id: 2,
            type: 'my-type',
            attributes: {},
          },
        ],
      };
      var secondPayload = {
        data: [
          {
            id: 3,
            type: 'my-type',
            attributes: {},
          },
        ],
      };

      this.adapterAjax.returns(Ember.RSVP.resolve(firstPayload));

      var options = { cacheKey: 'uwot' };

      return this.queryCache
        .queryURL('/uwot', options)
        .then(function(models) {
          assert.deepEqual(
            models.map(function(x) {
              return x.id;
            }),
            ['1', '2'],
            'the returned promise fulfills with the models'
          );
          models.objectAt(0).unloadRecord();
        })
        .then(function() {
          _this12.adapterAjax.returns(Ember.RSVP.resolve(secondPayload));
          return _this12.queryCache.queryURL('/uwot', options);
        })
        .then(function(models) {
          assert.deepEqual(
            models.map(function(x) {
              return x.id;
            }),
            ['3'],
            'cache is cleared when any member model is unloaded'
          );
          assert.equal(_this12.adapterAjax.callCount, 2, 'adapter.ajax is called again');
        })
        .then(function() {
          return _this12.queryCache.queryURL('/uwot', options);
        })
        .then(function(models) {
          assert.deepEqual(
            models.map(function(x) {
              return x.id;
            }),
            ['3'],
            'cache can be used after being cleared'
          );
          assert.equal(_this12.adapterAjax.callCount, 2, 'adapter.ajax is not called again');
        });
    });

    (0,
    _qunit.test)('multiple cache entries are invalidated if they both involve the same unloaded model', function(assert) {
      var _this13 = this;

      var firstPayload = {
        data: {
          id: 1,
          type: 'my-type',
          attributes: {},
        },
      };
      var secondPayload = {
        data: {
          id: 2,
          type: 'my-type',
          attributes: {},
        },
      };

      this.adapterAjax.returns(Ember.RSVP.resolve(firstPayload));

      var options = { cacheKey: 'uwot' };
      var siblingOptions = { cacheKey: 'alt-uwot' };

      return this.queryCache
        .queryURL('/uwot', options)
        .then(function(model) {
          assert.equal(model.id, '1');
          assert.equal(_this13.adapterAjax.callCount, 1);
          return _this13.queryCache.queryURL('/alt-uwot', siblingOptions);
        })
        .then(function(model) {
          assert.equal(model.id, '1');
          assert.equal(_this13.adapterAjax.callCount, 2);
          // we expect this to invalidate both caches
          model.unloadRecord();

          _this13.adapterAjax.returns(Ember.RSVP.resolve(secondPayload));

          return _this13.queryCache.queryURL('/uwot', options);
        })
        .then(function(model) {
          assert.equal(model.id, '2');
          assert.equal(_this13.adapterAjax.callCount, 3);

          return _this13.queryCache.queryURL('/alt-uwot', siblingOptions);
        })
        .then(function(model) {
          assert.equal(model.id, '2');
          assert.equal(_this13.adapterAjax.callCount, 4);
        });
    });

    (0, _qunit.test)('the cache entry for a query is invalidated by cacheKey', function(assert) {
      var _this14 = this;

      var firstPayload = {
        data: {
          id: 1,
          type: 'my-type',
          attributes: {},
        },
      };

      this.adapterAjax.returns(Ember.RSVP.resolve(firstPayload));

      var cacheKey = 'uwot';
      var options = { cacheKey: cacheKey };

      return this.queryCache.queryURL('/uwot', options).then(function() {
        _this14.queryCache.unloadURL(cacheKey);

        assert.notOk(_this14.queryCache.contains(cacheKey));
      });
    });

    (0,
    _qunit.test)('contains by cacheKey correctly returns true when a query is cached', function(assert) {
      var _this15 = this;

      var firstPayload = {
        data: {
          id: 1,
          type: 'my-type',
          attributes: {},
        },
      };

      this.adapterAjax.returns(Ember.RSVP.resolve(firstPayload));

      var cacheKey = 'uwot';
      var options = { cacheKey: cacheKey };

      return this.queryCache.queryURL('/uwot', options).then(function() {
        assert.ok(_this15.queryCache.contains(cacheKey));
      });
    });

    (0, _qunit.test)('models are removed from results when they are unloaded', function(assert) {
      var firstPayload = {
        data: [
          {
            id: 1,
            type: 'my-type',
            attributes: {},
          },
          {
            id: 2,
            type: 'my-type',
            attributes: {},
          },
        ],
      };

      var secondPayload = {
        data: [
          {
            id: 2,
            type: 'my-type',
            attributes: {},
          },
          {
            id: 3,
            type: 'my-type',
            attributes: {},
          },
        ],
      };

      this.adapterAjax.withArgs('/uwot').returns(Ember.RSVP.resolve(firstPayload));
      this.adapterAjax.withArgs('/okay').returns(Ember.RSVP.resolve(secondPayload));

      return Ember.RSVP.Promise.all([
        this.queryCache.queryURL('/uwot'),
        this.queryCache.queryURL('/okay'),
      ]).then(function(_ref) {
        var _ref2 = _slicedToArray(_ref, 2),
          firstResult = _ref2[0],
          secondResult = _ref2[1];

        assert.deepEqual(
          firstResult.toArray().map(function(x) {
            return x.id;
          }),
          ['1', '2'],
          'results are initially correct'
        );
        assert.deepEqual(
          secondResult.toArray().map(function(x) {
            return x.id;
          }),
          ['2', '3'],
          'results are initially correct'
        );

        Ember.run(function() {
          firstResult.objectAt(1).unloadRecord();
        });

        assert.deepEqual(
          firstResult.toArray().map(function(x) {
            return x.id;
          }),
          ['1'],
          'models are removed from queryURL results when unloaded'
        );

        assert.deepEqual(
          secondResult.toArray().map(function(x) {
            return x.id;
          }),
          ['3'],
          'models are removed from queryURL results when unloaded'
        );
      });
    });

    (0, _qunit.test)('queryURL returns a record array that can be updated', function(assert) {
      var _this16 = this;

      var firstPayload = {
        data: [
          {
            id: 1,
            type: 'my-type',
            attributes: {},
          },
          {
            id: 2,
            type: 'my-type',
            attributes: {},
          },
        ],
      };

      var secondPayload = {
        data: [
          {
            id: 1,
            type: 'my-type',
            attributes: {},
          },
          {
            id: 3,
            type: 'my-type',
            attributes: {},
          },
        ],
      };

      this.adapterAjax.returns(Ember.RSVP.resolve(firstPayload));

      return this.queryCache.queryURL('/ohai').then(function(models) {
        assert.deepEqual(
          models.toArray().map(function(x) {
            return x.id;
          }),
          ['1', '2'],
          'models are initially correct'
        );

        _this16.adapterAjax.returns(Ember.RSVP.resolve(secondPayload));

        var updatePromise = models.update();

        assert.equal(models.get('isUpdating'), true, 'record array is updating during update');

        return updatePromise.then(function(fulfillmentValue) {
          assert.equal(fulfillmentValue, models, 'promise fulfills with the existing record array');
          assert.equal(models.get('isLoaded'), true, 'record array is loaded after update');
          assert.equal(
            models.get('isUpdating'),
            false,
            'record array is not updating after update'
          );

          assert.deepEqual(
            models.toArray().map(function(x) {
              return x.id;
            }),
            ['1', '3'],
            'models are updated'
          );
        });
      });
    });

    (0, _qunit.test)('update uses the original http method and query params', function(assert) {
      var _this17 = this;

      var payload = {
        data: [
          {
            id: 1,
            type: 'my-type',
            attributes: {},
          },
          {
            id: 2,
            type: 'my-type',
            attributes: {},
          },
        ],
      };

      this.adapterAjax.returns(Ember.RSVP.resolve(payload));
      return this.queryCache
        .queryURL('/ohai', { method: 'POST', params: { q: 'v' } })
        .then(function(models) {
          return models.update();
        })
        .then(function() {
          assert.deepEqual(
            (0, _stubCalls.default)(_this17.adapterAjax),
            [
              [_this17.adapter + '', ['/ohai', 'POST', { data: { q: 'v' } }]],
              [_this17.adapter + '', ['/ohai', 'POST', { data: { q: 'v' } }]],
            ],
            'adapter.ajax called with right args'
          );
        });
    });

    (0, _qunit.test)('queryURL goes through a serializer to normalize responses', function(assert) {
      var payload = {
        name: 'name name?',
        wat: 'definitely',
      };

      this.owner.register(
        'serializer:application',
        Serializer.extend({
          normalizeResponse: function normalizeResponse(
            store,
            modelClass,
            payload /*, id, requestType */
          ) {
            return {
              data: {
                id: 1,
                type: 'my-type',
                attributes: payload,
              },
            };
          },
        })
      );

      this.adapterAjax.returns(Ember.RSVP.resolve(payload));
      return this.queryCache.queryURL('/hello').then(function(model) {
        assert.equal(model.get('name'), 'name name?');
        assert.equal(model.get('wat'), 'definitely');
      });
    });

    (0, _qunit.test)('queryURL batch requests to same cacheKey', function(assert) {
      var payload = {
        data: [
          {
            id: 2,
            type: 'my-type',
            attributes: {},
          },
          {
            id: 3,
            type: 'my-type',
            attributes: {},
          },
        ],
      };
      var cacheKey = 'uwot';
      var options = { cacheKey: cacheKey };

      this.adapterAjax.returns(Ember.RSVP.resolve(payload));
      var promise1 = this.queryCache.queryURL('/uwot', options);
      // second call to `queryURL` before the first request finishes
      var promise2 = this.queryCache.queryURL('/uwot', options);
      assert.equal(promise1, promise2);
    });

    (0, _qunit.test)('.queryURL uses queryURL adapter hook if available', function(assert) {
      var _this18 = this;

      var params = { param: 'paramValue' };

      this.adapter.queryURL = this.sinon.stub().returns(
        Ember.RSVP.resolve({
          data: {
            id: '1',
            type: 'something-or-other',
            attributes: {},
          },
        })
      );

      // add cacheKey to confirm only select options are passed down
      var options = { cacheKey: 'cached-value', params: params };

      this.adapter.namespace = 'ns';
      return this.queryCache.queryURL('test-url', options).then(function() {
        assert.deepEqual(
          (0, _stubCalls.default)(_this18.adapter.queryURL),
          [[_this18.adapter + '', ['/ns/test-url', 'GET', { params: params }]]],
          'adapter.queryURL is called'
        );
        assert.equal(_this18.adapterAjax.called, false, '`adapter.ajax` is not called');
      });
    });

    (0,
    _qunit.test)('.cacheURL inserts consistently inserts a promise into cache', function(assert) {
      var _this19 = this;

      assert.expect(3);
      var mockResult = { id: 1, foo: 'bar' };

      this.queryCache.cacheURL('foo-bar', mockResult);
      var cachedResult = this.queryCache.queryURL('/foo-bar', { cacheKey: 'foo-bar' });

      assert.ok(cachedResult && cachedResult.then, 'cachedResult is a promise');

      return cachedResult.then(function(result) {
        assert.equal(_this19.adapterAjax.callCount, 0, 'adapter.ajax is never called');
        assert.deepEqual(mockResult, result, 'queryURL returned cached result');
      });
    });

    (0,
    _qunit.test)('.cacheURL supports unloading of models and invalidates cache', function(assert) {
      var _this20 = this;

      assert.expect(2);

      var firstPayload = {
        data: {
          id: 1,
          type: 'uw0tm8',
          attributes: {},
        },
      };

      var secondPayload = {
        data: {
          id: 2,
          type: 'my-other-type',
          attributes: {},
        },
      };

      this.adapterAjax.returns(Ember.RSVP.resolve(firstPayload));

      return this.queryCache
        .queryURL('/foo-bar', { cacheKey: 'foo-bar' })
        .then(function(model) {
          assert.equal(model.id, '1', 'Sanity check to ensure id is what we expected');
          _this20.queryCache.cacheURL('bar', model);
          _this20.adapterAjax.returns(Ember.RSVP.resolve(secondPayload));
          model.unloadRecord();
        })
        .then(function() {
          return _this20.queryCache.queryURL('/foo-bar', { cacheKey: 'bar' });
        })
        .then(function(model) {
          assert.equal(model.id, '2', 'unloadRecord clears the entry for entry of cacheURL');
        });
    });
  });
});
define('dummy/tests/unit/record-array-test', [
  'qunit',
  'ember-qunit',
  'ember-m3/services/m3-schema',
  'ember-m3/record-array',
], function(_qunit, _emberQunit, _m3Schema, _recordArray) {
  'use strict';

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

  (0, _qunit.module)('unit/record-array', function(hooks) {
    (0, _emberQunit.setupTest)(hooks);

    hooks.beforeEach(function() {
      var _this2 = this;

      this.owner.register(
        'services:m3-schema',
        (function(_DefaultSchema) {
          _inherits(TestSchema, _DefaultSchema);

          function TestSchema() {
            _classCallCheck(this, TestSchema);

            return _possibleConstructorReturn(
              this,
              (TestSchema.__proto__ || Object.getPrototypeOf(TestSchema)).apply(this, arguments)
            );
          }

          _createClass(TestSchema, [
            {
              key: 'includesModel',
              value: function includesModel() {
                return true;
              },
            },
          ]);

          return TestSchema;
        })(_m3Schema.default)
      );
      this.store = this.owner.lookup('service:store');

      Ember.run(function() {
        _this2.store.pushPayload('com.example.bookstore.Book', {
          data: [
            {
              id: 'isbn:1',
              type: 'com.example.bookstore.Book',
              attributes: {
                title: 'pretty good book',
              },
            },
            {
              id: 'isbn:2',
              type: 'com.example.bookstore.Book',
              attributes: {
                title: 'pretty okay book',
              },
            },
          ],
        });
      });

      this.createRecordArray = function() {
        var recordArray = new _recordArray.default();
        recordArray.store = this.store;
        return recordArray;
      };
    });

    (0, _qunit.test)('initially record arrays are unresolved', function(assert) {
      var recordArray = this.createRecordArray();
      assert.equal(recordArray._resolved, false);
    });

    (0, _qunit.test)('requesting an object resolves the record array', function(assert) {
      var recordArray = this.createRecordArray();
      assert.equal(recordArray._resolved, false, 'initialy unresolved');
      assert.strictEqual(recordArray.objectAt(0), undefined, 'array is empty');
      assert.equal(recordArray._resolved, true, 'requesting object resolved array');

      recordArray = this.createRecordArray();
      assert.equal(recordArray._resolved, false, 'initialy unresolved');
      assert.strictEqual(recordArray.get('firstObject'), undefined, 'array is empty');
      assert.equal(recordArray._resolved, true, 'requesting object resolved array');
    });

    (0, _qunit.test)('references can be resolved to records lazily', function(assert) {
      var recordArray = this.createRecordArray();
      recordArray._setReferences([
        { id: 'isbn:1', type: null },
        { id: 'isbn:2', type: 'com.example.bookstore.Book' },
      ]);

      var willChangeCount = 0;
      var didChangeCount = 0;
      recordArray.addArrayObserver({
        arrayWillChange: function arrayWillChange() {
          ++willChangeCount;
        },
        arrayDidChange: function arrayDidChange() {
          ++didChangeCount;
        },
      });

      assert.deepEqual(recordArray.mapBy('title'), ['pretty good book', 'pretty okay book']);
      assert.equal(willChangeCount, 0, 'resolving references does not trigger change events');
      assert.equal(didChangeCount, 0, 'resolving references does not trigger change events');
    });

    (0,
    _qunit.test)('updating a record array invalidates content and makes it unresolved', function(assert) {
      var recordArray = this.createRecordArray();

      assert.equal(recordArray._resolved, false, 'initialy unresolved');
      recordArray._setReferences([
        { id: 'isbn:1', type: null },
        { id: 'isbn:2', type: 'com.example.bookstore.Book' },
      ]);
      assert.equal(recordArray._resolved, false, 'unresolved after setting references');
      assert.equal(recordArray.get('firstObject.title'), 'pretty good book', 'reference resolved');
      assert.equal(recordArray._resolved, true, 'lazily resolved');

      recordArray._setReferences([{ id: 'isbn:2', type: 'com.example.bookstore.Book' }]);
      assert.equal(recordArray._resolved, false, 'unresolved when references change');
    });

    (0, _qunit.test)('a record array can resolve new values', function(assert) {
      var recordArray = this.createRecordArray();

      recordArray._setReferences([{ id: 'isbn:1', type: null }]);
      assert.deepEqual(recordArray.mapBy('title'), ['pretty good book']);

      var book2 = this.store.peekRecord('com.example.bookstore.Book', 'isbn:2');
      recordArray.pushObject(book2);

      assert.deepEqual(recordArray.mapBy('title'), ['pretty good book', 'pretty okay book']);
    });

    (0, _qunit.test)('setting internal models resolves the record array', function(assert) {
      var recordArray = this.createRecordArray();

      recordArray._setReferences([{ id: 'isbn:1', type: null }]);
      assert.equal(recordArray._resolved, false, 'initially unresolved');

      var book2 = this.store.peekRecord('com.example.bookstore.Book', 'isbn:2');

      var internalModels = [book2._internalModel];
      recordArray._setInternalModels(internalModels);

      assert.equal(
        recordArray._resolved,
        true,
        'setting internal models resolves the record array'
      );
      assert.deepEqual(
        recordArray.mapBy('title'),
        ['pretty okay book'],
        'setting internal models clears prior content'
      );
    });

    (0, _qunit.test)('setting references triggers a property change event', function(assert) {
      var recordArray = this.createRecordArray();
      var willChangeCount = 0;
      var didChangeCount = 0;
      recordArray.addArrayObserver({
        arrayWillChange: function arrayWillChange() {
          ++willChangeCount;
        },
        arrayDidChange: function arrayDidChange() {
          ++didChangeCount;
        },
      });
      recordArray._setReferences([{ id: 'isbn:1', type: null }]);

      assert.equal(willChangeCount, 1, 'willChange');
      assert.equal(didChangeCount, 1, 'willChange');
    });

    (0, _qunit.module)('RecordArrayManager api', function() {
      (0,
      _qunit.test)('internal moodels can be added and removed from the RecordArrayManager api', function(assert) {
        var recordArray = this.createRecordArray();
        var book1 = this.store.peekRecord('com.example.bookstore.Book', 'isbn:1');
        var book2 = this.store.peekRecord('com.example.bookstore.Book', 'isbn:2');

        assert.deepEqual(recordArray.toArray().mapBy('id'), [], 'record array empty');

        recordArray._pushInternalModels([book1._internalModel, book2._internalModel]);

        assert.deepEqual(
          recordArray.toArray().mapBy('id'),
          ['isbn:1', 'isbn:2'],
          '_pushInternalModels'
        );

        recordArray._removeInternalModels([book1._internalModel]);

        assert.deepEqual(recordArray.toArray().mapBy('id'), ['isbn:2'], '_removeInternalModels');
      });

      (0, _qunit.test)('adding internal models forces resolution', function(assert) {
        var recordArray = this.createRecordArray();
        recordArray._setReferences([
          {
            id: 'isbn:1',
            type: 'com.example.bookstore.Book',
          },
        ]);

        assert.equal(recordArray.length, 1, 'length is 1');
        assert.equal(recordArray._resolved, false, 'length does not resolve');

        var book2 = this.store.peekRecord('com.example.bookstore.Book', 'isbn:2');
        recordArray._pushInternalModels([book2._internalModel]);

        assert.equal(recordArray._resolved, true, '_pushInternalModels resolves');
        assert.deepEqual(recordArray.toArray().mapBy('id'), ['isbn:1', 'isbn:2'], 'records added');
      });

      (0, _qunit.test)('unresolved references can be removed', function(assert) {
        var recordArray = this.createRecordArray();
        recordArray._setReferences([
          {
            id: 'isbn:1',
            type: 'com.example.bookstore.Book',
          },
          {
            id: 'isbn:2',
            type: 'com.example.bookstore.Book',
          },
        ]);

        assert.equal(recordArray.length, 2, 'length is 2');

        var book2 = this.store.peekRecord('com.example.bookstore.Book', 'isbn:2');
        recordArray._removeInternalModels([book2._internalModel]);

        assert.equal(recordArray._resolved, false, '_removeInternalModels does not resolve');
        assert.deepEqual(recordArray.toArray().mapBy('id'), ['isbn:1'], 'records removed');
      });
    });
  });
});
define('dummy/tests/unit/record-data-test', [
  'qunit',
  'sinon',
  'lodash',
  'ember-qunit',
  'ember-m3/record-data',
  'ember-m3/services/m3-schema',
], function(_qunit, _sinon, _lodash, _emberQunit, _recordData, _m3Schema) {
  'use strict';

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

  var recordDataKey = function recordDataKey(_ref) {
    var modelName = _ref.modelName,
      id = _ref.id;
    return modelName + ':' + id;
  };

  (0, _qunit.module)('unit/record-data', function(hooks) {
    (0, _emberQunit.setupTest)(hooks);

    hooks.beforeEach(function() {
      this.sinon = _sinon.default.createSandbox();

      this.owner.register(
        'service:m3-schema',
        (function(_DefaultSchema) {
          _inherits(TestSchema, _DefaultSchema);

          function TestSchema() {
            _classCallCheck(this, TestSchema);

            return _possibleConstructorReturn(
              this,
              (TestSchema.__proto__ || Object.getPrototypeOf(TestSchema)).apply(this, arguments)
            );
          }

          _createClass(TestSchema, [
            {
              key: 'computeNestedModel',
              value: function computeNestedModel(key, value) {
                if (
                  value !== null &&
                  (typeof value === 'undefined' ? 'undefined' : _typeof(value)) === 'object'
                ) {
                  return { id: key, type: 'com.exmaple.bookstore.book', attributes: value };
                }
              },
            },
            {
              key: 'computeBaseModelName',
              value: function computeBaseModelName(modelName) {
                return ['com.bookstore.projected-book', 'com.bookstore.excerpt-book'].includes(
                  modelName
                )
                  ? 'com.bookstore.book'
                  : null;
              },
            },
          ]);

          return TestSchema;
        })(_m3Schema.default)
      );

      var schemaManager = (this.schemaManager = this.owner.lookup('service:m3-schema-manager'));

      var storeWrapper = (this.storeWrapper = {
        recordDatas: {},
        disconnectedRecordDatas: {},

        modelDataFor: function modelDataFor() {
          return this.recordDataFor.apply(this, arguments);
        },
        recordDataFor: function recordDataFor(modelName, id, clientId) {
          var key = recordDataKey({ modelName: modelName, id: id });
          return (
            this.recordDatas[key] ||
            (this.recordDatas[key] = new _recordData.default(
              modelName,
              id,
              clientId,
              storeWrapper,
              schemaManager
            ))
          );
        },
        disconnectRecord: function disconnectRecord(modelName, id) {
          var key = recordDataKey({ modelName: modelName, id: id });
          true &&
            !this.recordDatas[key] &&
            Ember.assert(
              'Disconnect record called for missing recordData ' + key,
              this.recordDatas[key]
            );

          this.disconnectedRecordDatas[key] = this.recordDatas[key];
          delete this.recordDatas[key];
        },
        setRecordId: function setRecordId() {},
        isRecordInUse: function isRecordInUse() {
          return false;
        },
        notifyPropertyChange: function notifyPropertyChange() {},
      });

      this.mockRecordData = function() {
        return this.storeWrapper.recordDataFor('com.bookstore.book', '1');
      };
    });

    hooks.afterEach(function() {
      this.sinon.restore();
    });

    (0,
    _qunit.test)('.eachAttribute iterates attributes, in-flight attrs and data', function(assert) {
      var recordData = new _recordData.default(
        'com.exmaple.bookstore.book',
        '1',
        null,
        this.storeWrapper,
        this.schemaManager,
        null,
        null
      );

      recordData.pushData(
        {
          id: '1',
          attributes: {
            dataAttr: 'value',
          },
        },
        false
      );

      recordData.setAttr('inFlightAttr', 'value');
      recordData.willCommit();
      recordData.setAttr('localAttr', 'value');

      var attrsIterated = [];
      recordData.eachAttribute(function(attr) {
        return attrsIterated.push(attr);
      });

      assert.deepEqual(attrsIterated, ['localAttr', 'inFlightAttr', 'dataAttr']);
    });

    (0, _qunit.test)('.getServerAttr returns the server state', function(assert) {
      var recordData = new _recordData.default(
        'com.exmaple.bookstore.book',
        '1',
        null,
        this.storeWrapper,
        this.schemaManager,
        null,
        null
      );

      recordData.pushData(
        {
          id: '1',
          attributes: {
            localAttr: 'server',
            inFlightAttr: 'server',
            serverAttr: 'server',
          },
        },
        false
      );

      recordData.setAttr('inFlightAttr', 'value');
      recordData.willCommit();
      recordData.setAttr('localAttr', 'value');
      recordData.setAttr('unknownAttr', 'value');

      assert.equal(
        recordData.getServerAttr('inFlightAttr'),
        'server',
        'InFlight attr read correctly'
      );
      assert.equal(recordData.getServerAttr('localAttr'), 'server', 'local attr read correctly');
      assert.equal(
        recordData.getServerAttr('unknownAttr'),
        undefined,
        'unknown attr read correctly'
      );
      assert.equal(recordData.getServerAttr('serverAttr'), 'server', 'server attr read correctly');
    });

    (0, _qunit.test)('._getChildRecordData returns new recordData', function(assert) {
      var topRecordData = new _recordData.default(
        'com.exmaple.bookstore.book',
        '1',
        null,
        this.storeWrapper,
        this.schemaManager,
        null,
        null
      );

      assert.strictEqual(topRecordData._parentRecordData, null, 'top recordData has no parent');
      assert.deepEqual(
        topRecordData._childRecordDatas,
        {},
        "initially child recordDatas aren't populated"
      );

      var child1RecordData = topRecordData._getChildRecordData(
        'child1',
        null,
        'com.example.bookstore.book',
        '1'
      );
      var child2RecordData = topRecordData._getChildRecordData(
        'child2',
        null,
        'com.example.bookstore.book',
        '1'
      );

      assert.equal(child1RecordData._parentRecordData, topRecordData, 'child1 -> parent');
      assert.equal(child2RecordData._parentRecordData, topRecordData, 'child2 -> parent');
      assert.deepEqual(
        topRecordData._childRecordDatas,
        {
          child1: child1RecordData,
          child2: child2RecordData,
        },
        'parent -> children'
      );
    });

    (0, _qunit.test)('.schemaInterface can read attributes', function(assert) {
      var recordData = this.mockRecordData();
      var schemaInterface = recordData.schemaInterface;
      recordData.pushData({
        attributes: {
          foo: 'fooVal',
          bar: 'barVal',
        },
      });
      schemaInterface._keyBeingResolved = 'testKey';
      assert.equal(recordData.getAttr('foo'), 'fooVal', 'recordData has foo=fooVal');
      assert.equal(schemaInterface.getAttr('foo'), 'fooVal', 'schemaInterface can read attr');
    });

    (0, _qunit.test)('.schemaInterface cannot write attributes', function(assert) {
      var recordData = this.mockRecordData();
      var schemaInterface = recordData.schemaInterface;

      assert.ok(typeof recordData.setAttr === 'function', 'recordData api is as expected');
      recordData.setAttr('bar', 'barVal');
      assert.equal(recordData.getAttr('bar'), 'barVal', 'recordData can write attr');

      assert.ok(typeof schemaInterface.setAttr === 'function', 'schemaInterface can write attr');
    });

    (0,
    _qunit.test)('.rollbackAttributes does not call notifyPropertyChange with undefined without hasChangedAttributes', function(assert) {
      assert.expect(1);
      var rollbackAttributesSpy = this.sinon.spy();
      this.storeWrapper.notifyPropertyChange = rollbackAttributesSpy;

      var recordData = new _recordData.default(
        'com.exmaple.bookstore.book',
        '1',
        null,
        this.storeWrapper,
        this.schemaManager,
        null,
        null
      );
      recordData.rollbackAttributes(true);
      assert.equal(rollbackAttributesSpy.getCalls().length, 0, 'rollbackAttributes was not called');
    });

    (0, _qunit.module)('base record data delegates', function() {
      var baseDelegates = {
        pushData: [{ id: 'test-resource', attributes: {} }, false, false],
        willCommit: [],
        didCommit: [{ id: 'test-resource', attributes: {} }, false],
        commitWasRejected: [],
        setAttr: ['some-key', 'some-value', false],
        getAttr: ['some-key'],
        _deleteAttr: ['some-key'],
        hasAttr: ['some-key'],
        hasLocalAttr: ['some-key'],
        getServerAttr: ['some-key'],
        isAttrDirty: ['some-key'],
        eachAttribute: [function() {}, { binding: 'binding' }],
        hasChangedAttributes: [],
        changedAttributes: [],
        rollbackAttributes: [],
        _destroyChildRecordData: ['some-key'],
      };

      var _loop = function _loop(method) {
        var args = baseDelegates[method];

        (0, _qunit.test)(method + ' delegates to base record data', function(assert) {
          var projectedRecordData = this.storeWrapper.recordDataFor(
            'com.bookstore.projected-book',
            '1'
          );
          var baseRecordData = this.storeWrapper.recordDatas[
            recordDataKey({
              modelName: 'com.bookstore.book',
              id: '1',
            })
          ];
          var baseRecordDataSpy = this.sinon.spy(baseRecordData, method);

          projectedRecordData[method].apply(projectedRecordData, args);

          assert.equal(
            baseRecordDataSpy.getCalls().length,
            1,
            'base ' + method + ' was called once'
          );
          assert.deepEqual(
            baseRecordDataSpy.args,
            [args],
            'base ' + method + ' was called with correct args'
          );
        });
      };

      var _iteratorNormalCompletion = true;
      var _didIteratorError = false;
      var _iteratorError = undefined;

      try {
        for (
          var _iterator = Object.keys(baseDelegates)[Symbol.iterator](), _step;
          !(_iteratorNormalCompletion = (_step = _iterator.next()).done);
          _iteratorNormalCompletion = true
        ) {
          var method = _step.value;

          _loop(method);
        }
      } catch (err) {
        _didIteratorError = true;
        _iteratorError = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion && _iterator.return) {
            _iterator.return();
          }
        } finally {
          if (_didIteratorError) {
            throw _iteratorError;
          }
        }
      }
    });

    (0,
    _qunit.test)('.isAttrDirty returns true when the attribute is mutated on a projection', function(assert) {
      assert.expect(2);
      var projectedRecordData = this.storeWrapper.recordDataFor(
        'com.bookstore.projected-book',
        '1'
      );
      var attrName = 'name';

      assert.notOk(
        projectedRecordData.isAttrDirty(attrName),
        'Fake attribute is not dirty initially'
      );
      projectedRecordData.setAttr(attrName, 'The best store in town');
      assert.ok(
        projectedRecordData.isAttrDirty(attrName),
        'Fake attribute is dirty after being mutated'
      );
    });

    (0, _qunit.test)('.schemaInterface track dependent keys resolved by ref key', function(assert) {
      var recordData = this.mockRecordData();
      var schemaInterface = recordData.schemaInterface;
      recordData.pushData({
        attributes: {
          '*foo': 'fooVal',
          bar: 'barVal',
        },
      });

      schemaInterface._beginDependentKeyResolution('foo');
      assert.equal(schemaInterface.getAttr('*foo'), 'fooVal', 'schemaInterface can read attr');
      schemaInterface._endDependentKeyResolution('foo');

      assert.equal(
        schemaInterface._getDependentResolvedKeys('*foo')[0],
        'foo',
        'schemaInterface tracks dependent property computed using ref key'
      );
    });

    (0, _qunit.test)('`.didCommit` sets the ID of the record in the store', function(assert) {
      var setRecordId = this.sinon.spy(this.storeWrapper, 'setRecordId');
      var recordData = this.mockRecordData();

      recordData.didCommit({
        id: 'newId',
        attributes: {},
      });

      assert.deepEqual(
        setRecordId.args,
        [['com.bookstore.book', 'newId', recordData.clientId]],
        'Expected setRecodId to have been called'
      );
    });

    (0, _qunit.test)('`.unloadRecord` disconnects the recordData from the store', function(assert) {
      var recordData = this.mockRecordData();

      // unload
      recordData.unloadRecord();

      assert.strictEqual(
        this.storeWrapper.disconnectedRecordDatas[recordDataKey(recordData)],
        recordData,
        'Expected the recordData to have been disconnected'
      );
    });

    (0, _qunit.test)('private API _deleteAttr exists', function(assert) {
      var recordData = this.mockRecordData();
      recordData.pushData({
        id: '1',
        attributes: {
          name: 'Harry Potter and the Chamber of Secrets',
          prequel: "Harry Potter and the Sorcerer's Stone",
        },
      });

      assert.equal(
        recordData.getAttr('name'),
        'Harry Potter and the Chamber of Secrets',
        'name attr exists'
      );
      assert.equal(
        recordData.getAttr('prequel'),
        "Harry Potter and the Sorcerer's Stone",
        'prequel attr exists'
      );

      recordData._deleteAttr('name');

      assert.strictEqual(recordData.getAttr('name'), undefined, 'name attr gone');
      assert.equal(
        recordData.getAttr('prequel'),
        "Harry Potter and the Sorcerer's Stone",
        'prequel attr still exists'
      );
    });

    (0,
    _qunit.test)('projection recordData initializes and register in base recordData', function(assert) {
      var projectedRecordData = this.storeWrapper.recordDataFor(
        'com.bookstore.projected-book',
        '1'
      );
      var baseRecordData = this.storeWrapper.recordDatas[
        recordDataKey({
          modelName: 'com.bookstore.book',
          id: '1',
        })
      ];

      assert.notEqual(baseRecordData, null, 'Expected base recordData to be initialized');
      assert.deepEqual(
        baseRecordData._projections,
        [baseRecordData, projectedRecordData],
        'Expected projected recordData to be in the projections list'
      );
    });

    (0,
    _qunit.test)('nested projection model register in the base model nested recordData', function(assert) {
      var projectionRecordData = this.storeWrapper.recordDataFor(
        'com.bookstore.projected-book',
        '1'
      );
      var baseRecordData = this.storeWrapper.recordDataFor('com.bookstore.book', '1');

      var nestedProjected = projectionRecordData._getChildRecordData(
        'preface',
        undefined,
        'com.bookstore.chapter'
      );

      assert.ok(
        baseRecordData._childRecordDatas['preface'],
        'Expected base recordData to have created a nested recordData'
      );

      var nestedBase = baseRecordData._getChildRecordData('preface', undefined);
      assert.ok(
        nestedBase._projections.find(function(x) {
          return x === nestedProjected;
        }),
        'Expected the nested projection recordData to be registered in the nested base recordData'
      );
    });

    (0,
    _qunit.test)('setting a nested model to null destroys child recordDatas in all projections', function(assert) {
      var projectionRecordData = this.storeWrapper.recordDataFor(
        'com.bookstore.projected-book',
        '1'
      );
      var baseRecordData = this.storeWrapper.recordDataFor('com.bookstore.book', '1');

      projectionRecordData.pushData({
        id: '1',
        attributes: {
          name: 'Harry Potter and the Chamber of Secrets',
          prequelBook: {
            name: "Harry Potter and the Sorcerer's Stone",
          },
        },
      });

      // initialize the child recordData
      projectionRecordData._getChildRecordData(
        'prequelBook',
        null,
        'com.bookstore.book',
        '1',
        null
      );

      assert.ok(
        baseRecordData._childRecordDatas['prequelBook'],
        'Expected base child recordData to have been created as well'
      );

      // reset to null
      baseRecordData.pushData({
        id: '1',
        attributes: {
          prequelBook: null,
        },
      });

      assert.notOk(
        baseRecordData._childRecordDatas['prequelBook'],
        'Expected base child recordData to have been destroyed'
      );
      assert.notOk(
        projectionRecordData._childRecordDatas['prequelBook'],
        'Expected projected child recordData to have been destroyed'
      );
    });

    (0,
    _qunit.test)('projection recordData unregister from base recordData and the store on unloadRecord', function(assert) {
      var projectionRecordData = this.storeWrapper.recordDataFor(
        'com.bookstore.projected-book',
        '1'
      );
      var baseRecordData = this.storeWrapper.recordDataFor('com.bookstore.book', '1');

      // unload the recordData
      projectionRecordData.unloadRecord();

      assert.notEqual(
        this.storeWrapper.disconnectedRecordDatas[recordDataKey(projectionRecordData)],
        null,
        'Expected projection recordData to have been disconnected from the store'
      );
      assert.equal(
        baseRecordData._projections.find(function(x) {
          return x === projectionRecordData;
        }),
        null,
        'Expected projected recordData to have been removed from the projections'
      );
    });

    (0,
    _qunit.test)('base recordData is disconnected from the store if there are no more projections', function(assert) {
      var projectionRecordData = this.storeWrapper.recordDataFor(
        'com.bookstore.projected-book',
        '1'
      );
      var baseRecordData = this.storeWrapper.recordDataFor('com.bookstore.book', '1');

      // unload the projection recordData
      projectionRecordData.unloadRecord();

      assert.notEqual(
        this.storeWrapper.disconnectedRecordDatas[recordDataKey(baseRecordData)],
        null,
        'Expected projection recordData to have been disconnected from the store'
      );
    });

    (0,
    _qunit.test)('base recordData is not disconnected from the store if there are other projections', function(assert) {
      var projectionRecordData = this.storeWrapper.recordDataFor(
        'com.bookstore.projected-book',
        '1'
      );
      this.storeWrapper.recordDataFor('com.bookstore.excerpt-book', '1');
      var baseRecordData = this.storeWrapper.recordDataFor('com.bookstore.book', '1');

      // unload the projection recordData
      projectionRecordData.unloadRecord();

      assert.equal(
        this.storeWrapper.disconnectedRecordDatas[recordDataKey(baseRecordData)],
        null,
        'Expected projection recordData to not have been disconnected from the store'
      );
    });

    (0,
    _qunit.test)('base recordData is not disconnected from the store if the record is in use', function(assert) {
      this.storeWrapper.isRecordInUse = function() {
        return true;
      };

      var projectionRecordData = this.storeWrapper.recordDataFor(
        'com.bookstore.projected-book',
        '1'
      );
      var baseRecordData = this.storeWrapper.recordDataFor('com.bookstore.book', '1');

      // unload the projection recordData
      projectionRecordData.unloadRecord();

      assert.equal(
        this.storeWrapper.disconnectedRecordDatas[recordDataKey(baseRecordData)],
        null,
        'Expected projection recordData to have been disconnected from the store'
      );
    });

    (0,
    _qunit.test)('projection recordData connects with base recordData when committed with id', function(assert) {
      var projectionRecordData = this.storeWrapper.recordDataFor(
        'com.bookstore.projected-book',
        null,
        1
      );
      var baseRecordData = this.storeWrapper.recordDatas[
        recordDataKey({ modelName: 'com.bookstore.book', id: null })
      ];
      assert.notEqual(
        baseRecordData,
        null,
        'Expected base recordData to have been created as well'
      );
      assert.ok(
        baseRecordData._projections.find(function(x) {
          return x === projectionRecordData;
        }),
        'Expected projection recordData to have been registered'
      );
      assert.equal(
        baseRecordData.clientId,
        projectionRecordData.clientId,
        'Expected the base recordData to have the same clientId as the projection'
      );

      // actually set to be saved
      projectionRecordData.setAttr('name', 'Harry Potter');
      projectionRecordData.setAttr('preface', {
        text: "Harry Potter's preface",
      });

      var setRecordIdSpy = this.sinon.spy(this.storeWrapper, 'setRecordId');

      projectionRecordData.willCommit();

      projectionRecordData.didCommit({
        id: '1',
        attributes: {},
      });

      assert.deepEqual(
        setRecordIdSpy.args,
        [
          ['com.bookstore.projected-book', '1', projectionRecordData.clientId],
          ['com.bookstore.book', '1', baseRecordData.clientId],
        ],
        'Expected server-side ID to be set for the committed records'
      );
      assert.equal(
        projectionRecordData.id,
        '1',
        'Expected projection recordData to have picked up the new ID'
      );
      assert.equal(baseRecordData.id, '1', 'Expected base recordData to have picked up the new ID');

      assert.equal(
        projectionRecordData.getAttr('name'),
        'Harry Potter',
        'Expected primitive attribute to have been retained'
      );
      assert.deepEqual(
        projectionRecordData.getAttr('preface'),
        {
          text: "Harry Potter's preface",
        },
        'Expected complex attribute to have been retained'
      );
    });

    (0,
    _qunit.test)('.isAttrDirty check if key is not in inFlight and data and set locally', function(assert) {
      var recordData = new _recordData.default(
        'com.exmaple.bookstore.book',
        '1',
        null,
        this.storeWrapper,
        this.schemaManager,
        null,
        null
      );

      recordData.pushData(
        {
          id: '1',
          attributes: {
            dataAttr: 'value',
          },
        },
        false
      );

      recordData.setAttr('inFlightAttr', 'value');
      recordData.willCommit();
      recordData.setAttr('localAttr', 'value');

      assert.ok(!recordData.isAttrDirty('dataAttr'), 'data attr is not dirty');
      assert.ok(!recordData.isAttrDirty('inFlightAttr'), 'inFlight attr is not dirty');
      assert.ok(recordData.isAttrDirty('localAttr'), 'local attr is not dirty');
    });

    (0, _qunit.test)('.schemaInterface can delete attributes', function(assert) {
      var recordData = this.mockRecordData();
      var schemaInterface = recordData.schemaInterface;
      recordData.pushData({
        attributes: {
          foo: 'fooVal',
          bar: 'barVal',
        },
      });
      schemaInterface._keyBeingResolved = 'testKey';
      assert.equal(recordData.getAttr('foo'), 'fooVal', 'recordData has foo=fooVal');
      assert.equal(schemaInterface.getAttr('foo'), 'fooVal', 'schemaInterface can read attr');
      schemaInterface.deleteAttr('foo');
      assert.equal(
        recordData.getAttr('foo'),
        undefined,
        'recordData does not have attr foo after calling deleteAttr'
      );
      assert.equal(
        schemaInterface.getAttr('foo'),
        undefined,
        'schemaInterface does not have attr foo after calling deleteAttr'
      );
    });

    (0,
    _qunit.test)('.hasLocalAttr validates the existance of key as part of the attributes of the record data', function(assert) {
      var recordData = this.mockRecordData();
      assert.notOk(
        recordData.hasLocalAttr('name'),
        'Name is not part of attributes because it has not been mutated'
      );
      recordData.setAttr('name', "Harry Potter and the Sorcerer's Stone");
      assert.ok(
        recordData.hasLocalAttr('name'),
        'Name is part of attributes because it has been mutated'
      );
    });

    (0,
    _qunit.test)('.hasLocalAttr validates the existance of key as part of the attributes of a base record data', function(assert) {
      var projectedRecordData = this.storeWrapper.recordDataFor(
        'com.bookstore.projected-book',
        '1'
      );
      var baseRecordData = this.storeWrapper.recordDatas[
        recordDataKey({
          modelName: 'com.bookstore.book',
          id: '1',
        })
      ];

      assert.notOk(
        baseRecordData.hasLocalAttr('name'),
        'Name is not part of attributes of the base record because it has not been mutated'
      );
      assert.notOk(
        projectedRecordData.hasLocalAttr('name'),
        'Name is not part of attributes of the projected record because it has not been mutated'
      );
      projectedRecordData.setAttr('name', "Harry Potter and the Sorcerer's Stone");
      assert.ok(
        baseRecordData.hasLocalAttr('name'),
        'Name is part of attributes of the base record because it has been mutated'
      );
      assert.ok(
        projectedRecordData.hasLocalAttr('name'),
        'Name is part of attributes of the projected record because it has not been mutated'
      );
    });

    (0, _qunit.module)('with nested models', function(hooks) {
      hooks.beforeEach(function() {
        this.topRecordData = new _recordData.default(
          'com.exmaple.bookstore.book',
          'top',
          null,
          this.storeWrapper,
          this.schemaManager,
          null,
          null
        );

        this.topRecordData.pushData({
          attributes: {
            name: 'name',
            child1: {
              name: 'c1',
              child1_1: {
                name: 'c1.1',
              },
            },
            child2: {
              name: 'c2',
            },
            child3: {
              name: 'c3',
            },
          },
        });

        this.child1Model = {
          _notifyProperties: this.sinon.spy(),
        };
        this.child1RecordData = this.topRecordData._getChildRecordData(
          'child1',
          null,
          'com.exmaple.bookstore.book',
          'child1',
          {
            record: this.child1Model,
          }
        );

        this.child2Model = {
          _notifyProperties: this.sinon.spy(),
        };
        this.child2RecordData = this.topRecordData._getChildRecordData(
          'child2',
          null,
          'com.exmaple.bookstore.book',
          'child2',
          {
            record: this.child2Model,
          }
        );

        this.child11Model = {
          _notifyProperties: this.sinon.spy(),
        };
        this.child11RecordData = this.child1RecordData._getChildRecordData(
          'child1_1',
          null,
          'com.exmaple.bookstore.book',
          'child1_1',
          { record: this.child11Model }
        );
      });

      (0, _qunit.test)('.pushData calls reified child recordDatas recursively', function(assert) {
        var pushDataSpy = this.sinon.spy(_recordData.default.prototype, 'pushData');
        var changedKeys = this.topRecordData.pushData(
          {
            attributes: {
              name: 'new name',
              child1: {
                name: 'c1_new',
                child1_1: {
                  name: 'c1.1_new',
                },
              },
              child3: 3,
            },
          },
          true
        );

        assert.deepEqual(
          changedKeys.sort(),
          ['name', 'child3'].sort(),
          'changed attributes are returned'
        );
        assert.deepEqual(
          (0, _lodash.zip)(
            pushDataSpy.thisValues.slice(1).map(function(x) {
              return x + '';
            }),
            pushDataSpy.args.slice(1)
          ),
          [
            [
              this.child1RecordData + '',
              [
                {
                  attributes: {
                    name: 'c1_new',
                    child1_1: {
                      name: 'c1.1_new',
                    },
                  },
                },
                true,
                true,
              ],
            ],
            [
              this.child11RecordData + '',
              [
                {
                  attributes: {
                    name: 'c1.1_new',
                  },
                },
                true,
                true,
              ],
            ],
          ],
          'pushData called recursively on children'
        );
      });

      (0,
      _qunit.test)('.pushData on a child recordData manually notifies changes', function(assert) {
        this.topRecordData.pushData(
          {
            attributes: {
              name: 'new name',
              child1: {
                name: 'c1_new',
                child1_1: {
                  name: 'c1.1_new',
                },
              },
              child3: 3,
            },
          },
          true
        );

        assert.deepEqual(
          (0, _lodash.zip)(
            this.child1Model._notifyProperties.thisValues.map(function(x) {
              return x + '';
            }),
            this.child1Model._notifyProperties.args
          ),
          [[this.child1Model + '', [['name']]]],
          'child1._notifyProperties called'
        );

        assert.deepEqual(
          (0, _lodash.zip)(
            this.child11Model._notifyProperties.thisValues.map(function(x) {
              return x + '';
            }),
            this.child11Model._notifyProperties.args
          ),
          [[this.child11Model + '', [['name']]]],
          'grandchild1_1._notifyProperties called'
        );

        assert.equal(
          this.child2Model._notifyProperties.callCount,
          0,
          'child2._notifyProperties not called'
        );
      });

      (0, _qunit.test)('.didCommit calls reified child recordDatas recursively', function(assert) {
        var didCommitSpy = this.sinon.spy(_recordData.default.prototype, 'didCommit');
        var changedKeys = this.topRecordData.didCommit({
          attributes: {
            name: 'new name',
            child1: {
              name: 'c1_new',
              child1_1: {
                name: 'c1.1_new',
              },
            },
            child3: 3,
          },
        });

        assert.deepEqual(
          changedKeys.sort(),
          ['name', 'child3'].sort(),
          'changed attributes are returned'
        );
        assert.deepEqual(
          (0, _lodash.zip)(
            didCommitSpy.thisValues.slice(1).map(function(x) {
              return x + '';
            }),
            didCommitSpy.args.slice(1)
          ),
          [
            [this.child2RecordData + '', []],
            [
              this.child1RecordData + '',
              [
                {
                  attributes: {
                    name: 'c1_new',
                    child1_1: {
                      name: 'c1.1_new',
                    },
                  },
                },
                true,
              ],
            ],
            [
              this.child11RecordData + '',
              [
                {
                  attributes: {
                    name: 'c1.1_new',
                  },
                },
                true,
              ],
            ],
          ],
          'didCommit called recursively on children'
        );
      });

      (0,
      _qunit.test)('.didCommit on a child recordData manually notifies changes', function(assert) {
        this.topRecordData.didCommit({
          attributes: {
            name: 'new name',
            child1: {
              name: 'c1_new',
              child1_1: {
                name: 'c1.1_new',
              },
            },
            child3: 3,
          },
        });

        assert.deepEqual(
          (0, _lodash.zip)(
            this.child1Model._notifyProperties.thisValues.map(function(x) {
              return x + '';
            }),
            this.child1Model._notifyProperties.args
          ),
          [[this.child1Model + '', [['name']]]],
          'child1._notifyProperties called'
        );

        assert.deepEqual(
          (0, _lodash.zip)(
            this.child11Model._notifyProperties.thisValues.map(function(x) {
              return x + '';
            }),
            this.child11Model._notifyProperties.args
          ),
          [[this.child11Model + '', [['name']]]],
          'grandchild1_1._notifyProperties called'
        );

        assert.equal(
          this.child2Model._notifyProperties.callCount,
          0,
          'child2._notifyProperties not called'
        );
      });

      (0,
      _qunit.test)('.commitWasRejected calls reified child recordDatas recursively', function(assert) {
        var commitWasRejectedSpy = this.sinon.spy(
          _recordData.default.prototype,
          'commitWasRejected'
        );
        this.topRecordData.willCommit();
        this.topRecordData.commitWasRejected();

        assert.deepEqual(
          (0, _lodash.zip)(
            commitWasRejectedSpy.thisValues.slice(1).map(function(x) {
              return x + '';
            }),
            commitWasRejectedSpy.args.slice(1)
          ),
          [
            [this.child1RecordData + '', []],
            [this.child11RecordData + '', []],
            [this.child2RecordData + '', []],
          ],
          'commitWasRejected called recursively on children'
        );
      });

      (0,
      _qunit.test)('.rollbackAttributes calls reified child recordDatas recursively', function(assert) {
        var rollbackAttributesSpy = this.sinon.spy(
          _recordData.default.prototype,
          'rollbackAttributes'
        );
        this.topRecordData.rollbackAttributes();

        assert.deepEqual(
          (0, _lodash.zip)(
            rollbackAttributesSpy.thisValues.slice(1).map(function(x) {
              return x + '';
            }),
            rollbackAttributesSpy.args.slice(1)
          ),
          [
            [this.child1RecordData + '', [true]],
            [this.child11RecordData + '', [true]],
            [this.child2RecordData + '', [true]],
          ],
          'rollbackAttributes called recursively on children'
        );
      });
    });
  });
});
define('dummy/tests/unit/schema-manager-test', [
  'qunit',
  'ember-qunit',
  'ember-m3/services/m3-schema',
], function(_qunit, _emberQunit, _m3Schema) {
  'use strict';

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

  (0, _qunit.module)('unit/schema-manager', function(hooks) {
    (0, _emberQunit.setupTest)(hooks);

    hooks.beforeEach(function() {
      var _this = this;

      this.schemaManager = this.owner.lookup('service:m3-schema-manager');
      this.registerSchema = function(schema) {
        _this.owner.register('service:m3-schema', schema);
      };
    });

    (0, _qunit.module)('schemas', function() {
      (0, _qunit.test)('can specify what models the schema handles', function(assert) {
        this.registerSchema(
          (function(_DefaultSchema) {
            _inherits(TestSchema, _DefaultSchema);

            function TestSchema() {
              _classCallCheck(this, TestSchema);

              return _possibleConstructorReturn(
                this,
                (TestSchema.__proto__ || Object.getPrototypeOf(TestSchema)).apply(this, arguments)
              );
            }

            _createClass(TestSchema, [
              {
                key: 'includesModel',
                value: function includesModel(modelName) {
                  return /com\.example\.bookstore\.*/i.test(modelName);
                },
              },
            ]);

            return TestSchema;
          })(_m3Schema.default)
        );

        assert.equal(this.schemaManager.includesModel('com.example.bookstore.Book'), true);
        assert.equal(this.schemaManager.includesModel('com.example.petstore.Pet'), false);
      });

      (0,
      _qunit.test)('can specify what fields refer to other models in the store', function(assert) {
        this.registerSchema(
          (function(_DefaultSchema2) {
            _inherits(TestSchema, _DefaultSchema2);

            function TestSchema() {
              _classCallCheck(this, TestSchema);

              return _possibleConstructorReturn(
                this,
                (TestSchema.__proto__ || Object.getPrototypeOf(TestSchema)).apply(this, arguments)
              );
            }

            _createClass(TestSchema, [
              {
                key: 'computeAttributeReference',
                value: function computeAttributeReference(key, value) {
                  if (/^ref-/i.test(key)) {
                    return {
                      type: key.substring('ref-'.length),
                      id: value,
                    };
                  }
                  return null;
                },
              },
            ]);

            return TestSchema;
          })(_m3Schema.default)
        );

        assert.deepEqual(this.schemaManager.computeAttributeReference('ref-foo', 200), {
          type: 'foo',
          id: 200,
        });
        assert.deepEqual(this.schemaManager.computeAttributeReference('foo', 70), null);
      });

      (0, _qunit.test)('can specify a nested model matcher', function(assert) {
        this.registerSchema(
          (function(_DefaultSchema3) {
            _inherits(TestSchema, _DefaultSchema3);

            function TestSchema() {
              _classCallCheck(this, TestSchema);

              return _possibleConstructorReturn(
                this,
                (TestSchema.__proto__ || Object.getPrototypeOf(TestSchema)).apply(this, arguments)
              );
            }

            _createClass(TestSchema, [
              {
                key: 'computeNestedModel',
                value: function computeNestedModel(key) {
                  return /com\.example\./i.test(key);
                },
              },
            ]);

            return TestSchema;
          })(_m3Schema.default)
        );

        assert.equal(this.schemaManager.computeNestedModel('com.example.bookstore.Author'), true);
        assert.equal(this.schemaManager.computeNestedModel('name'), false);
      });

      (0, _qunit.test)('can specify per-modelName transforms', function(assert) {
        var TestSchema = (function(_DefaultSchema4) {
          _inherits(TestSchema, _DefaultSchema4);

          function TestSchema() {
            _classCallCheck(this, TestSchema);

            return _possibleConstructorReturn(
              this,
              (TestSchema.__proto__ || Object.getPrototypeOf(TestSchema)).apply(this, arguments)
            );
          }

          return TestSchema;
        })(_m3Schema.default);

        TestSchema.prototype.models = {
          'com.example.bookstore.Book': {
            transforms: {
              name: function name(value) {
                return value + ' OMG!';
              },
            },
          },
        };
        this.registerSchema(TestSchema);

        assert.equal(
          this.schemaManager.transformValue('com.example.bookstore.Book', 'name', 'jeff'),
          'jeff OMG!'
        );
        assert.equal(
          this.schemaManager.transformValue('com.example.bookstore.Book', 'alternateName', 'jeff'),
          'jeff'
        );
        assert.equal(
          this.schemaManager.transformValue('com.example.bookstore.Author', 'name', 'jeff'),
          'jeff'
        );
      });

      (0, _qunit.test)('can specify per-modelName whitelisted attributes', function(assert) {
        var TestSchema = (function(_DefaultSchema5) {
          _inherits(TestSchema, _DefaultSchema5);

          function TestSchema() {
            _classCallCheck(this, TestSchema);

            return _possibleConstructorReturn(
              this,
              (TestSchema.__proto__ || Object.getPrototypeOf(TestSchema)).apply(this, arguments)
            );
          }

          return TestSchema;
        })(_m3Schema.default);

        TestSchema.prototype.models = {
          'com.example.bookstore.Book': {
            attributes: ['name'],
          },
          'com.example.bookstore.Author': {
            attributes: null,
          },
          'com.example.bookstore.ReaderComment': {},
        };
        this.registerSchema(TestSchema);

        assert.equal(
          this.schemaManager.isAttributeIncluded('com.example.bookstore.Book', 'name'),
          true
        );
        assert.equal(
          this.schemaManager.isAttributeIncluded('com.example.bookstore.Book', 'age'),
          false
        );
        assert.equal(
          this.schemaManager.isAttributeIncluded('com.example.bookstore.Author', 'name'),
          true
        );
        assert.equal(
          this.schemaManager.isAttributeIncluded('com.example.bookstore.Author', 'age'),
          true
        );
        assert.equal(
          this.schemaManager.isAttributeIncluded('com.example.bookstore.ReaderComment', 'name'),
          true
        );
        assert.equal(
          this.schemaManager.isAttributeIncluded('com.example.bookstore.ReaderComment', 'age'),
          true
        );
        assert.equal(
          this.schemaManager.isAttributeIncluded('com.example.bookstore.SearchResult', 'name'),
          true
        );
        assert.equal(
          this.schemaManager.isAttributeIncluded('com.example.bookstore.SearchResult', 'age'),
          true
        );
      });
    });

    (0,
    _qunit.test)('.isAttributeIncluded does not error when no schema is registered', function(assert) {
      assert.equal(
        this.schemaManager.isAttributeIncluded('com.example.movies.Movie', 'name'),
        true
      );
    });

    (0,
    _qunit.test)('.transformValue does not error when no schema is registered', function(assert) {
      assert.equal(
        this.schemaManager.transformValue('com.example.moves.Movie', 'name', 'jeff'),
        'jeff'
      );
    });
  });
});
define('dummy/tests/unit/schema/is-resolved-test', [
  'qunit',
  'ember-qunit',
  'sinon',
  'ember-m3/services/m3-schema',
  'ember-m3/m3-reference-array',
], function(_qunit, _emberQunit, _sinon, _m3Schema, _m3ReferenceArray) {
  'use strict';

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

  (0, _qunit.module)('unit/schema/is-resolved', function(hooks) {
    (0, _emberQunit.setupTest)(hooks);

    hooks.beforeEach(function() {
      this.sinon = _sinon.default.createSandbox();
      this.store = this.owner.lookup('service:store');
      this.BaseSchema = (function(_DefaultSchema) {
        _inherits(BaseTestSchema, _DefaultSchema);

        function BaseTestSchema() {
          _classCallCheck(this, BaseTestSchema);

          return _possibleConstructorReturn(
            this,
            (BaseTestSchema.__proto__ || Object.getPrototypeOf(BaseTestSchema)).apply(
              this,
              arguments
            )
          );
        }

        _createClass(BaseTestSchema, [
          {
            key: 'computeAttributeReference',
            value: function computeAttributeReference(key, value, modelName, schemaInterface) {
              var refValue = schemaInterface.getAttr('*' + key);
              if (typeof refValue === 'string') {
                return {
                  type: null,
                  id: refValue,
                };
              } else if (Array.isArray(refValue)) {
                return refValue.map(function(x) {
                  return {
                    type: null,
                    id: x,
                  };
                });
              }
              return null;
            },
          },
          {
            key: 'computeNestedModel',
            value: function computeNestedModel(key, value) {
              if (
                value &&
                (typeof value === 'undefined' ? 'undefined' : _typeof(value)) === 'object' &&
                value.constructor !== Date &&
                !Array.isArray(value)
              ) {
                return {
                  type: value.type,
                  id: value.id,
                  attributes: value,
                };
              }
            },
          },
          {
            key: 'includesModel',
            value: function includesModel(modelName) {
              return /^com.example.bookstore\./i.test(modelName);
            },
          },
        ]);

        return BaseTestSchema;
      })(_m3Schema.default);
    });

    hooks.afterEach(function() {
      this.sinon.restore();
    });

    (0, _qunit.module)('default impl', function(hooks) {
      hooks.beforeEach(function() {
        this.owner.register('service:m3-schema', this.BaseSchema);

        this.store.push({
          data: {
            id: 'isbn:9780439708180',
            type: 'com.example.bookstore.Book',
            attributes: {
              name: "Harry Potter and the Sorcerer's Stone",
              '*chapters': ['isbn:9780439708180:chapter:1', 'isbn:9780439708180:chapter:2'],
              '*dragons': [],
            },
          },
          included: [
            {
              id: 'isbn:9780439708180:chapter:1',
              type: 'com.example.bookstore.Chapter',
              attributes: {
                name: 'The Boy Who Lived',
              },
            },
            {
              id: 'isbn:9780439708180:chapter:2',
              type: 'com.example.bookstore.Chapter',
              attributes: {
                name: 'The Vanishing Glass',
              },
            },
          ],
        });

        this.book = this.store.peekRecord('com.example.bookstore.Book', 'isbn:9780439708180');
        this.chapter1 = this.store.peekRecord(
          'com.example.bookstore.Chapter',
          'isbn:9780439708180:chapter:1'
        );
        this.chapter2 = this.store.peekRecord(
          'com.example.bookstore.Chapter',
          'isbn:9780439708180:chapter:2'
        );
      });

      (0, _qunit.test)('records are treated as resolved', function(assert) {
        var computeAttrSpy = this.sinon.spy(this.BaseSchema.prototype, 'computeAttributeReference');

        this.book.set('bestChapter', this.chapter1);
        var ch1Attr = this.book.get('bestChapter');

        assert.deepEqual(Object.keys(this.book._cache), ['bestChapter'], 'attribute is cached');
        assert.equal(ch1Attr, this.chapter1, 'attribute was set');
        assert.equal(computeAttrSpy.callCount, 0, 'attribute was cached (treated as resolved)');
      });

      (0, _qunit.test)('record arrays are treated as resolved', function(assert) {
        var chapters = this.book.get('chapters');

        var computeAttrSpy = this.sinon.spy(this.BaseSchema.prototype, 'computeAttributeReference');

        this.book.set('chaptersAgain', chapters);

        assert.deepEqual(
          Object.keys(this.book._cache),
          ['chapters', 'chaptersAgain'],
          'attribute is cached'
        );
        assert.equal(this.book.get('chaptersAgain'), chapters, 'attribute was set');
        assert.equal(computeAttrSpy.callCount, 0, 'attribute was cached (treated as resolved)');
      });

      (0, _qunit.test)('empty record arrays are treated as resolved', function(assert) {
        var dragons = this.book.get('dragons');

        var computeAttrSpy = this.sinon.spy(this.BaseSchema.prototype, 'computeAttributeReference');

        this.book.set('dragonsAgain', dragons);

        assert.deepEqual(
          Object.keys(this.book._cache),
          ['dragons', 'dragonsAgain'],
          'attribute is cached'
        );
        assert.equal(this.book.get('dragonsAgain'), dragons, 'attribute was set');
        assert.equal(computeAttrSpy.callCount, 0, 'attribute was cached (treated as resolved)');
      });

      (0, _qunit.test)('plain arrays of records are treated as resolved', function(assert) {
        var computeAttrSpy = this.sinon.spy(this.BaseSchema.prototype, 'computeAttributeReference');

        this.book.set('chaptersAgain', [this.chapter1, this.chapter2]);

        assert.deepEqual(Object.keys(this.book._cache), ['chaptersAgain'], 'attribute is cached');
        assert.deepEqual(
          this.book.get('chaptersAgain').map(function(x) {
            return x.get('id');
          }),
          ['isbn:9780439708180:chapter:1', 'isbn:9780439708180:chapter:2'],
          'attribute was set'
        );
        assert.equal(computeAttrSpy.callCount, 0, 'attribute was cached (treated as resolved)');
      });

      (0, _qunit.test)('empty plain arrays are treated as unresolved', function(assert) {
        var computeAttrSpy = this.sinon.spy(this.BaseSchema.prototype, 'computeAttributeReference');

        this.book.set('*mentionedDragons', []);

        assert.deepEqual(Object.keys(this.book._cache), [], 'attribute is not cached');

        var mentionedDragons = this.book.get('mentionedDragons');

        assert.ok(
          mentionedDragons instanceof _m3ReferenceArray.default,
          'attribute is resolved to a reference array'
        );
        assert.deepEqual(mentionedDragons.length, 0, 'resolved array is empty');
        assert.equal(
          computeAttrSpy.callCount,
          1,
          'attribute was not cached (treated as unresolved)'
        );
      });

      (0, _qunit.test)('primitive references are treated as unresolved', function(assert) {
        var computeAttrSpy = this.sinon.spy(this.BaseSchema.prototype, 'computeAttributeReference');

        this.book.set('*someChapter', this.chapter1.id);

        assert.deepEqual(Object.keys(this.book._cache), [], 'attribute is not cached');
        assert.equal(
          this.book.get('someChapter.id'),
          'isbn:9780439708180:chapter:1',
          'attribute was set'
        );
        assert.equal(
          computeAttrSpy.callCount,
          1,
          'attribute was not cached (treated as unresolved)'
        );
      });

      (0, _qunit.test)('primitive values are treated as unresolved', function(assert) {
        var computeAttrSpy = this.sinon.spy(this.BaseSchema.prototype, 'computeAttributeReference');

        this.book.set('someChapter', this.chapter1.id);

        assert.deepEqual(Object.keys(this.book._cache), [], 'attribute is not cached');
        assert.equal(
          this.book.get('someChapter'),
          'isbn:9780439708180:chapter:1',
          'attribute was set'
        );
        assert.equal(
          computeAttrSpy.callCount,
          1,
          'attribute was not cached (treated as unresolved)'
        );
      });

      (0, _qunit.test)('plain objects are treated as unresolved', function(assert) {
        var computeNestedModelSpy = this.sinon.spy(this.BaseSchema.prototype, 'computeNestedModel');

        this.book.set('metadata', {
          '*bestChapter': 'isbn:9780439708180:chapter:1',
        });

        assert.ok(!('metadata' in this.book._cache), 'attriubte is not cached');
        var metadata = this.book.get('metadata');

        assert.ok(metadata.constructor.isModel, 'attribute is resolved');
        assert.equal(
          this.book.get('metadata.bestChapter.id'),
          'isbn:9780439708180:chapter:1',
          'attribute was set'
        );
        assert.equal(
          computeNestedModelSpy.callCount,
          1,
          'attribute was not cached (treated as unresolved)'
        );
      });
    });

    (0, _qunit.module)('user impl', function(hooks) {
      hooks.beforeEach(function() {
        var testContext = this;
        this.isAttributeResolved = function() {
          throw new Error('implement this in test');
        };
        this.owner.register(
          'service:m3-schema',
          (function(_BaseSchema) {
            _inherits(TestSchema, _BaseSchema);

            function TestSchema() {
              _classCallCheck(this, TestSchema);

              return _possibleConstructorReturn(
                this,
                (TestSchema.__proto__ || Object.getPrototypeOf(TestSchema)).apply(this, arguments)
              );
            }

            _createClass(TestSchema, [
              {
                key: 'isAttributeResolved',
                value: function isAttributeResolved() /* modelName, attrName, value, schemaInterface */ {
                  return testContext.isAttributeResolved.apply(testContext, arguments);
                },
              },
            ]);

            return TestSchema;
          })(this.BaseSchema)
        );

        this.store.push({
          data: {
            id: 'isbn:9780439708180',
            type: 'com.example.bookstore.Book',
            attributes: {
              name: "Harry Potter and the Sorcerer's Stone",
              '*chapters': ['isbn:9780439708180:chapter:1', 'isbn:9780439708180:chapter:2'],
            },
          },
          included: [
            {
              id: 'isbn:9780439708180:chapter:1',
              type: 'com.example.bookstore.Chapter',
              attributes: {
                name: 'The Boy Who Lived',
              },
            },
            {
              id: 'isbn:9780439708180:chapter:2',
              type: 'com.example.bookstore.Chapter',
              attributes: {
                name: 'The Vanishing Glass',
              },
            },
          ],
        });

        this.book = this.store.peekRecord('com.example.bookstore.Book', 'isbn:9780439708180');
        this.chapter1 = this.store.peekRecord(
          'com.example.bookstore.Chapter',
          'isbn:9780439708180:chapter:1'
        );
        this.chapter2 = this.store.peekRecord(
          'com.example.bookstore.Chapter',
          'isbn:9780439708180:chapter:2'
        );
      });

      (0, _qunit.test)('schema.isResolved can treat a set attribute as resolved', function(assert) {
        this.isAttributeResolved = function() {
          return true;
        };
        var computeAttrSpy = this.sinon.spy(this.BaseSchema.prototype, 'computeAttributeReference');

        this.book.set('someChapter', this.chapter1.id);

        assert.deepEqual(Object.keys(this.book._cache), ['someChapter'], 'attribute is cached');
        assert.equal(
          this.book.get('someChapter'),
          'isbn:9780439708180:chapter:1',
          'attribute was set'
        );
        assert.equal(computeAttrSpy.callCount, 0, 'attribute was cached (treated as resolved)');

        this.isAttributeResolved = function() {
          return false;
        };

        this.book.set('someOtherChapter', this.chapter2.id);

        assert.deepEqual(Object.keys(this.book._cache), ['someChapter'], 'attribute is not cached');
        assert.equal(
          this.book.get('someOtherChapter'),
          'isbn:9780439708180:chapter:2',
          'attribute was set'
        );
        assert.equal(
          computeAttrSpy.callCount,
          1,
          'attribute was not cached (treated as unresolved)'
        );
      });

      (0,
      _qunit.test)('schema.isResolved can treat a set attribute as unresolved', function(assert) {
        this.isAttributeResolved = function() {
          return false;
        };
        var computeAttrSpy = this.sinon.spy(this.BaseSchema.prototype, 'computeAttributeReference');

        this.book.set('someOtherChapter', this.chapter2.id);

        assert.deepEqual(Object.keys(this.book._cache), [], 'attribute is not cached');
        assert.equal(
          this.book.get('someOtherChapter'),
          'isbn:9780439708180:chapter:2',
          'attribute was set'
        );
        assert.equal(
          computeAttrSpy.callCount,
          1,
          'attribute was not cached (treated as unresolved)'
        );
      });
    });
  });
});
define('dummy/tests/unit/store-test', [
  'ember-data',
  'qunit',
  'ember-qunit',
  'sinon',
  'ember-m3/services/m3-schema',
], function(_emberData, _qunit, _emberQunit, _sinon, _m3Schema) {
  'use strict';

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

  (0, _qunit.module)('unit/store', function(hooks) {
    (0, _emberQunit.setupTest)(hooks);

    hooks.beforeEach(function() {
      this.sinon = _sinon.default.createSandbox();

      this.Author = _emberData.default.Model.extend({
        name: _emberData.default.attr('string'),
      });
      this.Author.toString = function() {
        return 'Author';
      };
      this.owner.register('model:author', this.Author);

      this.owner.register(
        'service:m3-schema',
        (function(_DefaultSchema) {
          _inherits(TestSchema, _DefaultSchema);

          function TestSchema() {
            _classCallCheck(this, TestSchema);

            return _possibleConstructorReturn(
              this,
              (TestSchema.__proto__ || Object.getPrototypeOf(TestSchema)).apply(this, arguments)
            );
          }

          _createClass(TestSchema, [
            {
              key: 'includesModel',
              value: function includesModel(modelName) {
                return /^com.example.bookstore\./i.test(modelName);
              },
            },
          ]);

          return TestSchema;
        })(_m3Schema.default)
      );
      this.store = this.owner.lookup('service:store');
    });

    hooks.afterEach(function() {
      this.sinon.restore();
    });

    (0,
    _qunit.test)('records are added to, and unloaded from, the global m3 cache', function(assert) {
      var _this2 = this;

      Ember.run(function() {
        return _this2.store.push({
          data: [
            {
              id: 'isbn:9780439708180',
              type: 'com.example.bookstore.Book',
            },
            {
              id: 'isbn:9780439708180/chapter/1',
              type: 'com.example.bookstore.Chapter',
            },
            {
              id: 'isbn:9780439064873',
              type: 'com.example.bookstore.Book',
            },
            {
              id: 'isbn:9780439708180/chapter/2',
              type: 'com.example.bookstore.Chapter',
            },
            {
              id: 'author:1',
              type: 'author',
              attributes: {
                name: 'JK Rowling',
              },
            },
          ],
        });
      });

      assert.deepEqual(
        Object.keys(this.store._identityMap._map).sort(),
        ['author', 'com.example.bookstore.book', 'com.example.bookstore.chapter'],
        'Identity map contains expected types'
      );

      var bookIds = Ember.A(
        this.store._internalModelsFor('com.example.bookstore.book')._models
      ).mapBy('id');

      assert.deepEqual(
        bookIds,
        ['isbn:9780439708180', 'isbn:9780439064873'],
        'Identity map contains expected models - book'
      );

      var chapterIds = Ember.A(
        this.store._internalModelsFor('com.example.bookstore.chapter')._models
      ).mapBy('id');

      assert.deepEqual(
        chapterIds,
        ['isbn:9780439708180/chapter/1', 'isbn:9780439708180/chapter/2'],
        'Identity map contains expected models - chapter'
      );

      assert.equal(this.store.hasRecordForId('author', 'author:1'), true);

      assert.deepEqual(
        Object.keys(this.store._globalM3Cache).sort(),
        [
          'isbn:9780439064873',
          'isbn:9780439708180',
          'isbn:9780439708180/chapter/1',
          'isbn:9780439708180/chapter/2',
        ],
        'global cache contains all m3 models, but no ds models'
      );

      Ember.run(function() {
        return _this2.store
          .peekRecord('com.example.bookstore.Book', 'isbn:9780439708180')
          .unloadRecord();
      });

      assert.deepEqual(
        Object.keys(this.store._globalM3Cache).sort(),
        ['isbn:9780439064873', 'isbn:9780439708180/chapter/1', 'isbn:9780439708180/chapter/2'],
        'global cache can unload records'
      );

      Ember.run(function() {
        return _this2.store.unloadAll();
      });

      assert.deepEqual(
        Object.keys(this.store._globalM3Cache),
        [],
        'global cache can unload all records'
      );
    });
  });
});
define('dummy/tests/unit/utils/copy-test', ['qunit', 'ember-m3/utils/copy'], function(
  _qunit,
  _copy
) {
  'use strict';

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError('Cannot call a class as a function');
    }
  }

  (0, _qunit.module)('unit/utils/copy', function() {
    (0, _qunit.test)('copy deep copies', function(assert) {
      var orig = {
        a: '1',
        b: {
          c: [1, 2, 3],
        },
        d: true,
        e: false,
        f: null,
      };

      var dupe = (0, _copy.copy)(orig);

      assert.deepEqual(dupe, {
        a: '1',
        b: {
          c: [1, 2, 3],
        },
        d: true,
        e: false,
        f: null,
      });

      assert.notEqual(orig.b, dupe.b, 'objects deep copied');

      orig.b.c.push(4);
      assert.deepEqual(orig.b.c, [1, 2, 3, 4], 'orig array updated');
      assert.deepEqual(dupe.b.c, [1, 2, 3], 'dupe array not updated');

      orig.b.q = 'hai';
      assert.strictEqual(dupe.b.q, undefined, 'dupe nested object not updated');

      var a = { b: {}, c: {} };
      a.b.foo = { q: 'yes hello i am foo' };
      a.c.foo = a.b.foo;

      var acopy = (0, _copy.copy)(a);

      assert.deepEqual(
        acopy,
        {
          b: {
            foo: { q: 'yes hello i am foo' },
          },
          c: {
            foo: { q: 'yes hello i am foo' },
          },
        },
        'graphs can be copied'
      );
      assert.strictEqual(acopy.b.foo, acopy.c.foo, 'graphs copied directly');
    });

    (0, _qunit.test)('copy deep copies top level object', function(assert) {
      var orig = {};
      var dupe = (0, _copy.copy)(orig);

      assert.notEqual(dupe, orig, 'copied top level object');

      orig = Object.create(null);
      dupe = (0, _copy.copy)(orig);

      assert.notEqual(dupe, orig, 'copied top level object (null prototype)');
    });

    (0, _qunit.test)('deep copies cycles', function(assert) {
      var orig = {
        a: { b: 'b' },
      };
      orig.a.c = orig.a;

      var dupe = (0, _copy.copy)(orig);

      assert.strictEqual(dupe.a.c, dupe.a, 'cycle copied');
      assert.notEqual(dupe.a.c, orig.a, 'cycle not a ref to original');
      assert.equal(dupe.a.b, 'b', 'value copied');
    });

    (0, _qunit.test)('copy shallow copies non-json values', function(assert) {
      var SomethingOrOther = function SomethingOrOther() {
        _classCallCheck(this, SomethingOrOther);

        this.x = 1;
        this.y = 2;
      };

      var orig = {
        s: new SomethingOrOther(),
        a: 2,
      };

      var dupe = (0, _copy.copy)(orig);

      assert.deepEqual(
        JSON.parse(JSON.stringify(dupe)),
        {
          s: {
            x: 1,
            y: 2,
          },
          a: 2,
        },
        'deep copy with class instance value'
      );

      assert.strictEqual(orig.s, dupe.s, 'class instance not deep copied (value)');
      assert.strictEqual(
        dupe.s.constructor,
        SomethingOrOther,
        'class instance not deep copied (constructor)'
      );
    });
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

require('dummy/tests/test-helper');
EmberENV.TESTS_FILE_LOADED = true;
//# sourceMappingURL=tests.map
