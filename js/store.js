"use strict";

var Store = (function () {
	var data = {},
			parent = {},
			children = {};

	function Store (name, props) {
		if (!(props instanceof Object))
			props = {};

		this.maxLife = (typeof props.maxLife === 'number') ? props.maxLife : Infinity;
		this.selfDestruct = (typeof props.selfDestruct === 'number') ? props.selfDestruct : 0;
		this.saveDelay = (typeof props.saveDelay === 'number') ? props.saveDelay : 2000;
		this.destroyChildren = !!props.destroyChildren;
		this.lock = !!props.lock;
		this.save = !!props.save;
		this.useSnapshot = !!props.snapshot;
		this.ignoreSave = !!props.ignoreSave;
		this.private = !!props.private;
		this.myChildren = this.private ? {} : children;
		this.myParent = this.private ? {} : parent;

		if (SettingStore.available && typeof name === 'string' && name.length)
			this.id = (props.save ? 'Storage-' : 'Cache-') + name;
		else
			this.id = Utilities.id();

		this.name = name;
		this.props = props;
		
		if (!this.private)
			Object.defineProperty(this, 'data', {
				enumerable: true,
				
				get: function () {
					return data[this.id];
				},
				set: function (value) {
					data[this.id] = value;
				}
			});

		this.prolongDestruction();		

		var defaultValue = {};

		if (props.defaultValue instanceof Object)
			for (var key in props.defaultValue)
				defaultValue[key] = {
					accessed: Date.now(),
					value: props.defaultValue[key]
				}

		if (!this.data)
			this.load(defaultValue);
		
		if (this.useSnapshot)
			this.snapshot = new Snapshot(this);

		if (this.maxLife < Infinity) {
			var cleanupName = 'StoreCleanup-' + this.id;

			Utilities.Timer.interval(cleanupName, function (store, cleanupName) {
				if (store.destroyed)
					Utilities.Timer.remove('interval', cleanupName);
				else
					store.removeExpired();
			}, this.maxLife * .25, [this, cleanupName]);
		}

		props = name = undefined;
	};

	Store.prototype = new EventListener();
	Store.prototype.constructor = Store;

	Store.destroyAll = function () {
		for (var key in Utilities.Timer.timers.timeout)
			if (key._startsWith('SelfDestruct'))
				Utilities.Timer.timers.timeout[key].script.apply(null, Utilities.Timer.timers.timeout[key].args);
	};

	Store.promote = function (object) {
		if (typeof object.data !== 'object' || typeof object.props !== 'object')
			throw new TypeError('cannot create store from object');

		var store = new Store(object.name, object.props);

		store.data = object.data;

		return store;
	};

	Store.compare = function (left, right) {
		if (!(left instanceof Store) || !(right instanceof Store))
			throw new TypeError('left or right is not an instance of Store');

		var key,
				thisValue,
				oppositeValue,
				compared,
				comparedSide,
				inside;

		var swap = {
			left: 'right',
			right: 'left'
		};

		var compare = {
			left: left,
			right: right
		};

		var store = Store.compareCache.getStore(left.name + '-' + right.name);

		var sides = {
			left: store.getStore('left'),
			right: store.getStore('right'),
			both: store.getStore('both')
		};

		for (var side in compare) {
			for (key in compare[side].data) {
				thisValue = compare[side].get(key, null, null, true);
				oppositeValue = compare[swap[side]].get(key, null, null, true);

				if (thisValue === undefined && oppositeValue === undefined)
					sides.both.set(key, undefined)
				else if (oppositeValue === undefined)
					sides[side].set(key, thisValue);
				else if (thisValue instanceof Store) {
					compared = Store.compare(compare.left.getStore(key, null, null, true), compare.right.getStore(key, null, null, true));

					compared.store.parent = store;

					for (comparedSide in sides) {
						inside = compared.sides[comparedSide];

						if (!inside.data._isEmpty())
							sides[comparedSide].set(key, inside);
					}
				} else if (JSON.stringify(thisValue) === JSON.stringify(oppositeValue))
					sides.both.set(key, thisValue);
				else if (thisValue !== undefined)
					sides[side].set(key, thisValue);
			}
		}

		sides.left = sides.left.readyJSON();
		sides.right = sides.right.readyJSON();

		return {
			store: store,
			sides: sides,
			equal: (sides.left.data._isEmpty() && sides.right.data._isEmpty())
		};
	};

	Object.defineProperty(Store.prototype, 'parent', {
		get: function () {
			return this.private ? this.myParent[this.id] : parent[this.id];
		},
		set: function (newParent) {			
			if (newParent instanceof Store) {
				newParent.children[this.id] = this;

				this.myParent[this.id] = newParent;
			} else if (newParent === null) {
				delete this.myParent[this.id];

				for (var key in this.myChildren)
					delete this.myChildren[key][this.id];
			} else
				throw new Error('parent is not null or an instance of Store');
		}
	});

	Object.defineProperty(Store.prototype, 'children', {
		get: function () {
			if (!this.myChildren[this.id])
				this.myChildren[this.id] = {};

			return this.myChildren[this.id];
		},
		set: function (v) {
			delete this.myChildren[this.id];
		}
	});

	Store.BREAK = -54684513;

	Store.prototype.__save = function (bypassIgnore) {
		if (this.lock || (this.ignoreSave && !bypassIgnore))
			return;

		if (this.save)
			Utilities.Timer.timeout('StoreSave' + this.id, function (store) {
				LogDebug('Save ' + store.id);

				store.triggerEvent('save');

				SettingStore.setJSON(store.id, store);
			}, this.saveDelay, [this]);

		if (this.parent)
			Utilities.setImmediateTimeout(function (store) {
				store.parent.__save(true);
			}, [this]);
	};

	Store.prototype.load = function (defaultValue) {
		if (this.save) {
			var stored = SettingStore.getJSON(this.id, {
				data: defaultValue
			});

			if (stored.lock)
				this.lock = true;

			this.data = stored.data;
		} else
			this.data = defaultValue;
	};

	Store.prototype.reload = function (defaultValue) {
		if (!this.save)
			throw new Error('cannot reload a store that is not saved.');

		this.destroy(true, true);

		delete this.destroyed;

		this.load(defaultValue);
	};

	Store.prototype.triggerEvent = function (name) {
		Utilities.Timer.timeout('StoreTrigger' + this.id + name, function (store, name) {
			store.trigger(name);

			if (store.parent)
				store.parent.triggerEvent(name);
		}, 500, [this, name]);
	};

	Store.prototype.isEmpty = function () {
		return !this.data || this.data._isEmpty();
	};

	Store.prototype.keys = function () {
		return Object.keys(this.data);
	};

	Store.prototype.keyExist = function (key) {
		return (key in this.data);
	};

	Store.prototype.clone = function (prefix, props) {
		var value;

		var store = new Store(prefix + ',' + this.name, props),
				newData = {};

		for (var key in this.data) {
			value = this.get(key, null, null, true);

			if (value instanceof Store)
				newData[key] = {
					accessed: this.data[key].accessed,
					value: value.clone(prefix, props)
				};
			else if (value !== undefined)
				newData[key] = {
					accessed: this.data[key].accessed,
					value: value
				};
		}

		store.data = newData;

		return store;
	};

	Store.prototype.merge = function (store, deep) {
		if (!(store instanceof Store))
			throw new TypeError(store + ' is not an instance of Store');

		var currentValue,
				storeValue;

		for (var key in store.data) {			
			currentValue = this.get(key, null, null, true);
			storeValue = store.get(key, null, null, true);

			if (deep && (currentValue instanceof Store) && (storeValue instanceof Store))
				currentValue.merge(storeValue, true);
			else
				this.set(key, storeValue);
		}

		return this;
	};

	Store.prototype.find = function (fn) {
		if (typeof fn !== 'function')
			throw new TypeError('fn is not a function');

		var value;

		for (var key in this.data) {
			value = this.get(key);

			if (fn(key, value, this))
				break;
		}

		return value;
	};

	Store.prototype.findLast = function (fn) {
		if (typeof fn !== 'function')
			throw new TypeError('fn is not a function');

		var value;

		var keys = this.keys().reverse(),
				found = false;

		for (var i = 0; i < keys.length; i++) {
			value = this.get(keys[i]);

			if (fn(keys[i], value, this)) {
				found = true;

				break;
			}
		}

		return found ? value : null;
	};

	Store.prototype.forEach = function (fn) {
		var value,
				result;

		var results = [];

		for (var key in this.data) {
			value = this.get(key);
			result = fn(key, value, this);

			if (result === Store.BREAK)
				break;

			results.push({
				key: ((result instanceof Object) && result.key) ? result.key : key,
				value: value,
				result: ((result instanceof Object) && result.value) ? result.value : result
			});
		}

		return results;
	};

	Store.prototype.map = function (fn, useSelf) {
		var results = this.forEach(fn);

		var store = useSelf ? this : new Store('Map-' + Utilities.id(), {
			selfDestruct: TIME.ONE_SECOND * 30
		});

		for (var i = 0; i < results.length; i++)
			store.set(results[i].key, results[i].result);

		return store;
	};

	Store.prototype.filter = function (fn) {
		var results = this.forEach(fn);

		var store = new Store('Filter-' + Utilities.id(), {
			selfDestruct: TIME.ONE_SECOND * 30
		});

		for (var i = 0; i < results.length; i++)
			if (results[i].result)
				store.set(results[i].key, results[i].value);

		return store;
	};

	Store.prototype.only = function (fn) {
		var results = this.forEach(fn);

		for (var i = 0; i < results.length; i++)
			if (!results[i].result)
				this.remove(results[i].key);

		return this;
	};

	Store.prototype.set = function (key, value, overwrite) {
		if (this.lock) {
			if (value instanceof Store) {
				value.lock = true;

				return value;
			}

			return this;
		}

		if (value === null || value === undefined) {
			LogError(['refusing to set value', this.id, key, value]);

			return this;
		}

		Utilities.setImmediateTimeout(function (store) {
			store.prolongDestruction();
		}, [this]);

		if ((typeof key !== 'string' && typeof key !== 'number') || (this.data[key] && !this.data.hasOwnProperty(key)))
			throw new Error(key + ' cannot be used as key.');

		if (typeof overwrite !== 'boolean')
			overwrite = true;

		if (!overwrite && (key in this.data))
			return this.get(key);

		this.data[key] = {
			accessed: this.data[key] ? this.data[key].accessed : Date.now(),
			value: value,
		};

		if (!this.ignoreSave)
			if (value instanceof Store) {
				value.parent = this;

				setTimeout(function (store, value) {
					if (!value.readyJSON().data._isEmpty())
						store.__save();
				}, 100, this, value);
			} else
				this.__save();

		if (value instanceof Store)
			return this.data[key].value;

		return this;
	};

	Store.prototype.setMany = function (object, overwrite) {
		if (typeof object === 'object')
			for (var key in object)
				if (object.hasOwnProperty(key))
					this.set(key, object[key], overwrite);

		return this;
	};

	Store.prototype.get = function (key, defaultValue, asReference, noAccess) {
		this.prolongDestruction();

		try {
		if (this.data.hasOwnProperty(key)) {
			if (!noAccess) {
				this.data[key].accessed = Date.now();

				if (this.maxLife < Infinity)
					this.__save();
			}

			var cached = this.data[key].value;

			if (!(cached instanceof Store))
				if (cached && cached.data && cached.props) {
					cached.props.private = cached.props.private || this.private;

					var value = Store.promote(cached);

					value.parent = this;

					this.data[key] = {
						accessed: Date.now(),
						value: value
					};

					return value;
				} else {
					switch (true) {
						case asReference:
							return cached;
						break;

						case Array.isArray(cached):
							return Utilities.makeArray(cached);
						break;

						case typeof cached === 'string':
							return cached.toString();
						break;

						case cached && Utilities.typeOf(cached) === 'object':
							return cached._clone();
						break;

						default:
							return cached;
						break;
					}
				}
			else if (!cached.destroyed)
				return cached;
		} else if (defaultValue !== undefined && defaultValue !== null)
			return this.set(key, defaultValue).get(key, null, asReference);
		} catch (error) {
			console.error('ERROR IN GET', error, this.id, key, this.destroyed);
		}
	};

	Store.prototype.getMany = function (keys) {
		return this.filter(function (key) {
			return keys._contains(key);
		});
	};

	Store.prototype.getStore = function (key, defaultProps) {
		var store = this.get(key),
				requiredName = (this.name || this.id) + ',' + key;

		if (!(store instanceof Store)) {
			if (!(defaultProps instanceof Object))
				defaultProps = {};

			defaultProps.private = defaultProps.private || this.private;
			defaultProps.maxLife = defaultProps.maxLife || this.maxLife;
			defaultProps.selfDestruct = defaultProps.selfDestruct || this.selfDestruct;

			return this.set(key, new Store(requiredName, defaultProps));
		}

		return store;
	};

	Store.prototype.decrement = function (key, by, start) {
		var current = this.get(key, start || 0);

		if (typeof current !== 'number')
			current = start || 0;

		this.set(key, current - (by || 1));

		return this;
	};

	Store.prototype.increment = function (key, by, start) {
		var current = this.get(key, start || 0);

		if (typeof current !== 'number')
			current = start || 0;

		this.set(key, current + (by || 1));

		return this;
	};

	Store.prototype.remove = function (key, deep) {
		if (this.lock)
			return;

		if (key === undefined) {
			if (this.parent)
				this.parent.forEach(function (key, value, store) {
					if (value === this)
						store.remove(key);
				}.bind(this));

			return this;
		}

		if (this.data.hasOwnProperty(key)) {
			var value = this.get(key, null, null, true);

			if (value instanceof Store)
				value.destroy(deep, false, true);

			delete this.data[key];
		}

		this.__save();

		return this;
	};

	Store.prototype.removeExpired = function () {
		if (this.lock)
			return;

		var value;

		var now = Date.now();

		for (var key in this.data)
			Utilities.setImmediateTimeout(function (store, key, now) {
				if (store.lock)
					return;
				
				value = store.get(key, null, null, true);

				if (store.data[key] && now - store.data[key].accessed > store.maxLife) {
					if (value instanceof Store)
						value.destroy();

					store.remove(key);
				} else if (value instanceof Store)
					value.removeExpired();
			}, [this, key, now]);
	};

	Store.prototype.replaceWith = function (store) {
		if (!(store instanceof Store))
			throw new TypeError(store + ' is not an instance of Store.');

		if (store === this)
			throw new Error('cannot replace a store with itself.');

		var swapPrefix = this.name ? this.name.split(',')[0] : undefined;

		this.clear();

		this.data = store.readyJSON(swapPrefix).data;
	};

	Store.prototype.clear = function () {
		if (this.lock)
			return;

		for (var child in this.children)
			this.children[child].clear();

		this.data = {};

		this.__save();

		return this;
	};

	Store.prototype.destroy = function (deep, unlock, ignoreParent) {
		if (this.destroyed)
			return;

		var key;

		var self = this;

		if (this.destroyChildren || deep)
			for (var child in this.children) {
				this.children[child].destroy(true);

				delete this.children[child];
			}

		if (!ignoreParent && this.parent)
			this.parent.only(function (key, value) {
				return value !== self;
			});

		this.lock = this.lock || !unlock;
		this.data = undefined;

		delete data[this.id];

		Object.defineProperty(this, 'destroyed', {
			configurable: true,
			value: true
		});
	};

	Store.prototype.prolongDestruction = function () {
		if (this.selfDestruct > 0)
			Utilities.Timer.timeout('ProlongDestruction' + this.id, function (store) {
				Utilities.Timer.timeout('SelfDestruct' + store.id, function (store) {
					store.destroy();
				}, store.selfDestruct, [store]);
			}, 500, [this]);
	};

	Store.prototype.all = function () {
		var key,
				value,
				finalValue;

		var object = {};

		for (var key in this.data) {
			value = this.get(key, null, null, true);

			if (value instanceof Store) {
				if (value.isEmpty())
					continue;
				else {
					finalValue = value.all();

					if (finalValue._isEmpty())
						continue;
				}
			} else
				finalValue = value;

			if (finalValue === undefined)
				continue;

			object[key] = finalValue;
		}

		return object;
	};

	Store.prototype.allJSON = function () {
		return JSON.stringify(this.all(), null, 2);
	};

	Store.prototype.readyJSON = function (swapPrefix) {
		var value,
				finalValue;

		var name = this.name ? this.name.toString() : null;

		if (name && typeof swapPrefix === 'string' && swapPrefix.length) {
			var split = this.name.split(',');

			split[0] = swapPrefix;

			name = split.join(',');
		}

		var stringable = {
			name: name,
			save: this.save,
			props: this.props,
			lock: this.lock,
			private: this.private,
			data: {}
		};

		for (var key in this.data) {
			value = this.get(key, null, null, true);

			if (value instanceof Store) {
				if (value.isEmpty())
					continue;
				else {
					finalValue = value.readyJSON(swapPrefix);

					if (finalValue.data._isEmpty())
						continue;
				}
			} else
				finalValue = value;

			if (finalValue !== undefined)
				stringable.data[key] = {
					accessed: this.data[key].accessed,
					value: finalValue
				};
		}

		return stringable;
	};

	Store.prototype.toJSON = function () {
		return this.readyJSON();
	};

	Store.prototype.dump = function  () {
		Log(data);

		return data;
	};

	Store.prototype.expireNow = function () {
		var orig = parseInt(this.maxLife, 10);

		this.maxLife = 1;

		this.removeExpired();
	};

	Store.compareCache = new Store('Compare', {
		maxLife: TIME.ONE_MINUTE * 10,
		private: true
	});

	return Store;
})();
