import Ember from 'ember';

export default Ember.Route.extend({
  init(...args) {
    this._super(...args);
    this.invocation = 0;
  },

  model() {
    return this.store.queryRecord('com.linkedin.voyager.collection', {});
  },

  actions: {
    updateData() {
      let first = this.modelFor('index').get('elements')[0];
      let attributes = JSON.parse(JSON.stringify(first.debugJSON()));

      if (this.invocation++ === 0) {
        attributes.permalink = 'update data';
      } else {
        attributes.permalink = Math.random();
      }

      this.store.pushPayload('com.linkedin.voyager.badger', {
        data: {
          attributes,
          id: first.id,
          type: 'com.linkedin.voyager.appleface' }
      });

      let firstComment = first.get('socialDetail.comments.elements')[0];
      let firstCommentAttributes = JSON.parse(JSON.stringify(firstComment.debugJSON()));
      firstCommentAttributes.comment.values[0].value = `INTERRUPT MESSAGE [${Math.random()}]`

      this.store.pushPayload('com.linkedin.voyager.definitely_not_a_potato', {
        data: {
          attributes: firstCommentAttributes,
          id: firstComment.id,
          type: 'com.linkedin.voyager.potato',
        }
      });
    }
  }
});
