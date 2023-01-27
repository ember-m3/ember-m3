import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render } from '@ember/test-helpers';
import hbs from 'htmlbars-inline-precompile';
import DefaultSchema from 'ember-m3/services/m3-schema';
import Component from '@ember/component';
import { run } from '@ember/runloop';

module('integration/model-invalidation-render', function (hooks) {
  setupRenderingTest(hooks);

  hooks.beforeEach(function () {
    this.owner.register(
      'service:m3-schema',
      class TestSchema extends DefaultSchema {
        includesModel(modelName) {
          return /^com\.example\./.test(modelName);
        }
      }
    );
    this.store = this.owner.lookup('service:store');

    let ctx = this;
    this.renderCount = 0;
    this.owner.register(
      'component:show-bookstore',
      Component.extend({
        layout: hbs`
        Name: <span class=name>{{this.bookstore.name}}</span>
      `,
        didRender() {
          ++ctx.renderCount;
        },
      })
    );
  });

  test('setting properties does not dirty the entire model', async function (assert) {
    this.store.pushPayload('com.example.Bookstore', {
      data: {
        id: 'urn:bookstore:1',
        type: 'com.example.Bookstore',
        attributes: {
          name: "Books 'n stuff",
          customers: 0,
        },
      },
    });

    let bookstore = (this.bookstore = this.store.peekRecord(
      'com.example.bookstore',
      'urn:bookstore:1'
    ));
    await render(hbs`
      {{show-bookstore bookstore=this.bookstore}}
      <br>
      Customers: <span class=customers>{{this.bookstore.customers}}</span>
    `);

    let renderedName = this.element.querySelector('.name').innerText;
    let renderedCustomerCount = this.element.querySelector('.customers').innerText;
    assert.equal(renderedName, "Books 'n stuff", 'component is rendered correctly');
    assert.equal(renderedCustomerCount, '0', 'outer property rendered correctyl');
    assert.equal(this.renderCount, 1, 'initial render');

    run(() => bookstore.incrementProperty('customers'));

    renderedName = this.element.querySelector('.name').innerText;
    renderedCustomerCount = this.element.querySelector('.customers').innerText;
    assert.equal(renderedName, "Books 'n stuff", 'component is rendered correctly');
    assert.equal(renderedCustomerCount, '1', 'outer property rendered correctyl');
    assert.equal(this.renderCount, 1, 'rerender succeeds and does not dirty the model');
  });
});
