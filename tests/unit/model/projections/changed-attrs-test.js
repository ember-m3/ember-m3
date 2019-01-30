import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';
import DefaultSchema from 'ember-m3/services/m3-schema';

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

  test('REGRESSION = nested models can report their own changed attributes', function(assert) {
    this.store.push({
      data: [
        {
          id: 'urn:book:1',
          type: 'com.bookstore.Book',
          attributes: {
            dummyCollection: [
              {
                country: 'US',
                geographicArea: 'California',
                city: 'San Francisco',
                postalCode: '94110',
                description: 'Club house',
                $type: 'com.linkedin.voyager.organization.OrganizationAddress',
                headquarter: true,
                line1: '1234 Lucky St',
              },
            ],
          },
        },
        {
          id: 'urn:book:1',
          type: 'com.bookstore.ProjectedBook',
          dummyCollection: [
            {
              country: 'US',
              geographicArea: 'California',
              city: 'San Francisco',
              postalCode: '94110',
              description: 'Club house',
              $type: 'com.linkedin.voyager.organization.OrganizationAddress',
              headquarter: true,
              line1: '1234 Lucky St',
            },
          ],
        },
      ],
    });

    let model = this.store.peekRecord('com.bookstore.ProjectedBook', 'urn:book:1');

    const currentCollection = model.get('dummyCollection').slice();
    const aNewLocation = {
      country: 'MX',
      geographicArea: 'California',
      city: 'Ensenada',
      postalCode: '22810',
      description: 'Home',
      $type: 'com.linkedin.voyager.organization.OrganizationAddress',
      headquarter: true,
      line1: '555 Main St.',
    };
    model.set('dummyCollection', currentCollection.concat(aNewLocation));
    model.get('dummyCollection');
    assert.deepEqual(model.changedAttributes(), {
      dummyCollection: [[], []],
    });
  });
});
