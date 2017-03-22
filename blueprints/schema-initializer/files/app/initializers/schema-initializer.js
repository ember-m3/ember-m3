import SchemaManager from 'ember-m3/schema-manager';

export function initialize(/* application */) {
  SchemaManager.registerSchema({

    computeAttributeReference(/* key, value, modelName */) {
      // If the attribute with value `value` under key `key` of `modelName` is
      // a reference to another model, return `{ type, id }`, otherwise return
      // null.
      return null;
    },

    isAttributeArrayReference(/* key, value, modelName */) {
      // If the attribute with value `value` under key `key` of `modelName` is
      // an array of references to models (eg a has-many) return `true` and
      // `false` otherwise.
      return false;
    },

    computeNestedModel(/* key, value, modelName */) {
      // If the attribute with value `value` under key `key` of `modelName`
      // should be treated as a nested model instead of a plain POJO, then
      // return `{ id, type, attributes }`.  Arrays will have this method
      // invoked for each entry in the array, not for the array itself.
      //
      // For example with payload
      //
      // {
      //  id: 1,
      //  type: 'com.example.library.Book',
      //  attributes: {
      //    bestChapter: {
      //      number: 7,
      //      characterPOV: 'urn:character:2',
      //    }
      //  }
      // }
      //
      // In which you want `bestChapter.characterPOV` to resolve to another
      // model (as opposed to the string 'urn:character:2') it is necessary for
      // the attribute `bestChapter` to be treated as a nested model and not
      // merely as a POJO.
      //
      // To have the attribute treated as a POJO return null.
      //
      return null;
    },

    includesModel(/* modelName */) {
      // Return true if modelName should be provided by a MegamorphicModel,
      // false if it should be handled via the store default (probably a
      // DS.Model)
      return false;
    },

    /*
    models: {
      'my-model-name': {
        // an optional whitelist of attributes.  If undefined, all attributes
        // returned by the API will be available on the model
        attributes: ['foo', 'bar', 'baz'],

        // an optional list of attribute transforms.  Use this if your API
        // returns values whose types can't be encoded in JSON, such as dates.
        // Each key is the name of an attribute as it appears in the payload,
        // and each value is a function that takes the raw api value and returns
        // the transformed value
        transforms: {
          dateAttr: function dateTransform(dateString) {
            return dateString && new Date(Date.parse(dateString));
          },
        },

        defaults: {
          tag: 'span',
        },

        aliases: {
          fullName: 'person.name',
        },
      }
    }
    */
  });
}

export default {
  name: 'm3-schema-initializer',
  initialize
};
