import Route from '@ember/routing/route';
import { action } from '@ember/object';
import generateSampleData from '../models/sample-data';

const iterations = 12000;

export default class Materializing extends Route {
  model() {
    let sampleData = [...Array(iterations)].map((e, i) =>
      generateSampleData(i)
    );
    performance.mark('start-loading');
    for (let i = 0; i < iterations; i++) {
      this.store.pushPayload(
        'com.example.bookstore.search-results',
        sampleData[i]
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
