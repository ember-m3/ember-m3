import Route from '@ember/routing/route';
import { action } from '@ember/object';
import generateSampleData from '../models/sample-data';

export default class Rendering extends Route {
  model() {
    let sampleData = [...Array(100)].map((e, i) => generateSampleData(i));

    performance.mark('start-loading');
    for (let i = 0; i < 100; i++) {
      this.store.pushPayload(
        'com.example.bookstore.search-results',
        sampleData[i]
      );
    }
    performance.mark('pushed-payload');
    return this.store.peekAll('com.example.bookstore.search-results');
  }

  @action
  didTransition() {
    performance.mark('end-loading');
  }
}
