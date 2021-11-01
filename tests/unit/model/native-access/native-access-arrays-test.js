import sinon from 'sinon';
import { get } from '@ember/object';
import { run } from '@ember/runloop';
import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';
import DefaultSchema from 'ember-m3/services/m3-schema';
import { CUSTOM_MODEL_CLASS } from 'ember-m3/-infra/features';
import HAS_NATIVE_PROXY from 'ember-m3/utils/has-native-proxy';

function computeNestedModel(key, value /*, modelName, schemaInterface */) {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return {
      attributes: value,
    };
  }
}

class TestSchema extends DefaultSchema {
  includesModel(modelName) {
    return /^com.example.bookstore\./i.test(modelName);
  }
  computeAttribute(key, value, modelName, schemaInterface) {
    if (Array.isArray(value)) {
      let nested = value.map((v) => {
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
}

if (CUSTOM_MODEL_CLASS && HAS_NATIVE_PROXY) {
  module(`unit/model/native-access/native-access-arrays`, function (hooks) {
    setupTest(hooks);

    hooks.beforeEach(function () {
      this.sinon = sinon.createSandbox();
      this.owner.register('service:m3-schema', TestSchema);
      this.store = this.owner.lookup('service:store');
    });

    test('managed arrays can be accessed using [], and used as native arrays', function (assert) {
      let model = run(() =>
        this.store.push({
          data: {
            id: 'isbn:9780439708180',
            type: 'com.example.bookstore.Book',
            attributes: {
              name: `Harry Potter and the Sorcerer's Stone`,
              chapters: [
                {
                  name: 'The Boy Who Lived',
                },
              ],
            },
          },
        })
      );

      let chapters = model.get('chapters');

      assert.equal(
        chapters[0].get('name'),
        'The Boy Who Lived',
        `chapters's embedded records can resolve values`
      );
      chapters.push({ name: 'The Vanishing Glass' });

      let chapter2 = chapters[1];
      assert.equal(chapter2.constructor.isModel, true, 'new values can be resolved via push');
      assert.equal(
        get(chapter2, 'name'),
        'The Vanishing Glass',
        `new values can be resolved via push`
      );
      let spreadChapters = [...chapters, { name: 'plain object' }];
      assert.equal(
        spreadChapters[0].get('name'),
        'The Boy Who Lived',
        `can use the spread operator with managed arrays`
      );
      assert.equal(
        chapters.some((el) => el.get('name') === 'The Boy Who Lived'),
        true,
        'array.some() is implemented'
      );
      chapters.sort((first, second) => (first.get('name') < second.get('name') ? 1 : -1));
      assert.equal(chapters[0].get('name'), 'The Vanishing Glass', `Array.sort is implemented`);

      let slicedChapters = chapters.slice(1);
      assert.equal(slicedChapters[0].get('name'), 'The Boy Who Lived', `Array.slice still works`);
      assert.notEqual(slicedChapters, chapters, `Array.slice still works`);

      let toReverse = chapters.slice();
      toReverse.reverse();
      assert.equal(toReverse[0].get('name'), 'The Boy Who Lived', `Array.reverse works`);
      assert.equal(toReverse[1].get('name'), 'The Vanishing Glass', `Array.reverse works`);

      assert.equal(
        chapters.reduce((acc, item) => acc + ' and ' + item.get('name'), ''),
        ' and The Vanishing Glass and The Boy Who Lived',
        'Array.reduce still works'
      );
      assert.equal(
        chapters.reduceRight((acc, item) => acc + ' and ' + item.get('name'), ''),
        ' and The Boy Who Lived and The Vanishing Glass',
        'Array.reduceRight works'
      );

      assert.equal(
        chapters.join(' '),
        '<EmbeddedMegamorphicModel:undefined> <EmbeddedMegamorphicModel:undefined>',
        `Array.join works`
      );

      if ([].at) {
        assert.equal(chapters.at(-1).get('name'), 'The Boy Who Lived', `Array.at is implemented`);
      }

      let concatedChapters = chapters.concat([{ name: 'plain object' }]);
      assert.equal(concatedChapters.length, 3, 'Array.concat works');
      assert.equal(chapters.length, 2, 'Array.concat does not modify the original array');
      assert.equal(concatedChapters[2].name, 'plain object', 'Array.concat works');

      assert.equal(
        chapters.findIndex((ch) => ch.get('name') === 'The Boy Who Lived'),
        1,
        'Array.findIndex works'
      );

      let valuesIterator = chapters.values();
      let agg = '';
      for (const value of valuesIterator) {
        agg += value.get('name');
      }
      assert.equal(agg, 'The Vanishing GlassThe Boy Who Lived', 'Array.values works');

      let keysIterator = chapters.keys();
      agg = '';
      for (const value of keysIterator) {
        agg += `${value} `;
      }
      assert.equal(agg, '0 1 ', 'Array.keys works');

      let entriesIterator = chapters.entries();
      agg = '';
      for (const [key, value] of entriesIterator) {
        agg += `${key}: ${value.get('name')},`;
      }
      assert.equal(agg, '0: The Vanishing Glass,1: The Boy Who Lived,', 'Array.entries works');

      let chaptersToCopyWithin = chapters.slice();
      chaptersToCopyWithin.copyWithin(0, 1, 2);
      assert.equal(chaptersToCopyWithin[0], chaptersToCopyWithin[1], 'Array.copyWithin works');

      chapters[1] = { name: 'Direct set' };
      assert.equal(chapters[1].get('name'), 'Direct set', 'Can set using []');

      chapters.fill({ name: 'Another name' });
      assert.equal(chapters[0].get('name'), 'Another name', 'Array.fill works');
    });

    test('managed arrays can be shifted and unshifted', function (assert) {
      let model = this.store.push({
        data: {
          id: 'isbn:9780439708180',
          type: 'com.example.bookstore.Book',
          attributes: {
            name: `Harry Potter and the Sorcerer's Stone`,
            chapters: [
              { name: 'Prologue' },
              {
                name: 'The Boy Who Lived',
              },
            ],
          },
        },
      });

      let chapters = model.get('chapters');

      let shiftedChapter = chapters.shift();

      assert.equal(chapters[0].get('name'), 'The Boy Who Lived', `Array.shift works`);
      assert.equal(chapters.length, 1, `Array.shift works`);

      chapters.unshift(shiftedChapter);
      assert.equal(chapters[0].get('name'), 'Prologue', `Array.unshift works`);
      assert.equal(chapters.length, 2, `Array.unshift works`);
    });
  });
}
