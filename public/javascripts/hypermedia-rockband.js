(function() {
  /**
 * Require the given path.
 *
 * @param {String} path
 * @return {Object} exports
 * @api public
 */
    function require(path, parent, orig) {
    var resolved = require.resolve(path);
    // lookup failed
    if (null == resolved) {
      orig = orig || path;
      parent = parent || "root";
      var err = new Error('Failed to require "' + orig + '" from "' + parent + '"');
      err.path = orig;
      err.parent = parent;
      err.require = true;
      throw err;
    }
    var module = require.modules[resolved];
    // perform real require()
    // by invoking the module's
    // registered function
    if (!module._resolving && !module.exports) {
      var mod = {};
      mod.exports = {};
      mod.client = mod.component = true;
      module._resolving = true;
      module.call(this, mod.exports, require, mod);
      delete module._resolving;
      module.exports = mod.exports;
    }
    return module.exports;
  }

  /**
 * Registered modules.
 */
  require.modules = {};

  /**
 * Registered aliases.
 */
  require.aliases = {};

  /**
 * Resolve `path`.
 *
 * Lookup:
 *
 *   - PATH/index.js
 *   - PATH.js
 *   - PATH
 *
 * @param {String} path
 * @return {String} path or null
 * @api private
 */
  require.resolve = function(path) {
    if (require.modules.hasOwnProperty(path)) return path;
  };

  /**
 * Register module at `path` with callback `definition`.
 *
 * @param {String} path
 * @param {Function} definition
 * @api private
 */
  require.register = function(path, definition) {
    require.modules[path] = definition;
  };
  require.register("backbone-helpers", function(exports, require, module) {
    //     Backbone.js 1.0.0
    //     (c) 2010-2013 Jeremy Ashkenas, DocumentCloud Inc.
    //     Backbone may be freely distributed under the MIT license.
    //     For all details and documentation:
    //     http://backbonejs.org 
    var _ = require("underscore");
    // Helpers
    // -------
    // Helper function to correctly set up the prototype chain, for subclasses.
    // Similar to `goog.inherits`, but uses a hash of prototype properties and
    // class properties to be extended.
    var extend = module.exports.extend = function(protoProps, staticProps) {
      var parent = this;
      var child;
      // The constructor function for the new subclass is either defined by you
      // (the "constructor" property in your `extend` definition), or defaulted
      // by us to simply call the parent's constructor.
      if (protoProps && _.has(protoProps, "constructor")) {
        child = protoProps.constructor;
      } else {
        child = function() {
          return parent.apply(this, arguments);
        };
      }
      // Add static properties to the constructor function, if supplied.
      _.extend(child, parent, staticProps);
      // Set the prototype chain to inherit from `parent`, without calling
      // `parent`'s constructor function.
      var Surrogate = function() {
        this.constructor = child;
      };
      Surrogate.prototype = parent.prototype;
      child.prototype = new Surrogate();
      // Add prototype properties (instance properties) to the subclass,
      // if supplied.
      if (protoProps) _.extend(child.prototype, protoProps);
      // Set a convenience property in case the parent's prototype is needed
      // later.
      child.__super__ = parent.prototype;
      return child;
    };
    var urlError = module.exports.urlError = function() {
      throw new Error('A "url" property or function must be specified');
    };
    // Wrap an optional error callback with a fallback error event.
    var wrapError = module.exports.wrapError = function(model, options) {
      var error = options.error;
      options.error = function(resp) {
        if (error) error(model, resp, options);
        model.trigger("error", model, resp, options);
      };
    };
  })
  require.register("backbone-model", function(exports, require, module) {
    //     Backbone.js 1.0.0
    //     (c) 2010-2013 Jeremy Ashkenas, DocumentCloud Inc.
    //     Backbone may be freely distributed under the MIT license.
    //     For all details and documentation:
    //     http://backbonejs.org
    // Backbone.Model
    // --------------
    // Backbone **Models** are the basic data object in the framework --
    // frequently representing a row in a table in a database on your server.
    // A discrete chunk of data and a bunch of useful, related methods for
    // performing computations and transformations on that data.
    // Create a new model with the specified attributes. A client id (`cid`)
    // is automatically generated and assigned for you.
    var _ = require("underscore");
    var Events = require("backbone-events").Events;
    var urlError = require("backbone-helpers").urlError;
    var wrapError = require("backbone-helpers").wrapError;
    var array = [];
    var push = array.push;
    var slice = array.slice;
    var splice = array.splice;
    var Model = module.exports.Model = function(attributes, options) {
      var attrs = attributes || {};
      options || (options = {});
      this.cid = _.uniqueId("c");
      this.attributes = {};
      if (options.collection) this.collection = options.collection;
      if (options.parse) attrs = this.parse(attrs, options) || {};
      attrs = _.defaults({}, attrs, _.result(this, "defaults"));
      this.set(attrs, options);
      this.changed = {};
      this.initialize.apply(this, arguments);
    };
    // Attach all inheritable methods to the Model prototype.
    _.extend(Model.prototype, Events, {
      // A hash of attributes whose current and previous value differ.
      changed: null,
      // The value returned during the last failed validation.
      validationError: null,
      // The default name for the JSON `id` attribute is `"id"`. MongoDB and
      // CouchDB users may want to set this to `"_id"`.
      idAttribute: "id",
      // Initialize is an empty function by default. Override it with your own
      // initialization logic.
      initialize: function() {},
      // Return a copy of the model's `attributes` object.
      toJSON: function(options) {
        return _.clone(this.attributes);
      },
      sync: function() {
        throw new Error("Sync component not used");
      },
      // Get the value of an attribute.
      get: function(attr) {
        return this.attributes[attr];
      },
      // Get the HTML-escaped value of an attribute.
      escape: function(attr) {
        return _.escape(this.get(attr));
      },
      // Returns `true` if the attribute contains a value that is not null
      // or undefined.
      has: function(attr) {
        return this.get(attr) != null;
      },
      // Set a hash of model attributes on the object, firing `"change"`. This is
      // the core primitive operation of a model, updating the data and notifying
      // anyone who needs to know about the change in state. The heart of the beast.
      set: function(key, val, options) {
        var attr, attrs, unset, changes, silent, changing, prev, current;
        if (key == null) return this;
        // Handle both `"key", value` and `{key: value}` -style arguments.
        if (typeof key === "object") {
          attrs = key;
          options = val;
        } else {
          (attrs = {})[key] = val;
        }
        options || (options = {});
        // Run validation.
        if (!this._validate(attrs, options)) return false;
        // Extract attributes and options.
        unset = options.unset;
        silent = options.silent;
        changes = [];
        changing = this._changing;
        this._changing = true;
        if (!changing) {
          this._previousAttributes = _.clone(this.attributes);
          this.changed = {};
        }
        current = this.attributes, prev = this._previousAttributes;
        // Check for changes of `id`.
        if (this.idAttribute in attrs) this.id = attrs[this.idAttribute];
        // For each `set` attribute, update or delete the current value.
        for (attr in attrs) {
          val = attrs[attr];
          if (!_.isEqual(current[attr], val)) changes.push(attr);
          if (!_.isEqual(prev[attr], val)) {
            this.changed[attr] = val;
          } else {
            delete this.changed[attr];
          }
          unset ? delete current[attr] : current[attr] = val;
        }
        // Trigger all relevant attribute changes.
        if (!silent) {
          if (changes.length) this._pending = true;
          for (var i = 0, l = changes.length; i < l; i++) {
            this.trigger("change:" + changes[i], this, current[changes[i]], options);
          }
        }
        // You might be wondering why there's a `while` loop here. Changes can
        // be recursively nested within `"change"` events.
        if (changing) return this;
        if (!silent) {
          while (this._pending) {
            this._pending = false;
            this.trigger("change", this, options);
          }
        }
        this._pending = false;
        this._changing = false;
        return this;
      },
      // Remove an attribute from the model, firing `"change"`. `unset` is a noop
      // if the attribute doesn't exist.
      unset: function(attr, options) {
        return this.set(attr, void 0, _.extend({}, options, {
          unset: true
        }));
      },
      // Clear all attributes on the model, firing `"change"`.
      clear: function(options) {
        var attrs = {};
        for (var key in this.attributes) attrs[key] = void 0;
        return this.set(attrs, _.extend({}, options, {
          unset: true
        }));
      },
      // Determine if the model has changed since the last `"change"` event.
      // If you specify an attribute name, determine if that attribute has changed.
      hasChanged: function(attr) {
        if (attr == null) return !_.isEmpty(this.changed);
        return _.has(this.changed, attr);
      },
      // Return an object containing all the attributes that have changed, or
      // false if there are no changed attributes. Useful for determining what
      // parts of a view need to be updated and/or what attributes need to be
      // persisted to the server. Unset attributes will be set to undefined.
      // You can also pass an attributes object to diff against the model,
      // determining if there *would be* a change.
      changedAttributes: function(diff) {
        if (!diff) return this.hasChanged() ? _.clone(this.changed) : false;
        var val, changed = false;
        var old = this._changing ? this._previousAttributes : this.attributes;
        for (var attr in diff) {
          if (_.isEqual(old[attr], val = diff[attr])) continue;
          (changed || (changed = {}))[attr] = val;
        }
        return changed;
      },
      // Get the previous value of an attribute, recorded at the time the last
      // `"change"` event was fired.
      previous: function(attr) {
        if (attr == null || !this._previousAttributes) return null;
        return this._previousAttributes[attr];
      },
      // Get all of the attributes of the model at the time of the previous
      // `"change"` event.
      previousAttributes: function() {
        return _.clone(this._previousAttributes);
      },
      // Fetch the model from the server. If the server's representation of the
      // model differs from its current attributes, they will be overridden,
      // triggering a `"change"` event.
      fetch: function(options) {
        options = options ? _.clone(options) : {};
        if (options.parse === void 0) options.parse = true;
        var model = this;
        var success = options.success;
        options.success = function(resp) {
          if (!model.set(model.parse(resp, options), options)) return false;
          if (success) success(model, resp, options);
          model.trigger("sync", model, resp, options);
        };
        wrapError(this, options);
        return this.sync("read", this, options);
      },
      // Set a hash of model attributes, and sync the model to the server.
      // If the server returns an attributes hash that differs, the model's
      // state will be `set` again.
      save: function(key, val, options) {
        var attrs, method, xhr, attributes = this.attributes;
        // Handle both `"key", value` and `{key: value}` -style arguments.
        if (key == null || typeof key === "object") {
          attrs = key;
          options = val;
        } else {
          (attrs = {})[key] = val;
        }
        options = _.extend({
          validate: true
        }, options);
        // If we're not waiting and attributes exist, save acts as
        // `set(attr).save(null, opts)` with validation. Otherwise, check if
        // the model will be valid when the attributes, if any, are set.
        if (attrs && !options.wait) {
          if (!this.set(attrs, options)) return false;
        } else {
          if (!this._validate(attrs, options)) return false;
        }
        // Set temporary attributes if `{wait: true}`.
        if (attrs && options.wait) {
          this.attributes = _.extend({}, attributes, attrs);
        }
        // After a successful server-side save, the client is (optionally)
        // updated with the server-side state.
        if (options.parse === void 0) options.parse = true;
        var model = this;
        var success = options.success;
        options.success = function(resp) {
          // Ensure attributes are restored during synchronous saves.
          model.attributes = attributes;
          var serverAttrs = model.parse(resp, options);
          if (options.wait) serverAttrs = _.extend(attrs || {}, serverAttrs);
          if (_.isObject(serverAttrs) && !model.set(serverAttrs, options)) {
            return false;
          }
          if (success) success(model, resp, options);
          model.trigger("sync", model, resp, options);
        };
        wrapError(this, options);
        method = this.isNew() ? "create" : options.patch ? "patch" : "update";
        if (method === "patch") options.attrs = attrs;
        xhr = this.sync(method, this, options);
        // Restore attributes.
        if (attrs && options.wait) this.attributes = attributes;
        return xhr;
      },
      // Destroy this model on the server if it was already persisted.
      // Optimistically removes the model from its collection, if it has one.
      // If `wait: true` is passed, waits for the server to respond before removal.
      destroy: function(options) {
        options = options ? _.clone(options) : {};
        var model = this;
        var success = options.success;
        var destroy = function() {
          model.trigger("destroy", model, model.collection, options);
        };
        options.success = function(resp) {
          if (options.wait || model.isNew()) destroy();
          if (success) success(model, resp, options);
          if (!model.isNew()) model.trigger("sync", model, resp, options);
        };
        if (this.isNew()) {
          options.success();
          return false;
        }
        wrapError(this, options);
        var xhr = this.sync("delete", this, options);
        if (!options.wait) destroy();
        return xhr;
      },
      // Default URL for the model's representation on the server -- if you're
      // using Backbone's restful methods, override this to change the endpoint
      // that will be called.
      url: function() {
        var base = _.result(this, "urlRoot") || _.result(this.collection, "url") || urlError();
        if (this.isNew()) return base;
        return base + (base.charAt(base.length - 1) === "/" ? "" : "/") + encodeURIComponent(this.id);
      },
      // **parse** converts a response into the hash of attributes to be `set` on
      // the model. The default implementation is just to pass the response along.
      parse: function(resp, options) {
        return resp;
      },
      // Create a new model with identical attributes to this one.
      clone: function() {
        return new this.constructor(this.attributes);
      },
      // A model is new if it has never been saved to the server, and lacks an id.
      isNew: function() {
        return this.id == null;
      },
      // Check if the model is currently in a valid state.
      isValid: function(options) {
        return this._validate({}, _.extend(options || {}, {
          validate: true
        }));
      },
      // Run validation against the next complete set of model attributes,
      // returning `true` if all is well. Otherwise, fire an `"invalid"` event.
      _validate: function(attrs, options) {
        if (!options.validate || !this.validate) return true;
        attrs = _.extend({}, this.attributes, attrs);
        var error = this.validationError = this.validate(attrs, options) || null;
        if (!error) return true;
        this.trigger("invalid", this, error, _.extend(options, {
          validationError: error
        }));
        return false;
      }
    });
    // Underscore methods that we want to implement on the Model.
    var modelMethods = [ "keys", "values", "pairs", "invert", "pick", "omit" ];
    // Mix in each Underscore method as a proxy to `Model#attributes`.
    _.each(modelMethods, function(method) {
      Model.prototype[method] = function() {
        var args = slice.call(arguments);
        args.unshift(this.attributes);
        return _[method].apply(_, args);
      };
    });
    Model.extend = require("backbone-helpers").extend;
  })
  require.register("backbone-collection", function(exports, require, module) {
    //     Backbone.js 1.0.0
    //     (c) 2010-2013 Jeremy Ashkenas, DocumentCloud Inc.
    //     Backbone may be freely distributed under the MIT license.
    //     For all details and documentation:
    //     http://backbonejs.org
    var _ = require("underscore");
    var Model = require("backbone-model").Model;
    var Events = require("backbone-events").Events;
    var array = [];
    var push = array.push;
    var slice = array.slice;
    var splice = array.splice;
    var wrapError = require("backbone-helpers").wrapError;
    // Backbone.Collection
    // -------------------
    // If models tend to represent a single row of data, a Backbone Collection is
    // more analagous to a table full of data ... or a small slice or page of that
    // table, or a collection of rows that belong together for a particular reason
    // -- all of the messages in this particular folder, all of the documents
    // belonging to this particular author, and so on. Collections maintain
    // indexes of their models, both in order, and for lookup by `id`.
    // Create a new **Collection**, perhaps to contain a specific type of `model`.
    // If a `comparator` is specified, the Collection will maintain
    // its models in sort order, as they're added and removed.
    var Collection = module.exports.Collection = function(models, options) {
      options || (options = {});
      if (options.model) this.model = options.model;
      if (options.comparator !== void 0) this.comparator = options.comparator;
      this._reset();
      this.initialize.apply(this, arguments);
      if (models) this.reset(models, _.extend({
        silent: true
      }, options));
    };
    // Default options for `Collection#set`.
    var setOptions = {
      add: true,
      remove: true,
      merge: true
    };
    var addOptions = {
      add: true,
      remove: false
    };
    // Define the Collection's inheritable methods.
    _.extend(Collection.prototype, Events, {
      // The default model for a collection is just a **Backbone.Model**.
      // This should be overridden in most cases.
      model: Model,
      // Initialize is an empty function by default. Override it with your own
      // initialization logic.
      initialize: function() {},
      // The JSON representation of a Collection is an array of the
      // models' attributes.
      toJSON: function(options) {
        return this.map(function(model) {
          return model.toJSON(options);
        });
      },
      // Proxy `Backbone.sync` by default.
      sync: function() {
        return Backbone.sync.apply(this, arguments);
      },
      // Add a model, or list of models to the set.
      add: function(models, options) {
        return this.set(models, _.extend({
          merge: false
        }, options, addOptions));
      },
      // Remove a model, or a list of models from the set.
      remove: function(models, options) {
        var singular = !_.isArray(models);
        models = singular ? [ models ] : _.clone(models);
        options || (options = {});
        var i, l, index, model;
        for (i = 0, l = models.length; i < l; i++) {
          model = models[i] = this.get(models[i]);
          if (!model) continue;
          delete this._byId[model.id];
          delete this._byId[model.cid];
          index = this.indexOf(model);
          this.models.splice(index, 1);
          this.length--;
          if (!options.silent) {
            options.index = index;
            model.trigger("remove", model, this, options);
          }
          this._removeReference(model);
        }
        return singular ? models[0] : models;
      },
      // Update a collection by `set`-ing a new list of models, adding new ones,
      // removing models that are no longer present, and merging models that
      // already exist in the collection, as necessary. Similar to **Model#set**,
      // the core operation for updating the data contained by the collection.
      set: function(models, options) {
        options = _.defaults({}, options, setOptions);
        if (options.parse) models = this.parse(models, options);
        var singular = !_.isArray(models);
        models = singular ? models ? [ models ] : [] : _.clone(models);
        var i, l, id, model, attrs, existing, sort;
        var at = options.at;
        var targetModel = this.model;
        var sortable = this.comparator && at == null && options.sort !== false;
        var sortAttr = _.isString(this.comparator) ? this.comparator : null;
        var toAdd = [], toRemove = [], modelMap = {};
        var add = options.add, merge = options.merge, remove = options.remove;
        var order = !sortable && add && remove ? [] : false;
        // Turn bare objects into model references, and prevent invalid models
        // from being added.
        for (i = 0, l = models.length; i < l; i++) {
          attrs = models[i];
          if (attrs instanceof Model) {
            id = model = attrs;
          } else {
            id = attrs[targetModel.prototype.idAttribute];
          }
          // If a duplicate is found, prevent it from being added and
          // optionally merge it into the existing model.
          if (existing = this.get(id)) {
            if (remove) modelMap[existing.cid] = true;
            if (merge) {
              attrs = attrs === model ? model.attributes : attrs;
              if (options.parse) attrs = existing.parse(attrs, options);
              existing.set(attrs, options);
              if (sortable && !sort && existing.hasChanged(sortAttr)) sort = true;
            }
            models[i] = existing;
          } else if (add) {
            model = models[i] = this._prepareModel(attrs, options);
            if (!model) continue;
            toAdd.push(model);
            // Listen to added models' events, and index models for lookup by
            // `id` and by `cid`.
            model.on("all", this._onModelEvent, this);
            this._byId[model.cid] = model;
            if (model.id != null) this._byId[model.id] = model;
          }
          if (order) order.push(existing || model);
        }
        // Remove nonexistent models if appropriate.
        if (remove) {
          for (i = 0, l = this.length; i < l; ++i) {
            if (!modelMap[(model = this.models[i]).cid]) toRemove.push(model);
          }
          if (toRemove.length) this.remove(toRemove, options);
        }
        // See if sorting is needed, update `length` and splice in new models.
        if (toAdd.length || order && order.length) {
          if (sortable) sort = true;
          this.length += toAdd.length;
          if (at != null) {
            for (i = 0, l = toAdd.length; i < l; i++) {
              this.models.splice(at + i, 0, toAdd[i]);
            }
          } else {
            if (order) this.models.length = 0;
            var orderedModels = order || toAdd;
            for (i = 0, l = orderedModels.length; i < l; i++) {
              this.models.push(orderedModels[i]);
            }
          }
        }
        // Silently sort the collection if appropriate.
        if (sort) this.sort({
          silent: true
        });
        // Unless silenced, it's time to fire all appropriate add/sort events.
        if (!options.silent) {
          for (i = 0, l = toAdd.length; i < l; i++) {
            (model = toAdd[i]).trigger("add", model, this, options);
          }
          if (sort || order && order.length) this.trigger("sort", this, options);
        }
        // Return the added (or merged) model (or models).
        return singular ? models[0] : models;
      },
      // When you have more items than you want to add or remove individually,
      // you can reset the entire set with a new list of models, without firing
      // any granular `add` or `remove` events. Fires `reset` when finished.
      // Useful for bulk operations and optimizations.
      reset: function(models, options) {
        options || (options = {});
        for (var i = 0, l = this.models.length; i < l; i++) {
          this._removeReference(this.models[i]);
        }
        options.previousModels = this.models;
        this._reset();
        models = this.add(models, _.extend({
          silent: true
        }, options));
        if (!options.silent) this.trigger("reset", this, options);
        return models;
      },
      // Add a model to the end of the collection.
      push: function(model, options) {
        return this.add(model, _.extend({
          at: this.length
        }, options));
      },
      // Remove a model from the end of the collection.
      pop: function(options) {
        var model = this.at(this.length - 1);
        this.remove(model, options);
        return model;
      },
      // Add a model to the beginning of the collection.
      unshift: function(model, options) {
        return this.add(model, _.extend({
          at: 0
        }, options));
      },
      // Remove a model from the beginning of the collection.
      shift: function(options) {
        var model = this.at(0);
        this.remove(model, options);
        return model;
      },
      // Slice out a sub-array of models from the collection.
      slice: function() {
        return slice.apply(this.models, arguments);
      },
      // Get a model from the set by id.
      get: function(obj) {
        if (obj == null) return void 0;
        return this._byId[obj.id] || this._byId[obj.cid] || this._byId[obj];
      },
      // Get the model at the given index.
      at: function(index) {
        return this.models[index];
      },
      // Return models with matching attributes. Useful for simple cases of
      // `filter`.
      where: function(attrs, first) {
        if (_.isEmpty(attrs)) return first ? void 0 : [];
        return this[first ? "find" : "filter"](function(model) {
          for (var key in attrs) {
            if (attrs[key] !== model.get(key)) return false;
          }
          return true;
        });
      },
      // Return the first model with matching attributes. Useful for simple cases
      // of `find`.
      findWhere: function(attrs) {
        return this.where(attrs, true);
      },
      // Force the collection to re-sort itself. You don't need to call this under
      // normal circumstances, as the set will maintain sort order as each item
      // is added.
      sort: function(options) {
        if (!this.comparator) throw new Error("Cannot sort a set without a comparator");
        options || (options = {});
        // Run sort based on type of `comparator`.
        if (_.isString(this.comparator) || this.comparator.length === 1) {
          this.models = this.sortBy(this.comparator, this);
        } else {
          this.models.sort(_.bind(this.comparator, this));
        }
        if (!options.silent) this.trigger("sort", this, options);
        return this;
      },
      // Pluck an attribute from each model in the collection.
      pluck: function(attr) {
        return _.invoke(this.models, "get", attr);
      },
      // Fetch the default set of models for this collection, resetting the
      // collection when they arrive. If `reset: true` is passed, the response
      // data will be passed through the `reset` method instead of `set`.
      fetch: function(options) {
        options = options ? _.clone(options) : {};
        if (options.parse === void 0) options.parse = true;
        var success = options.success;
        var collection = this;
        options.success = function(resp) {
          var method = options.reset ? "reset" : "set";
          collection[method](resp, options);
          if (success) success(collection, resp, options);
          collection.trigger("sync", collection, resp, options);
        };
        wrapError(this, options);
        return this.sync("read", this, options);
      },
      // Create a new instance of a model in this collection. Add the model to the
      // collection immediately, unless `wait: true` is passed, in which case we
      // wait for the server to agree.
      create: function(model, options) {
        options = options ? _.clone(options) : {};
        if (!(model = this._prepareModel(model, options))) return false;
        if (!options.wait) this.add(model, options);
        var collection = this;
        var success = options.success;
        options.success = function(model, resp, options) {
          if (options.wait) collection.add(model, options);
          if (success) success(model, resp, options);
        };
        model.save(null, options);
        return model;
      },
      // **parse** converts a response into a list of models to be added to the
      // collection. The default implementation is just to pass it through.
      parse: function(resp, options) {
        return resp;
      },
      // Create a new collection with an identical list of models as this one.
      clone: function() {
        return new this.constructor(this.models);
      },
      // Private method to reset all internal state. Called when the collection
      // is first initialized or reset.
      _reset: function() {
        this.length = 0;
        this.models = [];
        this._byId = {};
      },
      // Prepare a hash of attributes (or other model) to be added to this
      // collection.
      _prepareModel: function(attrs, options) {
        if (attrs instanceof Model) {
          if (!attrs.collection) attrs.collection = this;
          return attrs;
        }
        options = options ? _.clone(options) : {};
        options.collection = this;
        var model = new this.model(attrs, options);
        if (!model.validationError) return model;
        this.trigger("invalid", this, model.validationError, options);
        return false;
      },
      // Internal method to sever a model's ties to a collection.
      _removeReference: function(model) {
        if (this === model.collection) delete model.collection;
        model.off("all", this._onModelEvent, this);
      },
      // Internal method called every time a model in the set fires an event.
      // Sets need to update their indexes when models change ids. All other
      // events simply proxy through. "add" and "remove" events that originate
      // in other collections are ignored.
      _onModelEvent: function(event, model, collection, options) {
        if ((event === "add" || event === "remove") && collection !== this) return;
        if (event === "destroy") this.remove(model, options);
        if (model && event === "change:" + model.idAttribute) {
          delete this._byId[model.previous(model.idAttribute)];
          if (model.id != null) this._byId[model.id] = model;
        }
        this.trigger.apply(this, arguments);
      }
    });
    // Underscore methods that we want to implement on the Collection.
    // 90% of the core usefulness of Backbone Collections is actually implemented
    // right here:
    var methods = [ "forEach", "each", "map", "collect", "reduce", "foldl", "inject", "reduceRight", "foldr", "find", "detect", "filter", "select", "reject", "every", "all", "some", "any", "include", "contains", "invoke", "max", "min", "toArray", "size", "first", "head", "take", "initial", "rest", "tail", "drop", "last", "without", "difference", "indexOf", "shuffle", "lastIndexOf", "isEmpty", "chain" ];
    // Mix in each Underscore method as a proxy to `Collection#models`.
    _.each(methods, function(method) {
      Collection.prototype[method] = function() {
        var args = slice.call(arguments);
        args.unshift(this.models);
        return _[method].apply(_, args);
      };
    });
    // Underscore methods that take a property name as an argument.
    var attributeMethods = [ "groupBy", "countBy", "sortBy" ];
    // Use attributes instead of properties.
    _.each(attributeMethods, function(method) {
      Collection.prototype[method] = function(value, context) {
        var iterator = _.isFunction(value) ? value : function(model) {
          return model.get(value);
        };
        return _[method](this.models, iterator, context);
      };
    });
    Collection.extend = require("backbone-helpers").extend;
  })
  require.register("uritemplate", function(exports, require, module) {
    /*global unescape, module, define, window, global*/
    /*
 UriTemplate Copyright (c) 2012-2013 Franz Antesberger. All Rights Reserved.
 Available via the MIT license.
*/
    (function(exportCallback) {
      "use strict";
      var UriTemplateError = function() {
        function UriTemplateError(options) {
          this.options = options;
        }
        UriTemplateError.prototype.toString = function() {
          if (JSON && JSON.stringify) {
            return JSON.stringify(this.options);
          } else {
            return this.options;
          }
        };
        return UriTemplateError;
      }();
      var objectHelper = function() {
        function isArray(value) {
          return Object.prototype.toString.apply(value) === "[object Array]";
        }
        function isString(value) {
          return Object.prototype.toString.apply(value) === "[object String]";
        }
        function isNumber(value) {
          return Object.prototype.toString.apply(value) === "[object Number]";
        }
        function isBoolean(value) {
          return Object.prototype.toString.apply(value) === "[object Boolean]";
        }
        function join(arr, separator) {
          var result = "", first = true, index;
          for (index = 0; index < arr.length; index += 1) {
            if (first) {
              first = false;
            } else {
              result += separator;
            }
            result += arr[index];
          }
          return result;
        }
        function map(arr, mapper) {
          var result = [], index = 0;
          for (;index < arr.length; index += 1) {
            result.push(mapper(arr[index]));
          }
          return result;
        }
        function filter(arr, predicate) {
          var result = [], index = 0;
          for (;index < arr.length; index += 1) {
            if (predicate(arr[index])) {
              result.push(arr[index]);
            }
          }
          return result;
        }
        function deepFreezeUsingObjectFreeze(object) {
          if (typeof object !== "object" || object === null) {
            return object;
          }
          Object.freeze(object);
          var property, propertyName;
          for (propertyName in object) {
            if (object.hasOwnProperty(propertyName)) {
              property = object[propertyName];
              // be aware, arrays are 'object', too
              if (typeof property === "object") {
                deepFreeze(property);
              }
            }
          }
          return object;
        }
        function deepFreeze(object) {
          if (typeof Object.freeze === "function") {
            return deepFreezeUsingObjectFreeze(object);
          }
          return object;
        }
        return {
          isArray: isArray,
          isString: isString,
          isNumber: isNumber,
          isBoolean: isBoolean,
          join: join,
          map: map,
          filter: filter,
          deepFreeze: deepFreeze
        };
      }();
      var charHelper = function() {
        function isAlpha(chr) {
          return chr >= "a" && chr <= "z" || chr >= "A" && chr <= "Z";
        }
        function isDigit(chr) {
          return chr >= "0" && chr <= "9";
        }
        function isHexDigit(chr) {
          return isDigit(chr) || chr >= "a" && chr <= "f" || chr >= "A" && chr <= "F";
        }
        return {
          isAlpha: isAlpha,
          isDigit: isDigit,
          isHexDigit: isHexDigit
        };
      }();
      var pctEncoder = function() {
        var utf8 = {
          encode: function(chr) {
            // see http://ecmanaut.blogspot.de/2006/07/encoding-decoding-utf8-in-javascript.html
            return unescape(encodeURIComponent(chr));
          },
          numBytes: function(firstCharCode) {
            if (firstCharCode <= 127) {
              return 1;
            } else if (194 <= firstCharCode && firstCharCode <= 223) {
              return 2;
            } else if (224 <= firstCharCode && firstCharCode <= 239) {
              return 3;
            } else if (240 <= firstCharCode && firstCharCode <= 244) {
              return 4;
            }
            // no valid first octet
            return 0;
          },
          isValidFollowingCharCode: function(charCode) {
            return 128 <= charCode && charCode <= 191;
          }
        };
        /**
     * encodes a character, if needed or not.
     * @param chr
     * @return pct-encoded character
     */
        function encodeCharacter(chr) {
          var result = "", octets = utf8.encode(chr), octet, index;
          for (index = 0; index < octets.length; index += 1) {
            octet = octets.charCodeAt(index);
            result += "%" + (octet < 16 ? "0" : "") + octet.toString(16).toUpperCase();
          }
          return result;
        }
        /**
     * Returns, whether the given text at start is in the form 'percent hex-digit hex-digit', like '%3F'
     * @param text
     * @param start
     * @return {boolean|*|*}
     */
        function isPercentDigitDigit(text, start) {
          return text.charAt(start) === "%" && charHelper.isHexDigit(text.charAt(start + 1)) && charHelper.isHexDigit(text.charAt(start + 2));
        }
        /**
     * Parses a hex number from start with length 2.
     * @param text a string
     * @param start the start index of the 2-digit hex number
     * @return {Number}
     */
        function parseHex2(text, start) {
          return parseInt(text.substr(start, 2), 16);
        }
        /**
     * Returns whether or not the given char sequence is a correctly pct-encoded sequence.
     * @param chr
     * @return {boolean}
     */
        function isPctEncoded(chr) {
          if (!isPercentDigitDigit(chr, 0)) {
            return false;
          }
          var firstCharCode = parseHex2(chr, 1);
          var numBytes = utf8.numBytes(firstCharCode);
          if (numBytes === 0) {
            return false;
          }
          for (var byteNumber = 1; byteNumber < numBytes; byteNumber += 1) {
            if (!isPercentDigitDigit(chr, 3 * byteNumber) || !utf8.isValidFollowingCharCode(parseHex2(chr, 3 * byteNumber + 1))) {
              return false;
            }
          }
          return true;
        }
        /**
     * Reads as much as needed from the text, e.g. '%20' or '%C3%B6'. It does not decode!
     * @param text
     * @param startIndex
     * @return the character or pct-string of the text at startIndex
     */
        function pctCharAt(text, startIndex) {
          var chr = text.charAt(startIndex);
          if (!isPercentDigitDigit(text, startIndex)) {
            return chr;
          }
          var utf8CharCode = parseHex2(text, startIndex + 1);
          var numBytes = utf8.numBytes(utf8CharCode);
          if (numBytes === 0) {
            return chr;
          }
          for (var byteNumber = 1; byteNumber < numBytes; byteNumber += 1) {
            if (!isPercentDigitDigit(text, startIndex + 3 * byteNumber) || !utf8.isValidFollowingCharCode(parseHex2(text, startIndex + 3 * byteNumber + 1))) {
              return chr;
            }
          }
          return text.substr(startIndex, 3 * numBytes);
        }
        return {
          encodeCharacter: encodeCharacter,
          isPctEncoded: isPctEncoded,
          pctCharAt: pctCharAt
        };
      }();
      var rfcCharHelper = function() {
        /**
     * Returns if an character is an varchar character according 2.3 of rfc 6570
     * @param chr
     * @return (Boolean)
     */
        function isVarchar(chr) {
          return charHelper.isAlpha(chr) || charHelper.isDigit(chr) || chr === "_" || pctEncoder.isPctEncoded(chr);
        }
        /**
     * Returns if chr is an unreserved character according 1.5 of rfc 6570
     * @param chr
     * @return {Boolean}
     */
        function isUnreserved(chr) {
          return charHelper.isAlpha(chr) || charHelper.isDigit(chr) || chr === "-" || chr === "." || chr === "_" || chr === "~";
        }
        /**
     * Returns if chr is an reserved character according 1.5 of rfc 6570
     * or the percent character mentioned in 3.2.1.
     * @param chr
     * @return {Boolean}
     */
        function isReserved(chr) {
          return chr === ":" || chr === "/" || chr === "?" || chr === "#" || chr === "[" || chr === "]" || chr === "@" || chr === "!" || chr === "$" || chr === "&" || chr === "(" || chr === ")" || chr === "*" || chr === "+" || chr === "," || chr === ";" || chr === "=" || chr === "'";
        }
        return {
          isVarchar: isVarchar,
          isUnreserved: isUnreserved,
          isReserved: isReserved
        };
      }();
      /**
 * encoding of rfc 6570
 */
      var encodingHelper = function() {
        function encode(text, passReserved) {
          var result = "", index, chr = "";
          if (typeof text === "number" || typeof text === "boolean") {
            text = text.toString();
          }
          for (index = 0; index < text.length; index += chr.length) {
            chr = text.charAt(index);
            result += rfcCharHelper.isUnreserved(chr) || passReserved && rfcCharHelper.isReserved(chr) ? chr : pctEncoder.encodeCharacter(chr);
          }
          return result;
        }
        function encodePassReserved(text) {
          return encode(text, true);
        }
        function encodeLiteralCharacter(literal, index) {
          var chr = pctEncoder.pctCharAt(literal, index);
          if (chr.length > 1) {
            return chr;
          } else {
            return rfcCharHelper.isReserved(chr) || rfcCharHelper.isUnreserved(chr) ? chr : pctEncoder.encodeCharacter(chr);
          }
        }
        function encodeLiteral(literal) {
          var result = "", index, chr = "";
          for (index = 0; index < literal.length; index += chr.length) {
            chr = pctEncoder.pctCharAt(literal, index);
            if (chr.length > 1) {
              result += chr;
            } else {
              result += rfcCharHelper.isReserved(chr) || rfcCharHelper.isUnreserved(chr) ? chr : pctEncoder.encodeCharacter(chr);
            }
          }
          return result;
        }
        return {
          encode: encode,
          encodePassReserved: encodePassReserved,
          encodeLiteral: encodeLiteral,
          encodeLiteralCharacter: encodeLiteralCharacter
        };
      }();
      // the operators defined by rfc 6570
      var operators = function() {
        var bySymbol = {};
        function create(symbol) {
          bySymbol[symbol] = {
            symbol: symbol,
            separator: symbol === "?" ? "&" : symbol === "" || symbol === "+" || symbol === "#" ? "," : symbol,
            named: symbol === ";" || symbol === "&" || symbol === "?",
            ifEmpty: symbol === "&" || symbol === "?" ? "=" : "",
            first: symbol === "+" ? "" : symbol,
            encode: symbol === "+" || symbol === "#" ? encodingHelper.encodePassReserved : encodingHelper.encode,
            toString: function() {
              return this.symbol;
            }
          };
        }
        create("");
        create("+");
        create("#");
        create(".");
        create("/");
        create(";");
        create("?");
        create("&");
        return {
          valueOf: function(chr) {
            if (bySymbol[chr]) {
              return bySymbol[chr];
            }
            if ("=,!@|".indexOf(chr) >= 0) {
              return null;
            }
            return bySymbol[""];
          }
        };
      }();
      /**
 * Detects, whether a given element is defined in the sense of rfc 6570
 * Section 2.3 of the RFC makes clear defintions:
 * * undefined and null are not defined.
 * * the empty string is defined
 * * an array ("list") is defined, if it is not empty (even if all elements are not defined)
 * * an object ("map") is defined, if it contains at least one property with defined value
 * @param object
 * @return {Boolean}
 */
      function isDefined(object) {
        var propertyName;
        if (object === null || object === undefined) {
          return false;
        }
        if (objectHelper.isArray(object)) {
          // Section 2.3: A variable defined as a list value is considered undefined if the list contains zero members
          return object.length > 0;
        }
        if (typeof object === "string" || typeof object === "number" || typeof object === "boolean") {
          // falsy values like empty strings, false or 0 are "defined"
          return true;
        }
        // else Object
        for (propertyName in object) {
          if (object.hasOwnProperty(propertyName) && isDefined(object[propertyName])) {
            return true;
          }
        }
        return false;
      }
      var LiteralExpression = function() {
        function LiteralExpression(literal) {
          this.literal = encodingHelper.encodeLiteral(literal);
        }
        LiteralExpression.prototype.expand = function() {
          return this.literal;
        };
        LiteralExpression.prototype.toString = LiteralExpression.prototype.expand;
        return LiteralExpression;
      }();
      var parse = function() {
        function parseExpression(expressionText) {
          var operator, varspecs = [], varspec = null, varnameStart = null, maxLengthStart = null, index, chr = "";
          function closeVarname() {
            var varname = expressionText.substring(varnameStart, index);
            if (varname.length === 0) {
              throw new UriTemplateError({
                expressionText: expressionText,
                message: "a varname must be specified",
                position: index
              });
            }
            varspec = {
              varname: varname,
              exploded: false,
              maxLength: null
            };
            varnameStart = null;
          }
          function closeMaxLength() {
            if (maxLengthStart === index) {
              throw new UriTemplateError({
                expressionText: expressionText,
                message: "after a ':' you have to specify the length",
                position: index
              });
            }
            varspec.maxLength = parseInt(expressionText.substring(maxLengthStart, index), 10);
            maxLengthStart = null;
          }
          operator = function(operatorText) {
            var op = operators.valueOf(operatorText);
            if (op === null) {
              throw new UriTemplateError({
                expressionText: expressionText,
                message: "illegal use of reserved operator",
                position: index,
                operator: operatorText
              });
            }
            return op;
          }(expressionText.charAt(0));
          index = operator.symbol.length;
          varnameStart = index;
          for (;index < expressionText.length; index += chr.length) {
            chr = pctEncoder.pctCharAt(expressionText, index);
            if (varnameStart !== null) {
              // the spec says: varname =  varchar *( ["."] varchar )
              // so a dot is allowed except for the first char
              if (chr === ".") {
                if (varnameStart === index) {
                  throw new UriTemplateError({
                    expressionText: expressionText,
                    message: "a varname MUST NOT start with a dot",
                    position: index
                  });
                }
                continue;
              }
              if (rfcCharHelper.isVarchar(chr)) {
                continue;
              }
              closeVarname();
            }
            if (maxLengthStart !== null) {
              if (index === maxLengthStart && chr === "0") {
                throw new UriTemplateError({
                  expressionText: expressionText,
                  message: "A :prefix must not start with digit 0",
                  position: index
                });
              }
              if (charHelper.isDigit(chr)) {
                if (index - maxLengthStart >= 4) {
                  throw new UriTemplateError({
                    expressionText: expressionText,
                    message: "A :prefix must have max 4 digits",
                    position: index
                  });
                }
                continue;
              }
              closeMaxLength();
            }
            if (chr === ":") {
              if (varspec.maxLength !== null) {
                throw new UriTemplateError({
                  expressionText: expressionText,
                  message: "only one :maxLength is allowed per varspec",
                  position: index
                });
              }
              if (varspec.exploded) {
                throw new UriTemplateError({
                  expressionText: expressionText,
                  message: "an exploeded varspec MUST NOT be varspeced",
                  position: index
                });
              }
              maxLengthStart = index + 1;
              continue;
            }
            if (chr === "*") {
              if (varspec === null) {
                throw new UriTemplateError({
                  expressionText: expressionText,
                  message: "exploded without varspec",
                  position: index
                });
              }
              if (varspec.exploded) {
                throw new UriTemplateError({
                  expressionText: expressionText,
                  message: "exploded twice",
                  position: index
                });
              }
              if (varspec.maxLength) {
                throw new UriTemplateError({
                  expressionText: expressionText,
                  message: "an explode (*) MUST NOT follow to a prefix",
                  position: index
                });
              }
              varspec.exploded = true;
              continue;
            }
            // the only legal character now is the comma
            if (chr === ",") {
              varspecs.push(varspec);
              varspec = null;
              varnameStart = index + 1;
              continue;
            }
            throw new UriTemplateError({
              expressionText: expressionText,
              message: "illegal character",
              character: chr,
              position: index
            });
          }
          // for chr
          if (varnameStart !== null) {
            closeVarname();
          }
          if (maxLengthStart !== null) {
            closeMaxLength();
          }
          varspecs.push(varspec);
          return new VariableExpression(expressionText, operator, varspecs);
        }
        function parse(uriTemplateText) {
          // assert filled string
          var index, chr, expressions = [], braceOpenIndex = null, literalStart = 0;
          for (index = 0; index < uriTemplateText.length; index += 1) {
            chr = uriTemplateText.charAt(index);
            if (literalStart !== null) {
              if (chr === "}") {
                throw new UriTemplateError({
                  templateText: uriTemplateText,
                  message: "unopened brace closed",
                  position: index
                });
              }
              if (chr === "{") {
                if (literalStart < index) {
                  expressions.push(new LiteralExpression(uriTemplateText.substring(literalStart, index)));
                }
                literalStart = null;
                braceOpenIndex = index;
              }
              continue;
            }
            if (braceOpenIndex !== null) {
              // here just { is forbidden
              if (chr === "{") {
                throw new UriTemplateError({
                  templateText: uriTemplateText,
                  message: "brace already opened",
                  position: index
                });
              }
              if (chr === "}") {
                if (braceOpenIndex + 1 === index) {
                  throw new UriTemplateError({
                    templateText: uriTemplateText,
                    message: "empty braces",
                    position: braceOpenIndex
                  });
                }
                try {
                  expressions.push(parseExpression(uriTemplateText.substring(braceOpenIndex + 1, index)));
                } catch (error) {
                  if (error.prototype === UriTemplateError.prototype) {
                    throw new UriTemplateError({
                      templateText: uriTemplateText,
                      message: error.options.message,
                      position: braceOpenIndex + error.options.position,
                      details: error.options
                    });
                  }
                  throw error;
                }
                braceOpenIndex = null;
                literalStart = index + 1;
              }
              continue;
            }
            throw new Error("reached unreachable code");
          }
          if (braceOpenIndex !== null) {
            throw new UriTemplateError({
              templateText: uriTemplateText,
              message: "unclosed brace",
              position: braceOpenIndex
            });
          }
          if (literalStart < uriTemplateText.length) {
            expressions.push(new LiteralExpression(uriTemplateText.substr(literalStart)));
          }
          return new UriTemplate(uriTemplateText, expressions);
        }
        return parse;
      }();
      var VariableExpression = function() {
        // helper function if JSON is not available
        function prettyPrint(value) {
          return JSON && JSON.stringify ? JSON.stringify(value) : value;
        }
        function isEmpty(value) {
          if (!isDefined(value)) {
            return true;
          }
          if (objectHelper.isString(value)) {
            return value === "";
          }
          if (objectHelper.isNumber(value) || objectHelper.isBoolean(value)) {
            return false;
          }
          if (objectHelper.isArray(value)) {
            return value.length === 0;
          }
          for (var propertyName in value) {
            if (value.hasOwnProperty(propertyName)) {
              return false;
            }
          }
          return true;
        }
        function propertyArray(object) {
          var result = [], propertyName;
          for (propertyName in object) {
            if (object.hasOwnProperty(propertyName)) {
              result.push({
                name: propertyName,
                value: object[propertyName]
              });
            }
          }
          return result;
        }
        function VariableExpression(templateText, operator, varspecs) {
          this.templateText = templateText;
          this.operator = operator;
          this.varspecs = varspecs;
        }
        VariableExpression.prototype.toString = function() {
          return this.templateText;
        };
        function expandSimpleValue(varspec, operator, value) {
          var result = "";
          value = value.toString();
          if (operator.named) {
            result += encodingHelper.encodeLiteral(varspec.varname);
            if (value === "") {
              result += operator.ifEmpty;
              return result;
            }
            result += "=";
          }
          if (varspec.maxLength !== null) {
            value = value.substr(0, varspec.maxLength);
          }
          result += operator.encode(value);
          return result;
        }
        function valueDefined(nameValue) {
          return isDefined(nameValue.value);
        }
        function expandNotExploded(varspec, operator, value) {
          var arr = [], result = "";
          if (operator.named) {
            result += encodingHelper.encodeLiteral(varspec.varname);
            if (isEmpty(value)) {
              result += operator.ifEmpty;
              return result;
            }
            result += "=";
          }
          if (objectHelper.isArray(value)) {
            arr = value;
            arr = objectHelper.filter(arr, isDefined);
            arr = objectHelper.map(arr, operator.encode);
            result += objectHelper.join(arr, ",");
          } else {
            arr = propertyArray(value);
            arr = objectHelper.filter(arr, valueDefined);
            arr = objectHelper.map(arr, function(nameValue) {
              return operator.encode(nameValue.name) + "," + operator.encode(nameValue.value);
            });
            result += objectHelper.join(arr, ",");
          }
          return result;
        }
        function expandExplodedNamed(varspec, operator, value) {
          var isArray = objectHelper.isArray(value), arr = [];
          if (isArray) {
            arr = value;
            arr = objectHelper.filter(arr, isDefined);
            arr = objectHelper.map(arr, function(listElement) {
              var tmp = encodingHelper.encodeLiteral(varspec.varname);
              if (isEmpty(listElement)) {
                tmp += operator.ifEmpty;
              } else {
                tmp += "=" + operator.encode(listElement);
              }
              return tmp;
            });
          } else {
            arr = propertyArray(value);
            arr = objectHelper.filter(arr, valueDefined);
            arr = objectHelper.map(arr, function(nameValue) {
              var tmp = encodingHelper.encodeLiteral(nameValue.name);
              if (isEmpty(nameValue.value)) {
                tmp += operator.ifEmpty;
              } else {
                tmp += "=" + operator.encode(nameValue.value);
              }
              return tmp;
            });
          }
          return objectHelper.join(arr, operator.separator);
        }
        function expandExplodedUnnamed(operator, value) {
          var arr = [], result = "";
          if (objectHelper.isArray(value)) {
            arr = value;
            arr = objectHelper.filter(arr, isDefined);
            arr = objectHelper.map(arr, operator.encode);
            result += objectHelper.join(arr, operator.separator);
          } else {
            arr = propertyArray(value);
            arr = objectHelper.filter(arr, function(nameValue) {
              return isDefined(nameValue.value);
            });
            arr = objectHelper.map(arr, function(nameValue) {
              return operator.encode(nameValue.name) + "=" + operator.encode(nameValue.value);
            });
            result += objectHelper.join(arr, operator.separator);
          }
          return result;
        }
        VariableExpression.prototype.expand = function(variables) {
          var expanded = [], index, varspec, value, valueIsArr, oneExploded = false, operator = this.operator;
          // expand each varspec and join with operator's separator
          for (index = 0; index < this.varspecs.length; index += 1) {
            varspec = this.varspecs[index];
            value = variables[varspec.varname];
            // if (!isDefined(value)) {
            // if (variables.hasOwnProperty(varspec.name)) {
            if (value === null || value === undefined) {
              continue;
            }
            if (varspec.exploded) {
              oneExploded = true;
            }
            valueIsArr = objectHelper.isArray(value);
            if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
              expanded.push(expandSimpleValue(varspec, operator, value));
            } else if (varspec.maxLength && isDefined(value)) {
              // 2.4.1 of the spec says: "Prefix modifiers are not applicable to variables that have composite values."
              throw new Error("Prefix modifiers are not applicable to variables that have composite values. You tried to expand " + this + " with " + prettyPrint(value));
            } else if (!varspec.exploded) {
              if (operator.named || !isEmpty(value)) {
                expanded.push(expandNotExploded(varspec, operator, value));
              }
            } else if (isDefined(value)) {
              if (operator.named) {
                expanded.push(expandExplodedNamed(varspec, operator, value));
              } else {
                expanded.push(expandExplodedUnnamed(operator, value));
              }
            }
          }
          if (expanded.length === 0) {
            return "";
          } else {
            return operator.first + objectHelper.join(expanded, operator.separator);
          }
        };
        return VariableExpression;
      }();
      var UriTemplate = function() {
        function UriTemplate(templateText, expressions) {
          this.templateText = templateText;
          this.expressions = expressions;
          objectHelper.deepFreeze(this);
        }
        UriTemplate.prototype.toString = function() {
          return this.templateText;
        };
        UriTemplate.prototype.expand = function(variables) {
          // this.expressions.map(function (expression) {return expression.expand(variables);}).join('');
          var index, result = "";
          for (index = 0; index < this.expressions.length; index += 1) {
            result += this.expressions[index].expand(variables);
          }
          return result;
        };
        UriTemplate.parse = parse;
        UriTemplate.UriTemplateError = UriTemplateError;
        return UriTemplate;
      }();
      exportCallback(UriTemplate);
    })(function(UriTemplate) {
      "use strict";
      // export UriTemplate, when module is present, or pass it to window or global
      if (typeof module !== "undefined") {
        module.exports = UriTemplate;
      } else if (typeof define === "function") {
        define([], function() {
          return UriTemplate;
        });
      } else if (typeof window !== "undefined") {
        window.UriTemplate = UriTemplate;
      } else {
        global.UriTemplate = UriTemplate;
      }
    });
  })
  require.register("hyperbone-model", function(exports, require, module) {
    /*
 * Hyperbone Model
 * 
 * Author : Charlotte Gore
 * Version : 0.0.1
 * 
 * License: MIT
 */
    var _ = require("underscore");
    var BackboneModel = require("backbone-model").Model;
    var Collection = require("backbone-collection").Collection.extend({
      isHyperbone: true,
      toJSON: function() {
        var arr = [];
        _.each(this.models, function(model, index) {
          if (model.isHyperbone) {
            arr.push(model.toJSON());
          } else {
            arr.push(model);
          }
        });
        return arr;
      }
    });
    var makeTemplate = require("uritemplate").parse;
    var Command;
    var HyperboneModel = function(attributes, options) {
      // we override the initial function because we need to force a hypermedia parse at the
      // instantiation stage, not just the fetch/sync stage
      attributes || (attributes = {});
      // this will cause a throw later on...
      this._links = {};
      this.attributes = {};
      this.cid = _.uniqueId("c");
      this.isHyperbone = true;
      if (!this._prototypes) this._prototypes = {};
      if (!this.syncCommands) this.syncCommands = false;
      options || (options = {});
      if (attributes._prototypes) {
        _.extend(this._prototypes, attributes._prototypes);
        delete attributes._prototypes;
      }
      if (attributes.syncCommands) {
        this.syncCommands = true;
        this.syncEvents = [];
        // we keep a reference to any handlers we make so we can delete the old
        // ones if the model get reinitialised
        delete attributes.syncCommands;
      }
      if (options && options.collection) {
        this.collection = options.collection;
      }
      // this parser is for turning the source input into compatible hypermedia.
      if (this.parser) {
        attributes = this.parser(attributes);
      }
      attributes = _.defaults({}, attributes, _.result(this, "defaults"));
      this.set(attributes, {
        silent: true
      });
      if (this.syncCommands) {
        this.reinitCommandSync();
      }
      this.changed = {};
      this.initialize.apply(this, arguments);
    };
    _.extend(HyperboneModel.prototype, BackboneModel.prototype, {
      reinit: function(attributes, options) {
        attributes = _.defaults({}, attributes, _.result(this, "defaults"));
        if (this.parser) attributes = this.parser(attributes);
        this.set(attributes);
        if (this.syncCommands) {
          this.reinitCommandSync();
        }
      },
      reinitCommandSync: function() {
        var self = this;
        // unsubscribe any existing sync handlers...
        _.each(self.syncEvents, function(obj) {
          self.off(obj.event, obj.handler);
        });
        self.syncEvents = [];
        _.each(self.attributes, function(val, attr) {
          // only interested in backbone style top level key values.
          if (!_.isObject(val)) {
            _.each(self._commands.attributes, function(cmd) {
              var props = cmd.properties();
              if (props.get(attr) === val) {
                // we have a pair!!!
                var ev = {
                  event: "change:" + attr,
                  handler: function(model, newVal) {
                    var curVal = props.get(attr);
                    if (curVal !== newVal) {
                      props.set(attr, newVal);
                    }
                  }
                };
                props.on(ev.event, function(model, newVal) {
                  var curVal = self.get(attr);
                  if (curVal !== newVal) {
                    self.set(attr, newVal);
                  }
                });
                self.on(ev.event, ev.handler);
                self.syncEvents.push(ev);
              }
            });
          }
        });
      },
      parseHypermedia: function(attributes) {
        var self = this, signals = [];
        // update existing links for existing models
        if (attributes._links && this._links) {
          _.each(attributes._links, function(val, id) {
            if (!this._links[id]) {
              signals.push(function() {
                self.trigger("add-rel:" + id);
              });
            } else {
              if (val.href !== this._links[id].href) {
                signals.push(function() {
                  self.trigger("change-rel:" + id);
                });
              }
            }
            this._links[id] = val;
          }, this);
          _.each(this._links, function(val, id) {
            if (!attributes._links[id]) {
              signals.push(function() {
                delete self._links[id];
                self.trigger("remove-rel:" + id);
              });
            }
          }, this);
        } else {
          this._links = attributes._links || {};
        }
        delete attributes._links;
        this._curies = {};
        var curies = this._links["curie"] ? [ this._links["curie"] ] : this._links["curies"] ? this._links["curies"] : null;
        if (curies) {
          _.each(curies, function(curie) {
            if (!curie.templated) throw new Error("A curie without a template? What are you thinking?");
            this._curies[curie.name] = makeTemplate(curie.href);
          }, this);
        }
        // collapse unnecessary arrays. 
        _.each(this._links, function(link, id) {
          if (_.isArray(link) && link.length === 1) {
            this._links[id] = link[0];
          } else if (_.isArray(link)) {
            _.each(link, function(link, id) {
              if (link.templated) {
                link.template = makeTemplate(link.href);
              }
            });
          } else if (link.templated) {
            link.template = makeTemplate(link.href);
          }
        }, this);
        // make templates
        _.each(this._links, function(link, id) {
          if (link.templated) {
            link.template = makeTemplate(link.href);
          }
        }, this);
        if (attributes._embedded) {
          _.each(attributes._embedded, function(val, attr) {
            attributes[attr] = val;
          });
          delete attributes._embedded;
        }
        if (attributes._commands) {
          if (!this._commands) {
            this._commands = new HyperboneModel();
          } else {
            // find any deleted commands and delete them...
            _.each(this._commands.attributes, function(cmd, id) {
              if (!attributes._commands[id]) {
                signals.push(function() {
                  self.command(id).reset();
                  delete self._commands.attributes[id];
                  self.trigger("remove-command:" + id);
                });
              }
            });
          }
          _.each(attributes._commands, function(cmd, id) {
            // is it an existing command?
            var currentCmd;
            if (currentCmd = this.command(id)) {
              // assignment on purpose. DO NOT FIX.
              _.each(cmd, function(value, key) {
                if (key !== "properties") {
                  currentCmd.set(key, value);
                } else {
                  _.each(value, function(value, key) {
                    currentCmd.properties().set(key, value);
                  });
                }
              });
              if (!cmd.href) {
                currentCmd.set("href", self.url(), {
                  silent: true
                });
              }
            } else {
              // a new command?
              this._commands.set(id, new Command(cmd));
              var newCmd = this.command(id);
              newCmd._parentModel = self;
              _.each(newCmd.properties().attributes, function(value, key) {
                newCmd.properties().on("change:" + key, function(properties, value) {
                  self.trigger("change:" + key + ":" + id, newCmd, value);
                });
              });
              if (!cmd.href) {
                newCmd.set("href", self.url(), {
                  silent: true
                });
              }
              signals.push(function() {
                self.trigger("add-command:" + id);
              });
            }
          }, this);
          delete attributes._commands;
        }
        _.each(signals, function(fn) {
          fn();
        });
        return attributes;
      },
      toJSON: function() {
        var obj = {};
        _.each(this.attributes, function(attr, key) {
          if (attr && attr.isHyperbone) {
            obj[key] = attr.toJSON();
          } else if (attr || attr === 0 || attr === "") {
            obj[key] = attr;
          } else {
            obj[key] = "";
          }
        }, this);
        if (!_.isEmpty(this._links)) {
          obj._links = this.rels();
        }
        if (this._commands) {
          obj._commands = this._commands.toJSON();
        }
        return obj;
      },
      url: function(uri) {
        if (uri) {
          _.extend(this._links, {
            self: {
              href: uri
            }
          });
          return this;
        } else {
          if (this._links.self && this._links.self.href) {
            return this._links.self.href;
          }
          throw new Error("Not a hypermedia resource");
        }
      },
      get: function(attr) {
        if (this.attributes[attr] || this.attributes[attr] === 0 || this.attributes[attr] === "") {
          return this.attributes[attr];
        } else if (_.indexOf(attr, ".") !== -1 || /([a-zA-Z_]+)\[([0-9]+)\]/.test(attr)) {
          var parts = attr.split(".");
          attr = parts.shift();
          var remainder = parts.join(".");
          if (this.attributes[attr]) {
            return this.attributes[attr].get(remainder);
          } else {
            parts = attr.match(/([a-zA-Z_]+)\[([0-9]+)\]/);
            if (parts) {
              var index = parseInt(parts[2], 10);
              attr = parts[1];
              if (_.isNumber(index) && this.attributes[attr]) {
                if (remainder) {
                  return this.attributes[attr].at(index).get(remainder);
                } else {
                  return this.attributes[attr].at(index);
                }
              }
            } else {
              return null;
            }
          }
        }
        return null;
      },
      set: function(key, val, options) {
        var self = this;
        if (key && (key._links || key._commands || key._embedded)) {
          key = this.parseHypermedia(key);
        }
        var attr, attrs, unset, changes, silent, changing, prev, current, Proto, parts;
        if (key == null) return this;
        // Handle both `"key", value` and `{key: value}` -style arguments.
        if (typeof key === "object") {
          attrs = key;
          options = val;
        } else {
          (attrs = {})[key] = val;
        }
        options || (options = {});
        // Run validation.
        if (!this._validate(attrs, options)) return false;
        // Extract attributes and options.
        unset = options.unset;
        silent = options.silent;
        changes = [];
        changing = this._changing;
        noTraverse = options.noTraverse || false;
        ignoreDotNotation = options.ignoreDotNotation || false;
        this._changing = true;
        if (!changing) {
          this._previousAttributes = _.clone(this.attributes);
          this.changed = {};
        }
        current = this.attributes, prev = this._previousAttributes;
        // Check for changes of `id`.
        if (this.idAttribute in attrs) this.id = attrs[this.idAttribute];
        // Recursively call set on nested models and collections, if we're not
        // a brand new model
        if (!_.isEmpty(this.attributes)) {
          _.each(attrs, function(value, key) {
            // is it an object that currently exists in this model?
            if (_.isObject(value) && current[key] && current[key].isHyperbone) {
              // is it an array, and we have a matching collection?
              if (_.isArray(value) || current[key].models) {
                var Proto;
                // if we have a collection but it's not an array, make it an array
                value = _.isArray(value) ? value : [ value ];
                // if we have an array but current[key]is a model, make it a collection
                if (current[key].attributes) {
                  if (this._prototypes[attr]) {
                    Proto = this._prototypes[attr];
                  } else {
                    Proto = HyperboneModel;
                  }
                  // we want the default model to be a hyperbone model
                  // or whatever the user has selected as a prototype
                  var EmbeddedCollection = Collection.extend({
                    model: Proto
                  });
                  // create an embedded collection..
                  var collection = new EmbeddedCollection().add(current[key]);
                  current[key] = collection;
                }
                // if the existing collection or the array has no members...
                if (value.length === 0 || current[key].length === 0) {
                  // call reset to minimise the number of events fired
                  current[key].reset(value);
                } else if (current[key].length === value.length) {
                  // we do a straight change operation on each
                  current[key].each(function(model, index) {
                    model.set(value[index]);
                  });
                } else if (current[key].length > value.length) {
                  // we need to remove some models
                  var destroyers = [];
                  current[key].each(function(model, index) {
                    if (value[index]) {
                      model.set(value[index]);
                    } else {
                      destroyers.push(function() {
                        current[key].remove(model);
                      });
                    }
                  });
                  _.each(destroyers, function(fn) {
                    fn();
                  });
                } else {
                  // we need to add some models
                  _.each(value, function(value, index) {
                    if (current[key].at(index)) {
                      current[key].at(index).set(value);
                    } else {
                      current[key].add(value);
                    }
                  });
                }
                // clean up attributes
                delete attrs[key];
              } else {
                // it exists in the current model, but it's not an array 
                // so this is quite straightforward : recurse into set
                current[key].set(value);
                delete attrs[key];
              }
            }
          });
        }
        // having dealt with updating any nested models/collections, we 
        // now do set for attributes for this particular model
        _.each(attrs, function(val, attr) {
          // is the request a dot notation request?
          if (attr.indexOf(".") !== -1 && !ignoreDotNotation) {
            // break it up, recusively call set..
            parts = attr.split(".");
            attr = parts.pop();
            var path = parts.join(".");
            this.get(path).set(attr, val);
          } else {
            // is val an object?
            if (_.isObject(val) && !_.isArray(val)) {
              // is it a plain old javascript object?
              if (!val.isHyperbone && !noTraverse) {
                if (this._prototypes[attr]) {
                  Proto = this._prototypes[attr];
                } else {
                  Proto = HyperboneModel;
                }
                val = new Proto(val);
                val._parent = self;
              }
              if (val.on) {
                if (!val._trigger) {
                  val._trigger = val.trigger;
                  val.trigger = function(attr) {
                    return function() {
                      var args = Array.prototype.slice.call(arguments, 0);
                      this._trigger.apply(this, args);
                      args[0] = args[0] + ":" + attr;
                      self.trigger.apply(self, args);
                    };
                  }(attr);
                }
              }
            } else if (_.isArray(val)) {
              // we only want to convert a an array of objects
              // into a nested collection. Anything else is just added
              // as a javascript array.
              var containsJustObjects = true;
              _.each(val, function(element) {
                // deliberately making a function within a loop here
                if (!_.isObject(element)) containsJustObjects = false;
              });
              if (containsJustObjects) {
                var elements = [];
                // sort out our prototype
                if (this._prototypes[attr]) {
                  Proto = this._prototypes[attr];
                } else {
                  Proto = HyperboneModel;
                }
                // we want the default model to be a hyperbone model
                // or whatever the user has selected as a prototype
                var EmbeddedCollection = Collection.extend({
                  model: Proto
                });
                // create an embedded collection..
                var collection = new EmbeddedCollection();
                // add the array. Call reset so that we only get one event.
                collection.reset(val);
                // override the trigger method so we can efficently
                // cascade events to the parent model
                collection._trigger = collection.trigger;
                collection.trigger = function(attr) {
                  return function() {
                    var args = Array.prototype.slice.call(arguments, 0);
                    this._trigger.apply(this, args);
                    args[0] = args[0] + ":" + attr;
                    self.trigger.apply(self, args);
                  };
                }(attr);
                // update the reference to val
                val = collection;
              }
            }
          }
          if (!_.isEqual(current[attr], val)) changes.push(attr);
          if (!_.isEqual(prev[attr], val)) {
            this.changed[attr] = val;
          } else {
            delete this.changed[attr];
          }
          unset ? delete current[attr] : current[attr] = val;
        }, this);
        // Trigger all relevant attribute changes.
        if (!silent) {
          if (changes.length) this._pending = true;
          for (var i = 0, l = changes.length; i < l; i++) {
            this.trigger("change:" + changes[i], this, current[changes[i]], options);
          }
        }
        // You might be wondering why there's a `while` loop here. Changes can
        // be recursively nested within `"change"` events.
        if (changing) return this;
        if (!silent) {
          while (this._pending) {
            this._pending = false;
            this.trigger("change", this, options);
          }
        }
        this._pending = false;
        this._changing = false;
        return this;
      },
      rel: function(rel, data) {
        var link = this._links[rel] || {};
        if (!link) throw new Error("No such rel found");
        if (link.templated) {
          if (!data) throw new Error("No data provided to expand templated uri");
          return link.template.expand(data);
        }
        if (this._links && this._links[rel]) return this._links[rel].href ? this._links[rel].href : this._links[rel];
        return "";
      },
      rels: function() {
        return this._links;
      },
      fullyQualifiedRel: function(rel) {
        var parts = rel.split(":");
        return this._curies[parts[0]].expand({
          rel: parts[1]
        });
      },
      command: function(key) {
        var command;
        if (this._links[key] && this._commands) {
          var parts = this._links[key].href.split(/\//g);
          if (parts[0] === "#_commands" || parts[0] === "#commands" || parts[0] === "#command") parts = parts.slice(1);
          command = this._commands.get(parts.join("."));
        } else if (this._commands) {
          command = this._commands.get(key);
        }
        if (command) return command;
        return null;
      }
    });
    HyperboneModel.extend = BackboneModel.extend;
    Command = HyperboneModel.extend({
      defaults: {
        method: "",
        href: "",
        properties: {}
      },
      reset: function() {
        // completely remove all bound events before destroying.
        this.off();
        this.properties().off();
      },
      properties: function() {
        return this.get("properties");
      },
      pushTo: function(command) {
        var output = command.properties();
        var input = this.properties();
        _.each(output.attributes, function(value, key) {
          output.set(key, input.get(key));
        });
        return this;
      },
      pullFrom: function(command) {
        var output = this.properties();
        var input = command.properties();
        _.each(output.attributes, function(value, key) {
          if (input.get(key)) {
            output.set(key, input.get(key));
          }
        });
        return this;
      },
      pull: function() {
        var self = this;
        var props = this.properties();
        _.each(props.attributes, function(value, key) {
          props.set(key, self._parentModel.get(key));
        });
      },
      push: function() {
        var self = this;
        var props = this.properties();
        _.each(props.attributes, function(value, key) {
          self._parentModel.set(key, value);
        });
      }
    });
    module.exports.Model = HyperboneModel;
    module.exports.Collection = Collection;
  })
  require.register("backbone-events", function(exports, require, module) {
    //     Backbone.js 1.0.0
    //     (c) 2010-2013 Jeremy Ashkenas, DocumentCloud Inc.
    //     Backbone may be freely distributed under the MIT license.
    //     For all details and documentation:
    //     http://backbonejs.org
    // Backbone.Events
    // ---------------
    // A module that can be mixed in to *any object* in order to provide it with
    // custom events. You may bind with `on` or remove with `off` callback
    // functions to an event; `trigger`-ing an event fires all callbacks in
    // succession.
    //
    //     var object = {};
    //     _.extend(object, Backbone.Events);
    //     object.on('expand', function(){ alert('expanded'); });
    //     object.trigger('expand');
    //
    var array = [];
    var push = array.push;
    var slice = array.slice;
    var splice = array.splice;
    var _ = require("underscore");
    var Events = module.exports.Events = {
      // Bind an event to a `callback` function. Passing `"all"` will bind
      // the callback to all events fired.
      on: function(name, callback, context) {
        if (!eventsApi(this, "on", name, [ callback, context ]) || !callback) return this;
        this._events || (this._events = {});
        var events = this._events[name] || (this._events[name] = []);
        events.push({
          callback: callback,
          context: context,
          ctx: context || this
        });
        return this;
      },
      // Bind an event to only be triggered a single time. After the first time
      // the callback is invoked, it will be removed.
      once: function(name, callback, context) {
        if (!eventsApi(this, "once", name, [ callback, context ]) || !callback) return this;
        var self = this;
        var once = _.once(function() {
          self.off(name, once);
          callback.apply(this, arguments);
        });
        once._callback = callback;
        return this.on(name, once, context);
      },
      // Remove one or many callbacks. If `context` is null, removes all
      // callbacks with that function. If `callback` is null, removes all
      // callbacks for the event. If `name` is null, removes all bound
      // callbacks for all events.
      off: function(name, callback, context) {
        var retain, ev, events, names, i, l, j, k;
        if (!this._events || !eventsApi(this, "off", name, [ callback, context ])) return this;
        if (!name && !callback && !context) {
          this._events = {};
          return this;
        }
        names = name ? [ name ] : _.keys(this._events);
        for (i = 0, l = names.length; i < l; i++) {
          name = names[i];
          if (events = this._events[name]) {
            this._events[name] = retain = [];
            if (callback || context) {
              for (j = 0, k = events.length; j < k; j++) {
                ev = events[j];
                if (callback && callback !== ev.callback && callback !== ev.callback._callback || context && context !== ev.context) {
                  retain.push(ev);
                }
              }
            }
            if (!retain.length) delete this._events[name];
          }
        }
        return this;
      },
      // Trigger one or many events, firing all bound callbacks. Callbacks are
      // passed the same arguments as `trigger` is, apart from the event name
      // (unless you're listening on `"all"`, which will cause your callback to
      // receive the true name of the event as the first argument).
      trigger: function(name) {
        if (!this._events) return this;
        var args = slice.call(arguments, 1);
        if (!eventsApi(this, "trigger", name, args)) return this;
        var events = this._events[name];
        var allEvents = this._events.all;
        if (events) triggerEvents(events, args);
        if (allEvents) triggerEvents(allEvents, arguments);
        return this;
      },
      // Tell this object to stop listening to either specific events ... or
      // to every object it's currently listening to.
      stopListening: function(obj, name, callback) {
        var listeningTo = this._listeningTo;
        if (!listeningTo) return this;
        var remove = !name && !callback;
        if (!callback && typeof name === "object") callback = this;
        if (obj) (listeningTo = {})[obj._listenId] = obj;
        for (var id in listeningTo) {
          obj = listeningTo[id];
          obj.off(name, callback, this);
          if (remove || _.isEmpty(obj._events)) delete this._listeningTo[id];
        }
        return this;
      }
    };
    // Regular expression used to split event strings.
    var eventSplitter = /\s+/;
    // Implement fancy features of the Events API such as multiple event
    // names `"change blur"` and jQuery-style event maps `{change: action}`
    // in terms of the existing API.
    var eventsApi = function(obj, action, name, rest) {
      if (!name) return true;
      // Handle event maps.
      if (typeof name === "object") {
        for (var key in name) {
          obj[action].apply(obj, [ key, name[key] ].concat(rest));
        }
        return false;
      }
      // Handle space separated event names.
      if (eventSplitter.test(name)) {
        var names = name.split(eventSplitter);
        for (var i = 0, l = names.length; i < l; i++) {
          obj[action].apply(obj, [ names[i] ].concat(rest));
        }
        return false;
      }
      return true;
    };
    // A difficult-to-believe, but optimized internal dispatch function for
    // triggering events. Tries to keep the usual cases speedy (most internal
    // Backbone events have 3 arguments).
    var triggerEvents = function(events, args) {
      var ev, i = -1, l = events.length, a1 = args[0], a2 = args[1], a3 = args[2];
      switch (args.length) {
       case 0:
        while (++i < l) (ev = events[i]).callback.call(ev.ctx);
        return;

       case 1:
        while (++i < l) (ev = events[i]).callback.call(ev.ctx, a1);
        return;

       case 2:
        while (++i < l) (ev = events[i]).callback.call(ev.ctx, a1, a2);
        return;

       case 3:
        while (++i < l) (ev = events[i]).callback.call(ev.ctx, a1, a2, a3);
        return;

       default:
        while (++i < l) (ev = events[i]).callback.apply(ev.ctx, args);
      }
    };
    var listenMethods = {
      listenTo: "on",
      listenToOnce: "once"
    };
    // Inversion-of-control versions of `on` and `once`. Tell *this* object to
    // listen to an event in another object ... keeping track of what it's
    // listening to.
    _.each(listenMethods, function(implementation, method) {
      Events[method] = function(obj, name, callback) {
        var listeningTo = this._listeningTo || (this._listeningTo = {});
        var id = obj._listenId || (obj._listenId = _.uniqueId("l"));
        listeningTo[id] = obj;
        if (!callback && typeof name === "object") callback = this;
        obj[implementation](name, callback, this);
        return this;
      };
    });
    // Aliases for backwards compatibility.
    Events.bind = Events.on;
    Events.unbind = Events.off;
  })
  require.register("emitter", function(exports, require, module) {
    /**
 * Expose `Emitter`.
 */
    module.exports = Emitter;
    /**
 * Initialize a new `Emitter`.
 *
 * @api public
 */
    function Emitter(obj) {
      if (obj) return mixin(obj);
    }
    /**
 * Mixin the emitter properties.
 *
 * @param {Object} obj
 * @return {Object}
 * @api private
 */
    function mixin(obj) {
      for (var key in Emitter.prototype) {
        obj[key] = Emitter.prototype[key];
      }
      return obj;
    }
    /**
 * Listen on the given `event` with `fn`.
 *
 * @param {String} event
 * @param {Function} fn
 * @return {Emitter}
 * @api public
 */
    Emitter.prototype.on = Emitter.prototype.addEventListener = function(event, fn) {
      this._callbacks = this._callbacks || {};
      (this._callbacks[event] = this._callbacks[event] || []).push(fn);
      return this;
    };
    /**
 * Adds an `event` listener that will be invoked a single
 * time then automatically removed.
 *
 * @param {String} event
 * @param {Function} fn
 * @return {Emitter}
 * @api public
 */
    Emitter.prototype.once = function(event, fn) {
      var self = this;
      this._callbacks = this._callbacks || {};
      function on() {
        self.off(event, on);
        fn.apply(this, arguments);
      }
      on.fn = fn;
      this.on(event, on);
      return this;
    };
    /**
 * Remove the given callback for `event` or all
 * registered callbacks.
 *
 * @param {String} event
 * @param {Function} fn
 * @return {Emitter}
 * @api public
 */
    Emitter.prototype.off = Emitter.prototype.removeListener = Emitter.prototype.removeAllListeners = Emitter.prototype.removeEventListener = function(event, fn) {
      this._callbacks = this._callbacks || {};
      // all
      if (0 == arguments.length) {
        this._callbacks = {};
        return this;
      }
      // specific event
      var callbacks = this._callbacks[event];
      if (!callbacks) return this;
      // remove all handlers
      if (1 == arguments.length) {
        delete this._callbacks[event];
        return this;
      }
      // remove specific handler
      var cb;
      for (var i = 0; i < callbacks.length; i++) {
        cb = callbacks[i];
        if (cb === fn || cb.fn === fn) {
          callbacks.splice(i, 1);
          break;
        }
      }
      return this;
    };
    /**
 * Emit `event` with the given args.
 *
 * @param {String} event
 * @param {Mixed} ...
 * @return {Emitter}
 */
    Emitter.prototype.emit = function(event) {
      this._callbacks = this._callbacks || {};
      var args = [].slice.call(arguments, 1), callbacks = this._callbacks[event];
      if (callbacks) {
        callbacks = callbacks.slice(0);
        for (var i = 0, len = callbacks.length; i < len; ++i) {
          callbacks[i].apply(this, args);
        }
      }
      return this;
    };
    /**
 * Return array of callbacks for `event`.
 *
 * @param {String} event
 * @return {Array}
 * @api public
 */
    Emitter.prototype.listeners = function(event) {
      this._callbacks = this._callbacks || {};
      return this._callbacks[event] || [];
    };
    /**
 * Check if this emitter has `event` handlers.
 *
 * @param {String} event
 * @return {Boolean}
 * @api public
 */
    Emitter.prototype.hasListeners = function(event) {
      return !!this.listeners(event).length;
    };
  })
  require.register("reduce", function(exports, require, module) {
    /**
 * Reduce `arr` with `fn`.
 *
 * @param {Array} arr
 * @param {Function} fn
 * @param {Mixed} initial
 *
 * TODO: combatible error handling?
 */
    module.exports = function(arr, fn, initial) {
      var idx = 0;
      var len = arr.length;
      var curr = arguments.length == 3 ? initial : arr[idx++];
      while (idx < len) {
        curr = fn.call(null, curr, arr[idx], ++idx, arr);
      }
      return curr;
    };
  })
  require.register("superagent", function(exports, require, module) {
    /**
 * Module dependencies.
 */
    var Emitter = require("emitter");
    var reduce = require("reduce");
    /**
 * Root reference for iframes.
 */
    var root = "undefined" == typeof window ? this : window;
    /**
 * Noop.
 */
    function noop() {}
    /**
 * Check if `obj` is a host object,
 * we don't want to serialize these :)
 *
 * TODO: future proof, move to compoent land
 *
 * @param {Object} obj
 * @return {Boolean}
 * @api private
 */
    function isHost(obj) {
      var str = {}.toString.call(obj);
      switch (str) {
       case "[object File]":
       case "[object Blob]":
       case "[object FormData]":
        return true;

       default:
        return false;
      }
    }
    /**
 * Determine XHR.
 */
    function getXHR() {
      if (root.XMLHttpRequest && ("file:" != root.location.protocol || !root.ActiveXObject)) {
        return new XMLHttpRequest();
      } else {
        try {
          return new ActiveXObject("Microsoft.XMLHTTP");
        } catch (e) {}
        try {
          return new ActiveXObject("Msxml2.XMLHTTP.6.0");
        } catch (e) {}
        try {
          return new ActiveXObject("Msxml2.XMLHTTP.3.0");
        } catch (e) {}
        try {
          return new ActiveXObject("Msxml2.XMLHTTP");
        } catch (e) {}
      }
      return false;
    }
    /**
 * Removes leading and trailing whitespace, added to support IE.
 *
 * @param {String} s
 * @return {String}
 * @api private
 */
    var trim = "".trim ? function(s) {
      return s.trim();
    } : function(s) {
      return s.replace(/(^\s*|\s*$)/g, "");
    };
    /**
 * Check if `obj` is an object.
 *
 * @param {Object} obj
 * @return {Boolean}
 * @api private
 */
    function isObject(obj) {
      return obj === Object(obj);
    }
    /**
 * Serialize the given `obj`.
 *
 * @param {Object} obj
 * @return {String}
 * @api private
 */
    function serialize(obj) {
      if (!isObject(obj)) return obj;
      var pairs = [];
      for (var key in obj) {
        pairs.push(encodeURIComponent(key) + "=" + encodeURIComponent(obj[key]));
      }
      return pairs.join("&");
    }
    /**
 * Expose serialization method.
 */
    request.serializeObject = serialize;
    /**
  * Parse the given x-www-form-urlencoded `str`.
  *
  * @param {String} str
  * @return {Object}
  * @api private
  */
    function parseString(str) {
      var obj = {};
      var pairs = str.split("&");
      var parts;
      var pair;
      for (var i = 0, len = pairs.length; i < len; ++i) {
        pair = pairs[i];
        parts = pair.split("=");
        obj[decodeURIComponent(parts[0])] = decodeURIComponent(parts[1]);
      }
      return obj;
    }
    /**
 * Expose parser.
 */
    request.parseString = parseString;
    /**
 * Default MIME type map.
 *
 *     superagent.types.xml = 'application/xml';
 *
 */
    request.types = {
      html: "text/html",
      json: "application/json",
      urlencoded: "application/x-www-form-urlencoded",
      form: "application/x-www-form-urlencoded",
      "form-data": "application/x-www-form-urlencoded"
    };
    /**
 * Default serialization map.
 *
 *     superagent.serialize['application/xml'] = function(obj){
 *       return 'generated xml here';
 *     };
 *
 */
    request.serialize = {
      "application/x-www-form-urlencoded": serialize,
      "application/json": JSON.stringify
    };
    /**
  * Default parsers.
  *
  *     superagent.parse['application/xml'] = function(str){
  *       return { object parsed from str };
  *     };
  *
  */
    request.parse = {
      "application/x-www-form-urlencoded": parseString,
      "application/json": JSON.parse
    };
    /**
 * Parse the given header `str` into
 * an object containing the mapped fields.
 *
 * @param {String} str
 * @return {Object}
 * @api private
 */
    function parseHeader(str) {
      var lines = str.split(/\r?\n/);
      var fields = {};
      var index;
      var line;
      var field;
      var val;
      lines.pop();
      // trailing CRLF
      for (var i = 0, len = lines.length; i < len; ++i) {
        line = lines[i];
        index = line.indexOf(":");
        field = line.slice(0, index).toLowerCase();
        val = trim(line.slice(index + 1));
        fields[field] = val;
      }
      return fields;
    }
    /**
 * Return the mime type for the given `str`.
 *
 * @param {String} str
 * @return {String}
 * @api private
 */
    function type(str) {
      return str.split(/ *; */).shift();
    }
    /**
 * Return header field parameters.
 *
 * @param {String} str
 * @return {Object}
 * @api private
 */
    function params(str) {
      return reduce(str.split(/ *; */), function(obj, str) {
        var parts = str.split(/ *= */), key = parts.shift(), val = parts.shift();
        if (key && val) obj[key] = val;
        return obj;
      }, {});
    }
    /**
 * Initialize a new `Response` with the given `xhr`.
 *
 *  - set flags (.ok, .error, etc)
 *  - parse header
 *
 * Examples:
 *
 *  Aliasing `superagent` as `request` is nice:
 *
 *      request = superagent;
 *
 *  We can use the promise-like API, or pass callbacks:
 *
 *      request.get('/').end(function(res){});
 *      request.get('/', function(res){});
 *
 *  Sending data can be chained:
 *
 *      request
 *        .post('/user')
 *        .send({ name: 'tj' })
 *        .end(function(res){});
 *
 *  Or passed to `.send()`:
 *
 *      request
 *        .post('/user')
 *        .send({ name: 'tj' }, function(res){});
 *
 *  Or passed to `.post()`:
 *
 *      request
 *        .post('/user', { name: 'tj' })
 *        .end(function(res){});
 *
 * Or further reduced to a single call for simple cases:
 *
 *      request
 *        .post('/user', { name: 'tj' }, function(res){});
 *
 * @param {XMLHTTPRequest} xhr
 * @param {Object} options
 * @api private
 */
    function Response(req, options) {
      options = options || {};
      this.req = req;
      this.xhr = this.req.xhr;
      this.text = this.xhr.responseText;
      this.setStatusProperties(this.xhr.status);
      this.header = this.headers = parseHeader(this.xhr.getAllResponseHeaders());
      // getAllResponseHeaders sometimes falsely returns "" for CORS requests, but
      // getResponseHeader still works. so we get content-type even if getting
      // other headers fails.
      this.header["content-type"] = this.xhr.getResponseHeader("content-type");
      this.setHeaderProperties(this.header);
      this.body = this.req.method != "HEAD" ? this.parseBody(this.text) : null;
    }
    /**
 * Get case-insensitive `field` value.
 *
 * @param {String} field
 * @return {String}
 * @api public
 */
    Response.prototype.get = function(field) {
      return this.header[field.toLowerCase()];
    };
    /**
 * Set header related properties:
 *
 *   - `.type` the content type without params
 *
 * A response of "Content-Type: text/plain; charset=utf-8"
 * will provide you with a `.type` of "text/plain".
 *
 * @param {Object} header
 * @api private
 */
    Response.prototype.setHeaderProperties = function(header) {
      // content-type
      var ct = this.header["content-type"] || "";
      this.type = type(ct);
      // params
      var obj = params(ct);
      for (var key in obj) this[key] = obj[key];
    };
    /**
 * Parse the given body `str`.
 *
 * Used for auto-parsing of bodies. Parsers
 * are defined on the `superagent.parse` object.
 *
 * @param {String} str
 * @return {Mixed}
 * @api private
 */
    Response.prototype.parseBody = function(str) {
      var parse = request.parse[this.type];
      return parse ? parse(str) : null;
    };
    /**
 * Set flags such as `.ok` based on `status`.
 *
 * For example a 2xx response will give you a `.ok` of __true__
 * whereas 5xx will be __false__ and `.error` will be __true__. The
 * `.clientError` and `.serverError` are also available to be more
 * specific, and `.statusType` is the class of error ranging from 1..5
 * sometimes useful for mapping respond colors etc.
 *
 * "sugar" properties are also defined for common cases. Currently providing:
 *
 *   - .noContent
 *   - .badRequest
 *   - .unauthorized
 *   - .notAcceptable
 *   - .notFound
 *
 * @param {Number} status
 * @api private
 */
    Response.prototype.setStatusProperties = function(status) {
      var type = status / 100 | 0;
      // status / class
      this.status = status;
      this.statusType = type;
      // basics
      this.info = 1 == type;
      this.ok = 2 == type;
      this.clientError = 4 == type;
      this.serverError = 5 == type;
      this.error = 4 == type || 5 == type ? this.toError() : false;
      // sugar
      this.accepted = 202 == status;
      this.noContent = 204 == status || 1223 == status;
      this.badRequest = 400 == status;
      this.unauthorized = 401 == status;
      this.notAcceptable = 406 == status;
      this.notFound = 404 == status;
      this.forbidden = 403 == status;
    };
    /**
 * Return an `Error` representative of this response.
 *
 * @return {Error}
 * @api public
 */
    Response.prototype.toError = function() {
      var req = this.req;
      var method = req.method;
      var path = req.path;
      var msg = "cannot " + method + " " + path + " (" + this.status + ")";
      var err = new Error(msg);
      err.status = this.status;
      err.method = method;
      err.path = path;
      return err;
    };
    /**
 * Expose `Response`.
 */
    request.Response = Response;
    /**
 * Initialize a new `Request` with the given `method` and `url`.
 *
 * @param {String} method
 * @param {String} url
 * @api public
 */
    function Request(method, url) {
      var self = this;
      Emitter.call(this);
      this._query = this._query || [];
      this.method = method;
      this.url = url;
      this.header = {};
      this._header = {};
      this.on("end", function() {
        var res = new Response(self);
        if ("HEAD" == method) res.text = null;
        self.callback(null, res);
      });
    }
    /**
 * Mixin `Emitter`.
 */
    Emitter(Request.prototype);
    /**
 * Set timeout to `ms`.
 *
 * @param {Number} ms
 * @return {Request} for chaining
 * @api public
 */
    Request.prototype.timeout = function(ms) {
      this._timeout = ms;
      return this;
    };
    /**
 * Clear previous timeout.
 *
 * @return {Request} for chaining
 * @api public
 */
    Request.prototype.clearTimeout = function() {
      this._timeout = 0;
      clearTimeout(this._timer);
      return this;
    };
    /**
 * Abort the request, and clear potential timeout.
 *
 * @return {Request}
 * @api public
 */
    Request.prototype.abort = function() {
      if (this.aborted) return;
      this.aborted = true;
      this.xhr.abort();
      this.clearTimeout();
      this.emit("abort");
      return this;
    };
    /**
 * Set header `field` to `val`, or multiple fields with one object.
 *
 * Examples:
 *
 *      req.get('/')
 *        .set('Accept', 'application/json')
 *        .set('X-API-Key', 'foobar')
 *        .end(callback);
 *
 *      req.get('/')
 *        .set({ Accept: 'application/json', 'X-API-Key': 'foobar' })
 *        .end(callback);
 *
 * @param {String|Object} field
 * @param {String} val
 * @return {Request} for chaining
 * @api public
 */
    Request.prototype.set = function(field, val) {
      if (isObject(field)) {
        for (var key in field) {
          this.set(key, field[key]);
        }
        return this;
      }
      this._header[field.toLowerCase()] = val;
      this.header[field] = val;
      return this;
    };
    /**
 * Get case-insensitive header `field` value.
 *
 * @param {String} field
 * @return {String}
 * @api private
 */
    Request.prototype.getHeader = function(field) {
      return this._header[field.toLowerCase()];
    };
    /**
 * Set Content-Type to `type`, mapping values from `request.types`.
 *
 * Examples:
 *
 *      superagent.types.xml = 'application/xml';
 *
 *      request.post('/')
 *        .type('xml')
 *        .send(xmlstring)
 *        .end(callback);
 *
 *      request.post('/')
 *        .type('application/xml')
 *        .send(xmlstring)
 *        .end(callback);
 *
 * @param {String} type
 * @return {Request} for chaining
 * @api public
 */
    Request.prototype.type = function(type) {
      this.set("Content-Type", request.types[type] || type);
      return this;
    };
    /**
 * Set Authorization field value with `user` and `pass`.
 *
 * @param {String} user
 * @param {String} pass
 * @return {Request} for chaining
 * @api public
 */
    Request.prototype.auth = function(user, pass) {
      var str = btoa(user + ":" + pass);
      this.set("Authorization", "Basic " + str);
      return this;
    };
    /**
* Add query-string `val`.
*
* Examples:
*
*   request.get('/shoes')
*     .query('size=10')
*     .query({ color: 'blue' })
*
* @param {Object|String} val
* @return {Request} for chaining
* @api public
*/
    Request.prototype.query = function(val) {
      if ("string" != typeof val) val = serialize(val);
      if (val) this._query.push(val);
      return this;
    };
    /**
 * Send `data`, defaulting the `.type()` to "json" when
 * an object is given.
 *
 * Examples:
 *
 *       // querystring
 *       request.get('/search')
 *         .end(callback)
 *
 *       // multiple data "writes"
 *       request.get('/search')
 *         .send({ search: 'query' })
 *         .send({ range: '1..5' })
 *         .send({ order: 'desc' })
 *         .end(callback)
 *
 *       // manual json
 *       request.post('/user')
 *         .type('json')
 *         .send('{"name":"tj"})
 *         .end(callback)
 *
 *       // auto json
 *       request.post('/user')
 *         .send({ name: 'tj' })
 *         .end(callback)
 *
 *       // manual x-www-form-urlencoded
 *       request.post('/user')
 *         .type('form')
 *         .send('name=tj')
 *         .end(callback)
 *
 *       // auto x-www-form-urlencoded
 *       request.post('/user')
 *         .type('form')
 *         .send({ name: 'tj' })
 *         .end(callback)
 *
 *       // defaults to x-www-form-urlencoded
  *      request.post('/user')
  *        .send('name=tobi')
  *        .send('species=ferret')
  *        .end(callback)
 *
 * @param {String|Object} data
 * @return {Request} for chaining
 * @api public
 */
    Request.prototype.send = function(data) {
      var obj = isObject(data);
      var type = this.getHeader("Content-Type");
      // merge
      if (obj && isObject(this._data)) {
        for (var key in data) {
          this._data[key] = data[key];
        }
      } else if ("string" == typeof data) {
        if (!type) this.type("form");
        type = this.getHeader("Content-Type");
        if ("application/x-www-form-urlencoded" == type) {
          this._data = this._data ? this._data + "&" + data : data;
        } else {
          this._data = (this._data || "") + data;
        }
      } else {
        this._data = data;
      }
      if (!obj) return this;
      if (!type) this.type("json");
      return this;
    };
    /**
 * Invoke the callback with `err` and `res`
 * and handle arity check.
 *
 * @param {Error} err
 * @param {Response} res
 * @api private
 */
    Request.prototype.callback = function(err, res) {
      var fn = this._callback;
      if (2 == fn.length) return fn(err, res);
      if (err) return this.emit("error", err);
      fn(res);
    };
    /**
 * Invoke callback with x-domain error.
 *
 * @api private
 */
    Request.prototype.crossDomainError = function() {
      var err = new Error("Origin is not allowed by Access-Control-Allow-Origin");
      err.crossDomain = true;
      this.callback(err);
    };
    /**
 * Invoke callback with timeout error.
 *
 * @api private
 */
    Request.prototype.timeoutError = function() {
      var timeout = this._timeout;
      var err = new Error("timeout of " + timeout + "ms exceeded");
      err.timeout = timeout;
      this.callback(err);
    };
    /**
 * Enable transmission of cookies with x-domain requests.
 *
 * Note that for this to work the origin must not be
 * using "Access-Control-Allow-Origin" with a wildcard,
 * and also must set "Access-Control-Allow-Credentials"
 * to "true".
 *
 * @api public
 */
    Request.prototype.withCredentials = function() {
      this._withCredentials = true;
      return this;
    };
    /**
 * Initiate request, invoking callback `fn(res)`
 * with an instanceof `Response`.
 *
 * @param {Function} fn
 * @return {Request} for chaining
 * @api public
 */
    Request.prototype.end = function(fn) {
      var self = this;
      var xhr = this.xhr = getXHR();
      var query = this._query.join("&");
      var timeout = this._timeout;
      var data = this._data;
      // store callback
      this._callback = fn || noop;
      // CORS
      if (this._withCredentials) xhr.withCredentials = true;
      // state change
      xhr.onreadystatechange = function() {
        if (4 != xhr.readyState) return;
        if (0 == xhr.status) {
          if (self.aborted) return self.timeoutError();
          return self.crossDomainError();
        }
        self.emit("end");
      };
      // progress
      if (xhr.upload) {
        xhr.upload.onprogress = function(e) {
          e.percent = e.loaded / e.total * 100;
          self.emit("progress", e);
        };
      }
      // timeout
      if (timeout && !this._timer) {
        this._timer = setTimeout(function() {
          self.abort();
        }, timeout);
      }
      // querystring
      if (query) {
        query = request.serializeObject(query);
        this.url += ~this.url.indexOf("?") ? "&" + query : "?" + query;
      }
      // initiate request
      xhr.open(this.method, this.url, true);
      // body
      if ("GET" != this.method && "HEAD" != this.method && "string" != typeof data && !isHost(data)) {
        // serialize stuff
        var serialize = request.serialize[this.getHeader("Content-Type")];
        if (serialize) data = serialize(data);
      }
      // set header fields
      for (var field in this.header) {
        if (null == this.header[field]) continue;
        xhr.setRequestHeader(field, this.header[field]);
      }
      // send stuff
      xhr.send(data);
      return this;
    };
    /**
 * Expose `Request`.
 */
    request.Request = Request;
    /**
 * Issue a request:
 *
 * Examples:
 *
 *    request('GET', '/users').end(callback)
 *    request('/users').end(callback)
 *    request('/users', callback)
 *
 * @param {String} method
 * @param {String|Function} url or callback
 * @return {Request}
 * @api public
 */
    function request(method, url) {
      // callback
      if ("function" == typeof url) {
        return new Request("GET", method).end(url);
      }
      // url first
      if (1 == arguments.length) {
        return new Request("GET", method);
      }
      return new Request(method, url);
    }
    /**
 * GET `url` with optional callback `fn(res)`.
 *
 * @param {String} url
 * @param {Mixed|Function} data or fn
 * @param {Function} fn
 * @return {Request}
 * @api public
 */
    request.get = function(url, data, fn) {
      var req = request("GET", url);
      if ("function" == typeof data) fn = data, data = null;
      if (data) req.query(data);
      if (fn) req.end(fn);
      return req;
    };
    /**
 * HEAD `url` with optional callback `fn(res)`.
 *
 * @param {String} url
 * @param {Mixed|Function} data or fn
 * @param {Function} fn
 * @return {Request}
 * @api public
 */
    request.head = function(url, data, fn) {
      var req = request("HEAD", url);
      if ("function" == typeof data) fn = data, data = null;
      if (data) req.send(data);
      if (fn) req.end(fn);
      return req;
    };
    /**
 * DELETE `url` with optional callback `fn(res)`.
 *
 * @param {String} url
 * @param {Function} fn
 * @return {Request}
 * @api public
 */
    request.del = function(url, fn) {
      var req = request("DELETE", url);
      if (fn) req.end(fn);
      return req;
    };
    /**
 * PATCH `url` with optional `data` and callback `fn(res)`.
 *
 * @param {String} url
 * @param {Mixed} data
 * @param {Function} fn
 * @return {Request}
 * @api public
 */
    request.patch = function(url, data, fn) {
      var req = request("PATCH", url);
      if ("function" == typeof data) fn = data, data = null;
      if (data) req.send(data);
      if (fn) req.end(fn);
      return req;
    };
    /**
 * POST `url` with optional `data` and callback `fn(res)`.
 *
 * @param {String} url
 * @param {Mixed} data
 * @param {Function} fn
 * @return {Request}
 * @api public
 */
    request.post = function(url, data, fn) {
      var req = request("POST", url);
      if ("function" == typeof data) fn = data, data = null;
      if (data) req.send(data);
      if (fn) req.end(fn);
      return req;
    };
    /**
 * PUT `url` with optional `data` and callback `fn(res)`.
 *
 * @param {String} url
 * @param {Mixed|Function} data or fn
 * @param {Function} fn
 * @return {Request}
 * @api public
 */
    request.put = function(url, data, fn) {
      var req = request("PUT", url);
      if ("function" == typeof data) fn = data, data = null;
      if (data) req.send(data);
      if (fn) req.end(fn);
      return req;
    };
    /**
 * Expose `request`.
 */
    module.exports = request;
  })
  require.register("underscore", function(exports, require, module) {
    // Underscore.js 1.4.4
    // ===================
    // > http://underscorejs.org
    // > (c) 2009-2013 Jeremy Ashkenas, DocumentCloud Inc.
    // > Underscore may be freely distributed under the MIT license.
    // Baseline setup
    // --------------
    (function() {
      // Establish the root object, `window` in the browser, or `global` on the server.
      var root = this;
      // Save the previous value of the `_` variable.
      var previousUnderscore = root._;
      // Establish the object that gets returned to break out of a loop iteration.
      var breaker = {};
      // Save bytes in the minified (but not gzipped) version:
      var ArrayProto = Array.prototype, ObjProto = Object.prototype, FuncProto = Function.prototype;
      // Create quick reference variables for speed access to core prototypes.
      var push = ArrayProto.push, slice = ArrayProto.slice, concat = ArrayProto.concat, toString = ObjProto.toString, hasOwnProperty = ObjProto.hasOwnProperty;
      // All **ECMAScript 5** native function implementations that we hope to use
      // are declared here.
      var nativeForEach = ArrayProto.forEach, nativeMap = ArrayProto.map, nativeReduce = ArrayProto.reduce, nativeReduceRight = ArrayProto.reduceRight, nativeFilter = ArrayProto.filter, nativeEvery = ArrayProto.every, nativeSome = ArrayProto.some, nativeIndexOf = ArrayProto.indexOf, nativeLastIndexOf = ArrayProto.lastIndexOf, nativeIsArray = Array.isArray, nativeKeys = Object.keys, nativeBind = FuncProto.bind;
      // Create a safe reference to the Underscore object for use below.
      var _ = function(obj) {
        if (obj instanceof _) return obj;
        if (!(this instanceof _)) return new _(obj);
        this._wrapped = obj;
      };
      // Export the Underscore object for **Node.js**, with
      // backwards-compatibility for the old `require()` API. If we're in
      // the browser, add `_` as a global object via a string identifier,
      // for Closure Compiler "advanced" mode.
      if (typeof exports !== "undefined") {
        if (typeof module !== "undefined" && module.exports) {
          exports = module.exports = _;
        }
        exports._ = _;
      } else {
        root._ = _;
      }
      // Current version.
      _.VERSION = "1.4.4";
      // Collection Functions
      // --------------------
      // The cornerstone, an `each` implementation, aka `forEach`.
      // Handles objects with the built-in `forEach`, arrays, and raw objects.
      // Delegates to **ECMAScript 5**'s native `forEach` if available.
      var each = _.each = _.forEach = function(obj, iterator, context) {
        if (obj == null) return;
        if (nativeForEach && obj.forEach === nativeForEach) {
          obj.forEach(iterator, context);
        } else if (obj.length === +obj.length) {
          for (var i = 0, l = obj.length; i < l; i++) {
            if (iterator.call(context, obj[i], i, obj) === breaker) return;
          }
        } else {
          for (var key in obj) {
            if (_.has(obj, key)) {
              if (iterator.call(context, obj[key], key, obj) === breaker) return;
            }
          }
        }
      };
      // Return the results of applying the iterator to each element.
      // Delegates to **ECMAScript 5**'s native `map` if available.
      _.map = _.collect = function(obj, iterator, context) {
        var results = [];
        if (obj == null) return results;
        if (nativeMap && obj.map === nativeMap) return obj.map(iterator, context);
        each(obj, function(value, index, list) {
          results[results.length] = iterator.call(context, value, index, list);
        });
        return results;
      };
      var reduceError = "Reduce of empty array with no initial value";
      // **Reduce** builds up a single result from a list of values, aka `inject`,
      // or `foldl`. Delegates to **ECMAScript 5**'s native `reduce` if available.
      _.reduce = _.foldl = _.inject = function(obj, iterator, memo, context) {
        var initial = arguments.length > 2;
        if (obj == null) obj = [];
        if (nativeReduce && obj.reduce === nativeReduce) {
          if (context) iterator = _.bind(iterator, context);
          return initial ? obj.reduce(iterator, memo) : obj.reduce(iterator);
        }
        each(obj, function(value, index, list) {
          if (!initial) {
            memo = value;
            initial = true;
          } else {
            memo = iterator.call(context, memo, value, index, list);
          }
        });
        if (!initial) throw new TypeError(reduceError);
        return memo;
      };
      // The right-associative version of reduce, also known as `foldr`.
      // Delegates to **ECMAScript 5**'s native `reduceRight` if available.
      _.reduceRight = _.foldr = function(obj, iterator, memo, context) {
        var initial = arguments.length > 2;
        if (obj == null) obj = [];
        if (nativeReduceRight && obj.reduceRight === nativeReduceRight) {
          if (context) iterator = _.bind(iterator, context);
          return initial ? obj.reduceRight(iterator, memo) : obj.reduceRight(iterator);
        }
        var length = obj.length;
        if (length !== +length) {
          var keys = _.keys(obj);
          length = keys.length;
        }
        each(obj, function(value, index, list) {
          index = keys ? keys[--length] : --length;
          if (!initial) {
            memo = obj[index];
            initial = true;
          } else {
            memo = iterator.call(context, memo, obj[index], index, list);
          }
        });
        if (!initial) throw new TypeError(reduceError);
        return memo;
      };
      // Return the first value which passes a truth test. Aliased as `detect`.
      _.find = _.detect = function(obj, iterator, context) {
        var result;
        any(obj, function(value, index, list) {
          if (iterator.call(context, value, index, list)) {
            result = value;
            return true;
          }
        });
        return result;
      };
      // Return all the elements that pass a truth test.
      // Delegates to **ECMAScript 5**'s native `filter` if available.
      // Aliased as `select`.
      _.filter = _.select = function(obj, iterator, context) {
        var results = [];
        if (obj == null) return results;
        if (nativeFilter && obj.filter === nativeFilter) return obj.filter(iterator, context);
        each(obj, function(value, index, list) {
          if (iterator.call(context, value, index, list)) results[results.length] = value;
        });
        return results;
      };
      // Return all the elements for which a truth test fails.
      _.reject = function(obj, iterator, context) {
        return _.filter(obj, function(value, index, list) {
          return !iterator.call(context, value, index, list);
        }, context);
      };
      // Determine whether all of the elements match a truth test.
      // Delegates to **ECMAScript 5**'s native `every` if available.
      // Aliased as `all`.
      _.every = _.all = function(obj, iterator, context) {
        iterator || (iterator = _.identity);
        var result = true;
        if (obj == null) return result;
        if (nativeEvery && obj.every === nativeEvery) return obj.every(iterator, context);
        each(obj, function(value, index, list) {
          if (!(result = result && iterator.call(context, value, index, list))) return breaker;
        });
        return !!result;
      };
      // Determine if at least one element in the object matches a truth test.
      // Delegates to **ECMAScript 5**'s native `some` if available.
      // Aliased as `any`.
      var any = _.some = _.any = function(obj, iterator, context) {
        iterator || (iterator = _.identity);
        var result = false;
        if (obj == null) return result;
        if (nativeSome && obj.some === nativeSome) return obj.some(iterator, context);
        each(obj, function(value, index, list) {
          if (result || (result = iterator.call(context, value, index, list))) return breaker;
        });
        return !!result;
      };
      // Determine if the array or object contains a given value (using `===`).
      // Aliased as `include`.
      _.contains = _.include = function(obj, target) {
        if (obj == null) return false;
        if (nativeIndexOf && obj.indexOf === nativeIndexOf) return obj.indexOf(target) != -1;
        return any(obj, function(value) {
          return value === target;
        });
      };
      // Invoke a method (with arguments) on every item in a collection.
      _.invoke = function(obj, method) {
        var args = slice.call(arguments, 2);
        var isFunc = _.isFunction(method);
        return _.map(obj, function(value) {
          return (isFunc ? method : value[method]).apply(value, args);
        });
      };
      // Convenience version of a common use case of `map`: fetching a property.
      _.pluck = function(obj, key) {
        return _.map(obj, function(value) {
          return value[key];
        });
      };
      // Convenience version of a common use case of `filter`: selecting only objects
      // containing specific `key:value` pairs.
      _.where = function(obj, attrs, first) {
        if (_.isEmpty(attrs)) return first ? null : [];
        return _[first ? "find" : "filter"](obj, function(value) {
          for (var key in attrs) {
            if (attrs[key] !== value[key]) return false;
          }
          return true;
        });
      };
      // Convenience version of a common use case of `find`: getting the first object
      // containing specific `key:value` pairs.
      _.findWhere = function(obj, attrs) {
        return _.where(obj, attrs, true);
      };
      // Return the maximum element or (element-based computation).
      // Can't optimize arrays of integers longer than 65,535 elements.
      // See: https://bugs.webkit.org/show_bug.cgi?id=80797
      _.max = function(obj, iterator, context) {
        if (!iterator && _.isArray(obj) && obj[0] === +obj[0] && obj.length < 65535) {
          return Math.max.apply(Math, obj);
        }
        if (!iterator && _.isEmpty(obj)) return -Infinity;
        var result = {
          computed: -Infinity,
          value: -Infinity
        };
        each(obj, function(value, index, list) {
          var computed = iterator ? iterator.call(context, value, index, list) : value;
          computed >= result.computed && (result = {
            value: value,
            computed: computed
          });
        });
        return result.value;
      };
      // Return the minimum element (or element-based computation).
      _.min = function(obj, iterator, context) {
        if (!iterator && _.isArray(obj) && obj[0] === +obj[0] && obj.length < 65535) {
          return Math.min.apply(Math, obj);
        }
        if (!iterator && _.isEmpty(obj)) return Infinity;
        var result = {
          computed: Infinity,
          value: Infinity
        };
        each(obj, function(value, index, list) {
          var computed = iterator ? iterator.call(context, value, index, list) : value;
          computed < result.computed && (result = {
            value: value,
            computed: computed
          });
        });
        return result.value;
      };
      // Shuffle an array.
      _.shuffle = function(obj) {
        var rand;
        var index = 0;
        var shuffled = [];
        each(obj, function(value) {
          rand = _.random(index++);
          shuffled[index - 1] = shuffled[rand];
          shuffled[rand] = value;
        });
        return shuffled;
      };
      // An internal function to generate lookup iterators.
      var lookupIterator = function(value) {
        return _.isFunction(value) ? value : function(obj) {
          return obj[value];
        };
      };
      // Sort the object's values by a criterion produced by an iterator.
      _.sortBy = function(obj, value, context) {
        var iterator = lookupIterator(value);
        return _.pluck(_.map(obj, function(value, index, list) {
          return {
            value: value,
            index: index,
            criteria: iterator.call(context, value, index, list)
          };
        }).sort(function(left, right) {
          var a = left.criteria;
          var b = right.criteria;
          if (a !== b) {
            if (a > b || a === void 0) return 1;
            if (a < b || b === void 0) return -1;
          }
          return left.index < right.index ? -1 : 1;
        }), "value");
      };
      // An internal function used for aggregate "group by" operations.
      var group = function(obj, value, context, behavior) {
        var result = {};
        var iterator = lookupIterator(value || _.identity);
        each(obj, function(value, index) {
          var key = iterator.call(context, value, index, obj);
          behavior(result, key, value);
        });
        return result;
      };
      // Groups the object's values by a criterion. Pass either a string attribute
      // to group by, or a function that returns the criterion.
      _.groupBy = function(obj, value, context) {
        return group(obj, value, context, function(result, key, value) {
          (_.has(result, key) ? result[key] : result[key] = []).push(value);
        });
      };
      // Counts instances of an object that group by a certain criterion. Pass
      // either a string attribute to count by, or a function that returns the
      // criterion.
      _.countBy = function(obj, value, context) {
        return group(obj, value, context, function(result, key) {
          if (!_.has(result, key)) result[key] = 0;
          result[key]++;
        });
      };
      // Use a comparator function to figure out the smallest index at which
      // an object should be inserted so as to maintain order. Uses binary search.
      _.sortedIndex = function(array, obj, iterator, context) {
        iterator = iterator == null ? _.identity : lookupIterator(iterator);
        var value = iterator.call(context, obj);
        var low = 0, high = array.length;
        while (low < high) {
          var mid = low + high >>> 1;
          iterator.call(context, array[mid]) < value ? low = mid + 1 : high = mid;
        }
        return low;
      };
      // Safely convert anything iterable into a real, live array.
      _.toArray = function(obj) {
        if (!obj) return [];
        if (_.isArray(obj)) return slice.call(obj);
        if (obj.length === +obj.length) return _.map(obj, _.identity);
        return _.values(obj);
      };
      // Return the number of elements in an object.
      _.size = function(obj) {
        if (obj == null) return 0;
        return obj.length === +obj.length ? obj.length : _.keys(obj).length;
      };
      // Array Functions
      // ---------------
      // Get the first element of an array. Passing **n** will return the first N
      // values in the array. Aliased as `head` and `take`. The **guard** check
      // allows it to work with `_.map`.
      _.first = _.head = _.take = function(array, n, guard) {
        if (array == null) return void 0;
        return n != null && !guard ? slice.call(array, 0, n) : array[0];
      };
      // Returns everything but the last entry of the array. Especially useful on
      // the arguments object. Passing **n** will return all the values in
      // the array, excluding the last N. The **guard** check allows it to work with
      // `_.map`.
      _.initial = function(array, n, guard) {
        return slice.call(array, 0, array.length - (n == null || guard ? 1 : n));
      };
      // Get the last element of an array. Passing **n** will return the last N
      // values in the array. The **guard** check allows it to work with `_.map`.
      _.last = function(array, n, guard) {
        if (array == null) return void 0;
        if (n != null && !guard) {
          return slice.call(array, Math.max(array.length - n, 0));
        } else {
          return array[array.length - 1];
        }
      };
      // Returns everything but the first entry of the array. Aliased as `tail` and `drop`.
      // Especially useful on the arguments object. Passing an **n** will return
      // the rest N values in the array. The **guard**
      // check allows it to work with `_.map`.
      _.rest = _.tail = _.drop = function(array, n, guard) {
        return slice.call(array, n == null || guard ? 1 : n);
      };
      // Trim out all falsy values from an array.
      _.compact = function(array) {
        return _.filter(array, _.identity);
      };
      // Internal implementation of a recursive `flatten` function.
      var flatten = function(input, shallow, output) {
        each(input, function(value) {
          if (_.isArray(value)) {
            shallow ? push.apply(output, value) : flatten(value, shallow, output);
          } else {
            output.push(value);
          }
        });
        return output;
      };
      // Return a completely flattened version of an array.
      _.flatten = function(array, shallow) {
        return flatten(array, shallow, []);
      };
      // Return a version of the array that does not contain the specified value(s).
      _.without = function(array) {
        return _.difference(array, slice.call(arguments, 1));
      };
      // Produce a duplicate-free version of the array. If the array has already
      // been sorted, you have the option of using a faster algorithm.
      // Aliased as `unique`.
      _.uniq = _.unique = function(array, isSorted, iterator, context) {
        if (_.isFunction(isSorted)) {
          context = iterator;
          iterator = isSorted;
          isSorted = false;
        }
        var initial = iterator ? _.map(array, iterator, context) : array;
        var results = [];
        var seen = [];
        each(initial, function(value, index) {
          if (isSorted ? !index || seen[seen.length - 1] !== value : !_.contains(seen, value)) {
            seen.push(value);
            results.push(array[index]);
          }
        });
        return results;
      };
      // Produce an array that contains the union: each distinct element from all of
      // the passed-in arrays.
      _.union = function() {
        return _.uniq(concat.apply(ArrayProto, arguments));
      };
      // Produce an array that contains every item shared between all the
      // passed-in arrays.
      _.intersection = function(array) {
        var rest = slice.call(arguments, 1);
        return _.filter(_.uniq(array), function(item) {
          return _.every(rest, function(other) {
            return _.indexOf(other, item) >= 0;
          });
        });
      };
      // Take the difference between one array and a number of other arrays.
      // Only the elements present in just the first array will remain.
      _.difference = function(array) {
        var rest = concat.apply(ArrayProto, slice.call(arguments, 1));
        return _.filter(array, function(value) {
          return !_.contains(rest, value);
        });
      };
      // Zip together multiple lists into a single array -- elements that share
      // an index go together.
      _.zip = function() {
        var args = slice.call(arguments);
        var length = _.max(_.pluck(args, "length"));
        var results = new Array(length);
        for (var i = 0; i < length; i++) {
          results[i] = _.pluck(args, "" + i);
        }
        return results;
      };
      // Converts lists into objects. Pass either a single array of `[key, value]`
      // pairs, or two parallel arrays of the same length -- one of keys, and one of
      // the corresponding values.
      _.object = function(list, values) {
        if (list == null) return {};
        var result = {};
        for (var i = 0, l = list.length; i < l; i++) {
          if (values) {
            result[list[i]] = values[i];
          } else {
            result[list[i][0]] = list[i][1];
          }
        }
        return result;
      };
      // If the browser doesn't supply us with indexOf (I'm looking at you, **MSIE**),
      // we need this function. Return the position of the first occurrence of an
      // item in an array, or -1 if the item is not included in the array.
      // Delegates to **ECMAScript 5**'s native `indexOf` if available.
      // If the array is large and already in sort order, pass `true`
      // for **isSorted** to use binary search.
      _.indexOf = function(array, item, isSorted) {
        if (array == null) return -1;
        var i = 0, l = array.length;
        if (isSorted) {
          if (typeof isSorted == "number") {
            i = isSorted < 0 ? Math.max(0, l + isSorted) : isSorted;
          } else {
            i = _.sortedIndex(array, item);
            return array[i] === item ? i : -1;
          }
        }
        if (nativeIndexOf && array.indexOf === nativeIndexOf) return array.indexOf(item, isSorted);
        for (;i < l; i++) if (array[i] === item) return i;
        return -1;
      };
      // Delegates to **ECMAScript 5**'s native `lastIndexOf` if available.
      _.lastIndexOf = function(array, item, from) {
        if (array == null) return -1;
        var hasIndex = from != null;
        if (nativeLastIndexOf && array.lastIndexOf === nativeLastIndexOf) {
          return hasIndex ? array.lastIndexOf(item, from) : array.lastIndexOf(item);
        }
        var i = hasIndex ? from : array.length;
        while (i--) if (array[i] === item) return i;
        return -1;
      };
      // Generate an integer Array containing an arithmetic progression. A port of
      // the native Python `range()` function. See
      // [the Python documentation](http://docs.python.org/library/functions.html#range).
      _.range = function(start, stop, step) {
        if (arguments.length <= 1) {
          stop = start || 0;
          start = 0;
        }
        step = arguments[2] || 1;
        var len = Math.max(Math.ceil((stop - start) / step), 0);
        var idx = 0;
        var range = new Array(len);
        while (idx < len) {
          range[idx++] = start;
          start += step;
        }
        return range;
      };
      // Function (ahem) Functions
      // ------------------
      // Create a function bound to a given object (assigning `this`, and arguments,
      // optionally). Delegates to **ECMAScript 5**'s native `Function.bind` if
      // available.
      _.bind = function(func, context) {
        if (func.bind === nativeBind && nativeBind) return nativeBind.apply(func, slice.call(arguments, 1));
        var args = slice.call(arguments, 2);
        return function() {
          return func.apply(context, args.concat(slice.call(arguments)));
        };
      };
      // Partially apply a function by creating a version that has had some of its
      // arguments pre-filled, without changing its dynamic `this` context.
      _.partial = function(func) {
        var args = slice.call(arguments, 1);
        return function() {
          return func.apply(this, args.concat(slice.call(arguments)));
        };
      };
      // Bind all of an object's methods to that object. Useful for ensuring that
      // all callbacks defined on an object belong to it.
      _.bindAll = function(obj) {
        var funcs = slice.call(arguments, 1);
        if (funcs.length === 0) funcs = _.functions(obj);
        each(funcs, function(f) {
          obj[f] = _.bind(obj[f], obj);
        });
        return obj;
      };
      // Memoize an expensive function by storing its results.
      _.memoize = function(func, hasher) {
        var memo = {};
        hasher || (hasher = _.identity);
        return function() {
          var key = hasher.apply(this, arguments);
          return _.has(memo, key) ? memo[key] : memo[key] = func.apply(this, arguments);
        };
      };
      // Delays a function for the given number of milliseconds, and then calls
      // it with the arguments supplied.
      _.delay = function(func, wait) {
        var args = slice.call(arguments, 2);
        return setTimeout(function() {
          return func.apply(null, args);
        }, wait);
      };
      // Defers a function, scheduling it to run after the current call stack has
      // cleared.
      _.defer = function(func) {
        return _.delay.apply(_, [ func, 1 ].concat(slice.call(arguments, 1)));
      };
      // Returns a function, that, when invoked, will only be triggered at most once
      // during a given window of time.
      _.throttle = function(func, wait) {
        var context, args, timeout, result;
        var previous = 0;
        var later = function() {
          previous = new Date();
          timeout = null;
          result = func.apply(context, args);
        };
        return function() {
          var now = new Date();
          var remaining = wait - (now - previous);
          context = this;
          args = arguments;
          if (remaining <= 0) {
            clearTimeout(timeout);
            timeout = null;
            previous = now;
            result = func.apply(context, args);
          } else if (!timeout) {
            timeout = setTimeout(later, remaining);
          }
          return result;
        };
      };
      // Returns a function, that, as long as it continues to be invoked, will not
      // be triggered. The function will be called after it stops being called for
      // N milliseconds. If `immediate` is passed, trigger the function on the
      // leading edge, instead of the trailing.
      _.debounce = function(func, wait, immediate) {
        var timeout, result;
        return function() {
          var context = this, args = arguments;
          var later = function() {
            timeout = null;
            if (!immediate) result = func.apply(context, args);
          };
          var callNow = immediate && !timeout;
          clearTimeout(timeout);
          timeout = setTimeout(later, wait);
          if (callNow) result = func.apply(context, args);
          return result;
        };
      };
      // Returns a function that will be executed at most one time, no matter how
      // often you call it. Useful for lazy initialization.
      _.once = function(func) {
        var ran = false, memo;
        return function() {
          if (ran) return memo;
          ran = true;
          memo = func.apply(this, arguments);
          func = null;
          return memo;
        };
      };
      // Returns the first function passed as an argument to the second,
      // allowing you to adjust arguments, run code before and after, and
      // conditionally execute the original function.
      _.wrap = function(func, wrapper) {
        return function() {
          var args = [ func ];
          push.apply(args, arguments);
          return wrapper.apply(this, args);
        };
      };
      // Returns a function that is the composition of a list of functions, each
      // consuming the return value of the function that follows.
      _.compose = function() {
        var funcs = arguments;
        return function() {
          var args = arguments;
          for (var i = funcs.length - 1; i >= 0; i--) {
            args = [ funcs[i].apply(this, args) ];
          }
          return args[0];
        };
      };
      // Returns a function that will only be executed after being called N times.
      _.after = function(times, func) {
        if (times <= 0) return func();
        return function() {
          if (--times < 1) {
            return func.apply(this, arguments);
          }
        };
      };
      // Object Functions
      // ----------------
      // Retrieve the names of an object's properties.
      // Delegates to **ECMAScript 5**'s native `Object.keys`
      _.keys = nativeKeys || function(obj) {
        if (obj !== Object(obj)) throw new TypeError("Invalid object");
        var keys = [];
        for (var key in obj) if (_.has(obj, key)) keys[keys.length] = key;
        return keys;
      };
      // Retrieve the values of an object's properties.
      _.values = function(obj) {
        var values = [];
        for (var key in obj) if (_.has(obj, key)) values.push(obj[key]);
        return values;
      };
      // Convert an object into a list of `[key, value]` pairs.
      _.pairs = function(obj) {
        var pairs = [];
        for (var key in obj) if (_.has(obj, key)) pairs.push([ key, obj[key] ]);
        return pairs;
      };
      // Invert the keys and values of an object. The values must be serializable.
      _.invert = function(obj) {
        var result = {};
        for (var key in obj) if (_.has(obj, key)) result[obj[key]] = key;
        return result;
      };
      // Return a sorted list of the function names available on the object.
      // Aliased as `methods`
      _.functions = _.methods = function(obj) {
        var names = [];
        for (var key in obj) {
          if (_.isFunction(obj[key])) names.push(key);
        }
        return names.sort();
      };
      // Extend a given object with all the properties in passed-in object(s).
      _.extend = function(obj) {
        each(slice.call(arguments, 1), function(source) {
          if (source) {
            for (var prop in source) {
              obj[prop] = source[prop];
            }
          }
        });
        return obj;
      };
      // Return a copy of the object only containing the whitelisted properties.
      _.pick = function(obj) {
        var copy = {};
        var keys = concat.apply(ArrayProto, slice.call(arguments, 1));
        each(keys, function(key) {
          if (key in obj) copy[key] = obj[key];
        });
        return copy;
      };
      // Return a copy of the object without the blacklisted properties.
      _.omit = function(obj) {
        var copy = {};
        var keys = concat.apply(ArrayProto, slice.call(arguments, 1));
        for (var key in obj) {
          if (!_.contains(keys, key)) copy[key] = obj[key];
        }
        return copy;
      };
      // Fill in a given object with default properties.
      _.defaults = function(obj) {
        each(slice.call(arguments, 1), function(source) {
          if (source) {
            for (var prop in source) {
              if (obj[prop] == null) obj[prop] = source[prop];
            }
          }
        });
        return obj;
      };
      // Create a (shallow-cloned) duplicate of an object.
      _.clone = function(obj) {
        if (!_.isObject(obj)) return obj;
        return _.isArray(obj) ? obj.slice() : _.extend({}, obj);
      };
      // Invokes interceptor with the obj, and then returns obj.
      // The primary purpose of this method is to "tap into" a method chain, in
      // order to perform operations on intermediate results within the chain.
      _.tap = function(obj, interceptor) {
        interceptor(obj);
        return obj;
      };
      // Internal recursive comparison function for `isEqual`.
      var eq = function(a, b, aStack, bStack) {
        // Identical objects are equal. `0 === -0`, but they aren't identical.
        // See the Harmony `egal` proposal: http://wiki.ecmascript.org/doku.php?id=harmony:egal.
        if (a === b) return a !== 0 || 1 / a == 1 / b;
        // A strict comparison is necessary because `null == undefined`.
        if (a == null || b == null) return a === b;
        // Unwrap any wrapped objects.
        if (a instanceof _) a = a._wrapped;
        if (b instanceof _) b = b._wrapped;
        // Compare `[[Class]]` names.
        var className = toString.call(a);
        if (className != toString.call(b)) return false;
        switch (className) {
         // Strings, numbers, dates, and booleans are compared by value.
          case "[object String]":
          // Primitives and their corresponding object wrappers are equivalent; thus, `"5"` is
          // equivalent to `new String("5")`.
          return a == String(b);

         case "[object Number]":
          // `NaN`s are equivalent, but non-reflexive. An `egal` comparison is performed for
          // other numeric values.
          return a != +a ? b != +b : a == 0 ? 1 / a == 1 / b : a == +b;

         case "[object Date]":
         case "[object Boolean]":
          // Coerce dates and booleans to numeric primitive values. Dates are compared by their
          // millisecond representations. Note that invalid dates with millisecond representations
          // of `NaN` are not equivalent.
          return +a == +b;

         // RegExps are compared by their source patterns and flags.
          case "[object RegExp]":
          return a.source == b.source && a.global == b.global && a.multiline == b.multiline && a.ignoreCase == b.ignoreCase;
        }
        if (typeof a != "object" || typeof b != "object") return false;
        // Assume equality for cyclic structures. The algorithm for detecting cyclic
        // structures is adapted from ES 5.1 section 15.12.3, abstract operation `JO`.
        var length = aStack.length;
        while (length--) {
          // Linear search. Performance is inversely proportional to the number of
          // unique nested structures.
          if (aStack[length] == a) return bStack[length] == b;
        }
        // Add the first object to the stack of traversed objects.
        aStack.push(a);
        bStack.push(b);
        var size = 0, result = true;
        // Recursively compare objects and arrays.
        if (className == "[object Array]") {
          // Compare array lengths to determine if a deep comparison is necessary.
          size = a.length;
          result = size == b.length;
          if (result) {
            // Deep compare the contents, ignoring non-numeric properties.
            while (size--) {
              if (!(result = eq(a[size], b[size], aStack, bStack))) break;
            }
          }
        } else {
          // Objects with different constructors are not equivalent, but `Object`s
          // from different frames are.
          var aCtor = a.constructor, bCtor = b.constructor;
          if (aCtor !== bCtor && !(_.isFunction(aCtor) && aCtor instanceof aCtor && _.isFunction(bCtor) && bCtor instanceof bCtor)) {
            return false;
          }
          // Deep compare objects.
          for (var key in a) {
            if (_.has(a, key)) {
              // Count the expected number of properties.
              size++;
              // Deep compare each member.
              if (!(result = _.has(b, key) && eq(a[key], b[key], aStack, bStack))) break;
            }
          }
          // Ensure that both objects contain the same number of properties.
          if (result) {
            for (key in b) {
              if (_.has(b, key) && !size--) break;
            }
            result = !size;
          }
        }
        // Remove the first object from the stack of traversed objects.
        aStack.pop();
        bStack.pop();
        return result;
      };
      // Perform a deep comparison to check if two objects are equal.
      _.isEqual = function(a, b) {
        return eq(a, b, [], []);
      };
      // Is a given array, string, or object empty?
      // An "empty" object has no enumerable own-properties.
      _.isEmpty = function(obj) {
        if (obj == null) return true;
        if (_.isArray(obj) || _.isString(obj)) return obj.length === 0;
        for (var key in obj) if (_.has(obj, key)) return false;
        return true;
      };
      // Is a given value a DOM element?
      _.isElement = function(obj) {
        return !!(obj && obj.nodeType === 1);
      };
      // Is a given value an array?
      // Delegates to ECMA5's native Array.isArray
      _.isArray = nativeIsArray || function(obj) {
        return toString.call(obj) == "[object Array]";
      };
      // Is a given variable an object?
      _.isObject = function(obj) {
        return obj === Object(obj);
      };
      // Add some isType methods: isArguments, isFunction, isString, isNumber, isDate, isRegExp.
      each([ "Arguments", "Function", "String", "Number", "Date", "RegExp" ], function(name) {
        _["is" + name] = function(obj) {
          return toString.call(obj) == "[object " + name + "]";
        };
      });
      // Define a fallback version of the method in browsers (ahem, IE), where
      // there isn't any inspectable "Arguments" type.
      if (!_.isArguments(arguments)) {
        _.isArguments = function(obj) {
          return !!(obj && _.has(obj, "callee"));
        };
      }
      // Optimize `isFunction` if appropriate.
      if (typeof /./ !== "function") {
        _.isFunction = function(obj) {
          return typeof obj === "function";
        };
      }
      // Is a given object a finite number?
      _.isFinite = function(obj) {
        return isFinite(obj) && !isNaN(parseFloat(obj));
      };
      // Is the given value `NaN`? (NaN is the only number which does not equal itself).
      _.isNaN = function(obj) {
        return _.isNumber(obj) && obj != +obj;
      };
      // Is a given value a boolean?
      _.isBoolean = function(obj) {
        return obj === true || obj === false || toString.call(obj) == "[object Boolean]";
      };
      // Is a given value equal to null?
      _.isNull = function(obj) {
        return obj === null;
      };
      // Is a given variable undefined?
      _.isUndefined = function(obj) {
        return obj === void 0;
      };
      // Shortcut function for checking if an object has a given property directly
      // on itself (in other words, not on a prototype).
      _.has = function(obj, key) {
        return hasOwnProperty.call(obj, key);
      };
      // Utility Functions
      // -----------------
      // Run Underscore.js in *noConflict* mode, returning the `_` variable to its
      // previous owner. Returns a reference to the Underscore object.
      _.noConflict = function() {
        root._ = previousUnderscore;
        return this;
      };
      // Keep the identity function around for default iterators.
      _.identity = function(value) {
        return value;
      };
      // Run a function **n** times.
      _.times = function(n, iterator, context) {
        var accum = Array(n);
        for (var i = 0; i < n; i++) accum[i] = iterator.call(context, i);
        return accum;
      };
      // Return a random integer between min and max (inclusive).
      _.random = function(min, max) {
        if (max == null) {
          max = min;
          min = 0;
        }
        return min + Math.floor(Math.random() * (max - min + 1));
      };
      // List of HTML entities for escaping.
      var entityMap = {
        escape: {
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#x27;",
          "/": "&#x2F;"
        }
      };
      entityMap.unescape = _.invert(entityMap.escape);
      // Regexes containing the keys and values listed immediately above.
      var entityRegexes = {
        escape: new RegExp("[" + _.keys(entityMap.escape).join("") + "]", "g"),
        unescape: new RegExp("(" + _.keys(entityMap.unescape).join("|") + ")", "g")
      };
      // Functions for escaping and unescaping strings to/from HTML interpolation.
      _.each([ "escape", "unescape" ], function(method) {
        _[method] = function(string) {
          if (string == null) return "";
          return ("" + string).replace(entityRegexes[method], function(match) {
            return entityMap[method][match];
          });
        };
      });
      // If the value of the named property is a function then invoke it;
      // otherwise, return it.
      _.result = function(object, property) {
        if (object == null) return null;
        var value = object[property];
        return _.isFunction(value) ? value.call(object) : value;
      };
      // Add your own custom functions to the Underscore object.
      _.mixin = function(obj) {
        each(_.functions(obj), function(name) {
          var func = _[name] = obj[name];
          _.prototype[name] = function() {
            var args = [ this._wrapped ];
            push.apply(args, arguments);
            return result.call(this, func.apply(_, args));
          };
        });
      };
      // Generate a unique integer id (unique within the entire client session).
      // Useful for temporary DOM ids.
      var idCounter = 0;
      _.uniqueId = function(prefix) {
        var id = ++idCounter + "";
        return prefix ? prefix + id : id;
      };
      // By default, Underscore uses ERB-style template delimiters, change the
      // following template settings to use alternative delimiters.
      _.templateSettings = {
        evaluate: /<%([\s\S]+?)%>/g,
        interpolate: /<%=([\s\S]+?)%>/g,
        escape: /<%-([\s\S]+?)%>/g
      };
      // When customizing `templateSettings`, if you don't want to define an
      // interpolation, evaluation or escaping regex, we need one that is
      // guaranteed not to match.
      var noMatch = /(.)^/;
      // Certain characters need to be escaped so that they can be put into a
      // string literal.
      var escapes = {
        "'": "'",
        "\\": "\\",
        "\r": "r",
        "\n": "n",
        "	": "t",
        "\u2028": "u2028",
        "\u2029": "u2029"
      };
      var escaper = /\\|'|\r|\n|\t|\u2028|\u2029/g;
      // JavaScript micro-templating, similar to John Resig's implementation.
      // Underscore templating handles arbitrary delimiters, preserves whitespace,
      // and correctly escapes quotes within interpolated code.
      _.template = function(text, data, settings) {
        var render;
        settings = _.defaults({}, settings, _.templateSettings);
        // Combine delimiters into one regular expression via alternation.
        var matcher = new RegExp([ (settings.escape || noMatch).source, (settings.interpolate || noMatch).source, (settings.evaluate || noMatch).source ].join("|") + "|$", "g");
        // Compile the template source, escaping string literals appropriately.
        var index = 0;
        var source = "__p+='";
        text.replace(matcher, function(match, escape, interpolate, evaluate, offset) {
          source += text.slice(index, offset).replace(escaper, function(match) {
            return "\\" + escapes[match];
          });
          if (escape) {
            source += "'+\n((__t=(" + escape + "))==null?'':_.escape(__t))+\n'";
          }
          if (interpolate) {
            source += "'+\n((__t=(" + interpolate + "))==null?'':__t)+\n'";
          }
          if (evaluate) {
            source += "';\n" + evaluate + "\n__p+='";
          }
          index = offset + match.length;
          return match;
        });
        source += "';\n";
        // If a variable is not specified, place data values in local scope.
        if (!settings.variable) source = "with(obj||{}){\n" + source + "}\n";
        source = "var __t,__p='',__j=Array.prototype.join," + "print=function(){__p+=__j.call(arguments,'');};\n" + source + "return __p;\n";
        try {
          render = new Function(settings.variable || "obj", "_", source);
        } catch (e) {
          e.source = source;
          throw e;
        }
        if (data) return render(data, _);
        var template = function(data) {
          return render.call(this, data, _);
        };
        // Provide the compiled function source as a convenience for precompilation.
        template.source = "function(" + (settings.variable || "obj") + "){\n" + source + "}";
        return template;
      };
      // Add a "chain" function, which will delegate to the wrapper.
      _.chain = function(obj) {
        return _(obj).chain();
      };
      // OOP
      // ---------------
      // If Underscore is called as a function, it returns a wrapped object that
      // can be used OO-style. This wrapper holds altered versions of all the
      // underscore functions. Wrapped objects may be chained.
      // Helper function to continue chaining intermediate results.
      var result = function(obj) {
        return this._chain ? _(obj).chain() : obj;
      };
      // Add all of the Underscore functions to the wrapper object.
      _.mixin(_);
      // Add all mutator Array functions to the wrapper.
      each([ "pop", "push", "reverse", "shift", "sort", "splice", "unshift" ], function(name) {
        var method = ArrayProto[name];
        _.prototype[name] = function() {
          var obj = this._wrapped;
          method.apply(obj, arguments);
          if ((name == "shift" || name == "splice") && obj.length === 0) delete obj[0];
          return result.call(this, obj);
        };
      });
      // Add all accessor Array functions to the wrapper.
      each([ "concat", "join", "slice" ], function(name) {
        var method = ArrayProto[name];
        _.prototype[name] = function() {
          return result.call(this, method.apply(this._wrapped, arguments));
        };
      });
      _.extend(_.prototype, {
        // Start chaining a wrapped Underscore object.
        chain: function() {
          this._chain = true;
          return this;
        },
        // Extracts the result from a wrapped and chained object.
        value: function() {
          return this._wrapped;
        }
      });
    }).call(this);
  })
  require.register("hyperbone-model-with-io", function(exports, require, module) {
    var request = require("superagent");
    var _ = require("underscore");
    module.exports.Model = require("hyperbone-model").Model.extend({
      fetch: function(uri) {
        var self = this;
        if (uri) this.url(uri);
        request.get(this.url()).set("Accept", "application/json").set("If-None-Match", self.__etag || "").end(function(res) {
          // for GET we only want a 200
          if (res.status == 200) {
            if (res.header.etag) {
              self.__etag = res.header.etag;
            }
            self.reinit(res.body);
            self.trigger("sync", self, res);
          } else if (res.status === 304) {
            self.trigger("sync", self, res);
          } else {
            self.trigger("sync-error", res.status, res);
          }
        });
      },
      execute: function(command, callback) {
        var fn;
        var cmd = this.command(command);
        var self = this;
        if (_.isFunction(callback)) {
          fn = function(res) {
            if (res.status == 200 || res.status == 201 || res.status == 202) {
              self.trigger("executed", cmd);
              callback(false, res);
            } else {
              self.trigger("execution-failed", cmd, res);
              callback(res.status, res);
            }
          };
        } else {
          fn = function(res) {
            if (res.status == 200 || res.status == 201 || res.status == 202) {
              self.trigger("executed", cmd);
              self.fetch();
            } else {
              self.trigger("execution-failed", res.status, cmd, res);
            }
          };
        }
        if (cmd._files) {
          var formData = new FormData();
          var xhr = new XMLHttpRequest();
          var data = cmd.properties().toJSON();
          _.each(data, function(value, key) {
            if (cmd._files[key]) {
              formData.append(key, cmd._files[key]);
            } else {
              formData.append(key, value);
            }
          });
          xhr.upload.addEventListener("progress", function(event) {
            if (event.lengthComputable) {
              self.trigger("progress", cmd, event.loaded, event.total);
            }
          }, false);
          xhr.open("POST", cmd.get("href"));
          xhr.addEventListener("readystatechange", function(event) {
            if (xhr.readyState === 4) {
              fn(xhr);
            }
          }, false);
          xhr.setRequestHeader("Accept", "application/json");
          xhr.send(formData);
        } else {
          var encoding = "json";
          if (cmd.get("encoding") && cmd.get("encoding").indexOf("x-www-form-urlencoded")) encoding = "form";
          request(cmd.get("method") || "GET", cmd.get("href")).set("Accept", "application/json").type(encoding).send(cmd.properties().toJSON()).end(function(res) {
            fn(res);
          });
        }
      }
    });
  })
  require.register("type", function(exports, require, module) {
    /**
 * toString ref.
 */
    var toString = Object.prototype.toString;
    /**
 * Return the type of `val`.
 *
 * @param {Mixed} val
 * @return {String}
 * @api public
 */
    module.exports = function(val) {
      switch (toString.call(val)) {
       case "[object Function]":
        return "function";

       case "[object Date]":
        return "date";

       case "[object RegExp]":
        return "regexp";

       case "[object Arguments]":
        return "arguments";

       case "[object Array]":
        return "array";

       case "[object String]":
        return "string";
      }
      if (val === null) return "null";
      if (val === undefined) return "undefined";
      if (val && val.nodeType === 1) return "element";
      if (val === Object(val)) return "object";
      return typeof val;
    };
  })
  require.register("event", function(exports, require, module) {
    var bind = window.addEventListener ? "addEventListener" : "attachEvent", unbind = window.removeEventListener ? "removeEventListener" : "detachEvent", prefix = bind !== "addEventListener" ? "on" : "";
    /**
 * Bind `el` event `type` to `fn`.
 *
 * @param {Element} el
 * @param {String} type
 * @param {Function} fn
 * @param {Boolean} capture
 * @return {Function}
 * @api public
 */
    exports.bind = function(el, type, fn, capture) {
      el[bind](prefix + type, fn, capture || false);
      return fn;
    };
    /**
 * Unbind `el` event `type`'s callback `fn`.
 *
 * @param {Element} el
 * @param {String} type
 * @param {Function} fn
 * @param {Boolean} capture
 * @return {Function}
 * @api public
 */
    exports.unbind = function(el, type, fn, capture) {
      el[unbind](prefix + type, fn, capture || false);
      return fn;
    };
  })
  require.register("delegate", function(exports, require, module) {
    /**
 * Module dependencies.
 */
    var matches = require("matches-selector"), event = require("event");
    /**
 * Delegate event `type` to `selector`
 * and invoke `fn(e)`. A callback function
 * is returned which may be passed to `.unbind()`.
 *
 * @param {Element} el
 * @param {String} selector
 * @param {String} type
 * @param {Function} fn
 * @param {Boolean} capture
 * @return {Function}
 * @api public
 */
    exports.bind = function(el, selector, type, fn, capture) {
      return event.bind(el, type, function(e) {
        if (matches(e.target, selector)) fn(e);
      }, capture);
      return callback;
    };
    /**
 * Unbind event `type`'s callback `fn`.
 *
 * @param {Element} el
 * @param {String} type
 * @param {Function} fn
 * @param {Boolean} capture
 * @api public
 */
    exports.unbind = function(el, type, fn, capture) {
      event.unbind(el, type, fn, capture);
    };
  })
  require.register("indexof", function(exports, require, module) {
    var indexOf = [].indexOf;
    module.exports = function(arr, obj) {
      if (indexOf) return arr.indexOf(obj);
      for (var i = 0; i < arr.length; ++i) {
        if (arr[i] === obj) return i;
      }
      return -1;
    };
  })
  require.register("domify", function(exports, require, module) {
    /**
 * Expose `parse`.
 */
    module.exports = parse;
    /**
 * Wrap map from jquery.
 */
    var map = {
      option: [ 1, '<select multiple="multiple">', "</select>" ],
      optgroup: [ 1, '<select multiple="multiple">', "</select>" ],
      legend: [ 1, "<fieldset>", "</fieldset>" ],
      thead: [ 1, "<table>", "</table>" ],
      tbody: [ 1, "<table>", "</table>" ],
      tfoot: [ 1, "<table>", "</table>" ],
      colgroup: [ 1, "<table>", "</table>" ],
      caption: [ 1, "<table>", "</table>" ],
      tr: [ 2, "<table><tbody>", "</tbody></table>" ],
      td: [ 3, "<table><tbody><tr>", "</tr></tbody></table>" ],
      th: [ 3, "<table><tbody><tr>", "</tr></tbody></table>" ],
      col: [ 2, "<table><tbody></tbody><colgroup>", "</colgroup></table>" ],
      _default: [ 0, "", "" ]
    };
    /**
 * Parse `html` and return the children.
 *
 * @param {String} html
 * @return {Array}
 * @api private
 */
    function parse(html) {
      if ("string" != typeof html) throw new TypeError("String expected");
      // tag name
      var m = /<([\w:]+)/.exec(html);
      if (!m) throw new Error("No elements were generated.");
      var tag = m[1];
      // body support
      if (tag == "body") {
        var el = document.createElement("html");
        el.innerHTML = html;
        return el.removeChild(el.lastChild);
      }
      // wrap map
      var wrap = map[tag] || map._default;
      var depth = wrap[0];
      var prefix = wrap[1];
      var suffix = wrap[2];
      var el = document.createElement("div");
      el.innerHTML = prefix + html + suffix;
      while (depth--) el = el.lastChild;
      var els = el.children;
      if (1 == els.length) {
        return el.removeChild(els[0]);
      }
      var fragment = document.createDocumentFragment();
      while (els.length) {
        fragment.appendChild(el.removeChild(els[0]));
      }
      return fragment;
    }
  })
  require.register("classes", function(exports, require, module) {
    /**
 * Module dependencies.
 */
    var index = require("indexof");
    /**
 * Whitespace regexp.
 */
    var re = /\s+/;
    /**
 * toString reference.
 */
    var toString = Object.prototype.toString;
    /**
 * Wrap `el` in a `ClassList`.
 *
 * @param {Element} el
 * @return {ClassList}
 * @api public
 */
    module.exports = function(el) {
      return new ClassList(el);
    };
    /**
 * Initialize a new ClassList for `el`.
 *
 * @param {Element} el
 * @api private
 */
    function ClassList(el) {
      this.el = el;
      this.list = el.classList;
    }
    /**
 * Add class `name` if not already present.
 *
 * @param {String} name
 * @return {ClassList}
 * @api public
 */
    ClassList.prototype.add = function(name) {
      // classList
      if (this.list) {
        this.list.add(name);
        return this;
      }
      // fallback
      var arr = this.array();
      var i = index(arr, name);
      if (!~i) arr.push(name);
      this.el.className = arr.join(" ");
      return this;
    };
    /**
 * Remove class `name` when present, or
 * pass a regular expression to remove
 * any which match.
 *
 * @param {String|RegExp} name
 * @return {ClassList}
 * @api public
 */
    ClassList.prototype.remove = function(name) {
      if ("[object RegExp]" == toString.call(name)) {
        return this.removeMatching(name);
      }
      // classList
      if (this.list) {
        this.list.remove(name);
        return this;
      }
      // fallback
      var arr = this.array();
      var i = index(arr, name);
      if (~i) arr.splice(i, 1);
      this.el.className = arr.join(" ");
      return this;
    };
    /**
 * Remove all classes matching `re`.
 *
 * @param {RegExp} re
 * @return {ClassList}
 * @api private
 */
    ClassList.prototype.removeMatching = function(re) {
      var arr = this.array();
      for (var i = 0; i < arr.length; i++) {
        if (re.test(arr[i])) {
          this.remove(arr[i]);
        }
      }
      return this;
    };
    /**
 * Toggle class `name`.
 *
 * @param {String} name
 * @return {ClassList}
 * @api public
 */
    ClassList.prototype.toggle = function(name) {
      // classList
      if (this.list) {
        this.list.toggle(name);
        return this;
      }
      // fallback
      if (this.has(name)) {
        this.remove(name);
      } else {
        this.add(name);
      }
      return this;
    };
    /**
 * Return an array of classes.
 *
 * @return {Array}
 * @api public
 */
    ClassList.prototype.array = function() {
      var str = this.el.className.replace(/^\s+|\s+$/g, "");
      var arr = str.split(re);
      if ("" === arr[0]) arr.shift();
      return arr;
    };
    /**
 * Check if class `name` is present.
 *
 * @param {String} name
 * @return {ClassList}
 * @api public
 */
    ClassList.prototype.has = ClassList.prototype.contains = function(name) {
      return this.list ? this.list.contains(name) : !!~index(this.array(), name);
    };
  })
  require.register("css", function(exports, require, module) {
    /**
 * Properties to ignore appending "px".
 */
    var ignore = {
      columnCount: true,
      fillOpacity: true,
      fontWeight: true,
      lineHeight: true,
      opacity: true,
      orphans: true,
      widows: true,
      zIndex: true,
      zoom: true
    };
    /**
 * Set `el` css values.
 *
 * @param {Element} el
 * @param {Object} obj
 * @return {Element}
 * @api public
 */
    module.exports = function(el, obj) {
      for (var key in obj) {
        var val = obj[key];
        if ("number" == typeof val && !ignore[key]) val += "px";
        el.style[key] = val;
      }
      return el;
    };
  })
  require.register("value", function(exports, require, module) {
    /**
 * Module dependencies.
 */
    var typeOf = require("type");
    /**
 * Set or get `el`'s' value.
 *
 * @param {Element} el
 * @param {Mixed} val
 * @return {Mixed}
 * @api public
 */
    module.exports = function(el, val) {
      if (2 == arguments.length) return set(el, val);
      return get(el);
    };
    /**
 * Get `el`'s value.
 */
    function get(el) {
      switch (type(el)) {
       case "checkbox":
       case "radio":
        if (el.checked) {
          var attr = el.getAttribute("value");
          return null == attr ? true : attr;
        } else {
          return false;
        }

       case "radiogroup":
        for (var i = 0, radio; radio = el[i]; i++) {
          if (radio.checked) return radio.value;
        }
        break;

       case "select":
        var vals = [];
        for (var i = 0, option; option = el.options[i]; i++) {
          if (option.selected) vals.push(option.value);
        }
        return vals.length === 1 ? vals[0] : vals;
        break;

       default:
        return el.value;
      }
    }
    /**
 * Set `el`'s value.
 */
    function set(el, val) {
      switch (type(el)) {
       case "checkbox":
       case "radio":
        el.checked = val === true ? true : val == el.getAttribute("value");
        break;

       case "radiogroup":
        for (var i = 0, radio; radio = el[i]; i++) {
          radio.checked = radio.value === val;
        }
        break;

       case "select":
        var vals = "array" == typeOf(val) ? val : [ val ], found;
        for (var i = 0, option; option = el.options[i]; i++) {
          found = 0;
          for (var j = 0, v; v = vals[j]; j++) {
            found |= v === option.value;
          }
          option.selected = found === 1;
        }
        break;

       default:
        el.value = val;
      }
    }
    /**
 * Element type.
 */
    function type(el) {
      var group = "array" == typeOf(el) || "object" == typeOf(el);
      if (group) el = el[0];
      var name = el.nodeName.toLowerCase();
      var type = el.getAttribute("type");
      if (group && type && "radio" == type.toLowerCase()) return "radiogroup";
      if ("input" == name && type && "checkbox" == type.toLowerCase()) return "checkbox";
      if ("input" == name && type && "radio" == type.toLowerCase()) return "radio";
      if ("select" == name) return "select";
      return name;
    }
  })
  require.register("query", function(exports, require, module) {
    function one(selector, el) {
      return el.querySelector(selector);
    }
    exports = module.exports = function(selector, el) {
      el = el || document;
      return one(selector, el);
    };
    exports.all = function(selector, el) {
      el = el || document;
      return el.querySelectorAll(selector);
    };
    exports.engine = function(obj) {
      if (!obj.one) throw new Error(".one callback required");
      if (!obj.all) throw new Error(".all callback required");
      one = obj.one;
      exports.all = obj.all;
    };
  })
  require.register("matches-selector", function(exports, require, module) {
    /**
 * Module dependencies.
 */
    var query = require("query");
    /**
 * Element prototype.
 */
    var proto = Element.prototype;
    /**
 * Vendor function.
 */
    var vendor = proto.matches || proto.webkitMatchesSelector || proto.mozMatchesSelector || proto.msMatchesSelector || proto.oMatchesSelector;
    /**
 * Expose `match()`.
 */
    module.exports = match;
    /**
 * Match `el` to `selector`.
 *
 * @param {Element} el
 * @param {String} selector
 * @return {Boolean}
 * @api public
 */
    function match(el, selector) {
      if (vendor) return vendor.call(el, selector);
      var nodes = query.all(selector, el.parentNode);
      for (var i = 0; i < nodes.length; ++i) {
        if (nodes[i] == el) return true;
      }
      return false;
    }
  })
  require.register("traverse", function(exports, require, module) {
    /**
 * dependencies
 */
    var matches = require("matches-selector");
    /**
 * Traverse with the given `el`, `selector` and `len`.
 *
 * @param {String} type
 * @param {Element} el
 * @param {String} selector
 * @param {Number} len
 * @return {Array}
 * @api public
 */
    module.exports = function(type, el, selector, len) {
      var el = el[type], n = len || 1, ret = [];
      if (!el) return ret;
      do {
        if (n == ret.length) break;
        if (1 != el.nodeType) continue;
        if (matches(el, selector)) ret.push(el);
        if (!selector) ret.push(el);
      } while (el = el[type]);
      return ret;
    };
  })
  require.register("trim", function(exports, require, module) {
    exports = module.exports = trim;
    function trim(str) {
      if (str.trim) return str.trim();
      return str.replace(/^\s*|\s*$/g, "");
    }
    exports.left = function(str) {
      if (str.trimLeft) return str.trimLeft();
      return str.replace(/^\s*/, "");
    };
    exports.right = function(str) {
      if (str.trimRight) return str.trimRight();
      return str.replace(/\s*$/, "");
    };
  })
  require.register("dom", function(exports, require, module) {
    /**
 * Module dependencies.
 */
    var matches = require("matches-selector");
    var delegate = require("delegate");
    var classes = require("classes");
    var traverse = require("traverse");
    var indexof = require("indexof");
    var domify = require("domify");
    var events = require("event");
    var value = require("value");
    var query = require("query");
    var type = require("type");
    var trim = require("trim");
    var css = require("css");
    var eventRefs = {};
    var expando = 0;
    /**
 * Attributes supported.
 */
    var attrs = [ "id", "src", "rel", "cols", "rows", "type", "name", "href", "title", "style", "width", "height", "action", "method", "tabindex", "placeholder" ];
    /**
 * Expose `dom()`.
 */
    exports = module.exports = dom;
    /**
 * Expose supported attrs.
 */
    exports.attrs = attrs;
    /**
 * Return a dom `List` for the given
 * `html`, selector, or element.
 *
 * @param {String|Element|List}
 * @return {List}
 * @api public
 */
    function dom(selector, context) {
      // array
      if (Array.isArray(selector)) {
        return new List(selector);
      }
      // List
      if (selector instanceof List) {
        return selector;
      }
      // node
      if (selector.nodeName) {
        return new List([ selector ]);
      }
      if ("string" != typeof selector) {
        throw new TypeError("invalid selector");
      }
      // html
      var htmlselector = trim.left(selector);
      if ("<" == htmlselector.charAt(0)) {
        return new List([ domify(htmlselector) ], htmlselector);
      }
      // selector
      var ctx = context ? context.els ? context.els[0] : context : document;
      return new List(query.all(selector, ctx), selector);
    }
    /**
 * Expose `List` constructor.
 */
    exports.List = List;
    /**
 * Initialize a new `List` with the
 * given array-ish of `els` and `selector`
 * string.
 *
 * @param {Mixed} els
 * @param {String} selector
 * @api private
 */
    function List(els, selector) {
      this.els = els || [];
      this.selector = selector;
    }
    /**
 * Enumerable iterator.
 */
    List.prototype.__iterate__ = function() {
      var self = this;
      return {
        length: function() {
          return self.els.length;
        },
        get: function(i) {
          return new List([ self.els[i] ]);
        }
      };
    };
    /**
 * Remove elements from the DOM.
 *
 * @api public
 */
    List.prototype.remove = function() {
      for (var i = 0; i < this.els.length; i++) {
        var el = this.els[i];
        el.style.display = "none";
        // hide it, if nothing else.
        walkDOM(el, function(node) {
          var id;
          if (id = node.__expando) {
            for (var j = 0; j < eventRefs[id].length; ++j) {
              events.unbind(node, eventRefs[id][j].evt, eventRefs[id][j].fn);
              delete eventRefs[id][j];
            }
          }
          return true;
        });
        el.style.display = "";
        var parent = el.parentNode;
        if (parent) parent.removeChild(el);
      }
    };
    /**
 * Set attribute `name` to `val`, or get attr `name`.
 *
 * @param {String} name
 * @param {String} [val]
 * @return {String|List} self
 * @api public
 */
    List.prototype.attr = function(name, val) {
      // set via object
      if ("object" == typeof name) {
        for (var attr in name) {
          this.attr(attr, name[attr]);
        }
        return this;
      }
      // get
      if (1 == arguments.length) {
        return this.els[0] && this.els[0].getAttribute(name);
      }
      // remove
      if (null == val) {
        return this.removeAttr(name);
      }
      // set
      return this.forEach(function(el) {
        el.setAttribute(name, val);
      });
    };
    /**
 * Remove attribute `name`.
 *
 * @param {String} name
 * @return {List} self
 * @api public
 */
    List.prototype.removeAttr = function(name) {
      return this.forEach(function(el) {
        el.removeAttribute(name);
      });
    };
    /**
 * Set property `name` to `val`, or get property `name`.
 *
 * @param {String} name
 * @param {String} [val]
 * @return {Object|List} self
 * @api public
 */
    List.prototype.prop = function(name, val) {
      if (1 == arguments.length) {
        return this.els[0] && this.els[0][name];
      }
      return this.forEach(function(el) {
        el[name] = val;
      });
    };
    /**
 * Get the first element's value or set selected
 * element values to `val`.
 *
 * @param {Mixed} [val]
 * @return {Mixed}
 * @api public
 */
    List.prototype.val = List.prototype.value = function(val) {
      if (0 == arguments.length) {
        return this.els[0] ? value(this.els[0]) : undefined;
      }
      return this.forEach(function(el) {
        value(el, val);
      });
    };
    /**
 * Return a cloned `List` with all elements cloned.
 *
 * @return {List}
 * @api public
 */
    List.prototype.clone = function() {
      var arr = [];
      for (var i = 0, len = this.els.length; i < len; ++i) {
        arr.push(this.els[i].cloneNode(true));
      }
      return new List(arr);
    };
    /**
 * Prepend `val`.
 *
 * @param {String|Element|List} val
 * @return {List} new list
 * @api public
 */
    List.prototype.prepend = function(val) {
      var el = this.els[0];
      if (!el) return this;
      val = dom(val);
      for (var i = 0; i < val.els.length; ++i) {
        if (el.children.length) {
          el.insertBefore(val.els[i], el.firstChild);
        } else {
          el.appendChild(val.els[i]);
        }
      }
      return val;
    };
    /**
 * Append `val`.
 *
 * @param {String|Element|List} val
 * @return {List} new list
 * @api public
 */
    List.prototype.append = function(val) {
      var el = this.els[0];
      if (!el) return this;
      val = dom(val);
      for (var i = 0; i < val.els.length; ++i) {
        el.appendChild(val.els[i]);
      }
      return val;
    };
    /**
 * Append self's `el` to `val`
 *
 * @param {String|Element|List} val
 * @return {List} self
 * @api public
 */
    List.prototype.appendTo = function(val) {
      dom(val).append(this);
      return this;
    };
    /**
 * Insert self's `els` after `val`
 *
 * @param {String|Element|List} val
 * @return {List} self
 * @api public
 */
    List.prototype.insertAfter = function(val) {
      val = dom(val).els[0];
      if (!val || !val.parentNode) return this;
      this.forEach(function(el) {
        val.parentNode.insertBefore(el, val.nextSibling);
      });
      return this;
    };
    /**
 * Return a `List` containing the element at `i`.
 *
 * @param {Number} i
 * @return {List}
 * @api public
 */
    List.prototype.at = function(i) {
      return new List([ this.els[i] ], this.selector);
    };
    /**
 * Return a `List` containing the first element.
 *
 * @param {Number} i
 * @return {List}
 * @api public
 */
    List.prototype.first = function() {
      return new List([ this.els[0] ], this.selector);
    };
    /**
 * Return a `List` containing the last element.
 *
 * @param {Number} i
 * @return {List}
 * @api public
 */
    List.prototype.last = function() {
      return new List([ this.els[this.els.length - 1] ], this.selector);
    };
    /**
 * Return an `Element` at `i`.
 *
 * @param {Number} i
 * @return {Element}
 * @api public
 */
    List.prototype.get = function(i) {
      return this.els[i || 0];
    };
    /**
 * Return list length.
 *
 * @return {Number}
 * @api public
 */
    List.prototype.length = function() {
      return this.els.length;
    };
    /**
 * Return element text.
 *
 * @param {String} str
 * @return {String|List}
 * @api public
 */
    List.prototype.text = function(str) {
      // TODO: real impl
      if (1 == arguments.length) {
        this.forEach(function(el) {
          el.textContent = str;
        });
        return this;
      }
      var str = "";
      for (var i = 0; i < this.els.length; ++i) {
        str += this.els[i].textContent;
      }
      return str;
    };
    /**
 * Return element html.
 *
 * @return {String} html
 * @api public
 */
    List.prototype.html = function(html) {
      if (1 == arguments.length) {
        return this.forEach(function(el) {
          el.innerHTML = html;
        });
      }
      // TODO: real impl
      return this.els[0] && this.els[0].innerHTML;
    };
    /**
 * Bind to `event` and invoke `fn(e)`. When
 * a `selector` is given then events are delegated.
 *
 * @param {String} event
 * @param {String} [selector]
 * @param {Function} fn
 * @param {Boolean} capture
 * @return {List}
 * @api public
 */
    List.prototype.on = function(event, selector, fn, capture) {
      var id, cur;
      if ("string" == typeof selector) {
        for (var i = 0; i < this.els.length; ++i) {
          fn._delegate = delegate.bind(this.els[i], selector, event, fn, capture);
        }
        return this;
      }
      capture = fn;
      fn = selector;
      for (var i = 0; i < this.els.length; ++i) {
        if (id = this.els[i].__expando) {} else {
          id = ++expando;
          this.els[i].__expando = id;
        }
        if (!eventRefs[id]) {
          eventRefs[id] = [];
        }
        cur = eventRefs[id].length;
        eventRefs[id][cur] = {
          evt: event,
          fn: fn
        };
        events.bind(this.els[i], eventRefs[id][cur].evt, eventRefs[id][cur].fn, capture);
      }
      return this;
    };
    /**
 * Unbind to `event` and invoke `fn(e)`. When
 * a `selector` is given then delegated event
 * handlers are unbound.
 *
 * @param {String} event
 * @param {String} [selector]
 * @param {Function} fn
 * @param {Boolean} capture
 * @return {List}
 * @api public
 */
    List.prototype.off = function(event, selector, fn, capture) {
      var id, i;
      if ("string" == typeof selector) {
        for (i = 0; i < this.els.length; ++i) {
          // TODO: add selector support back
          delegate.unbind(this.els[i], event, fn._delegate, capture);
        }
        return this;
      }
      capture = fn;
      fn = selector;
      if (!selector) {
        for (i = 0; i < this.els.length; ++i) {
          id = this.els[i].__expando;
          for (var j = 0; j < eventRefs[id].length; ++j) {
            events.unbind(this.els[i], eventRefs[id][j].evt, eventRefs[id][j].fn);
          }
        }
      } else {
        for (i = 0; i < this.els.length; ++i) {
          events.unbind(this.els[i], event, fn, capture);
        }
      }
      return this;
    };
    /**
 * Iterate elements and invoke `fn(list, i)`.
 *
 * @param {Function} fn
 * @return {List} self
 * @api public
 */
    List.prototype.each = function(fn) {
      for (var i = 0; i < this.els.length; ++i) {
        fn(new List([ this.els[i] ], this.selector), i);
      }
      return this;
    };
    /**
 * Iterate elements and invoke `fn(el, i)`.
 *
 * @param {Function} fn
 * @return {List} self
 * @api public
 */
    List.prototype.forEach = function(fn) {
      for (var i = 0; i < this.els.length; ++i) {
        fn(this.els[i], i);
      }
      return this;
    };
    /**
 * Map elements invoking `fn(list, i)`.
 *
 * @param {Function} fn
 * @return {Array}
 * @api public
 */
    List.prototype.map = function(fn) {
      var arr = [];
      for (var i = 0; i < this.els.length; ++i) {
        arr.push(fn(new List([ this.els[i] ], this.selector), i));
      }
      return arr;
    };
    /**
 * Filter elements invoking `fn(list, i)`, returning
 * a new `List` of elements when a truthy value is returned.
 *
 * @param {Function} fn
 * @return {List}
 * @api public
 */
    List.prototype.select = List.prototype.filter = function(fn) {
      var el;
      var list = new List([], this.selector);
      for (var i = 0; i < this.els.length; ++i) {
        el = this.els[i];
        if (fn(new List([ el ], this.selector), i)) list.els.push(el);
      }
      return list;
    };
    /**
 * Filter elements invoking `fn(list, i)`, returning
 * a new `List` of elements when a falsey value is returned.
 *
 * @param {Function} fn
 * @return {List}
 * @api public
 */
    List.prototype.reject = function(fn) {
      var el;
      var list = new List([], this.selector);
      for (var i = 0; i < this.els.length; ++i) {
        el = this.els[i];
        if (!fn(new List([ el ], this.selector), i)) list.els.push(el);
      }
      return list;
    };
    /**
 * Add the given class `name`.
 *
 * @param {String} name
 * @return {List} self
 * @api public
 */
    List.prototype.addClass = function(name) {
      var el;
      for (var i = 0; i < this.els.length; ++i) {
        el = this.els[i];
        el._classes = el._classes || classes(el);
        el._classes.add(name);
      }
      return this;
    };
    /**
 * Remove the given class `name`.
 *
 * @param {String|RegExp} name
 * @return {List} self
 * @api public
 */
    List.prototype.removeClass = function(name) {
      var el;
      if ("regexp" == type(name)) {
        for (var i = 0; i < this.els.length; ++i) {
          el = this.els[i];
          el._classes = el._classes || classes(el);
          var arr = el._classes.array();
          for (var j = 0; j < arr.length; j++) {
            if (name.test(arr[j])) {
              el._classes.remove(arr[j]);
            }
          }
        }
        return this;
      }
      for (var i = 0; i < this.els.length; ++i) {
        el = this.els[i];
        el._classes = el._classes || classes(el);
        el._classes.remove(name);
      }
      return this;
    };
    /**
 * Toggle the given class `name`,
 * optionally a `bool` may be given
 * to indicate that the class should
 * be added when truthy.
 *
 * @param {String} name
 * @param {Boolean} bool
 * @return {List} self
 * @api public
 */
    List.prototype.toggleClass = function(name, bool) {
      var el;
      var fn = "toggle";
      // toggle with boolean
      if (2 == arguments.length) {
        fn = bool ? "add" : "remove";
      }
      for (var i = 0; i < this.els.length; ++i) {
        el = this.els[i];
        el._classes = el._classes || classes(el);
        el._classes[fn](name);
      }
      return this;
    };
    /**
 * Check if the given class `name` is present.
 *
 * @param {String} name
 * @return {Boolean}
 * @api public
 */
    List.prototype.hasClass = function(name) {
      var el;
      for (var i = 0; i < this.els.length; ++i) {
        el = this.els[i];
        el._classes = el._classes || classes(el);
        if (el._classes.has(name)) return true;
      }
      return false;
    };
    /**
 * Set CSS `prop` to `val` or get `prop` value.
 * Also accepts an object (`prop`: `val`)
 *
 * @param {String} prop
 * @param {Mixed} val
 * @return {List|String}
 * @api public
 */
    List.prototype.css = function(prop, val) {
      if (2 == arguments.length) {
        var obj = {};
        obj[prop] = val;
        return this.setStyle(obj);
      }
      if ("object" == type(prop)) {
        return this.setStyle(prop);
      }
      return this.getStyle(prop);
    };
    /**
 * Set CSS `props`.
 *
 * @param {Object} props
 * @return {List} self
 * @api private
 */
    List.prototype.setStyle = function(props) {
      for (var i = 0; i < this.els.length; ++i) {
        css(this.els[i], props);
      }
      return this;
    };
    /**
 * Get CSS `prop` value.
 *
 * @param {String} prop
 * @return {String}
 * @api private
 */
    List.prototype.getStyle = function(prop) {
      var el = this.els[0];
      if (el) return el.style[prop];
    };
    /**
 * Find children matching the given `selector`.
 *
 * @param {String} selector
 * @return {List}
 * @api public
 */
    List.prototype.find = function(selector) {
      return dom(selector, this);
    };
    /**
 * Empty the dom list
 *
 * @return self
 * @api public
 */
    List.prototype.empty = function() {
      var elem, el;
      for (var i = 0; i < this.els.length; ++i) {
        el = this.els[i];
        while (el.firstChild) {
          el.removeChild(el.firstChild);
        }
      }
      return this;
    };
    /**
 * Check if the first element matches `selector`.
 *
 * @param {String} selector
 * @return {Boolean}
 * @api public
 */
    List.prototype.is = function(selector) {
      return matches(this.get(0), selector);
    };
    /**
 * Get parent(s) with optional `selector` and `limit`
 *
 * @param {String} selector
 * @param {Number} limit
 * @return {List}
 * @api public
 */
    List.prototype.parent = function(selector, limit) {
      return new List(traverse("parentNode", this.get(0), selector, limit || 1));
    };
    /**
 * Get next element(s) with optional `selector` and `limit`.
 *
 * @param {String} selector
 * @param {Number} limit
 * @retrun {List}
 * @api public
 */
    List.prototype.next = function(selector, limit) {
      return new List(traverse("nextSibling", this.get(0), selector, limit || 1));
    };
    /**
 * Get previous element(s) with optional `selector` and `limit`.
 *
 * @param {String} selector
 * @param {Number} limit
 * @return {List}
 * @api public
 */
    List.prototype.prev = List.prototype.previous = function(selector, limit) {
      return new List(traverse("previousSibling", this.get(0), selector, limit || 1));
    };
    /**
 * Attribute accessors.
 */
    attrs.forEach(function(name) {
      List.prototype[name] = function(val) {
        if (0 == arguments.length) return this.attr(name);
        return this.attr(name, val);
      };
    });
    /**
 * Walk Dom `node` and call `func`.
 *
 * @param {Object} domNode, {Function} callback
 * @return null
 * @api private
 */
    function walkDOM(node, func) {
      var go = func(node);
      if (go) {
        node = node.firstChild;
        while (node) {
          walkDOM(node, func);
          node = node.nextSibling;
        }
      }
    }
  })
  require.register("green-mesa-hyperbone-view", function(exports, require, module) {
    var _ = require("underscore"), dom = require("dom"), regex = {
      alias: /^[A-Za-z0-9\_\-\.]+$/,
      helper: /^([A-Za-z\_\-\.]+)\(([A-Za-z0-9\_\.]+)\)$/,
      expression: /^([A-Za-z\_\-\.]+)\((|(.+))\)$/,
      tache: /\{\{|\}\}/
    }, Events = require("backbone-events").Events, attributeHandlers = {}, templateHelpers = {};
    /**
 * Constructor.
 *
 * @param null
 * @return {Object} this
 * @api public
 */
    var HyperboneView = function(config) {
      var self = this;
      this.activeNodes = [];
      this.delegates = [];
      this.eventRefs = [];
      _.extend(this, Events);
      if (config) {
        if (config.initialised) {
          this.on("initialised", config.initialised);
        }
        if (config.delegates) {
          this.addDelegate(config.delegates);
        }
        if (config.model && config.el) {
          this.create(config.el, config.model);
        }
      }
      return this;
    };
    HyperboneView.prototype = {
      /**
 * Initialise this instance of Hyperbone View with an element and model.
 *
 * @param {Object} element, {Object} hyperboneModel
 * @return {Object} this
 * @api public
 */
      create: function(el, model) {
        this.el = dom(el);
        this._original = this.el.clone();
        this.model = model;
        this.evaluate();
        this.bindToModel();
        this.activateDelegates();
        this.trigger("initialised", this.el, this.model);
        if (isNode(this.el.els[0])) {
          this.el.css({
            visibility: "visible"
          });
        }
        return this;
      },
      /**
 * Register an event delegate.
 *
 * @param {String} selector, {Function}, fn
 * @return {Object} this
 * @api public
 */
      addDelegate: function(selector, fn) {
        if (_.isObject(selector)) {
          _.each(selector, function(fn, sel) {
            this.addDelegate(sel, fn);
          }, this);
          return this;
        }
        this.delegates.push({
          selector: selector,
          fn: fn
        });
        return this;
      },
      /**
 * Traverse the DOM, finding templates.
 *
 * @param null
 * @return {Object} this
 * @api private
 */
      evaluate: function() {
        var self = this;
        // Visit every node in the dom to check for templated attributes and innerText
        walkDOM(this.el.els[0], function(node) {
          var toks, rel, continueWalking = true;
          if (isNode(node)) {
            // check for templated attributes
            _.each(node.attributes, function(attr) {
              if (attributeHandlers[attr.name]) {
                // custom attribute detected. 
                attributeHandlers[attr.name].call(self, node, node.getAttribute(attr.name), function() {
                  continueWalking = false;
                });
              }
              // okay, at this point there's no custom attributes to worry about so..
              var toks = tokenise(attr.nodeValue);
              // and if we detect a template...
              if (toks.length > 1) {
                self.activeNodes.push({
                  node: node,
                  attribute: attr.name,
                  original: attr.nodeValue,
                  expressions: getExpressions(toks),
                  tokens: toks
                });
              }
            });
            // this should be 'true' unless a custom attribute has claimed ownership of all children. 
            return continueWalking;
          } else if (isTextNode(node)) {
            toks = tokenise(node.wholeText);
            // detect a template. 
            if (toks.length > 1) {
              self.activeNodes.push({
                node: node,
                expressions: getExpressions(toks),
                original: node.wholeText,
                tokens: toks
              });
            }
            return true;
          }
          // by default we return 'true' to continue traversing. This 
          // return is required to support 'weird' nodes like document fragments.
          return true;
        });
        return this;
      },
      /**
 * Bind to the model, registering on change handlers and rendering templates.
 *
 * @param null
 * @return {Object} this
 * @api private
 */
      bindToModel: function() {
        var self = this;
        // having established our list of templates, iterate through
        // bind to model events and execute the template immediately.
        _.each(this.activeNodes, function(node) {
          node.fn = compile(node.tokens);
          _.each(node.expressions, function(expr) {
            var ev = "change", subExpr, modelGets, relsOrUrls;
            if (isAlias(expr)) {
              ev = "change:" + expr;
            } else if (subExpr = tokeniseHelper(expr)) {
              ev = "change:" + subExpr.val;
            } else if (modelGets = expr.match(/model\.get\((\'|\")([\S]+)(\'|\")\)/g)) {
              // test for use of model.get('something') inside a template...
              var props = [];
              _.each(modelGets, function(get) {
                props.push("change:" + get.match(/model\.get\((\'|\")([\S]+)(\'|\")\)/)[2]);
              });
              if (props.length) {
                ev = props.join(" ");
              }
            } else if (resOrUrls = expr.match(/url\(\)/)) {
              // test for use of rel() or url() inside a template
              ev = "change-rel:self";
            } else if (resOrUrls = expr.match(/rel\((\'|\")([\S]+)(\'|\")\)/)) {
              ev = "change-rel:" + resOrUrls[2];
            }
            this.model.on(ev, function(val) {
              render.call(self, node);
              self.trigger("updated", self.el, self.model, ev);
            });
          }, this);
          render.call(self, node);
        }, this);
        return this;
      },
      /**
 * register our delegates
 *
 * @param null
 * @return {Object} this
 * @api private
 */
      activateDelegates: function() {
        var self = this;
        // having established our list of templates, iterate through
        // bind to model events and execute the template immediately.
        _.each(this.delegates, function(delegate) {
          var parts = delegate.selector.split(" ");
          var event = parts[0];
          var selector = parts[1];
          this.el.on(event, selector, function(e) {
            //e.preventDefault();
            delegate.fn.call(self.model, e, self.model, self.el);
            self.trigger("delegate-fired", self.el, self.model, delegate.selector);
          });
        }, this);
        return this;
      }
    };
    // Export HyperboneView
    module.exports.HyperboneView = HyperboneView;
    _.extend(templateHelpers, {
      /**
 * "get" template helper
 *
 * @param {String} prop, {Object} HyperboneModel
 * @return string
 * @api private
 */
      get: function(prop) {
        return prop;
      },
      /**
 * "url" template helper
 *
 * @param {String} unused, {Object} HyperboneModel
 * @return string
 * @api private
 */
      url: function(blank, model) {
        try {
          return model.url();
        } catch (e) {
          return "";
        }
      },
      /**
 * "rel" template helper
 *
 * @param {String} rel, {Object} HyperboneModel
 * @return string
 * @api private
 */
      rel: function(rel, model) {
        return model.rel(rel);
      },
      /**
 * "expression" template helper
 *
 * @param {String} expression result, {Object} HyperboneModel
 * @return string
 * @api private
 */
      expression: function(result) {
        return result;
      }
    });
    /**
 * .registerHelper() - Register a template helper
 *
 * @param {String} name, {Function} fn
 * @return null
 * @api public
 */
    var registerHelper;
    module.exports.registerHelper = registerHelper = function(name, fn) {
      if (_.isObject(name)) {
        _.extend(templateHelpers, name);
      } else {
        templateHelpers[name] = fn;
      }
    };
    _.extend(attributeHandlers, {
      /**
 * "rel" custom attribute handler. Populates an href if the rel is recognised
 *
 * @param {Object} node, {String} hb-width value
 * @return null
 * @api private
 */
      rel: function(node, prop) {
        var rel, self = this;
        // CONVENTION: If an anchor tag has a 'rel' attribute, and the model 
        // has a matching .rel(), we automatically add/populate the href attribute.
        if (node.tagName === "A") {
          rel = node.getAttribute("rel");
          var setHref = function() {
            var uri = self.model.rel(rel);
            if (uri) {
              node.style.display = "";
              node.setAttribute("href", uri);
            } else {
              node.style.display = "none";
              node.setAttribute("href", "#");
            }
          };
          // just quickly check the rel isn't templated. If it is, we ignore it.
          if (rel && tokenise(rel).length === 1) {
            this.model.on("add-rel:" + rel + " remove-rel:" + rel + " change-rel:" + rel, function() {
              setHref();
            });
            setHref();
          }
        }
      },
      /**
 * "if" custom attribute handler. Makes an element displayed or not.
 *
 * @param {Object} node, {String} hb-width value
 * @return null
 * @api private
 */
      "if": function(node, prop, cancel) {
        var self = this, test = function() {
          dom(node).css({
            display: self.model.get(prop) ? "" : "none"
          });
        };
        this.model.on("change:" + prop, function() {
          test();
        });
        // do the initial state.
        test();
      },
      /**
 * "if-not" custom attribute handler. Makes an element displayed or not.
 *
 * @param {Object} node, {String} hb-width value
 * @return null
 * @api private
 */
      "if-not": function(node, prop, cancel) {
        var self = this, test = function() {
          dom(node).css({
            display: self.model.get(prop) ? "none" : ""
          });
        };
        this.model.on("change:" + prop, function() {
          test();
        });
        // do the initial state.
        test();
      },
      /**
 * "hb-with" custom attribute handler. Creates subview with a different scope.
 *
 * @param {Object} node, {String} hb-width value
 * @return null
 * @api private
 */
      "hb-with": function(node, prop, cancel) {
        var collection, inner, self = this;
        // remove this attribute so it's not found when the subview walks the dom
        node.removeAttribute("hb-with");
        collection = this.model.get(prop);
        if (!collection) {
          this.model.set(prop, []);
          collection = this.model.get(prop);
        }
        if (collection.models) {
          inner = dom(Array.prototype.slice.call(node.children, 0));
          inner.style.display = "none";
          inner.remove();
          node.__nodes = {};
          var render = function(collection) {
            collection.each(function(model, index, models) {
              if (!node.__nodes[model.cid]) {
                var html = inner.clone(true);
                var view = new HyperboneView().on("updated", function(el, model, event) {
                  self.trigger("updated", el, model, "subview " + prop + " " + event);
                }).create(html, model);
                node.__nodes[model.cid] = view;
                html.appendTo(node);
              }
            });
          };
          collection.on("add", function(model, models, details) {
            render(self.model.get(prop));
          });
          collection.on("remove", function(model, models, details) {
            if (node.__nodes[model.cid]) {
              // attempt to completely destroy the subview..
              node.__nodes[model.cid].el.remove();
              node.__nodes[model.cid].model.off();
              node.__nodes[model.cid].off();
              delete node.__nodes[model.cid];
            }
          });
          collection.on("reset", function() {
            var destroyers = [];
            _.each(node.__nodes, function(n, id) {
              n.el.remove();
              n.model.off();
              n.off();
              destroyers.push(function() {
                delete node.__nodes[id];
              });
            });
            _.each(destroyers, function(fn) {
              fn();
            });
            render(self.model.get(prop));
          });
          render(collection);
        } else {
          // create a subview which passes updated events back to the primary view
          new HyperboneView().on("updated", function(el, model, event) {
            self.trigger("updated", el, model, "subview " + prop + " " + event);
          }).create(dom(node), self.model.get(prop));
        }
        // don't want to process this node's childrens so we cancel
        cancel();
      },
      /**
 * "hb-bind" custom attribute handler
 *
 * @param {Object} node, {String} hb-bind property, {Function} cancel
 * @return null
 * @api private
 */
      "hb-bind": function(node, prop, cancel) {
        var self = this, el = dom(node), attrValue = this.model.get(prop);
        el.on("change", function() {
          var oldVal = self.model.get(prop);
          var val = el.val();
          if (oldVal !== val) {
            self.model.set(prop, val);
          }
        });
        this.model.on("change:" + prop, function(model, val) {
          var oldVal = el.val();
          if (oldVal !== val) {
            el.val(val);
          }
        });
        el.val(attrValue);
        // don't want to process this node's childrens so return false;
        cancel();
      },
      /**
 * "hb-click-bind" custom attribute handler
 *
 * @param {Object} node, {String} hb-click-bind property, {Function} cancel
 * @return null
 * @api private
 */
      "hb-click-toggle": function(node, prop, cancel) {
        var self = this;
        dom(node).on("click", function(e) {
          self.model.set(prop, !self.model.get(prop));
        });
      },
      /**
 * "hb-trigger" trigger a backbone event handler.
 *
 * @param {Object} node, {String} event to trigger, {Function} cancel
 * @return null
 * @api private
 */
      "hb-trigger": function(node, prop, cancel) {
        var self = this;
        dom(node).on("click", function(e) {
          self.model.trigger(prop, self.model, prop, function() {
            e.preventDefault();
          });
        });
      }
    });
    /**
 * .registerAttributeHandler() - Register an attribute handler. 
 *
 * @param {String} name, {Function} fn
 * @return null
 * @api public
 */
    var registerAttributeHandler;
    module.exports.registerAttributeHandler = registerAttributeHandler = function(name, fn) {
      if (_.isObject(name)) {
        _.extend(attributeHandlers, name);
      } else {
        attributeHandlers[name] = fn;
      }
    };
    /**
 * .use() - use an extension
 *
 * @param {Object} obj
 * @return null
 * @api public
 */
    module.exports.use = function(obj) {
      if (obj.attributeHandlers) {
        _.each(obj.attributeHandlers, function(handler, id) {
          registerAttributeHandler(id, handler);
        });
      }
      if (obj.templateHelpers) {
        _.each(obj.templateHelpers, function(handler, id) {
          registerHelper(id, handler);
        });
      }
    };
    /**
 * Render a template to a node.
 *
 * @param {Object} node, {Function} mode
 * @return null
 * @api private
 */
    function render(node) {
      var res = node.fn(this.model, templateHelpers);
      if (isNode(node.node)) {
        node.node.setAttribute(node.attribute, res);
      } else {
        if (res === "") {
          res = "​";
        }
        node.node.replaceWholeText(res);
      }
    }
    /**
 * Walk Dom `node` and call `func`.
 *
 * @param {Object} domNode, {Function} callback
 * @return null
 * @api private
 */
    function walkDOM(node, func) {
      var go = func(node);
      if (go) {
        node = node.firstChild;
        while (node) {
          walkDOM(node, func);
          node = node.nextSibling;
        }
      }
    }
    /**
 * Find expressions within an array of Tokens.
 *
 * @param {Array} toks
 * @return {Array} expressions
 * @api private
 */
    function getExpressions(toks) {
      var expr = [];
      _.each(toks, function(t, i) {
        if (i % 2 === 1) {
          expr.push(t.trim());
        }
      });
      return expr;
    }
    /**
 * Compile the given `str` to a `Function`.
 *
 * @param {String} str
 * @return {Function}
 * @api public
 */
    function compile(tokens) {
      var js = [], tokens, token, expr, subTokens;
      for (var i = 0; i < tokens.length; ++i) {
        token = tokens[i];
        if (i % 2 == 0) {
          js.push('"' + token.replace(/"/g, '\\"') + '"');
        } else {
          if (isAlias(token)) {
            js.push(' + model.get("' + token + '") + ');
          } else if (expr = tokeniseHelper(token)) {
            js.push(' + helpers["' + expr.fn + '"]( model.get("' + expr.val + '"), model) + ');
          } else if (expr = tokeniseExpression(token)) {
            js.push(' + helpers["' + expr.fn + '"](' + (expr.val ? expr.val : '""') + ", model) + ");
          }
        }
      }
      js = "\n return " + js.join("").replace(/\n/g, "\\n");
      return new Function("model", "helpers", js);
    }
    /**
 * Tokenise `str`.
 *
 * @param {String} str
 * @return {Array}
 * @api private
 */
    function tokenise(str) {
      return str.split(regex.tache);
    }
    /**
 * Check if the node is a standard node.
 *
 * @param {Object} node
 * @return {Boolean}
 * @api private
 */
    function isNode(node) {
      return node.nodeType === 1;
    }
    /**
 * Check if the node is a standard node.
 *
 * @param {Object} node
 * @return {Boolean}
 * @api private
 */
    function isTextNode(node) {
      return node.nodeType === 3;
    }
    /**
 * Check if `str` looks like a model property name.
 *
 * @param {String} str
 * @return {Boolean}
 * @api private
 */
    function isAlias(str) {
      return regex.alias.test(str);
    }
    /**
 * Validate and return tokens for a call to a helper with a model property alias
 *
 * @param {String} str
 * @return {Array}
 * @api private
 */
    function tokeniseHelper(str) {
      var matches = str.match(regex.helper);
      return matches ? {
        fn: matches[1],
        val: matches[2]
      } : false;
    }
    /**
 * Validate and return tokens for a call to a helper with freeform expression.
 *
 * @param {String} str
 * @return {Array}
 * @api private
 */
    function tokeniseExpression(str) {
      var matches = str.match(regex.expression);
      return matches ? {
        fn: matches[1],
        val: matches[2]
      } : false;
    }
    /**
 * Indent `str`.
 *
 * @param {String} str
 * @return {String}
 * @api private
 */
    function indent(str) {
      return str.replace(/^/gm, "  ");
    }
  })
  require.register("each", function(exports, require, module) {
    "use strict";
    var nativeForEach = [].forEach;
    // Underscore's each function
    module.exports = function(obj, iterator, context) {
      if (obj == null) return;
      if (nativeForEach && obj.forEach === nativeForEach) {
        obj.forEach(iterator, context);
      } else if (obj.length === +obj.length) {
        for (var i = 0, l = obj.length; i < l; i++) {
          if (iterator.call(context, obj[i], i, obj) === {}) return;
        }
      } else {
        for (var key in obj) {
          if (Object.prototype.hasOwnProperty.call(obj, key)) {
            if (iterator.call(context, obj[key], key, obj) === {}) return;
          }
        }
      }
    };
  })
  require.register("hashchange", function(exports, require, module) {
    var each = require("each"), indexOf = require("indexof");
    var getFragment = function(url) {
      var url = url || window.location.href;
      return url.replace(/^[^#]*#?(.*)$/, "$1");
    };
    var HashChange = function() {
      var self = this;
      this.onChangeCallbacks = [];
      window.addEventListener("hashchange", function(e) {
        self.hashChanged(getFragment(e.newURL));
      }, false);
      return this;
    };
    HashChange.prototype = {
      update: function(callback) {
        if (callback) {
          this.onChangeCallbacks.push(callback);
          return this;
        } else {
          this.hashChanged(getFragment());
        }
      },
      unbind: function(callback) {
        var i = indexOf(this.onChangeCallbacks, callback);
        if (i !== -1) {
          this.onChangeCallbacks.splice(i - 1, 1);
        }
        return this;
      },
      updateHash: function(hash) {
        this.currentHash = hash;
        window.location.href = window.location.href.replace(/#.*/, "") + "#" + hash;
      },
      hashChanged: function(frag) {
        if (this.onChangeCallbacks.length) {
          each(this.onChangeCallbacks, function(callback) {
            callback(frag);
            return true;
          });
        }
        return this;
      }
    };
    hashChange = new HashChange();
    module.exports = hashChange;
  })
  require.register("path-to-regexp", function(exports, require, module) {
    /**
 * Expose `pathtoRegexp`.
 */
    module.exports = pathtoRegexp;
    /**
 * Normalize the given path string,
 * returning a regular expression.
 *
 * An empty array should be passed,
 * which will contain the placeholder
 * key names. For example "/user/:id" will
 * then contain ["id"].
 *
 * @param  {String|RegExp|Array} path
 * @param  {Array} keys
 * @param  {Object} options
 * @return {RegExp}
 * @api private
 */
    function pathtoRegexp(path, keys, options) {
      options = options || {};
      var sensitive = options.sensitive;
      var strict = options.strict;
      keys = keys || [];
      if (path instanceof RegExp) return path;
      if (path instanceof Array) path = "(" + path.join("|") + ")";
      path = path.concat(strict ? "" : "/?").replace(/\/\(/g, "(?:/").replace(/(\/)?(\.)?:(\w+)(?:(\(.*?\)))?(\?)?(\*)?/g, function(_, slash, format, key, capture, optional, star) {
        keys.push({
          name: key,
          optional: !!optional
        });
        slash = slash || "";
        return "" + (optional ? "" : slash) + "(?:" + (optional ? slash : "") + (format || "") + (capture || (format && "([^/.]+?)" || "([^/]+?)")) + ")" + (optional || "") + (star ? "(/*)?" : "");
      }).replace(/([\/.])/g, "\\$1").replace(/\*/g, "(.*)");
      return new RegExp("^" + path + "$", sensitive ? "" : "i");
    }
  })
  require.register("route", function(exports, require, module) {
    /**
 * Module dependencies.
 */
    var toRegexp = require("path-to-regexp");
    /**
 * Expose `Route`.
 */
    module.exports = Route;
    /**
 * Initialize a route with the given `path`.
 *
 * @param {String|Regexp} path
 * @return {Type}
 * @api public
 */
    function Route(path) {
      this.path = path;
      this.keys = [];
      this.regexp = toRegexp(path, this.keys);
      this._before = [];
      this._after = [];
    }
    /**
 * Add before `fn`.
 *
 * @param {Function} fn
 * @return {Route} self
 * @api public
 */
    Route.prototype.before = function(fn) {
      this._before.push(fn);
      return this;
    };
    /**
 * Add after `fn`.
 *
 * @param {Function} fn
 * @return {Route} self
 * @api public
 */
    Route.prototype.after = function(fn) {
      this._after.push(fn);
      return this;
    };
    /**
 * Invoke callbacks for `type` with `args`.
 *
 * @param {String} type
 * @param {Array} args
 * @api public
 */
    Route.prototype.call = function(type, args) {
      args = args || [];
      var fns = this["_" + type];
      if (!fns) throw new Error("invalid type");
      for (var i = 0; i < fns.length; i++) {
        fns[i].apply(null, args);
      }
    };
    /**
 * Check if `path` matches this route,
 * returning `false` or an object.
 *
 * @param {String} path
 * @return {Object}
 * @api public
 */
    Route.prototype.match = function(path) {
      var keys = this.keys;
      var qsIndex = path.indexOf("?");
      var pathname = ~qsIndex ? path.slice(0, qsIndex) : path;
      var m = this.regexp.exec(pathname);
      var params = [];
      var args = [];
      if (!m) return false;
      for (var i = 1, len = m.length; i < len; ++i) {
        var key = keys[i - 1];
        var val = "string" == typeof m[i] ? decodeURIComponent(m[i]) : m[i];
        if (key) {
          params[key.name] = undefined !== params[key.name] ? params[key.name] : val;
        } else {
          params.push(val);
        }
        args.push(val);
      }
      params.args = args;
      return params;
    };
  })
  require.register("green-mesa-hyperbone-router", function(exports, require, module) {
    var _ = require("underscore");
    var Route = require("route");
    var hashchange = require("hashchange");
    var Events = require("backbone-events").Events;
    var routes = [];
    var Router;
    var navigateTo;
    var eventHandler = function(newHash) {
      redirect(newHash);
    };
    module.exports.navigateTo = navigateTo = function navigateTo(uri, options) {
      if (uri.substr(0, 1) === "#") uri = uri.substr(1);
      if (uri.substr(0, 1) !== "!") uri = "!" + uri;
      hashchange.updateHash(uri);
      if (options && options.trigger) {
        redirect(uri);
      }
    };
    // when the hash changes...
    var redirect = function redirect(uri) {
      if (uri.substr(0, 1) === "#") uri = uri.substr(1);
      if (uri.substr(0, 1) === "!") uri = uri.substr(1);
      // iterate twice..
      var turnOn = [];
      var turnOff = [];
      var ctx;
      routes.forEach(function(route) {
        if (ctx = route.match(uri)) {
          turnOn.push(function routeActivator() {
            route.active = uri;
            route.trigger("activate", ctx, uri);
          });
        } else if (route.active) {
          turnOff.push(function routeDeactivator() {
            route.active = false;
            route.trigger("deactivate", uri);
          });
        }
      });
      turnOff.forEach(function(fn) {
        fn();
      });
      turnOn.forEach(function(fn) {
        fn();
      });
    };
    module.exports.Router = Router = function() {
      return this;
    };
    Router.prototype = {
      route: function(path, model) {
        var route = new Route(path), ctrl, self = this;
        _.extend(route, Events);
        routes.push(route);
        if (model) {
          route.on({
            activate: function(ctx, uri) {
              model.set("active", true);
            },
            deactivate: function(ctx, uri) {
              model.set("active", false);
            }
          });
        }
        ctrl = {
          on: function(event, fn) {
            route.on(event, fn);
            return ctrl;
          },
          route: function(path, model) {
            return self.route(path, model);
          },
          listen: function() {
            self.listen();
            return self;
          }
        };
        return ctrl;
      },
      listen: function() {
        hashchange.update(eventHandler);
        hashchange.update();
      },
      navigateTo: function(path, options) {
        navigateTo(path, options);
        return this;
      }
    };
    module.exports.reset = function() {
      hashchange.unbind(eventHandler);
      routes.forEach(function(route) {
        route.off();
      });
      routes = [];
    };
  })
  require.register("green-mesa-hyperbone-view-commands", function(exports, require, module) {
    /**
 * 
 * Commands for Hyperbone View
 *
**/
    var dom = require("dom");
    function bindCommand(cmd, root, model, value) {
      var properties = cmd.get("properties");
      var self = this;
      root.find("[name]").each(function(el) {
        var property = el.attr("name"), sync;
        if (el.is("select") && cmd.get("schema." + property + ".options")) {
          cmd.get("schema." + property + ".options").each(function(option) {
            el.els[0].appendChild(dom('<option value="' + option.get("value") + '">' + option.get("name") + "</option>").els[0]);
          });
        }
        var val = properties.get(property);
        el.val(val);
        if (el.attr("type") === "file") {
          if (!cmd._files) {
            cmd._files = {};
          }
          el.on("change", function(e) {
            var file = el.els[0].files[0];
            cmd._files[property] = file;
            properties.set(property, el.val());
            model.trigger("change:" + value, file, cmd);
          });
        } else {
          properties.on("change:" + property, function(val) {
            var oldVal = el.val();
            var newVal = properties.get(property);
            if (oldVal !== newVal) {
              el.val(newVal);
            }
          });
          el.on("change", function(e) {
            var oldVal = properties.get(property);
            var newVal = el.val();
            if (oldVal !== newVal) {
              properties.set(property, newVal);
            }
            model.trigger("change:" + value, cmd);
          });
        }
        // bind a particular input to an attribute on the parent model
        if (sync = el.attr("hb-sync-with")) {
          // assignment on purpose. do not fix.
          properties.on("change:" + property, function(properties, val) {
            model.set(sync, val);
          });
        }
      });
      root.on("submit", function(e) {
        e.preventDefault();
        model.trigger("submit:" + value, cmd, function(callback) {
          model.execute(value, callback);
        });
      });
      root.addClass("bound-to-command");
      root.__isBound = true;
    }
    function unBindCommand(cmd, root, model, value) {
      root.find("[name]").each(function(el) {
        el.off("change");
      });
      root.off("submit");
      root.removeClass("bound-to-command");
      root.__isBound = false;
    }
    module.exports = {
      attributeHandlers: {
        "hb-with-command": function(node, value, cancel) {
          var self = this;
          var root = dom(node);
          var showHide = true;
          if (node.getAttribute("if") || node.getAttribute("if-not")) showHide = false;
          var checkCommand = function() {
            var cmd = self.model.command(value);
            if (cmd && !root.__isBound) {
              // bind or rebind the form to the command
              // this has to happen every time 'add-command' is called
              // because the command will be a completely different model
              // in the parent model and thus all the old events bound
              // won't work
              bindCommand(cmd, root, self.model, value);
            } else if (!cmd && root.__isBound) {
              // unbind if the command has been removed. We only
              // care about clearing down the DOM events here though
              unBindCommand(cmd, root, self.model, value);
            }
            // hide forms bound to non-existent commands
            if (showHide) dom(node).css({
              display: cmd ? "" : "none"
            });
          };
          // bind to add and remove command events to make this turn on and offable and deal
          // with commands loaded from a server after teh view initialised.
          this.model.on("add-command:" + value + " remove-command:" + value, checkCommand);
          checkCommand();
        },
        // brings 'if' to commands
        "if-command": function(node, prop, cancel) {
          var self = this, test = function() {
            dom(node).css({
              display: self.model.command(prop) ? "" : "none"
            });
          };
          this.model.on("add-command:" + prop + " remove-command:" + prop, test);
          // do the initial state.
          test();
        },
        // brings 'if-not' to commands
        "if-not-command": function(node, prop, cancel) {
          var self = this, test = function() {
            dom(node).css({
              display: self.model.command(prop) ? "none" : ""
            });
          };
          this.model.on("add-command:" + prop + " remove-command:" + prop, test);
          // do the initial state.
          test();
        }
      }
    };
  })
  require.register("hypermedia-rockband", function(exports, require, module) {
    window.Model = require("hyperbone-model-with-io").Model;
  })
    require("hypermedia-rockband");
})();