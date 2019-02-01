import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';
import DefaultSchema from 'ember-m3/services/m3-schema';
import MegamorphicModel from 'ember-m3/model';
import { gte } from 'ember-compatibility-helpers';

module('unit/model/projections/changed-attrs', function(hooks) {
  setupTest(hooks);

  hooks.beforeEach(function() {
    this.store = this.owner.lookup('service:store');

    this.owner.register(
      'service:m3-schema',
      class TestSchema extends DefaultSchema {
        includesModel() {
          return true;
        }

        computeNestedModel(key, value) {
          if (value !== null && typeof value === 'object') {
            return { id: key, type: value.type, attributes: value };
          }
        }

        computeBaseModelName(modelName) {
          return ['com.bookstore.projected-book', 'com.bookstore.excerpt-book'].includes(modelName)
            ? 'com.bookstore.book'
            : null;
        }
      }
    );
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

  test('Can set a many embedded property to a semi resolved array containing a mix of pojos and megamorphic models - projections', async function(assert) {
    if (gte('3.0.0')) {
      assert.expect(4);
    } else {
      assert.expect(3);
    }
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
    this.owner.register(
      'service:m3-schema',
      class TestSchema extends DefaultSchema {
        includesModel() {
          return true;
        }

        computeNestedModel(key, value) {
          assert.ok(
            !(value instanceof MegamorphicModel),
            "We don't pass Megamorphic Models to computeNestedModel"
          );
          let attributesType = value && value.$type;
          if (value !== null && typeof value === 'object') {
            return { id: key, type: attributesType, attributes: value };
          }
        }

        computeBaseModelName(modelName) {
          return ['com.bookstore.projected-book', 'com.bookstore.excerpt-book'].includes(modelName)
            ? 'com.bookstore.book'
            : null;
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
});
