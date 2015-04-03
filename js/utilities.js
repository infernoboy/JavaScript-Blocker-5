"use strict";

// Global constants =====================================================================

var ARRAY = {
	CONTAINS: {
		ONE: 1,
		ANY: 2,
		ALL: 4,
		NONE: 8
	}
};

var TIME = {
	ONE: {
		SECOND: 1000,
		MINUTE: 1000 * 60,
		HOUR: 1000 * 60 * 60,
		DAY: 1000 * 60 * 60 * 24
	}
};

var LINE_SEPARATOR = '―――――――――――――――';


// Primary utilities ====================================================================

var Utilities = {
	__watchdog: {},
	__immediateTimeouts: [],

	safariBuildVersion: parseInt(window.navigator.appVersion.split('Safari/')[1].split('.')[0], 10),

	noop: function () {},

	beautifyScript: function (script) {
		var beautiful = js_beautify(script, {
			indent_size: 2
		});

		var code = $('<pre><code class="javascript"></code></pre>').find('code').text(beautiful);

		hljs.highlightBlock(code[0]);

		return code.end();
	},

	OSXVersion: (function () {
		var osx = window.navigator.userAgent.match(/Mac OS X ([^\)]+)\)/);

		if (!osx[1])
			return null;

		var version = osx[1].split(/_/);

		return version[0] + '.' + version[1];
	})(),

	watchdog: function (type, tries, timeLimit, callback) {
		return new Promise(function (resolve, reject) {
			var first;

			if (typeof callback !== 'function')
				callback = $.noop;

			if (!Utilities.__watchdog[type])
				Utilities.__watchdog[type] = [];

			Utilities.__watchdog[type].push(Date.now());

			if (Utilities.__watchdog[type].length > tries) {
				first = Utilities.__watchdog[type].shift();

				if (Utilities.__watchdog[type][Utilities.__watchdog[type].length - 1] - first >= timeLimit)
					resolve();
				else
					reject();
			} else
				resolve();

			if (Utilities.__watchdog[type].length > tries)
				Utilities.__watchdog[type].splice(0, tries);
		});
	},

	makeArray: function (arrayLikeObject, offset) {
		if (typeof offset !== 'number')
			offset = 0;

		return Array.prototype.slice.call(arrayLikeObject, offset);
	},

	setImmediateTimeout: function (fn, args) {
		this.__immediateTimeouts.push({
			fn: fn,
			args: args
		});
		
		if (!Utilities.Page.isWebpage)
			window.postMessage('nextImmediateTimeout', '*');
		else
			GlobalPage.message('bounce', {
				command: 'nextImmediateTimeout'
			});
	},

	nextImmediateTimeout: function () {
		if (this.__immediateTimeouts.length) {
			var next = this.__immediateTimeouts.shift();

			if (typeof next.fn === 'function')
				next.fn.apply(null, next.args);
		}
	},

	decode: function (str) {
		try {
			return decodeURIComponent(escape(atob(str)));
		} catch (e) {
			return str;
		}
	},

	encode: function (str) {
		return btoa(unescape(encodeURIComponent(str)));
	},

	throttle: function (fn, delay, extraArgs, debounce) {
		var timeout = null,
				last = 0;

		var execute = function (args) {
			last = Date.now();

			fn.apply(this, Utilities.makeArray(args).concat(extraArgs || []));
		};

		return function () {
			if (delay === 0)
				return Utilities.setImmediateTimeout(execute.bind(this, arguments));
			
			var elapsed = Date.now() - last;

			clearTimeout(timeout);

			if (elapsed > delay && !debounce)
				execute.call(this, arguments)
			else
				timeout = setTimeout(execute.bind(this, arguments), debounce ? delay : delay - elapsed);
		};
	},

	byteSize: function (number) {	
		var power;

		var number = parseInt(number, 10),
				powers = ['', 'K', 'M', 'G', 'T', 'E', 'P'],
				divisor = /Mac/.test(navigator.platform) ? 1000 : 1024;

		for(var key = 0; key < powers.length; key++) {
			power = powers[key];

			if(Math.abs(number) < divisor)
				break;

			number /= divisor;
		}

		return (Math.round(number * 100) / 100) + ' ' + power + (divisor === 1024 && power.length ? 'i' : '') + (power.length ? 'B' : ('byte' + (number === 1 ? '' : 's')));
	},

	isNewerVersion: function (a, b) {
		var a = typeof a === 'string' ? a : '0',
				b = typeof b === 'string' ? b : '0',
				aModifier = a.split(/[^0-9\.]+/),
				bModifier = b.split(/[^0-9\.]+/),
				aSimpleModifier = a.split(/[0-9\.]+/),
				bSimpleModifier = b.split(/[0-9\.]+/),
				aVersionPieces = aModifier[0].split(/\./),
				bVersionPieces = bModifier[0].split(/\./),
				aModifierCheck = aModifier[1] !== undefined ? parseInt(aModifier[1], 10) : Infinity,
				bModifierCheck = bModifier[1] !== undefined ? parseInt(bModifier[1], 10) : Infinity;

		aModifier[1] = isNaN(aModifierCheck) ? aSimpleModifier[1] : aModifierCheck;
		bModifier[1] = isNaN(bModifierCheck) ? bSimpleModifier[1] : bModifierCheck;

		while (aVersionPieces.length < 6)
			aVersionPieces.push(0);

		while (bVersionPieces.length < 6)
			bVersionPieces.push(0);

		var aVersion = aVersionPieces.join(''), bVersion = bVersionPieces.join('');

		if (aVersion.charAt(0) === '0' || bVersion.charAt(0) === '0') {
			aVersion = '99999' + aVersion;
			bVersion = '99999' + bVersion;
		}

		aVersion = parseInt(aVersion, 10);
		bVersion = parseInt(bVersion, 10);

		return (bVersion > aVersion || (bVersion === aVersion && bModifier[1] > aModifier[1]));
	},

	typeOf: function (object) {
		return ({}).toString.call(object).match(/\s([a-zA-Z]+)/)[1].toLowerCase();
	},

	isFloat: function (subject) {
		return typeof subject === 'number' && isFinite(subject) && subject % 1 !== 0;
	},

	messageHistory: function () {
		return {
			log: Popover.window.Log.history.concat(GlobalPage.window.Log.history).reverse(),
			error: Popover.window.LogError.history.concat(GlobalPage.window.LogError.history).reverse(),
			debug: Popover.window.LogDebug.history.concat(GlobalPage.window.LogDebug.history).reverse(),
		};
	},

	humanTime: function (time) {
		var convertedUnit;

		var seconds = time / 1000,
				humanTime = {};

		var units = {
			days: 24 * 60 * 60,
			hours: 60 * 60,
			minutes: 60,
			seconds: 1
		};
		
		for (var unit in units) {
			if (seconds / units[unit] > 0) {
				convertedUnit = Math.floor(seconds / units[unit]);

				humanTime[unit] = convertedUnit;

				seconds -= convertedUnit * units[unit];
			} else
				humanTime[unit] = 0;
		};

		return humanTime;
	},

	Queue: (function () {
		var Queue = function Queue (delay) {
			this.__stopped = false;

			this.delay = typeof delay === 'number' ? delay : 1;

			if (delay === false)
				this.delay = false;
			
			this.clear();
		};

		Queue.prototype.push = function (fn, args) {			
			this.queue.push([fn, args || []]);
		};

		Queue.prototype.next = function () {
			if (!this.__started)
				return;

			var next = this.queue.shift();

			if (next) {
				next[0].apply(this, next[1]);

				if (this.delay === false)
					this.next();
				else
					Utilities.setImmediateTimeout(this.next.bind(this));
			}

			return this;
		}

		Queue.prototype.start = function () {
			if (this.__started)
				return;

			this.__stopped = false;
			this.__started = true;

			if (this.delay === false || this.delay === 0)
				return this.next();

			for (var b = this.queue.length; this.index < b; this.index++) {
				if (!this.__started)
					break;

				this.timers[this.index] = setTimeout(function (self, index, queued) {
					if (self.__started) {
						self.queue.shift();

						queued[0].apply(self, queued[1]);
					} else if (self.__stopped === false) {
						self.__stopped = true;

						self.index = 0;
					}

					delete self.timers[index];
				}, this.delay * this.index, this, this.index, this.queue[this.index]);
			}
		};
		
		Queue.prototype.stop = function () {
			this.__started = false;

			var keys = Object.keys(this.timers || {});

			for (var i = 1, b = keys.length; i < b; i++)
				clearTimeout(this.timers[keys[i]]);

			this.timers = {};

			return this;
		};

		Queue.prototype.clear = function () {
			this.stop();

			this.queue = [];
			this.index = 0;
			this.timers = {};
		}

		return Queue;
	})(),

	Group: {
		NONE: 0,
		IS_ANYTHING: 1,
		IS: 2,
		STARTS_WITH: 3,
		ENDS_WITH: 4,
		CONTAINS: 5,
		MATCHES: 6,

		NOT: {
			IS: 7,
			STARTS_WITH: 8,
			ENDS_WITH: 9,
			CONTAINS: 10,
			MATCHES: 11 
		},

		isGroup: function (group) {
			return (group && typeof group === 'object' && typeof group.group === 'string' && Array.isArray(group.items));
		},

		satisfies: function (method, haystack, needle) {
			var type = Utilities.typeOf(needle);

			if (type === 'object')
				return this.eval(needle, haystack);

			if (!this.TYPES[type] || !this.TYPES[type]._contains(method))
				return false;

			switch (method) {
				case this.IS_ANYTHING:
					return (typeof needle !== 'undefined' && needle !== null);
				break;

				case this.IS:
					return haystack === needle;
				break;

				case this.NOT.IS:
					return haystack !== needle;
				break;

				case this.STARTS_WITH:
					return haystack._startsWith(needle);
				break;

				case this.NOT.STARTS_WITH:
					return !haystack._startsWith(needle);
				break;

				case this.ENDS_WITH:
					return haystack._endsWith(needle);
				break;

				case this.NOT.ENDS_WITH:
					return !haystack._endsWith(needle);
				break;

				case this.CONTAINS:
					return haystack._contains(needle);
				break;

				case this.NOT.CONTAINS:
					return !haystack._contains(needle);
				break;

				case this.MATCHES:
					try {
						return (new RegExp(needle)).test(haystack);
					} catch (e) {}
				break;

				case this.NOT.MATCHES:
					try {
						return !(new RegExp(needle)).test(haystack);
					} catch (e) {}
				break;
			}

			return false;
		},

		eval: function (group, subject) {
			if (!this.isGroup(group))
				throw new TypeError(group + ' is not a valid group.');

			if (!group.items.length)
				return true;

			var results = [];

			for (var i = 0; i < group.items.length; i++) {
				if (this.isGroup(group.items[i]))
					results.unshift(this.eval(group.items[i], subject));
				else
					results.unshift(this.satisfies(group.items[i].method, subject[group.items[i].key], group.items[i].needle));

				if (group.group === 'all' && !results[0])
					return false;
			}

			return results._contains(true);
		}
	},

	Timer: {
		timers: {
			interval: {},
			timeout: {}
		},

		__findReference: function (type, reference) {
			var timers = this.timers[type];

			if (typeof reference === 'string')
				return timers[reference] ? reference : undefined;

			for (var timerID in timers)
				if (timers[timerID].reference === reference)
					return timerID;
		},

		__run_interval: function (timerID, isSetter) {
			var interval = this.timers.interval[timerID];

			if (!interval)
				return this.remove('RunInterval' + timerID);

			if (!isSetter)
				interval.script.apply(null, interval.args);

			setTimeout(this.__run_interval.bind(this), interval.time, timerID);
		},

		exist: function (type, reference) {
			return !!this.__findReference(type, reference);
		},

		interval: function () {
			this.create.apply(this, ['interval'].concat(Utilities.makeArray(arguments)));
		},

		timeout: function () {
			this.create.apply(this, ['timeout'].concat(Utilities.makeArray(arguments)));
		},

		timeoutNow: function (reference) {
			var timerID = this.__findReference('timeout', reference);

			if (timerID) {
				clearTimeout(this.timers.timeout[timerID].timer);

				this.timers.timeout[timerID].script.apply(null, this.timers.timeout[timerID].args);

				this.remove('timeout', reference);
			}
		},

		resetTimeout: function (reference, time) {			
			var timerID = this.__findReference('timeout', reference);

			if (timerID) {
				var info = this.timers.timeout[timerID];

				this.remove('timeout', reference);

				this.timeout(reference, info.script, time, info.args);
			}
		},
		
		create: function (type, reference, script, time, args) {
			if (!['timeout', 'interval']._contains(type))
				throw new TypeError(type + ' is not a supported timer.');

			if (reference === undefined)
				throw new TypeError('reference cannot be undefined.');

			if (type === 'interval' && typeof reference !== 'string')
				throw new TypeError(reference + ' cannot be used as an interval reference.');
			
			if (!Array.isArray(args))
				args = [];

			this.remove(type, reference);

			var timer = null,
					timerID = typeof reference === 'string' ? reference : Utilities.Token.generate();

			if (type === 'timeout')
				timer = setTimeout(function (timer, type, reference, script, args) {
					script.apply(null, args);

					timer.remove(type, reference);
				}, time, this, type, reference, script, args);

			this.timers[type][timerID] = {
				reference: reference,
				timer: timer,
				args: args,
				time: time,
				script: script
			};

			if (type === 'interval')
				this.__run_interval(timerID, true);
		},

		remove: function () {
			var timerID;

			var existed = false,
					args = Utilities.makeArray(arguments),
					type = args.shift();

			if (!args.length) {
				for (timerID in this.timers[type])
					this.remove(type, this.timers[type][timerID].reference);

				return;
			}
	
			for (var i = 0; i < args.length; i++) {
				timerID = this.__findReference(type, args[i]);

				if (timerID) {
					if (type === 'timeout')
						clearTimeout(this.timers[type][timerID].timer);

					existed = true;

					delete this.timers[type][timerID];
				}
			}

			return existed;
		}
	},

	Token: (function () {
		var tokens = {},
				characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

		return {
			generate: function () {
				var text = '';

				for (var i = 0; i < 15; i++)
					text += characters[Math.floor(Math.random() * characters.length)];

				return text;
			},

			create: function (value, keep) {
				var token = this.generate();

				if (tokens[token])
					return this.create(value, keep);

				tokens[token] = {
					value: value,
					keep: !!keep
				};

				return token;
			},

			valid: function (token, value, expire) {
				if (typeof token !== 'string' || !(token in tokens))
					return false;

				var isValid = tokens[token].value === value;

				if (expire !== undefined)
					this.expire(token, expire);

				return isValid;
			},

			expire: function (token, expireKept) {
				if ((token in tokens) && (!expireKept || !tokens[token].keep))
					delete tokens[token];
			}
		}
	})(),

	Element: {
		__adjustmentProperties: ['top', 'right', 'bottom', 'left', 'z-index', 'clear', 'float', 'vertical-align', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left', '-webkit-margin-before-collapse', '-webkit-margin-after-collapse'],

		insertText: function (element, text) {
			var value = element.value,
					selectionStart = element.selectionStart;

			element.value = value.substr(0, selectionStart) + text + value.substr(element.selectionEnd);

			element.selectionStart = element.selectionEnd = selectionStart + 1;
		},
		
		cloneAdjustmentProperties: function (fromElement, toElement) {
			for (var i = 0; i < this.__adjustmentProperties.length; i++)
				toElement.style.setProperty(this.__adjustmentProperties[i], fromElement.getPropertyValue(this.__adjustmentProperties[i]), 'important');
		},

		setCSSProperties: function (element, properties, isImportant) {
			for (var property in properties)
				element.style.setProperty(property, properties[property], isImportant ? 'important' : '');
		},

		repaint: function (element) {
			var display = element.style.display;

			element.style.setProperty('display', 'none', 'important');
			element.offsetHeight;
			element.style.setProperty('display', display, 'important');
		},

		/**
		@function fitFontWithin Adjust the size of a font so that it fits perfectly within containerNode.
		@param {Element} containerNode - Box element that the font should fit within.
		@param {Element} textNode - Element that will have its font size adjusted.
		@param (Element) wrapperNode - Parent element of textNode whose top margin is adjusted so as to be centered within containerNode.
		*/
		fitFontWithin: function (containerNode, textNode) {
			var textNodeHeight,
					textNodeWidth;

			var currentFontSize = 30,
					maxWrapperHeight = containerNode.offsetHeight + containerNode.offsetHeight,
					maxWrapperWidth = containerNode.offsetWidth;
						
			do {
				textNode.style.setProperty('font-size', currentFontSize + 'pt', 'important');

				textNodeHeight = textNode.offsetHeight;
				textNodeWidth = textNode.offsetWidth;

				currentFontSize -= 1;
			} while ((textNodeHeight > maxWrapperHeight || textNodeWidth > maxWrapperWidth) && currentFontSize > 10);

			return textNodeHeight;		
		},

		createFromHTML: function (html) {
			var div = document.createElement('div');

			try {
				div.innerHTML = html;

				return div.childNodes;
			} catch (error) {
				html = html.replace(/<(input|br|img|link|meta) ([^>]+)>/g, '<$1 $2/>');

				try {
					div.innerHTML = html;

					return div.childNodes;
				} catch (error) {
					LogError(error);

					throw new Error('failed to create html element from string');
				}
			}
		}
	},

	Page: {
		isXML: ((document.ownerDocument || document).documentElement.nodeName.toUpperCase() !== 'HTML' && document.xmlVersion !== null),
		isGlobal: (window.GlobalPage && GlobalPage.window === window),
		isPopover: Popover.window === window,
		isTop: window === window.top,
		isAbout: document.location.protocol === 'about:',
		isSrcDoc: document.location.href === 'about:srcdoc',

		getCurrentLocation: function () {
			if (['http:', 'https:', 'file:']._contains(document.location.protocol)) {
				var base = document.location.protocol + '//' + document.location.host + document.location.pathname + document.location.search;

				if (document.location.hash.length > 0)
					return base + document.location.hash;
				else if (document.location.href.substr(-1) === '#')
					return base + '#';
				else if (/\?$/.test(document.location.href))
					return base + '?';
				else
					return base;
			} else {
				return document.location.href;
			}
		}
	},

	URL: {
		__anchor: document.createElement('a'),
		__structure: /^(blob:)?(https?|s?ftp|file|safari\-extension):\/\/([^\/]+)\//,
		__IPv4: /^([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3})(:[0-9]{1,7})?$/,
		__IPv6: /^\s*((([0-9A-Fa-f]{1,4}:){7}([0-9A-Fa-f]{1,4}|:))|(([0-9A-Fa-f]{1,4}:){6}(:[0-9A-Fa-f]{1,4}|((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){5}(((:[0-9A-Fa-f]{1,4}){1,2})|:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){4}(((:[0-9A-Fa-f]{1,4}){1,3})|((:[0-9A-Fa-f]{1,4})?:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){3}(((:[0-9A-Fa-f]{1,4}){1,4})|((:[0-9A-Fa-f]{1,4}){0,2}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){2}(((:[0-9A-Fa-f]{1,4}){1,5})|((:[0-9A-Fa-f]{1,4}){0,3}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){1}(((:[0-9A-Fa-f]{1,4}){1,6})|((:[0-9A-Fa-f]{1,4}){0,4}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(:(((:[0-9A-Fa-f]{1,4}){1,7})|((:[0-9A-Fa-f]{1,4}){0,5}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))(%.+)?\s*$/,

		createFromContent: function (content, type, base64) {
			var URL = window.URL || window.webkitURL;

			if (!base64 && window.Blob && URL && URL.createObjectURL)
				return URL.createObjectURL(new Blob([content], {
					type: type
				}));
			else
				return 'data:' + type + ';base64,' + Utilities.encode(content);
		},

		isURL: function (url) {
			return typeof url === 'string' && (this.__structure.test(url) || this.protocol(url) === 'about:' || this.protocol(url) === 'data:');
		},

		strip: function (url) {
			if (typeof url !== 'string')
				throw new TypeError(url + ' is not a string.');

			if (url._contains('?'))
				url = url.substr(0, url.indexOf('?'));

			if (url._contains('#'))
				url = url.substr(0, url.indexOf('#'));

			return url;
		},

		getAbsolutePath: function (url) {
			this.__anchor.href = url;

			if (this.__anchor.protocol === ':')
				return 'about:blank';

			return this.__anchor.href;
		},

		extractPath: function (url) {
			this.__anchor.href = url;

			return this.__anchor.pathname;
		},

		extractHost: function (url) {
			var url = (typeof url !== 'string') ? Utilities.Page.getCurrentLocation() : url;

			if (/^about:/.test(url))
				return url.substr(6);

			if (/^javascript:/.test(url))
				return 'Inline JavaScript';

			if (/^data:/.test(url))
				return 'Data URI';

			if (/^blob:/.test(url))
				return 'Blob URI';

			this.__anchor.href = url;

			return this.__anchor.host;
		},

		hostParts: function (host, prefixed) {
			if (!this.hostParts.cache && window.Store)
				this.hostParts.cache = new Store('HostParts', {
					maxLife: TIME.ONE.HOUR
				});

			var cacheKey = prefixed ? 'prefixed' : 'unprefixed',
					hostStore =  this.hostParts.cache.getStore(host),
					cached = hostStore.get(cacheKey);

			if (cached)
				return cached;

			if (!host._contains('.') || this.__IPv4.test(host) || this.__IPv6.test(host))
				return hostStore.set(cacheKey, [host]).get(cacheKey);

			var split = host.split(/\./g).reverse(),
					part = split[0],
					parts = [],
					eTLDLength = EffectiveTLDs.length,
					sTLDLength = SimpleTLDs.length;

			if (!EffectiveTLDs._contains(host) && !SimpleTLDs._contains(host)) {
				var part,
						j;
								
				hostLoop:
				for (var i = 1; i < split.length; i++) {
					part = split[i] + '.' + part;

					for (j = 0; j < sTLDLength; j++)
						if (SimpleTLDs[j] === part)
							continue hostLoop;

					for (j = 0; j < eTLDLength; j++)
						if (EffectiveTLDs[j].test(part))
							continue hostLoop;

					parts.push((((i < split.length - 1) && prefixed) ? '.' : '') + part);
				}
			}

			if (!parts.length)
				parts.push(host);

			parts.reverse();

			if (prefixed)
				parts.splice(1, 0, '.' + parts[0]);
			
			return hostStore.set(cacheKey, parts).get(cacheKey);
		},

		pageParts: function (url) {
			this.__anchor.href = url;

			var parts = [this.__anchor.origin !== 'null' ? (this.__anchor.origin + '/') : this.__anchor.protocol],
					splitPath = this.__anchor.pathname.split(/\//g);
		
			if (splitPath.length > 1)
				splitPath._remove(0);

			if (splitPath[0].length)
				for (var i = 0; i < splitPath.length; i++)
					if (splitPath[i].length)
						parts.push(parts[i] + splitPath[i] + (i < splitPath.length - 1 ? '/' : ''));

			return {
				parts: parts,
				search: this.__anchor.search,
				hash: this.__anchor.hash,
				pageSearch: parts[parts.length - 1] + this.__anchor.search,
				pageHash: parts[parts.length - 1] + this.__anchor.search + this.__anchor.hash
			};
		},

		host: function (url) {
			this.__anchor.href = url;

			return this.__anchor.host;
		},

		origin: function (url) {
			this.__anchor.href = url;

			return this.__anchor.origin;
		},

		protocol: function (url) {
			this.__anchor.href = url;

			return this.__anchor.protocol === ':' ? 'about:' : this.__anchor.protocol;
		},

		href: function (url) {
			this.__anchor.href = url;

			return this.__anchor.href;
		},

		hash: function (url) {
			this.__anchor.href = url;

			return this.__anchor.hash;
		},

		search: function (url) {
			this.__anchor.href = url;

			return this.__anchor.search;
		}
	}
};


// Global functions ==========================================================

var LOG_HISTORY_SIZE = 20;

function Log () {
	var args = Utilities.makeArray(arguments),
			logMessages = Utilities.Page.isGlobal ? args : ['(JSB)'].concat(args);

	logMessages.unshift((new Date).toLocaleTimeString(), '-');

	Log.history.unshift(logMessages.join(' '));

	Log.history = Log.history._chunk(LOG_HISTORY_SIZE)[0];

	if (window.localConsole)
		window.localConsole.log.apply(window.localConsole, logMessages);

	console.log.apply(console, logMessages);
};

Log.history = [];

function LogDebug () {
	if (globalSetting.debugMode) {
		var args = Utilities.makeArray(arguments),
				debugMessages = Utilities.Page.isGlobal ? args : ['(JSB)'].concat(args);

		debugMessages.unshift((new Date).toLocaleTimeString(), '-');

		LogDebug.history.unshift(debugMessages.join(' '));

		LogDebug.history = LogDebug.history._chunk(LOG_HISTORY_SIZE)[0];

		if (window.localConsole)
			window.localConsole.debug.apply(window.localConsole, debugMessages);

		console.debug.apply(console, debugMessages);

		if (Utilities.Page.isWebpage)
			for (var i = 0; i < args.length; i++)
				GlobalPage.message('logDebug', {
					source: document.location.href,
					message: args[i]
				});
	}
};

LogDebug.history = [];

function LogError () {
	var	error,
			errorMessage,
			errorStack,
			showThisError;

	var args = Utilities.makeArray(arguments);
			
	for (var i = 0; i < args.length; i++) {
		error = args[i];
		showThisError = false;

		if (error && (error instanceof DOMException || (error.constructor && error.constructor.name && error.constructor.name._endsWith('Error')))) {
			errorStack = error.stack ? error.stack.replace(new RegExp(ExtensionURL()._escapeRegExp(), 'g'), '/') : '';

			if (error.sourceURL)
				errorMessage = [error.message, '-', error.sourceURL.replace(ExtensionURL(), '/'),  '-', error.line];
			else
				errorMessage = [error.message];
		} else
			errorMessage = [error];

		errorMessage.unshift((new Date).toLocaleTimeString(), '-');

		LogError.history.unshift({
			message: errorMessage,
			stack: errorStack || ''
		});

		LogError.history = LogError.history._chunk(LOG_HISTORY_SIZE)[0];

		if (Utilities.Page.isWebpage)
			try {
				GlobalPage.message('logError', {
					source: document.location.href,
					message: errorMessage
				});
			} catch (error) {
				showThisError = true;
			}

		if (Utilities.Page.isGlobal || Utilities.Page.isPopover || globalSetting.debugMode || showThisError) {
			if (Utilities.Page.isWebpage)
				errorMessage.unshift('(JSB)');

			if (window.localConsole)
				window.localConsole.error.apply(window.localConsole, errorMessage);

			console.error.apply(console, errorMessage);

			if (errorStack) {
				console.groupCollapsed('(JSB) Stack');
				console.error(errorStack);
				console.groupEnd();
			}
		}
	}

	if (window.UI) {
		$('#open-menu', UI.view.viewToolbar).addClass('unread-error');

		// Update.showRequiredPopover();
	}
};

LogError.history = [];


// Native object extensions =============================================================

var Extension = {
	Function: {
		_clone: {
			value: function () {
				var fn = this;

				var cloned = function cloned () {
					return fn.apply(this, arguments);
				};

				for (var key in this)
					if (this.hasOwnProperty(key))
						cloned[key] = this[key];

				return cloned;
			}
		},

		_extendClass: {
			value: function (fn) {
				if (typeof fn !== 'function')
					throw new TypeError(fn + ' is not a function');

				function extended () {
					fn.call(this);

					extended.__originalClass.apply(this, arguments);
				};

				extended.__originalClass = this;

				extended.prototype = Object.create(fn.prototype);

				extended.prototype.constructor = this;

				return extended;
			}
		}
	},

	Array: {
		__contains: {
			value: function (matchType, needle, returnMissingItems) {
				if (typeof matchType !== 'number')
					throw new TypeError(matchType + ' is not a number');
				
				switch(matchType) {
					case ARRAY.CONTAINS.ONE:
						return this.indexOf(needle) > -1;
					break;

					case ARRAY.CONTAINS.ANY:
						if (!Array.isArray(needle))
							throw new TypeError(needle + ' is not an array');

						for (var i = 0, b = needle.length; i < b; i++)
							if (this._contains(needle[i]))
								return true;

						return false;
					break;

					case ARRAY.CONTAINS.ALL:
						if (!Array.isArray(needle))
							throw new TypeError(needle + ' is not an array');

						var missingItems = [];

						for (var i = 0, b = needle.length; i < b; i++)
							if (!this._contains(needle[i]))
								if (returnMissingItems)
									missingItems.push(needle[i]);
								else
									return false;

						if (returnMissingItems)
							return missingItems;
						else
							return true;
					break;

					case ARRAY.CONTAINS.NONE:
						return !this._containsAny(needle);
					break;

					default:
						throw new Error('unsupported match type');
					break;
				}
			}
		},
		_contains: {
			value: function (needle) {
				return this.__contains(ARRAY.CONTAINS.ONE, needle);
			}
		},
		_containsAny: {
			value: function (needle) {
				return this.__contains(ARRAY.CONTAINS.ANY, needle);
			}
		},
		_containsAll: {
			value: function (needle, returnMissingItems) {
				return this.__contains(ARRAY.CONTAINS.ALL, needle, returnMissingItems);
			}
		},
		_containsNone: {
			value: function (needle) {
				return this.__contains(ARRAY.CONTAINS.NONE, needle);
			}
		},

		_clone: {
			value: function () {
				return Utilities.makeArray(this);
			}
		},

		_pushAll: {
			value: function (item) {
				if (!Array.isArray(item))
					item = [item];

				return this.push.apply(this, item);
			}
		},
		_pushMissing: {
			value: function (item) {
				if (!Array.isArray(item))
					item = [item];

				var missingItems = this._containsAll(item, true);

				return this._pushAll(missingItems);
			}
		},

		_unique: {
			value: function() {
				var a = this.concat();

				for(var i = 0; i < a.length; ++i) {
					for(var j = i + 1; j < a.length; ++j) {
						if(a[i] === a[j])
							a.splice(j--, 1);
					}
				}

			return a;
			}
		},

		_chunk: {
			value: function (pieces) {
				var chunks = [[]],
						chunk = 0;

				for (var i = 0, b = this.length; i < b; i++) {
					if (pieces > 0 && chunks[chunk].length >= pieces)
						chunks[++chunk] = [];

					chunks[chunk].push(this[i]);
				}

				return chunks;
			}
		},

		_remove: {
			value: function (index) {
				if (index < 0)
					return;

				return this.splice(index, 1)[0];
			}
		},

		_sortUsingArray: {
			value: function (array) {
				var newArray = [];

				for (var i = 0; i < array.length; i++)
					if (this._contains(array[i]))
						newArray.push(array[i]);

				return newArray;
			}
		}
	},

	String: {
		_pluralize: {
			value: function (number) {
				return number === 1 ? this : this + 's';
			}
		},

		_lcut: {
			value: function (length, prefix) {
				var trimmed = this._reverse().substr(0, length)._reverse();

				if (trimmed !== this && prefix)
					trimmed = prefix + trimmed;

				return trimmed;
			}
		},

		_reverse: {
			value: function () {
				return this.split('').reverse().join('');
			}
		},

		_rpad: {
			value: function (length, padding) {
				if (this.length < length) {
					if (padding.length !== 1)
						throw new TypeError(padding + ' is not equal to 1');

					var arr = new Array(length - this.length + 1);

					return this + arr.join(padding);
				}

				return this;
			}
		},

		_contains: {
			value: function (string) {
				return this.indexOf(string) > -1;
			}
		},

		_startsWith: {
			value: function (prefix) {
				return this.indexOf(prefix) === 0;
			}
		},
		_endsWith: {
			value: function (suffix) {
				return this.indexOf(suffix, this.length - suffix.length) > -1;
			}
		},

		_ucfirst: {
			value: function() {
				return this.substr(0, 1).toUpperCase() + this.substr(1);
			}
		},

		_lcfirst: {
			value: function() {
				return this.substr(0, 1).toLowerCase() + this.substr(1);
			}
		},

		_escapeRegExp: {
			value: function () {
				return this.replace(new RegExp('(\\' + ['/','.','*','+','?','|','$','^','(',')','[',']','{','}','\\'].join('|\\') + ')', 'g'), '\\$1');
			}
		},

		_escapeHTML: {
			value: function () {
				return this.replace(/&/g, '&amp;').replace(/</g, '&lt;');
			}
		},

		_entityQuotes: {
			value: function () {
				return this.replace(/"/g, '&quot;').replace(/'/g, '&apos;');
			}
		},

		_format: {
			value: function (args) {
				if (!Array.isArray(args))
					throw new TypeError(args + ' is not an array');

				var string = this.toString();

				for (var i = 0; i < args.length; i++)
					string = string.replace(new RegExp('\\{' + i + '\\}', 'g'), args[i]);
				
				return string;
			}
		}
	},

	Object: {
		_findKey: {
			value: function (findKey) {
				if (this.hasOwnProperty(findKey))
					return this[findKey];

				var found;

				for (var key in this)
					if (this.hasOwnProperty(key) && Object._isPlainObject(this[key]))
						if (found = this[key]._findKey(findKey))
							return found;

				return undefined;
			}
		},

		_hasPrototypeKey: {
			value: function (key) {
				return ((key in this) && !this.hasOwnProperty(key));
			}
		},

		_getWithDefault: {
			value: function (key, defaultValue) {
				if (this.hasOwnProperty(key))
					return this[key];

				this[key] = defaultValue;

				return this[key];
			}
		},

		_setWithDefault: {
			value: function (key, defaultValue) {
				if (this.hasOwnProperty(key))
					return this;

				this[key] = defaultValue;

				return this;
			}
		},

		_remap: {
			value: function (map) {
				var newObject = {};

				for (var key in this)
					if (this.hasOwnProperty(key) && map.hasOwnProperty(key))
						newObject[map[key]] = this[key];

				return newObject;
			}
		},
		
		_createReverseMap: {
			value: function (deep) {
				for (var key in this)
					if (deep && (this[key] instanceof Object))
						this[key] = this[key]._createReverseMap(deep);
					else
						this[this[key]] = key;

				return this;
			}
		},

		_isEmpty: {
			value: function () {
				for (var key in this)
					return false;

				return true;
			}
		},

		_clone: {
			value: function (deep) {
				var object = {};

				for (var key in this)
					if (this.hasOwnProperty(key)) {
						if (deep && Object._isPlainObject(this[key])) {
							object[key] = Object.prototype._clone.call(this[key], true);
						} else
							object[key] = Object._copy(this[key]);
					}

				return object;
			}
		},

		_merge: {
			value: function () {
				var object;

				var deep = false,
						objects = Utilities.makeArray(arguments);

				if (objects[0] === true) {
					deep = true;

					objects.shift();
				}

				for (var i = 0; i < objects.length; i++) {
					object = objects[i];

					if (typeof object !== 'object')
						throw new TypeError(object + ' is not an object');

					for (var key in object)
						if (object.hasOwnProperty(key)) {
							if (deep && Object._isPlainObject(this[key]) && Object._isPlainObject(object[key]) && this.hasOwnProperty(key))
								this[key]._merge(true, object[key]);
							else
								this[key] = object[key];
						}
				}

				return this;
			}
		},

		_sort: {
			value: function (fn, reverse) {
				var newObject = {},
						keys = Object.keys(this).sort(fn);

				if (reverse)
					keys.reverse();

				for (var i = 0, b = keys.length; i < b; i++)
					newObject[keys[i]] = this[keys[i]];

				return newObject;
			}
		},

		_chunk: {
			value: function (pieces) {
				var size = 0,
						chunk = 0,
						chunks = { 0: {} };

				for (var key in this) {
					if (pieces > 0 && size >= pieces) {
						size = 0;

						chunks[++chunk] = {};
					}

					chunks[chunk][key] = this[key];

					size++;
				}

				return chunks;
			}
		}
	}
};

(function () {
	for (var object in Extension)
		try {
			Object.defineProperties(window[object].prototype, Extension[object]);
		} catch (error) {}
})();

Extension = undefined;

Object._isPlainObject = function (object) {
	return (typeof object === 'object' && object !== null && object.constructor && object.constructor.name === 'Object');
};

Object._copy = function (object, defaultValue) {
	var objectType = typeof object;

	switch (true) {
		case object === null:
			return null;
		break;

		case Array.isArray(object):
			return Utilities.makeArray(object);
		break;

		case objectType === 'string':
			return String(object);
		break;

		case objectType === 'number':
			return Number(object);
		break;

		case objectType === 'boolean':
			return Boolean(object);
		break;

		case objectType === 'undefined':
			if (defaultValue !== undefined && defaultValue !== null)
				return defaultValue;

			return object;
		break;

		case objectType === 'object' && object.constructor === Object:
			return object._clone(true);
		break;

		default:
			// console.trace();
			// LogDebug('getting as reference when not requested as such:', object);

			return object;
		break;
	}
};

Object._extend = function () {
	var deep = false,
			args = Utilities.makeArray(arguments);

	if (args[0] === true) {
		deep = true;

		args.shift();
	}

	var key;

	var base = args.shift();

	for (var i = 0; i < args.length; i ++)
		for (key in args[i])
			if (deep && Utilities.typeOf(base[key]) === 'object' && Utilities.typeOf(args[i][key]) === 'object')
				Object._extend(base[key], args[i][key]);
			else
				base[key] = args[i][key];

	return base;
};

Object._deepFreeze = function (object) {
	Object.freeze(object);

	var props = Object.getOwnPropertyNames(object);

	for (var i = 0; i < props.length; i++)
		if (object[props[i]] !== null && (typeof object[props[i]] === 'object' || typeof object[props[i]] === 'function'))
			Object._deepFreeze(object[props[i]]);

	return object;
};

Utilities.safariVersionSupported = Utilities.safariBuildVersion >= 537;

if (!Utilities.safariVersionSupported)
	throw new Error('safari version too old.');

Utilities.Page.isWebpage = !!GlobalPage.tab && !window.location.href._startsWith(ExtensionURL());
Utilities.Page.isUserScript = window.location.href._endsWith('.user.js');

Utilities.Group.NOT._createReverseMap();

Utilities.Group.TYPES = {
	string: [Utilities.Group.IS_ANYTHING, Utilities.Group.IS, Utilities.Group.NOT.IS, Utilities.Group.STARTS_WITH, Utilities.Group.NOT.STARTS_WITH, Utilities.Group.ENDS_WITH, Utilities.Group.NOT.ENDS_WITH, Utilities.Group.MATCHES, Utilities.Group.NOT.MATCHES, Utilities.Group.CONTAINS, Utilities.Group.NOT.CONTAINS],
	number: [Utilities.Group.IS_ANYTHING, Utilities.Group.IS, Utilities.Group.NOT.IS, Utilities.Group.MATCHES, Utilities.Group.NOT.MATCHES],
	array: [Utilities.Group.IS_ANYTHING, Utilities.Group.IS, Utilities.Group.NOT.IS, Utilities.Group.CONTAINS, Utilities.Group.NOT.CONTAINS],
	boolean: [Utilities.Group.IS_ANYTHING, Utilities.Group.IS, Utilities.Group.NOT.IS]
};


// Event listeners ======================================================================

if (!Utilities.Page.isWebpage)
	window.addEventListener('message', function nextImmediateTimeout (event) {
		if (event.data === 'nextImmediateTimeout')
			Utilities.nextImmediateTimeout();
	}, true);
