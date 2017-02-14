/*
JS Blocker 5 (http://jsblocker.toggleable.com) - Copyright 2017 Travis Lee Roman
*/

'use strict';

var Store = (function () {
	function Store (name, props) {
		if (!(props instanceof Object))
			props = {};

		this.setProperties(name, props);

		this.destructionTimer = null;

		if (this.selfDestruct > 0)
			this.prolongDestruction();

		if (!this.data)
			this.load();

		if (this.useSnapshot)
			this.snapshot = new Snapshot(this, {
				maxUnkept: props.maxUnkeptSnapshots
			});

		if (this.save) {			
			this.addCustomEventListener('storeDidSave', function () {
				if (window.globalSetting.debugMode) {
					var bytes = this.savedByteSize();

					LogDebug('SIZE ' + this.id + ': ' + Utilities.byteSize(bytes) + ' - ' + (bytes < Store.LOCAL_SAVE_SIZE ? 'via localStorage' : 'via Safari settings'));
				}
			}.bind(this));

			setTimeout(function (store) {
				store.saveNow();
			}, 5000, this);
		}
	}

	Store = Store._extendClass(EventListener);

	Store.__emptyStoreString = Utilities.decode('4a+h4KGS5IG04L2A4pSl4KKg4rqA4LCC5YCgIA==');
	Store.__inheritable = ['ignoreSave', 'inheritMaxLife', 'selfDestruct'];

	Store.LOCAL_SAVE_SIZE = 100000;
	Store.STORE_STRING = 'Storage-';
	Store.CACHE_STRING = 'Cache-';

	Store.promote = function (object) {
		if (object instanceof Store)
			return object;

		if (!Store.isStore(object))
			throw new TypeError('cannot create store from object');

		if (!object.props)
			object.props = {};

		var store = new Store(object.name, object.props);

		store.data = object.data || object.STORE;

		return store;
	};

	Store.inherit = function (props, store) {
		var inheritable = Store.__inheritable.slice(0);

		if (store.inheritMaxLife)
			inheritable.push('maxLife');

		for (var i = 0; i < inheritable.length; i++)
			props[inheritable[i]] = (inheritable[i] in props) ? props[inheritable[i]] : store[inheritable[i]];

		return props;
	};

	Store.compare = function (left, right, parent) {
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

		var store = new Store(left.id + '|' + right.id, null, {
			maxLife: TIME.ONE.MINUTE * 1
		});

		if (parent)
			store.parent = parent;

		var sides = {
			left: store.getStore('left'),
			right: store.getStore('right'),
			both: store.getStore('both')
		};

		for (var side in compare)
			for (key in compare[side].data) {
				thisValue = compare[side].get(key, null, null, true);
				oppositeValue = compare[swap[side]].get(key, null, null, true);

				if (thisValue === undefined && oppositeValue === undefined)
					sides.both.set(key, undefined);

				else if (oppositeValue === undefined)
					sides[side].set(key, thisValue);

				else if (thisValue instanceof Store) {
					compared = Store.compare(compare.left.getStore(key, null, null, true), compare.right.getStore(key, null, null, true), store);

					for (comparedSide in sides) {
						inside = compared.sides[comparedSide];

						if (!inside.STORE._isEmpty())
							sides[comparedSide].set(key, inside);
					}

				} else if (JSON.stringify(thisValue) === JSON.stringify(oppositeValue))
					sides.both.set(key, thisValue);

				else if (thisValue !== undefined)
					sides[side].set(key, thisValue);
			}

		sides.left = sides.left.readyJSON(null, true);
		sides.right = sides.right.readyJSON(null, true);
		sides.both = sides.both.readyJSON(null, true);

		return {
			store: store,
			sides: sides,
			equal: (sides.left.STORE._isEmpty() && sides.right.STORE._isEmpty())
		};
	};

	Store.isStore = function (object) {
		return !!(object && object.data && object.props) || object.STORE instanceof Object;
	};

	Object.defineProperty(Store.prototype, 'parent', {
		get: function () {
			return this.__parent;
		},

		set: function (newParent) {
			var hasParent = this.__parent instanceof Store;

			if (hasParent && newParent !== null)
				this.parent = null;

			if (newParent instanceof Store)
				this.__parent = newParent;
			else if (newParent === null)
				this.__parent = undefined;
			else
				throw new Error('parent is not null or an instance of Store');
		}
	});

	Store.BREAK = Utilities.Token.generate();

	Store.prototype.__parent = undefined;

	Store.prototype.__save = function (bypassIgnore, saveNow) {
		if (this.lock || (this.ignoreSave && !bypassIgnore))
			return;

		if (this.save) {
			clearTimeout(this.__saveTimeout);

			this.__saveTimeout = setTimeout(function (store) {
				var startTime = window.globalSetting.debugMode ? new Date : 0;

				if (window.globalSetting.debugMode)
					console.time(startTime.toLocaleTimeString() + ' - SAVED ' + store.id);

				var savableStore = JSON.stringify(store),
					useLocal = savableStore.length < Store.LOCAL_SAVE_SIZE;				

				if (useLocal)
					savableStore = LZString.compressToUTF16(savableStore);

				Settings.__method('setItem', store.id, savableStore, !useLocal);

				if (window.globalSetting.debugMode) {
					console.timeEnd(startTime.toLocaleTimeString() + ' - SAVED ' + store.id);

					LogDebug('SAVED ' + store.id + ': ' + (Date.now() - startTime.getTime()) + 'ms');
				}

				store.triggerEvent('storeDidSave');
			}, saveNow ? 0 : this.saveDelay, this);
		} else
			this.triggerEvent('storeWouldHaveSaved');

		if (this.parent)
			Utilities.setImmediateTimeout(function (store) {
				store.parent.__save(true);
			}, [this]);
	};

	Store.prototype.setProperties = function (name, props) {
		this.maxLife = (typeof props.maxLife === 'number') ? props.maxLife : Infinity;
		this.inheritMaxLife = (typeof props.inheritMaxLife === 'boolean') ? props.inheritMaxLife : true;
		this.selfDestruct = (typeof props.selfDestruct === 'number') ? props.selfDestruct : 0;
		this.saveDelay = (typeof props.saveDelay === 'number') ? props.saveDelay : 2000;
		this.lock = !!props.lock;
		this.save = !!props.save;
		this.useSnapshot = !!props.snapshot;
		this.ignoreSave = !!props.ignoreSave;

		if (!this.id)
			if (typeof name === 'string' && name.length)
				this.id = (props.save ? Store.STORE_STRING : Store.CACHE_STRING) + name;
			else
				this.id = Utilities.Token.generate();

		this.name = name;
		this.props = props;
	};

	Store.prototype.savedByteSize = function () {
		return this.save ? JSON.stringify(Settings.__method('getItem', this.id)).length : -1;
	};

	Store.prototype.unlock = function () {
		this.lock = false;
		this.props.lock = false;

		this.forEach(function (key, value) {
			if (value instanceof Store)
				value.unlock();
		});

		this.saveNow();

		return this;
	};

	Store.prototype.saveNow = function (bypassIgnore, immediate) {
		this.__save(bypassIgnore, immediate ? 2 : 1);
	};

	Store.prototype.load = function () {
		if (this.save) {
			var stored = Settings.__method('getItem', this.id, Store.__emptyStoreString);

			var decompressed;

			if (typeof stored === 'string') {
				try {
					decompressed = LZString.decompressFromUTF16(stored);

					if (!decompressed.length || decompressed.charAt(0) === '@')
						decompressed = stored;
				} catch (e) {
					decompressed = stored;
				}

				try {
					stored = JSON.parse(decompressed);
				} catch (e) {
					LogError(e, decompressed);

					stored = {};
				}
			}

			if (stored.lock)
				this.lock = true;

			this.data = stored.STORE || stored.data || {};
		} else
			this.data = {};
	};

	Store.prototype.reload = function () {
		if (!this.save)
			throw new Error('cannot reload a store that is not saved.');

		this.load();
	};

	Store.prototype.triggerEvent = function (name) {
		Utilities.Timer.timeout('StoreTrigger' + this.id + name, function (store, name) {
			store.trigger(name, store);
		}, 500, [this, name]);
	};

	Store.prototype.isEmpty = function () {
		return !this.data || this.data._isEmpty() || this.all()._isEmpty();
	};

	Store.prototype.keys = function () {
		return Object.keys(this.data);
	};

	Store.prototype.keyExist = function (key) {
		return (key in this.data);
	};

	Store.prototype.clone = function (prefix, props) {
		var value;

		var store = new Store(prefix ? (prefix + ',' + this.name) : this.name, props),
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
			else if (deep && storeValue instanceof Store)
				this.set(key, storeValue.clone('Merged'));
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
			value = this.get(key, null, null, true);

			if (fn(key, value, this))
				break;
		}

		return value;
	};

	Store.prototype.findLast = function (fn) {
		if (typeof fn !== 'function')
			throw new TypeError('fn is not a function');

		var value;

		var keys = this.keys(),
			found = false;

		for (var i = keys.length; i--;) {
			value = this.get(keys[i], null, null, true);

			if (fn(keys[i], value, this)) {
				found = true;

				break;
			}
		}

		return found ? value : null;
	};

	Store.prototype.deepFindKey = function (findKey, level) {
		var info = {
			key: findKey,
			store: null,
			value: undefined
		};

		if (typeof level !== 'number')
			level = false;

		var value;

		for (var key in this.data) {
			value = this.get(key, null, null, true);

			if ((value instanceof Store) && (level > 0 || level === false))
				info = value.deepFindKey(findKey, level !== false ? level - 1 : level);
			else if (findKey === key && (level === 0 || level === false)) {
				info.store = this;
				info.value = value;
			}

			if (info.value !== undefined)
				break;
		}

		return info;
	};

	Store.prototype.forEach = function (fn) {
		var value,
			result;

		var results = [];

		for (var key in this.data) {
			value = this.get(key, null, null, true);
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

		var store = useSelf ? this : new Store('Map-' + Utilities.Token.generate(), {
			selfDestruct: TIME.ONE.SECOND * 30
		});

		for (var i = 0; i < results.length; i++)
			store.set(results[i].key, results[i].result);

		return store;
	};

	Store.prototype.filter = function (fn) {
		var results = this.forEach(fn);

		var store = new Store('Filter-' + Utilities.Token.generate(), {
			selfDestruct: TIME.ONE.SECOND * 30
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

	Store.prototype.copy = function (key, newKey) {
		if (!this.keyExist(key))
			throw new Error(key + ' does not exist.');

		return this.set(newKey, this.get(key));
	};

	Store.prototype.move = function (key, newKey) {
		return this.copy(key, newKey).remove(key);
	};

	Store.prototype.replace = function (key, newKey, value) {
		if (typeof value === 'undefined')
			throw new TypeError('value cannot be undefined.');
		
		return this.move(key, newKey).set(newKey, value);
	};

	Store.prototype.set = function (key, value, setNull, parent) {
		if (this.lock) {
			if (value instanceof Store) {
				value.lock = true;

				return value;
			}

			return this;
		}

		if ((value === null && !setNull) || value === undefined)
			return this;

		if (this.selfDestruct > 0)
			setTimeout(function (store) {
				store.prolongDestruction();
			}, 50, this);

		try {
			if ((typeof key !== 'string' && typeof key !== 'number') || this.data._hasPrototypeKey(key))
				throw new Error(key + ' cannot be used as key.');
		} catch (e) {
			return LogError(['ERROR IN SET - locked:', this.lock, 'destroyed:', this.destroyed, 'data:', this.data, 'key:', key, 'value:', value, 'store:', this], e);
		}

		var accessed = this.data[key] ? this.data[key].accessed : (this.maxLife < Infinity ? Date.now() : -1);

		this.data[key] = {
			value: value
		};

		if (accessed > -1)
			this.data[key].accessed = accessed;

		if (value instanceof Store)
			value.parent = parent || this;

		if (!this.ignoreSave)
			if (value instanceof Store)
				setTimeout(function (store, value) {
					if (!value.readyJSON().STORE._isEmpty())
						store.__save();
				}, 100, this, value);
			else
				this.__save();

		if (this.maxLife < Infinity)
			setTimeout(function (store, key) {
				Utilities.Timer.timeout('StoreCleanup-' + store.name + '$' + key, store.removeExpired.bind(store), store.maxLife);
			}, 100, this, key);

		if (value instanceof Store)
			return this.data[key].value;

		return this;
	};

	Store.prototype.setMany = function (object) {
		if (typeof object === 'object')
			for (var key in object)
				if (object.hasOwnProperty(key))
					this.set(key, object[key]);

		return this;
	};

	Store.prototype.get = function (key, defaultValue, asReference, noAccess) {
		if (this.selfDestruct > 0)
			this.prolongDestruction();

		try {
			if (this.data.hasOwnProperty(key)) {
				if (this.maxLife < Infinity && !noAccess)
					Utilities.setImmediateTimeout(function (store, key) {
						if (!store.destroyed && store.data && store.data[key]) {
							store.data[key].accessed = Date.now();

							store.__save(null, null, true);
						}
					}, [this, key]);

				var value = this.data[key].value;

				if (value !== null && !(value instanceof Store))
					if (Store.isStore(value)) {
						value.name = (this.name || this.id) + ',' + key;
						value.props = {};

						Store.inherit(value.props, this);

						var promoted = Store.promote(value),
							accessed = this.maxLife < Infinity ? Date.now() : -1;

						promoted.parent = this;

						this.data[key] = {
							value: promoted
						};

						if (accessed > -1)
							this.data[key] = accessed;

						return promoted;
					} else if (asReference)
						return value;
					else
						return Object._copy(value, defaultValue);
				else if (value === null || !value.destroyed)
					return value;
			} else if (defaultValue !== undefined && defaultValue !== null)
				return this.set(key, defaultValue).get(key, null, asReference);
		} catch (error) {
			LogError(['ERROR IN GET', this.id, key, this.destroyed, this, this.data], error, '------');
		}
	};

	Store.prototype.getMany = function (keys) {
		return this.filter(function (key) {
			return keys._contains(key);
		});
	};

	Store.prototype.getStore = function (key, defaultProps, parent) {
		var store = this.get(key),
			hasDefaultProps = !!defaultProps,
			requiredName = (this.name || this.id) + ',' + key;

		if (!(defaultProps instanceof Object)) 
			defaultProps = {};

		Store.inherit(defaultProps, this);

		if (!(store instanceof Store) || !store.data || store.destroyed)
			store = this.set(key, new Store(requiredName, defaultProps), null, parent);
		else if (hasDefaultProps)
			for (var i = Store.__inheritable.length; i--;)
				if (defaultProps[Store.__inheritable[i]] !== store.props[Store.__inheritable[i]]) {
					store.setProperties(requiredName, defaultProps);

					break;
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

	Store.prototype.remove = function (key) {
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
			delete this.data[key];

			this.clearTimers(key);
		}

		this.__save();

		return this;
	};

	Store.prototype.removeMatching = function (regexp) {
		if (this.lock)
			return;

		var keys = Object.keys(this.data).filter(function (value) {
			return regexp.test(value);
		});

		for (var i = keys.length; i--;)
			this.remove(keys[i]);

		return this;
	};

	Store.prototype.removeExpired = function () {
		if (this.lock)
			return;

		var value,
			now;

		for (var key in this.data) {
			if (!now)
				now = Date.now();
		
			Utilities.setImmediateTimeout(function (store, key, now) {
				if (store.lock)
					return;

				value = store.get(key, null, null, true);

				if (store.data[key] && store.data[key].accessed && now - store.data[key].accessed > store.maxLife) {
					if (value instanceof Store)
						value.destroy();

					store.remove(key);
				} else if (value instanceof Store)
					value.removeExpired();
			}, [this, key, now]);
		}
	};

	Store.prototype.replaceWith = function (store) {
		if (!(store instanceof Store))
			throw new TypeError(store + ' is not an instance of Store.');

		if (store === this)
			throw new Error('cannot replace a store with itself.');

		var swapPrefix = this.name ? this.name.split(',')[0] : undefined;

		this.clear();

		this.data = store.readyJSON(swapPrefix).STORE;

		return this;
	};

	Store.prototype.clear = function (ignoreSave) {
		if (this.lock)
			return;

		this.data = {};

		if (!ignoreSave)
			this.__save();

		this.triggerEvent('storeDidClear');

		this.clearTimers();

		return this;
	};

	Store.prototype.destroy = function (deep, unlock, ignoreParent) {
		if (this.destroyed)
			return;

		this.destroyed = true;

		this.clearTimers();

		var self = this;

		if (!ignoreParent && this.parent)
			this.parent.only(function (key, value) {
				return value !== self;
			});

		this.lock = this.lock || !unlock;
		this.data = undefined;
	};

	Store.prototype.prolongDestruction = function () {
		if (this.selfDestruct > 0) {
			clearTimeout(this.destructionTimer);

			this.destructionTimer = setTimeout(function (store) {
				store.destroy();
			}, this.selfDestruct, this);
		}
	};

	Store.prototype.clearTimers = function (key) {
		if (!key)
			key = '';

		var timerIDPrefix = 'StoreCleanup-' + this.name;

		Utilities.Timer.removeStartingWith('timeout', timerIDPrefix + '$' + key, timerIDPrefix + ',' + key + (key.length ? '$' : ''));
	};

	Store.prototype.all = function () {
		var key,
			value,
			finalValue;

		var object = {};

		for (key in this.data) {
			value = this.get(key, null, null, true);

			if (value instanceof Store)
				if (value.isEmpty())
					continue;
				else {
					finalValue = value.all();

					if (finalValue._isEmpty())
						continue;
				}
			else
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

	Store.prototype.readyJSON = function (swapPrefix, noProps) {
		var value,
			finalValue;

		var name = (this.name && !this.parent) ? this.name.toString() : null;

		if (name && typeof swapPrefix === 'string' && swapPrefix.length) {
			var split = this.name.split(',');

			split[0] = swapPrefix;

			name = split.join(',');
		}

		var stringable = {
			STORE: {},
			props: {
				lock: this.lock
			}
		};

		if (noProps)
			delete stringable.props;

		for (var key in this.data) {
			value = this.get(key, null, null, true);

			if (value instanceof Store)
				if (value.isEmpty())
					continue;
				else {
					finalValue = value.readyJSON(swapPrefix);

					if (finalValue.STORE._isEmpty())
						continue;
				}
			else
				finalValue = value;

			if (finalValue !== undefined)
				stringable.STORE[key] = {
					accessed: this.data[key].accessed,
					value: finalValue
				};
		}

		for (key in stringable.props)
			if (stringable.props[key] === false)
				stringable.props[key] = undefined;

		return stringable;
	};

	Store.prototype.toJSON = function () {
		return this.readyJSON();
	};
	
	return Store;
})();
