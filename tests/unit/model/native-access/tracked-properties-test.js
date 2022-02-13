import { test, module } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import DefaultSchema from 'ember-m3/services/m3-schema';
import { CUSTOM_MODEL_CLASS } from 'ember-m3/-infra/features';
import HAS_NATIVE_PROXY from 'ember-m3/utils/has-native-proxy';
import Component from '@glimmer/component';
import hbs from 'htmlbars-inline-precompile';
import { render, settled } from '@ember/test-helpers';

if (CUSTOM_MODEL_CLASS && HAS_NATIVE_PROXY) {
  class TestSchema extends DefaultSchema {
    includesModel(modelName) {
      return /^com.example.bookstore\./i.test(modelName);
    }
    setAttribute(modelName, attr, value, schemaInterface) {
      schemaInterface.setAttr(attr, value);
    }
    useNativeProperties() {
      return true;
    }
  }

  module('unit/model/native-access/tracked-properties', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
      this.store = this.owner.lookup('service:store');
    });

    test('Component getters which depend on m3 native properties update correctly', async function (assert) {
      this.owner.register('service:m3-schema', TestSchema);
      this.owner.register(
        'template:components/show-book',
        hbs`<h1 class="title">{{this.formattedTitle}}</h1>
    `
      );

      this.owner.register(
        'component:show-book',
        class ShowBookComponent extends Component {
          constructor() {
            super(...arguments);
          }
          get formattedTitle() {
            return `Title: ${this.args.model.title}`;
          }
        }
      );

      this.store.push({
        data: {
          id: 'urn:li:book:1',
          type: 'com.example.bookstore.Book',
          attributes: {
            title: 'How to Win Friends and Influence People',
          },
        },
      });

      let book = (this.book = this.store.peekRecord('com.example.bookstore.Book', 'urn:li:book:1'));
      await render(hbs`
        {{show-book model=this.book}}
      `);

      let renderedTitle = this.element.querySelector('.title').innerText;
      assert.equal(
        renderedTitle,
        'Title: How to Win Friends and Influence People',
        'component is rendered correctly'
      );
      book.title = 'New title';
      await settled();

      renderedTitle = this.element.querySelector('.title').innerText;
      assert.equal(renderedTitle, 'Title: New title', 'component is updated correctly');
    });

    test('Template getters which depend on m3 native properties update correctly', async function (assert) {
      this.owner.register('service:m3-schema', TestSchema);
      this.owner.register(
        'template:components/show-book',
        hbs`<h1 class="title">{{@model.title}}</h1>
    `
      );

      this.store.push({
        data: {
          id: 'urn:li:book:1',
          type: 'com.example.bookstore.Book',
          attributes: {
            title: 'How to Win Friends and Influence People',
          },
        },
      });

      let book = (this.book = this.store.peekRecord('com.example.bookstore.Book', 'urn:li:book:1'));
      await render(hbs`
        {{show-book model=this.book}}
      `);

      let renderedTitle = this.element.querySelector('.title').innerText;
      assert.equal(
        renderedTitle,
        'How to Win Friends and Influence People',
        'template is rendered correctly'
      );
      book.title = 'New title';
      await settled();

      renderedTitle = this.element.querySelector('.title').innerText;
      assert.equal(renderedTitle, 'New title', 'template is updated correctly');
    });

    test('Component getters which depend on m3 native properties update across nested models correctly', async function (assert) {
      this.owner.register('service:m3-schema', TestSchema);
      this.owner.register(
        'template:components/show-book',
        hbs`<h1 class="title">{{this.formattedTitle}}</h1>
  `
      );
      class NestedSchema extends TestSchema {
        computeAttribute(key, value, modelName, schemaInterface) {
          if (key === 'chapter') {
            return schemaInterface.nested({
              attributes: value,
            });
          }
          return value;
        }
      }

      this.owner.register('service:m3-schema', NestedSchema);

      this.owner.register(
        'component:show-book',
        class ShowBookComponent extends Component {
          constructor() {
            super(...arguments);
          }
          get formattedTitle() {
            return `Title: ${this.args.model.chapter.title}`;
          }
        }
      );

      this.store.push({
        data: {
          id: 'urn:li:book:1',
          type: 'com.example.bookstore.Book',
          attributes: {
            chapter: {
              title: 'How to Win Friends and Influence People',
            },
          },
        },
      });

      let book = (this.book = this.store.peekRecord('com.example.bookstore.Book', 'urn:li:book:1'));
      await render(hbs`
        {{show-book model=this.book}}
      `);

      let renderedTitle = this.element.querySelector('.title').innerText;
      assert.equal(
        renderedTitle,
        'Title: How to Win Friends and Influence People',
        'component is rendered correctly'
      );
      book.chapter.title = 'New title';
      await settled();

      renderedTitle = this.element.querySelector('.title').innerText;
      assert.equal(renderedTitle, 'Title: New title', 'component is updated correctly');
    });
  });
}
