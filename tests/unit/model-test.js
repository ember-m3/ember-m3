import { test } from 'qunit';
import { default as moduleFor }  from 'ember-qunit/module-for';
import sinon from 'sinon';

import DS from 'ember-data';
import Ember from 'ember';
import { zip } from 'lodash';

import MegamorphicModel from 'ember-m3/model';
import SchemaManager from 'ember-m3/schema-manager';
import { initialize as initializeStore } from 'ember-m3/initializers/m3-store';

const { get, run } = Ember;

moduleFor('m3:model', 'unit/model', {
  integration: true,

  beforeEach() {
    this.sinon = sinon.sandbox.create();
    initializeStore(this);

    this.Baz = DS.Model.extend({
      suchBaz: DS.attr(),
      foo: DS.belongsTo('gg.foo', { async: false }),
    });
    this.Baz.toString = () => 'Baz';
    this.register('model:baz', this.Baz);

    SchemaManager.registerSchema({
      includesModel(modelName) {
        return /^gg\./i.test(modelName);
      },

      computeAttributeReference(key, value) {
        if (key === 'bar_id') {
          return {
            type: 'gg.bar',
            id: value,
          };
        } else if (key === 'baz_id') {
          return {
            type: 'baz',
            id: value,
          };
        } else if (key === 'bars' && !Array.isArray(value)) {
          return {
            type: 'gg.bar',
            id: value,
          };
        } else if (key === 'arrayMixed' && /^bar_(\d)/.test(value)) {
          return {
            type: 'gg.bar',
            id: /^bar_(\d)/.exec(value)[1],
          };
        } else if (key === 'arrayMixed' && /^baz_(\d)/.test(value)) {
          return {
            type: 'baz',
            id: /^baz_(\d)/.exec(value)[1],
          };
        }
      },

      computeNestedModel(key, value) {
        if (!value || typeof value !== 'object') { return; }

        if (key === 'nested') {
          return {
            id: value.id,
            type: 'gg.nested',
            attributes: value,
          };
        } else if (key === 'nesteds' && !Array.isArray(value)) {
          return {
            id: value.id,
            type: 'gg.nested',
            attributes: value,
          };
        }
      },

      models: {
        'gg.foo': {
          transforms: {
            name(value) {
              return `${value} OMG!`;
            }
          }
        }
      }
    });
  },

  afterEach() {
    this.sinon.restore();
  },

  store: function() {
    return this.container.lookup('service:store');
  },
});

test('it appears as a model to ember data', function(assert) {
  assert.equal(MegamorphicModel.isModel, true);
  assert.equal(MegamorphicModel.klass, MegamorphicModel);
  assert.deepEqual(MegamorphicModel.attributes, []);
});

test('.unknownProperty returns undefined for attributes not included in the schema', function(assert) {
  let model = run(() => {
    return this.store().push({
      data: {
        id: 1,
        type: 'gg.foo',
        attributes: {
          title: 'the foo',
        },
      }
    });
  });

  assert.equal(get(model, 'title'), 'the foo');
  assert.equal(get(model, 'age'), undefined);
});

test('.unknownProperty returns schema-transformed values', function(assert) {
  let model = run(() => {
    return this.store().push({
      data: {
        id: 1,
        type: 'gg.foo',
        attributes: {
          name: 'the foo',
        },
      }
    });
  });

  assert.equal(get(model, 'name'), 'the foo OMG!');
});

test('.unknownProperty resolves id-matched values to external m3-models', function(assert) {
  let model = run(() => {
    return this.store().push({
      data: {
        id: 1,
        type: 'gg.foo',
        attributes: {
          bar_id: '2',
        },
      },

      included: [{
        id: 2,
        type: 'gg.bar',
        attributes: {
          suchBar: 'very',
        }
      }]
    });
  });

  assert.equal(get(model, 'bar_id.suchBar'), 'very');
  assert.equal(get(model, 'bar_id').constructor, MegamorphicModel);
});

test('.unknownProperty resolves id-matched values to external DS.models', function(assert) {
  let model = run(() => {
    return this.store().push({
      data: {
        id: 1,
        type: 'gg.foo',
        attributes: {
          baz_id: '3',
        },
      },

      included: [{
        id: 3,
        type: 'baz',
        attributes: {
          suchBaz: 'indeed',
        }
      }]
    });
  });

  assert.equal(get(model, 'baz_id.suchBaz'), 'indeed');
  assert.equal(get(model, 'baz_id').constructor, this.Baz);
});

test('.unknownProperty resolves nested-matched values as nested m3-models', function(assert) {
  let model = run(() => {
    return this.store().push({
      data: {
        id: 1,
        type: 'gg.foo',
        attributes: {
          baz_id: '3',
          nested: {
            id: 4,
            name: 'i am nest',
            bar_id: 2,
            baz_id: 3,
          }
        },
      },

      included: [{
        id: 2,
        type: 'gg.bar',
        attributes: {
          suchBar: 'very',
        }
      }, {
        id: 3,
        type: 'baz',
        attributes: {
          suchBaz: 'indeed',
        }
      }]
    });
  });

  assert.equal(get(model, 'nested.name'), 'i am nest');
  assert.equal(get(model, 'nested.bar_id.suchBar'), 'very');
  assert.equal(get(model, 'nested.bar_id').constructor, MegamorphicModel);
  assert.equal(get(model, 'nested.baz_id.suchBaz'), 'indeed');
  assert.equal(get(model, 'nested.baz_id').constructor, this.Baz);
});

test('.unknownProperty resolves arrays of id-matched values', function(assert) {
  let model = run(() => {
    return this.store().push({
      data: {
        id: 1,
        type: 'gg.foo',
        attributes: {
          bars: ['5', '6', '7'],
        },
      },

      included: [{
        id: 5,
        type: 'gg.foo',
        attributes: {
          secretName: 'foo5',
        }
      }, {
        id: 6,
        type: 'gg.foo',
        attributes: {
          secretName: 'foo6',
        }
      }, {
        id: 7,
        type: 'gg.foo',
        attributes: {
          secretName: 'foo7',
        }
      }]
    });
  });

  assert.deepEqual(get(model, 'bars').map(x => get(x, 'secretName')), ['foo5', 'foo6', 'foo7']);
});

test('.unknownProperty resolves arrays of nested-matched values', function(assert) {
  let model = run(() => {
    return this.store().push({
      data: {
        id: 1,
        type: 'gg.foo',
        attributes: {
          nesteds: [{
            id: 1,
            name: 'nested1',
          }, {
            id: 2,
            name: 'nested2',
          }, {
            id: 3,
            name: 'nested3',
          }],
        },
      },
    });
  });

  assert.deepEqual(get(model, 'nesteds').map(x => get(x, 'name')), ['nested1', 'nested2', 'nested3']);
});

test('.unknownProperty resolves heterogenous arrays of id-matched, nested-matched and unmatched values', function(assert) {
  let model = run(() => {
    return this.store().push({
      data: {
        id: 1,
        type: 'gg.foo',
        attributes: {
          arrayMixed: [
            {
              id: 1,
              name: 'nested1',
            },
            'bar_6',
            'baz_7'
          ],
        },
      },

      included: [{
        id: 6,
        type: 'gg.bar',
        attributes: {
          suchBar: 'very',
        },
      }, {
        id: 7,
        type: 'baz',
        attributes: {
          suchBaz: 'indeed',
        }
      }]
    });
  });

  let arrayMixed = get(model, 'arrayMixed');
  assert.equal(arrayMixed.length, 3, 'array has right length');
  assert.equal(get(arrayMixed[0], 'name'), 'nested1', 'array nested');
  assert.equal(get(arrayMixed[1], 'suchBar'), 'very', 'array ref-to-m3');
  assert.equal(get(arrayMixed[2], 'suchBaz'), 'indeed', 'array ref-to-ds.model');
});

test('DS.Models can have relationships into m3 models', function(assert) {
  let model = run(() => {
    return this.store().push({
      data: {
        id: 3,
        type: 'baz',
        attributes: {
          suchBaz: 'indeed',
        },
        relationships: {
          foo: {
            data: {
              id: 1,
              type: 'gg.foo'
            }
          }
        }
      },

      included: [{
        id: 1,
        type: 'gg.foo',
        attributes: {
          secretName: 'secret ohai',
        }
      }]
    });
  });

  assert.equal(get(model, 'suchBaz'), 'indeed', 'ds.model loaded');
  assert.equal(get(model, 'foo.secretName'), 'secret ohai', 'ds.model can access m3 model via relationship');
});

test('nested models are created lazily', function(assert) {
  let init = this.sinon.spy(MegamorphicModel.prototype, 'init');
  let model = run(() => {
    return this.store().push({
      data: {
        id: 1,
        type: 'gg.foo',
        attributes: {
          nested: {
            id: 4,
            name: 'i am nest',
            nested: {
              id: 6,
              name: 'i nest again!'
            }
          }
        },
      },
    });
  });

  assert.equal(init.callCount, 1, 'initially only one model is created');

  model = run(() => {
    return this.store().push({
      data: {
        id: 1,
        type: 'gg.foo',
        attributes: {
          nested: {
            id: 4,
            name: 'i am a changed nest',
            nested: {
              id: 6,
              name: 'i nest again! but changed!'
            }
          }
        },
      },
    });
  });

  assert.equal(init.callCount, 1, 'model changes do not reify nested models');

  assert.equal(get(model, 'nested.id'), 4);
  assert.equal(init.callCount, 2, 'nested model is created lazily');

  assert.equal(get(model, 'nested.id'), 4);
  assert.equal(init.callCount, 2, 'nested model is cached');

  assert.equal(get(model, 'nested.nested.id'), 6);
  assert.equal(init.callCount, 3, 'doubly nested model is created lazily');

  assert.equal(get(model, 'nested.nested.id'), 6);
  assert.equal(init.callCount, 3, 'doubly nested model is cached');
});

test('attribute property changes are properly detected', function(assert) {
  let propChange = this.sinon.spy(MegamorphicModel.prototype, 'notifyPropertyChange');
  let model = run(() => {
    return this.store().push({
      data: {
        id: 1,
        type: 'gg.foo',
        attributes: {
          secretName: 'secret',
          anotherAttribute: 'another',
        },
      },
    });
  });

  run(() => {
    return this.store().push({
      data: {
        id: 1,
        type: 'gg.foo',
        attributes: {
          secretName: 'super secret',
          anotherAttribute: 'another',
        }
      }
    });
  });

  assert.deepEqual(zip(propChange.thisValues.map(x => x+''), propChange.args), [
    [model+'', ['secretName']],
  ]);
});

test('omitted attributes are treated as deleted', function(assert) {
  let propChange = this.sinon.spy(MegamorphicModel.prototype, 'notifyPropertyChange');

  let model = run(() => {
    return this.store().push({
      data: {
        id: 1,
        type: 'gg.foo',
        attributes: {
          secretName: 'secret',
          anotherAttribute: 'another',
          thirdAttribute: 'eye',
        },
      },
    });
  });

  run(() => {
    return this.store().push({
      data: {
        id: 1,
        type: 'gg.foo',
        attributes: {
          secretName: 'secret',
        }
      }
    });
  });

  assert.deepEqual(zip(propChange.thisValues.map(x => x+''), propChange.args), [
    [model+'', ['anotherAttribute']],
    [model+'', ['thirdAttribute']],
  ], 'omitted attributes are treated as deleted');
});

test('omitted attributes in nested models are treated as deleted', function(assert) {
  let init = this.sinon.spy(MegamorphicModel.prototype, 'init');
  let propChange = this.sinon.spy(MegamorphicModel.prototype, 'notifyPropertyChange');

  let model = run(() => {
    return this.store().push({
      data: {
        id: 1,
        type: 'gg.foo',
        attributes: {
          nested: {
            id: 4,
            name: 'i am nest',
            anotherAttribute: 'another',
            nested: {
              id: 6,
              name: 'i nest again!',
              anotherAttribute: 'wat',
            }
          }
        },
      },
    });
  });

  assert.equal(init.callCount, 1, 'one model is initially created');
  assert.equal(propChange.callCount, 0, 'no property changes');

  let nested = get(model, 'nested');
  let doubleNested = get(model, 'nested.nested');

  assert.equal(init.callCount, 3, 'models created lazily');

  assert.equal(get(nested, 'name'), 'i am nest');
  assert.equal(get(nested, 'anotherAttribute'), 'another');
  assert.equal(get(doubleNested, 'name'), 'i nest again!');
  assert.equal(get(doubleNested, 'anotherAttribute'), 'wat');

  run(() => {
    return this.store().push({
      data: {
        id: 1,
        type: 'gg.foo',
        attributes: {
          nested: {
            id: 4,
            name: 'still nest',
            nested: {
              id: 6,
              name: 'i nest again!',
            }
          }
        }
      }
    });
  });

  assert.deepEqual(zip(propChange.thisValues.map(x => x+''), propChange.args), [
    [nested+'', ['anotherAttribute']],
    [nested+'', ['name']],
    [doubleNested+'', ['anotherAttribute']],
  ], 'omitted attributes in nested models are deleted');

  assert.equal(get(nested, 'name'), 'still nest');
  assert.equal(get(nested, 'anotherAttribute'), undefined);
  assert.equal(get(doubleNested, 'name'), 'i nest again!');
  assert.equal(get(doubleNested, 'anotherAttribute'), undefined);
});

test('new attributes are treated as changed', function(assert) {
  let propChange = this.sinon.spy(MegamorphicModel.prototype, 'notifyPropertyChange');

  let model = run(() => {
    return this.store().push({
      data: {
        id: 1,
        type: 'gg.foo',
        attributes: {
          secretName: 'secret',
        },
      },
    });
  });

  assert.equal(get(model, 'secretName'), 'secret');
  assert.equal(get(model, 'anotherAttribute'), undefined);

  run(() => {
    return this.store().push({
      data: {
        id: 1,
        type: 'gg.foo',
        attributes: {
          secretName: 'secret',
          anotherAttribute: 'another',
        }
      }
    });
  });

  assert.deepEqual(zip(propChange.thisValues.map(x => x+''), propChange.args), [
    [model+'', ['anotherAttribute']],
  ], 'new attributes are treated as changes');

  assert.equal(get(model, 'secretName'), 'secret');
  assert.equal(get(model, 'anotherAttribute'), 'another');
});

test('new attributes in nested models are treated as changed', function(assert) {
  let init = this.sinon.spy(MegamorphicModel.prototype, 'init');
  let propChange = this.sinon.spy(MegamorphicModel.prototype, 'notifyPropertyChange');

  let model = run(() => {
    return this.store().push({
      data: {
        id: 1,
        type: 'gg.foo',
        attributes: {
          nested: {
            id: 4,
            name: 'i am nest',
            nested: {
              id: 6,
              name: 'i nest again!',
            }
          }
        },
      },
    });
  });

  assert.equal(init.callCount, 1, 'one model is initially created');
  assert.equal(propChange.callCount, 0, 'no property changes');

  let nested = get(model, 'nested');
  let doubleNested = get(model, 'nested.nested');

  assert.equal(init.callCount, 3, 'models created lazily');

  assert.equal(get(nested, 'name'), 'i am nest');
  assert.equal(get(nested, 'anotherAttribute'), undefined);
  assert.equal(get(doubleNested, 'name'), 'i nest again!');
  assert.equal(get(doubleNested, 'anotherAttribute'), undefined);

  run(() => {
    return this.store().push({
      data: {
        id: 1,
        type: 'gg.foo',
        attributes: {
          nested: {
            id: 4,
            name: 'still nest',
            anotherAttribute: 'another',
            nested: {
              id: 6,
              name: 'i nest again!',
              anotherAttribute: 'wat',
            }
          }
        }
      }
    });
  });

  assert.deepEqual(zip(propChange.thisValues.map(x => x+''), propChange.args), [
    [nested+'', ['anotherAttribute']],
    [nested+'', ['name']],
    [doubleNested+'', ['anotherAttribute']],
  ], 'new attributes are treated as changed');

  assert.equal(get(nested, 'name'), 'still nest');
  assert.equal(get(nested, 'anotherAttribute'), 'another');
  assert.equal(get(doubleNested, 'name'), 'i nest again!');
  assert.equal(get(doubleNested, 'anotherAttribute'), 'wat');
});

test('nested model attribute changes are properly detected', function(assert) {
  let init = this.sinon.spy(MegamorphicModel.prototype, 'init');
  let propChange = this.sinon.spy(MegamorphicModel.prototype, 'notifyPropertyChange');

  let model = run(() => {
    return this.store().push({
      data: {
        id: 1,
        type: 'gg.foo',
        attributes: {
          nested: {
            id: 4,
            name: 'i am nest',
            anotherAttribute: 'another',
            nested: {
              id: 6,
              name: 'i nest again!',
              anotherAttribute: 'wat',
            }
          }
        },
      },
    });
  });

  assert.equal(init.callCount, 1, 'one model is initially created');
  assert.equal(propChange.callCount, 0, 'no property changes');

  let nested = get(model, 'nested');
  let doubleNested = get(model, 'nested.nested');

  assert.equal(init.callCount, 3, 'models created lazily');

  run(() => {
    return this.store().push({
      data: {
        id: 1,
        type: 'gg.foo',
        attributes: {
          nested: {
            id: 4,
            name: 'still nest',
            anotherAttribute: 'another',
            nested: {
              id: 6,
              name: 'stuck in nest',
              anotherAttribute: 'wat',
            }
          }
        }
      }
    });
  });

  assert.deepEqual(zip(propChange.thisValues.map(x => x+''), propChange.args), [
    [nested+'', ['name']],
    [doubleNested+'', ['name']],
  ], 'property changes are called for changed attributes on nested models, but not for unchanged attributes');
});

test('nested model updates null -> model', function(assert) {
  let init = this.sinon.spy(MegamorphicModel.prototype, 'init');
  let propChange = this.sinon.spy(MegamorphicModel.prototype, 'notifyPropertyChange');

  let model = run(() => {
    return this.store().push({
      data: {
        id: 1,
        type: 'gg.foo',
        attributes: {
          secretName: 'ohai'
        },
      },
    });
  });

  assert.equal(get(model, 'secretName'), 'ohai', 'property get as expected');
  assert.equal(init.callCount, 1, 'one model is initially created');

  run(() => {
    return this.store().push({
      data: {
        id: 1,
        type: 'gg.foo',
        attributes: {
          secretName: 'ohai',
          nested: {
            id: 4,
            name: 'still nest',
            anotherAttribute: 'another',
            nested: {
              id: 6,
              name: 'stuck in nest',
              anotherAttribute: 'wat',
            }
          }
        }
      }
    });
  });

  assert.equal(init.callCount, 1, 'nested models are not eaagerly created from changes');
  assert.deepEqual(zip(propChange.thisValues.map(x => x+''), propChange.args), [
    [model+'', ['nested']],
  ], 'nested model from null is treated as a change');

  assert.equal(get(model, 'nested.nested.name'), 'stuck in nest', 'nested model attrs set');
  assert.equal(init.callCount, 3, 'nested models are lazily created');
});

test('nested model updates primitive -> model', function(assert) {
  let init = this.sinon.spy(MegamorphicModel.prototype, 'init');
  let propChange = this.sinon.spy(MegamorphicModel.prototype, 'notifyPropertyChange');

  let model = run(() => {
    return this.store().push({
      data: {
        id: 1,
        type: 'gg.foo',
        attributes: {
          secretName: 'ohai',
          nested: 24601,
        },
      },
    });
  });

  assert.equal(get(model, 'secretName'), 'ohai', 'get model.secretName');
  assert.equal(get(model, 'nested'), 24601, 'get model.nested');
  assert.equal(init.callCount, 1, 'one model is initially created');

  run(() => {
    return this.store().push({
      data: {
        id: 1,
        type: 'gg.foo',
        attributes: {
          secretName: 'ohai',
          nested: {
            id: 4,
            name: 'still nest',
            anotherAttribute: 'another',
            nested: {
              id: 6,
              name: 'stuck in nest',
              anotherAttribute: 'wat',
            }
          }
        }
      }
    });
  });

  assert.equal(init.callCount, 1, 'nested models are not eaagerly created from changes');
  assert.deepEqual(zip(propChange.thisValues.map(x => x+''), propChange.args), [
    [model+'', ['nested']],
  ], 'nested model from null is treated as a change');

  assert.equal(get(model, 'nested.nested.name'), 'stuck in nest', 'nested model attrs set');
  assert.equal(init.callCount, 3, 'nested models are lazily created');
});

test('nested model updates model -> null (model reified)', function(assert) {
  let init = this.sinon.spy(MegamorphicModel.prototype, 'init');
  let propChange = this.sinon.spy(MegamorphicModel.prototype, 'notifyPropertyChange');

  let model = run(() => {
    return this.store().push({
      data: {
        id: 1,
        type: 'gg.foo',
        attributes: {
          secretName: 'ohai',
          nested: {
            id: 4,
            name: 'still nest',
            anotherAttribute: 'another',
            nested: {
              id: 6,
              name: 'stuck in nest',
              anotherAttribute: 'wat',
            }
          }
        }
      }
    });
  });

  assert.equal(get(model, 'nested.nested.name'), 'stuck in nest', 'nested model attrs set');
  assert.equal(init.callCount, 3, 'nested models are created');

  run(() => {
    self.halt = true;
    return this.store().push({
      data: {
        id: 1,
        type: 'gg.foo',
        attributes: {
          secretName: 'ohai'
        },
      },
    });
  });

  assert.equal(init.callCount, 3, 'no additional models created');
  assert.equal(get(model, 'nested.nested.name'), undefined, 'nested model is cleared');
  assert.deepEqual(zip(propChange.thisValues.map(x => x+''), propChange.args), [
    [model+'', ['nested']],
  ], 'nested model to null is treated as a change');
});

test('nested model updates model -> primitive', function(assert) {
  let init = this.sinon.spy(MegamorphicModel.prototype, 'init');
  let propChange = this.sinon.spy(MegamorphicModel.prototype, 'notifyPropertyChange');

  let model = run(() => {
    return this.store().push({
      data: {
        id: 1,
        type: 'gg.foo',
        attributes: {
          secretName: 'ohai',
          nested: {
            id: 4,
            name: 'still nest',
            anotherAttribute: 'another',
            nested: {
              id: 6,
              name: 'stuck in nest',
              anotherAttribute: 'wat',
            }
          }
        }
      }
    });
  });

  assert.equal(get(model, 'secretName'), 'ohai', 'get model.secretName');
  assert.equal(get(model, 'nested.nested.name'), 'stuck in nest', 'nested model attrs set');
  assert.equal(init.callCount, 3, 'three models is initially created');

  run(() => {
    return this.store().push({
      data: {
        id: 1,
        type: 'gg.foo',
        attributes: {
          secretName: 'ohai',
          nested: 24601,
        },
      },
    });
  });

  assert.equal(init.callCount, 3, 'no new models created');
  assert.deepEqual(zip(propChange.thisValues.map(x => x+''), propChange.args), [
    [model+'', ['nested']],
  ], 'nested model from null is treated as a change');

  assert.equal(get(model, 'nested'), 24601, 'nested model -> primitive');
});

test('nested model updates model -> null (model inert)', function(assert) {
  let init = this.sinon.spy(MegamorphicModel.prototype, 'init');
  let propChange = this.sinon.spy(MegamorphicModel.prototype, 'notifyPropertyChange');

  let model = run(() => {
    return this.store().push({
      data: {
        id: 1,
        type: 'gg.foo',
        attributes: {
          secretName: 'ohai',
          nested: {
            id: 4,
            name: 'still nest',
            anotherAttribute: 'another',
            nested: {
              id: 6,
              name: 'stuck in nest',
              anotherAttribute: 'wat',
            }
          }
        }
      }
    });
  });

  assert.equal(init.callCount, 1, 'one model is initially created');

  run(() => {
    return this.store().push({
      data: {
        id: 1,
        type: 'gg.foo',
        attributes: {
          secretName: 'ohai'
        },
      },
    });
  });

  assert.equal(init.callCount, 1, 'nested models are not eaagerly created from changes');
  assert.deepEqual(zip(propChange.thisValues.map(x => x+''), propChange.args), [
    [model+'', ['nested']],
  ], 'nested model from null is treated as a change');

  assert.equal(get(model, 'nested.nested.name'), undefined, 'nested model not set');
  assert.equal(init.callCount, 1, 'nested model not created');
});

test('nested array attribute changes are properly detected', function(assert) {

});
