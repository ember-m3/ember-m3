import { test } from 'qunit';
import { default as moduleFor }  from 'ember-qunit/module-for';

import DS from 'ember-data';
import Ember from 'ember';

import MegamorphicModel from 'ember-m3/model';
import SchemaManager from 'ember-m3/schema-manager';
import { initialize as initializeStore } from 'ember-m3/initializers/m3-store';

const { get, run } = Ember;

moduleFor('m3:model', 'unit/model', {
  integration: true,

  beforeEach() {
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
