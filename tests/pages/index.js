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

class SocialDetailOnPage extends PageObject {
  id() {
    return this.$('> ul > li > .social-detail-id').text();
  }
}

class CommentOnPage extends PageObject {
  value() {
    return this.$('.comment-body').
      text().
      replace(/\s+/g, ' ').
      replace(/^\s*/, '').
      replace(/\s*$/, '');
  }
}

class FeedUpdateOnPage extends PageObject {
  id() {
    return this.$('.id').text();
  }

  permalink() {
    return this.$('.permalink').text();
  }

  socialDetail() {
    return new SocialDetailOnPage(this);
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


  feedUpdates() {
    return this.$('ul.feed-updates > li').
      toArray().
      map(x => new FeedUpdateOnPage({ scope: x }));
  }
}
