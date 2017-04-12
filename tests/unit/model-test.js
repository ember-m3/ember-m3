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
        }
      },

      computeNestedModel(key, value) {
        if (key === 'nested') {
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

});

test('.unknownProperty resolves arrays of nested-matched values', function(assert) {

});

test('.unknownProperty resolves heterogenous arrays of id-matched, nested-matched and unmatched values', function(assert) {

});

