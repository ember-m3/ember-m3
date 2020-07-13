import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';
import DefaultSchema from 'ember-m3/services/m3-schema';

let computeNestedModel = function computeNestedModel(key, value) {
  if (Array.isArray(value)) {
    return null;
  }

  if (value !== null && typeof value === 'object') {
    return { id: key, type: value.type, attributes: value };
  }
};

class TestSchemaOldHooks extends DefaultSchema {
  includesModel() {
    return true;
  }

  computeNestedModel(key, value, modelName, schemaInterface) {
    return computeNestedModel(key, value, modelName, schemaInterface);
  }

  computeBaseModelName(modelName) {
    return ['com.bookstore.projected-book', 'com.bookstore.excerpt-book'].includes(modelName)
      ? 'com.bookstore.book'
      : null;
  }
}

class TestSchema extends DefaultSchema {
  includesModel() {
    return true;
  }

  computeAttribute(key, value, modelName, schemaInterface) {
    if (Array.isArray(value)) {
      let nested = value.map(v => {
        if (typeof v === 'object') {
          return schemaInterface.nested(computeNestedModel(key, v, modelName, schemaInterface));
        } else {
          return v;
        }
      });
      return schemaInterface.managedArray(nested);
    } else {
      let nested = computeNestedModel(key, value, modelName, schemaInterface);
      if (nested) {
        return schemaInterface.nested(nested);
      }
    }
  }

  computeBaseModelName(modelName) {
    return ['com.bookstore.projected-book', 'com.bookstore.excerpt-book'].includes(modelName)
      ? 'com.bookstore.book'
      : null;
  }
}

for (let testRun = 0; testRun < 2; testRun++) {
  module(
    `unit/model/projections/changed-attrss  ${
      testRun === 0 ? 'old hooks' : 'with computeAttribute'
    }`,
    function(hooks) {
      setupTest(hooks);

      hooks.beforeEach(function() {
        this.store = this.owner.lookup('service:store');

        if (testRun === 0) {
          this.owner.register('service:m3-schema', TestSchemaOldHooks);
        } else if (testRun === 1) {
          this.owner.register('service:m3-schema', TestSchema);
        }
      });

      test('setting a dirty nested model (on projection) to null has correct changed attrs', function(assert) {
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

        let projectedRecord = this.store.peekRecord('com.bookstore.ProjectedBook', 'urn:book:1');

        assert.equal(
          projectedRecord.get('randomChapter.position'),
          2,
          'read randomChapter.position (nested record)'
        );
        assert.equal(
          projectedRecord.get('randomChapter.title'),
          'Not actually a chapter in this book',
          'read randomChapter.title (nested record)'
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

      test('resetting a property on parent model while nested model is dirty keeps parent model dirty', function(assert) {
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
          ],
        });

        let record = this.store.peekRecord('com.bookstore.Book', 'urn:book:1');

        assert.equal(
          record.get('randomChapter.title'),
          'Not actually a chapter in this book',
          'read randomChapter.title (nested record)'
        );

        record.set('title', 'something');
        record.get('randomChapter').set('position', 3);
        record.set('title', 'A History of the English Speaking Peoples Vol I');
        assert.equal(record.get('isDirty'), true, 'record is still dirty');
        record.get('randomChapter').set('position', 2);
        assert.equal(
          record.get('isDirty'),
          false,
          'record is not dirty after nested record becomes clean'
        );
      });

      test('Can set a many embedded property to a semi resolved array containing a mix of pojos and megamorphic models - projections', async function(assert) {
        assert.expect(1);

        this.owner.register(
          'adapter:-ember-m3',
          class TestAdapter {
            static create() {
              return new TestAdapter(...arguments);
            }
            updateRecord() {
              assert.ok(true, 'Called updateRecord');
              return Promise.resolve();
            }
          }
        );

        this.store.push({
          data: [
            {
              id: 'urn:book:1',
              type: 'com.bookstore.Book',
              attributes: {
                locations: [
                  {
                    country: 'US',
                    geographicArea: 'California',
                    city: 'San Francisco',
                    postalCode: '94110',
                    description: 'Club house',
                    $type: 'OrganizationAddress',
                    headquarter: true,
                    line1: '1234 Lucky St',
                  },
                ],
              },
            },
            {
              id: 'urn:book:1',
              type: 'com.bookstore.ProjectedBook',
              locations: [
                {
                  country: 'US',
                  geographicArea: 'California',
                  city: 'San Francisco',
                  postalCode: '94110',
                  description: 'Club house',
                  $type: 'OrganizationAddress',
                  headquarter: true,
                  line1: '1234 Lucky St',
                },
              ],
            },
          ],
        });

        let record = this.store.peekRecord('com.bookstore.ProjectedBook', 'urn:book:1');
        const currentCollection = record.get('locations').slice();
        const aNewLocation = {
          country: 'MX',
          geographicArea: 'California',
          city: 'Ensenada',
          postalCode: '22810',
          description: 'Home',
          $type: 'OrganizationAddress',
          headquarter: true,
          line1: '555 Main St.',
        };

        record.set('locations', currentCollection.concat(aNewLocation));
        // Saving relies on correctly setup nested record datas
        await record.save();
      });
    }
  );
}
