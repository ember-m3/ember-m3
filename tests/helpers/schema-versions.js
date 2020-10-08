import DefaultSchema from 'ember-m3/services/m3-schema';

function computeAttributeCompat(v2Schema, key, value, modelName, schemaInterface, isReference) {
  let targets = [];
  let arrayTarget;

  let identity = (x) => x;
  let addTarget = (x) => {
    targets.push(x);
    return x;
  };
  let managedArray = (array) => {
    if (array.length > 0 && array.every((x) => targets.includes(x))) {
      arrayTarget = array;
    }
    return array;
  };
  let compatSchemaInterface = new Proxy(schemaInterface, {
    get(object, property) {
      switch (property) {
        case 'nested':
          return isReference ? identity : addTarget;
        case 'reference':
          return isReference ? addTarget : identity;
        case 'managedArray':
          return managedArray;
        default:
          return object[property];
      }
    },
  });

  let result = v2Schema.computeAttribute(key, value, modelName, compatSchemaInterface);
  if (result === arrayTarget) {
    return arrayTarget;
  } else if (targets.includes(result)) {
    return result;
  }
}

export default function* schemaVersions(SchemaV2) {
  class SchemaV1 extends DefaultSchema {
    init(...args) {
      super.init(...args);
      this._v2Schema = SchemaV2.create(...args);
    }

    get models() {
      return this._v2Schema.models;
    }

    includesModel(name) {
      return this._v2Schema.includesModel(name);
    }

    computeAttributeReference(key, value, modelName, schemaInterface) {
      return computeAttributeCompat(this._v2Schema, key, value, modelName, schemaInterface, true);
    }

    computeNestedModel(key, value, modelName, schemaInterface) {
      return computeAttributeCompat(this._v2Schema, key, value, modelName, schemaInterface, false);
    }

    computeBaseModelName(modelName) {
      return this._v2Schema.computeBaseModelName(modelName);
    }
  }

  yield {
    name: 'v1 (computeAttriuteReference, computeNestedModel)',
    schemaClass: SchemaV1,
  };

  yield {
    name: 'v2 (computeAttribute)',
    schemaClass: SchemaV2,
  };
}
