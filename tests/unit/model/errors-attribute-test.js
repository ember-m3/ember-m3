import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';
import { run } from '@ember/runloop';
import { get } from '@ember/object';
import DefaultSchema from 'ember-m3/services/m3-schema';
import { Errors as ModelErrors } from '@ember-data/model/-private';

class TestSchemaFlagOn extends DefaultSchema {
  includesModel(modelName) {
    return /^com.example.bookstore\./i.test(modelName);
  }

  useUnderlyingErrorsValue() {
    return true;
  }
}

class TestSchemaFlagOff extends DefaultSchema {
  includesModel(modelName) {
    return /^com.example.bookstore\./i.test(modelName);
  }

  useUnderlyingErrorsValue() {
    return false;
  }
}

class TestSchemaNoOverride extends DefaultSchema {
  includesModel(modelName) {
    return /^com.example.bookstore\./i.test(modelName);
  }
}

const errorsArray = [
  {
    path: ['talentHiringProjectsByCriteria'],
    locations: [{ column: 3, line: 2 }],
    message: 'Error calling findByCriteria.',
  },
];

module('unit/model/errors-attribute', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function () {
    this.store = this.owner.lookup('service:store');
  });

  test('schema with flag set to true returns errors from payload', function (assert) {
    this.owner.register('service:m3-schema', TestSchemaFlagOn);

    let model = run(() => {
      return this.store.push({
        data: {
          id: 'urn:book:1',
          type: 'com.example.bookstore.Book',
          attributes: {
            author: ['urn:author:1'],
            errors: errorsArray,
          },
        },
      });
    });
    assert.deepEqual(
      get(model, 'errors').get('firstObject'),
      errorsArray[0],
      "schema's useUnderlyingErrorsValue value set to true should return payload errors array"
    );
  });

  test('schema with flag set to true but no errors in payload returns undefined', function (assert) {
    this.owner.register('service:m3-schema', TestSchemaFlagOn);

    let model = run(() => {
      return this.store.push({
        data: {
          id: 'urn:book:1',
          type: 'com.example.bookstore.Book',
          attributes: {
            author: ['urn:author:1'],
          },
        },
      });
    });
    assert.equal(
      get(model, 'errors'),
      undefined,
      "schema's useUnderlyingErrorsValue returns true but missing data payload should return undefined"
    );
  });

  test('schema with flag set to true returns errors from payload', function (assert) {
    this.owner.register('service:m3-schema', TestSchemaFlagOn);

    let model = run(() => {
      return this.store.push({
        data: {
          id: 'urn:book:1',
          type: 'com.example.bookstore.Book',
          attributes: {
            author: ['urn:author:1'],
            errors: errorsArray,
          },
        },
      });
    });
    assert.deepEqual(
      get(model, 'errors').get('firstObject'),
      errorsArray[0],
      "schema's useUnderlyingErrorsValue returns true should return payload errors array"
    );
  });

  test('schema with flag set to false returns Errors object instance', function (assert) {
    this.owner.register('service:m3-schema', TestSchemaFlagOff);

    let model = run(() => {
      return this.store.push({
        data: {
          id: 'urn:book:1',
          type: 'com.example.bookstore.Book',
          attributes: {
            author: ['urn:author:1'],
            errors: errorsArray,
          },
        },
      });
    });
    assert.ok(
      get(model, 'errors') instanceof ModelErrors,
      "schema's useUnderlyingErrorsValue returns false should return ModelsError object instance"
    );
  });

  test('schema with no flag property returns Errors object instance', function (assert) {
    this.owner.register('service:m3-schema', TestSchemaNoOverride);

    let model = run(() => {
      return this.store.push({
        data: {
          id: 'urn:book:1',
          type: 'com.example.bookstore.Book',
          attributes: {
            author: ['urn:author:1'],
            errors: errorsArray,
          },
        },
      });
    });
    assert.ok(
      get(model, 'errors') instanceof ModelErrors,
      "schema's default useUnderlyingErrorsValue return value should return ModelsError object instance"
    );
  });
});
