class PageObject {
  constructor({ scope }) {
    this.scope = scope;
  }

  $(...args) {
    if (args.length > 0) {
      return self.jQuery(this.scope).find(...args);
    } else {
      return self.jQuery(this.scope);
    }
  }
}

class CommentOnPage extends PageObject {
  body() {
    return this.$('.comment-body').
      text().
      replace(/\s+/g, ' ').
      replace(/^\s*/, '').
      replace(/\s*$/, '');
  }

  parts() {
    return this.$('.comment-parts li').
      map((x,y) => self.jQuery(y).text()).
      toArray().
      map(x =>
        x.replace(/\s+/g, ' ').
        replace(/^\s*/, '').
        replace(/\s*$/, '')
      );
  }
}

class BookOnPage extends PageObject {
  id() {
    return this.$('.id').text();
  }

  name() {
    return this.$('.name').text();
  }

  authorName() {
    return this.$('.author').text();
  }

  pubMonth() {
    return parseInt(this.$('.pubmonth').text(), 10);
  }

  comments() {
    return this.$('ul.comments > li').
      toArray().
      map(x => new CommentOnPage({ scope: x }));
  }
}

export default class IndexPage extends PageObject {
  constructor() {
    super({
      scope: '.ember-application',
    });
  }

  visit() {
    visit('/');
  }


  books() {
    return this.$('ul.books > li').
      toArray().
      map(x => new BookOnPage({ scope: x }));
  }
}
