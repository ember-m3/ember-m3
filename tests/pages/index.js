import { visit } from '@ember/test-helpers';

class PageObject {
  constructor({ scope }) {
    if (typeof scope === 'string') {
      this.scope = document.querySelector(scope);
    } else {
      this.scope = scope;
    }
  }

  querySelector(selector) {
    return this.scope.querySelector(selector);
  }

  querySelectorAll(selector) {
    return Array.from(this.scope.querySelectorAll(selector));
  }
}

class CommentOnPage extends PageObject {
  body() {
    let commentBody = this.querySelector('.comment-body');

    return commentBody === null
      ? ''
      : commentBody.innerText.replace(/\s+/g, ' ').replace(/^\s*/, '').replace(/\s*$/, '');
  }

  parts() {
    return this.querySelectorAll('.comment-parts li').map((x) =>
      x.innerText.replace(/\s+/g, ' ').replace(/^\s*/, '').replace(/\s*$/, '')
    );
  }
}

class BookOnPage extends PageObject {
  id() {
    return this.querySelector('.id')
      .innerText.replace(/\s+/g, ' ')
      .replace(/^\s*/, '')
      .replace(/\s*$/, '');
  }

  name() {
    return this.querySelector('.name')
      .innerText.replace(/\s+/g, ' ')
      .replace(/^\s*/, '')
      .replace(/\s*$/, '');
  }

  authorName() {
    return this.querySelector('.author')
      .innerText.replace(/\s+/g, ' ')
      .replace(/^\s*/, '')
      .replace(/\s*$/, '');
  }

  pubMonth() {
    return parseInt(this.querySelector('.pubmonth').innerText, 10);
  }

  comments() {
    return this.querySelectorAll('ul.comments > li').map((x) => new CommentOnPage({ scope: x }));
  }
}

export default class IndexPage extends PageObject {
  constructor() {
    super({
      scope: '.ember-application',
    });
  }

  visit() {
    return visit('/');
  }

  books() {
    return this.querySelectorAll('ul.books > li').map((x) => new BookOnPage({ scope: x }));
  }
}
