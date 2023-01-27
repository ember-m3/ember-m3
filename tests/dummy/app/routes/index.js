import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';

export default class extends Route {
  invocation = 0;

  @service store;

  model() {
    return this.store.queryURL('/api0.json');
  }

  @action
  updateData() {
    let vol = this.invocation++ === 0 ? 'I' : Math.random();

    this.store.pushPayload('com.example.bookstore.book', {
      data: {
        id: 'isbn:9780760768570',
        type: 'com.example.bookstore.Book',
        attributes: {
          $type: 'com.example.bookstore.Book',
          name: `Vol ${vol}. The Birth of Britain`,
          author: 'urn:author:1',
          pubDate: 'April 2005',
          readerComments: ['urn:comment:1', 'urn:comment:2'],
        },
      },
    });
  }

  @action
  updateArray() {
    this.store.pushPayload('com.example.bookstore.ReaderComment', {
      data: {
        id: 'urn:comment:3',
        type: 'com.example.bookstore.ReaderComment',
        attributes: {
          commenter: {
            $type: 'com.example.bookstore.Commenter',
            name: 'Definitely a Different User',
            favouriteBook: 'isbn:9780760768570',
          },
          parts: [
            {
              value: 'I really enjoyed this book',
            },
            {
              value: `quite a lot ([${Math.random()}])`,
            },
            {
              value: 'although my favourite is still Volume Ⅰ.',
            },
          ],
        },
      },
    });
  }
}
