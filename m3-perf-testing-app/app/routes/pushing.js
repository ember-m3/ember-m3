import Route from '@ember/routing/route';
import { action } from '@ember/object';

function  generateSampleData(iteration) {
  return {
  "data": {
    "id": `${iteration}-search-result-0`,
    "type": "com.example.bookstore.SearchResults",
    "attributes": {
      "results": [
        `${iteration}-isbn:9780760768570`,
        `${iteration}-isbn:9780760768587`,
        `${iteration}-isbn:9780760768594`,
        `${iteration}-isbn:9780297609568`
      ]
    }
  },
  "included": [
    {
      "id": `${iteration}-isbn:9780760768570`,
      "type": "com.example.bookstore.Book",
      "attributes": {
        "author": `${iteration}-urn:author:1`,
        "name": "The Birth of Britain",
        "pubDate": "April 2005",
        "readerComments": [`${iteration}-urn:comment:1`, `${iteration}-urn:comment:2`]
      }
    },
    {
      "id": `${iteration}-isbn:9780760768587`,
      "type": "com.example.bookstore.Book",
      "attributes": {
        "author": `${iteration}-urn:author:1`,
        "name": "The New World",
        "pubDate": "April 2005",
        "readerComments": []
      }
    },
    {
      "id": `${iteration}-isbn:9780760768594`,
      "type": "com.example.bookstore.Book",
      "attributes": {
        "author": `${iteration}-urn:author:1`,
        "name": "The Age of Revolution",
        "pubDate": "April 2005",
        "readerComments": [`${iteration}-urn:comment:3`, `${iteration}-urn:comment:4`]
      }
    },
    {
      "id": `${iteration}-isbn:9780297609568`,
      "type": "com.example.bookstore.Book",
      "attributes": {
        "author": `${iteration}-urn:author:1`,
        "name": "The Great Democracies",
        "pubDate": "April 2005",
        "readerComments": []
      }
    },
    {
      "id": `${iteration}-urn:author:1`,
      "type": "com.example.bookstore.Author",
      "attributes": {
        "name": "Winston Churchill"
      }
    },
    {
      "id": `${iteration}-urn:comment:1`,
      "type": "com.example.bookstore.ReaderComment",
      "attributes": {
        "commenter": {
          "$type": "com.example.bookstore.Commenter",
          "name": "Some User",
          "favouriteBook": `${iteration}-isbn:9780760768587`
        },
        "body": "This book is great"
      }
    },
    {
      "id": `${iteration}-urn:comment:2`,
      "type": "com.example.bookstore.ReaderComment",
      "attributes": {
        "commenter": {
          "$type": "com.example.bookstore.Commenter",
          "name": "Some Other User"
        },
        "body": "I agree"
      }
    },
    {
      "id": `${iteration}-urn:comment:3`,
      "type": "com.example.bookstore.ReaderComment",
      "attributes": {
        "commenter": {
          "$type": "com.example.bookstore.Commenter",
          "name": "Definitely a Different User",
          "favouriteBook": `${iteration}-isbn:9780760768570`
        },
        "parts": [
          {
            "value": "Really enjoyed this book"
          },
          {
            "value": "A lot"
          }
        ]
      }
    },
    {
      "id": `${iteration}-urn:comment:4`,
      "type": "com.example.bookstore.ReaderComment",
      "attributes": {
        "commenter": {
          "$type": "com.example.bookstore.Commenter",
          "name": "Definitely a Different User"
        },
        "body": "Yup"
      }
    }
  ]
}
}



export default Route.extend({
  model() {
    performance.mark('start-loading');
    for (let i = 0; i < 100; i++) {
      this.store.pushPayload('com.example.bookstore.search-results',generateSampleData(i));
    }
    performance.mark('pushed-payload');
    return this.store.peekAll('com.example.bookstore.search-results');
  },

  @action
  didTransition() {
    performance.mark('end-loading');
  }
});