These are notes re the intimate API that would need to become public for a
non-private swappable model class.

# Klass

## Impl (schema.x(?))

  - inverseFor(modelName, relationshipName) 
    we'll need to look carefully at the thing this returns

## Maybe?

  - toString

## Drop

  - modelName DROP (this is already bad)
  - SET modelName
  - SET inverseFor
  - SET findInverseFor

# All things

    /**
      @module ember-data
    
      KLASS interface
      SET [
      "toString",
      "modelName",
      "findInverseFor",
      "inverseFor",
    ]
    
      GET [
      "isNamespace",
      "hasOwnProperty",
      "detect",
      "detectInstance",
      "reopenClass",
      "ClassMixin",
      "willMergeMixin",
      "concatenatedProperties",
      "mergedProperties",
      "toString",
      "didDefineProperty",
      "extend",
      "reopen",
      "willReopen",
      "PrototypeMixin",
    
      "_onLookup",
    
      "proto",
      "prototype",
    
      "valueOf",
      "create",
      "_initProperties",
    
      // polymorphic stuff
      "class",
      "superclass",
    
      "isModel",
      "modelName",
    
      "attributes",
      // used to detect attr + relationships
      "eachComputedProperty",
      "_computedProperties",
      "relationshipsByName",
      "eachAttribute",
      "eachRelationship",
      "eachTransformedAttribute",
      "transformedAttributes",
    
      "inverseFor",
      "inverseMap",
      "_findInverseFor",
      "typeForRelationship",
      "metaForProperty",
      "relationships",
      "determineRelationshipType",
      "relatedTypes",
      "relationshipNames",
      "eachRelatedType",
      "fields"
    
       // ember detecting if something is an array or not
      "size",
      "length",
    ]
    
      GET_OWN_PROP_DESC [
      "valueOf",
      "toString",
      "__NAME_KEY__ [id=__ember1488409404179231051005748]",
      "superclass",
      "_create"
    
    
      // ED stuff
      "isModel",
      "modelName",
    



      // Instance
        //
      // GET
      "toString",
      "toStringExtension",
      "id",
      "constructor",
      "isDestroyed",
      "currentState",
      "setUnknownProperty",
      "setProperties",
      "_internalModel",
      "trigger",
      "_super",
      "ready",
      "save",
      "eachAttribute",
      "changedAttributes",
      "get",
      "set",
      "setId",
      "isError",
      "adapterError",
      "_notifyProperties",
      "didCreate",
      "didCommit",
      "then",
      "isDescriptor",
      "_createSnapshot",
      "eachRelationship",
      "destroy",
      "willDestroy",
      "_scheduledDestroy",
      "notifyPropertyChange",
      "propertyWillChange",
      "propertyDidChange",
      "didLoad",
      "didUpdate",
      "isSaving",
      "willWatchProperty",
      "hasDirtyAttributes",
      "currentState",
      "errors",
      "becameInvalid",
      "notifyHasManyAdded",
      "notifyBelongsToChanged",
      "isEmpty",
      "deleteRecord",
      "didDelete",
      "reload",
      "isReloading",
      "isLoaded",
      "didUnwatchProperty",
      "getProperties",
      "isNew",
      "didAddListener",
      "unloadRecord",
      "didRemoveListener",
      "valueOf",
      "model",
      "becameError",
      "destroyRecord",
      "addObserver",
      "isDestroying",
      "belongsTo",
      "hasMany",
      "serialize",
      "store",
      "toJSON",
      "rollbackAttributes",
      "hasOwnProperty",
      "inverseFor",
      "relationshipFor",
      "type", ?
      "setInterval",
      "length",
      "wasFetched"
    ]
    
        SET
    [
      "currentState",
      "isReloading",
      "isError",
      "adapterError",
      "superVillian",
      "willDestroy",
      "deleteRecord",
      "foo"
    ]
    
        getOwnPropertyDescriptor:
    
        "currentState", "isNew", "hasDirtyAttributes", "title", "id", "name", "author", "_internalModel"
    *
