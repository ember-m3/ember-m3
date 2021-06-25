import Route from '@ember/routing/route';
import { action } from '@ember/object';
import generateSampleData from '../models/sample-data';

export default class Materializing extends Route {
  model() {
    performance.mark('start-loading');
    for (let i = 0; i < 10000; i++) {
      this.store.pushPayload(
        'com.example.bookstore.search-results',
        generateSampleData(i)
      );
    }
    performance.mark('pushed-payload');
    let records = this.store.peekAll('com.example.bookstore.search-results');
    // Make sure we materialize some of the nested models and references
    records.forEach((r) => {
      r.get('results').forEach((book) => {
        book.get('author.name');
      });
    });
  }

  @action
  didTransition() {
    performance.mark('end-loading');
  }
}
