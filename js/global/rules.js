"use strict";

var ACTION = {
	BLOCK_FIRST_VISIT_NO_NOTIFICATION: 8,
	BLOCK_FIRST_VISIT: 6,
	WHITELIST: 5,
	BLACKLIST: 4,	
	AUTO_ALLOW_USER_SCRIPT: 3,
	AUTO_BLOCK_USER_SCRIPT: 2,
	ALLOW: 1,
	BLOCK: 0,	
	ALLOW_WITHOUT_RULE: -1,
	BLOCK_WITHOUT_RULE: -2,
	AUTO_ALLOW_UNBLOCKABLE: -3,
	AUTO_BLOCK_HIDDEN_FRAME: -4,
	ALLOW_XHR_VIA_PROMPT: -5,
	BLOCK_XHR_VIA_PROMPT: -6,
	BLOCKED_ATTENTION_REQUIRED: -8,
	ALLOW_AFTER_FIRST_VISIT: -9,
	KIND_DISABLED: -85,
	UNBLOCKABLE: -87
};

ACTION._createReverseMap();

Object.freeze(ACTION);

function Rule (store, storeProps, ruleProps) {
	this.action = (ruleProps && typeof ruleProps.action === 'number') ? ruleProps.action : null;
	this.longRuleAllowed = (ruleProps && typeof ruleProps.longRuleAllowed === 'boolean') ? ruleProps.longRuleAllowed : null;

	if (typeof store === 'string')
		this.rules = new Store(store, storeProps);
	else if (store instanceof Store)
		this.rules = store;
	else
		this.rules = new Store(null, storeProps);

	this.addPage = this.__add.bind(this, 'page');
	this.addNotPage = this.__add.bind(this, 'notPage');
	this.addDomain = this.__add.bind(this, 'domain');
	this.addNotDomain = this.__add.bind(this, 'notDomain');
	
	this.removePage = this.__remove.bind(this, 'page');
	this.removeNotPage = this.__remove.bind(this, 'notPage');
	this.removeDomain = this.__remove.bind(this, 'domain');
	this.removeNotDomain = this.__remove.bind(this, 'notDomain');
};

Rule.withLocationRules = function (allRules, callback) {
	var ruleList,
			ruleKind,
			ruleType,
			domains,
			domain;

	matchingRulesLoop:
	for (ruleList in allRules) {
		for (ruleKind in allRules[ruleList]) {
			for (ruleType in allRules[ruleList][ruleKind]) {
				if (allRules[ruleList][ruleKind][ruleType]) {
					domains = allRules[ruleList][ruleKind][ruleType].data._sort(Rules.__prioritize);

					for (domain in domains)
						if (callback(ruleList, ruleKind, ruleType, domain, domains[domain].value))
							break matchingRulesLoop;
				}
			}
		}
	}
}

Rule.prototype.__add = function (type, kind, domain, rule) {
	if (!(rule instanceof Object))
		throw new TypeError(rule + ' is not an instance of Object');

	if (rule.rule instanceof Object) {
		if (typeof rule.rule.domain !== 'string' || !Array.isArray(rule.rule.protocols))
			throw new Error(rule.rule + ' does not contain a valid domain or protocols definition');

		rule.rule = rule.rule.protocols.join(','), + '|' + rule.rule.domain;
	} else if (typeof rule.rule !== 'string')
		throw new TypeError(rule.rule + ' is not a valid rule');

	if (!Rules.kindSupported(kind))
		throw new Error(Rules.ERROR.KIND.NOT_SUPPORTED);

	var types = this.kind(kind);

	if (!types.hasOwnProperty(type))
		throw new Error(Rules.ERROR.TYPE.NOT_SUPPORTED);

	if (type.toLowerCase()._endsWith('page') && !Rules.isRegExp(domain))
		throw new TypeError(Rules.ERROR.TYPE.PAGE_NOT_REGEXP);

	var rules = types[type](domain);

	if (kind._endsWith('*'))
		Resource.canLoadCache.clear();
	else {
		Resource.canLoadCache.remove(kind, true);
		Resource.canLoadCache.remove('framed:' + kind, true);
	}

	rules.set(rule.rule, {
		regexp: Rules.isRegExp(rule.rule),
		action: typeof this.action === 'number' ? this.action : rule.action
	});

	return rules;
};

Rule.prototype.__remove = function (type, kind, domain, rule) {
	if (kind === undefined) {
		var self = this;

		this.rules.forEach(function (kind) {
			self.__remove(type, kind);
		});
	} else {
		var types = this.kind(kind);

		if (!types.hasOwnProperty(type))
			throw new Error(Rules.ERROR.TYPE.NOT_SUPPORTED);

		if (domain === undefined)
			types[type]().clear();
		else if (rule === undefined)
			types[type]().remove(domain, true);
		else
			types[type](domain).remove(rule);
	}

	if (kind._endsWith('*'))
		Resource.canLoadCache.clear();
	else {
		Resource.canLoadCache.remove(kind, true);
		Resource.canLoadCache.remove('framed:' + kind, true)
	}
};

Rule.prototype.kind = function (kindName, hide) {
	if (hide)
		kindName = 'hide:' + kindName;

	if (typeof kindName !== 'string')
		throw new Error(Rules.ERROR.KIND.NOT_STRING);

	if (!Rules.kindSupported(kindName))
		throw new Error(Rules.ERROR.KIND.NOT_SUPPORTED);

	var kind = this.rules.getStore(kindName);

	kind.__rules = function (type, domain) {
		if (!this.hasOwnProperty(type))
			throw new Error(Rules.ERROR.TYPE.NOT_SUPPORTED);

		var rules;

		var domains = this.getStore(type);

		if (Array.isArray(domain)) {
			if (domain.length === 1)
				return this.__rules(type, [domain[0], null]);

			rules = new Store(domains.name + ',' + domain.join(), {
				selfDestruct: TIME.ONE.HOUR,
				ignoreSave: true
			});

			rules.parent = this;

			for (var i = 0; i < domain.length; i++)
				if (!rules.keyExist(domain[i]) && domains.keyExist(domain[i]))
					rules.set(domain[i], this.__rules(type, domain[i]));
		} else if (typeof domain === 'string')
			rules = domains.getStore(domain);
		else
			rules = domains;

		return rules;
	};

	kind.page = kind.__rules.bind(kind, 'page');
	kind.domain = kind.__rules.bind(kind, 'domain');
	kind.notPage = kind.__rules.bind(kind, 'notPage');
	kind.notDomain = kind.__rules.bind(kind, 'notDomain');

	return kind;
};

Rule.prototype.domain = function (domain) {
	var rules;

	var self = this,
			kinds = {};

	this.rules.forEach(function (kind) {
		rules = self.kind(kind).domain(domain);

		if (!rules.isEmpty())
			kinds[kind] = rules;
	});

	return kinds;
};

Rule.prototype.addMany = function (kinds) {
	if (typeof kinds !== 'object')
		throw new TypeError(kinds + ' is not an object');

	var kind,
			types,
			type,
			domain,
			rule;

	for (kind in kinds) {
		if (!Rules.kindSupported(kind)) {
			LogError([Rules.ERROR.KIND.NOT_SUPPORTED, kind]);

			continue;
		}

		types = this.kind(kind);

		for (type in kinds[kind]) {
			if (!types.hasOwnProperty(type)) {
				LogError([Rules.ERROR.TYPE.NOT_SUPPORTED, type]);

				continue;
			}

			for (domain in kinds[kind][type])
				for (rule in kinds[kind][type][domain]) {
					if (!(kinds[kind][type][domain][rule] instanceof Object))
						continue;

					kinds[kind][type][domain][rule].rule = rule;

					this.__add(type, kind, domain, kinds[kind][type][domain][rule]);
				}
		}
	}

	return this;
};

Rule.prototype.forLocation = function (params) {
	if (Array.isArray(params.searchKind)) {
		var localParams = params._clone(true),
				rules = {};

		for (var i = 0; i < params.searchKind.length; i++)
			if (params.searchKind[i]) {
				localParams.searchKind = params.searchKind[i];

				rules[params.searchKind[i]] = this.forLocation(localParams);
			}

		return rules;
	}

	if (!Rules.kindSupported(params.searchKind))
		throw new Error(Rules.ERROR.KIND.NOT_SUPPORTED);

	var regExp,
			lowerPage;

	var location = params.location.toLowerCase(),
			host = params.pageRulesOnly ? '' : Utilities.URL.extractHost(location),
			hostParts = params.pageRulesOnly ? [] : (params.excludeParts ? [host] : Utilities.URL.hostParts(host, true));

	if (!params.excludeAllDomains)
		hostParts.push('*');	

	var types = this.kind(params.searchKind);

	var rules = {
		page: types.page().filter(function (page) {
			try {
				lowerPage = page.toLowerCase();

				regExp = Rules.__regExpCache[lowerPage] || (Rules.__regExpCache[lowerPage] = new RegExp(lowerPage));

				return regExp.test(location);
			} catch (error) {
				LogError(error);

				return false;
			}
		}),

		domain: params.pageRulesOnly ? undefined : types.domain(hostParts),

		notPage: types.notPage().filter(function (page) {
			try {
				lowerPage = page.toLowerCase();

				regExp = Rules.__regExpCache[lowerPage] || (Rules.__regExpCache[lowerPage] = new RegExp(lowerPage));

				return !regExp.test(location);
			} catch (error) {
				LogError(error);

				return false;
			}
		}),

		notDomain: params.pageRulesOnly ? undefined : types.notDomain().filter(function (domain) {
			return !hostParts._contains(domain);
		})
	};

	if (typeof params.isAllowed === 'boolean')
		for (var type in rules)
			rules[type] = rules[type].map(function (domain, rules, domainStore) {
				return rules.filter(function (rule, value, ruleStore) {
					return (!!(value.action % 2) === params.isAllowed);
				});
			})

	return rules;
};

var Rules = {
	__regExpCache: {},
	__partsCache: new Store('RuleParts'),

	ERROR: {
		RULES: {
			NOT_STORE: 'rules is not an instance of Store'
		},
		KIND: {
			NOT_SUPPORTED: 'kind not supported',
			NOT_STRING: 'kind is not a string'
		},
		TYPE: {
			NOT_SUPPORTED: 'type not supported',
			PAGE_NOT_REGEXP: 'page does not begin with ^ or end with $'
		}
	},

	CREATE: {
		EXACT: 1,
		HASH: 2,
		SEARCH: 4,
		PATH: 8
	},

	// Used to sort rules so that they are applied based on if the full host is matched or just a sub-domain.
	// lion.toggleable.com > .lion.toggleable.com > .toggleable.com > *
	__prioritize: function (a, b) {
		if (a === '*' || b.length > a.length || b[0] !== '.')
			return 1;

		if (b === '*' || a.length > b.length || a[0] !== '.')
			return -1;

		return 0;
	},

	useCurrent: function () {
		this.list.active = this.list.user;

		return this;
	},

	kindSupported: function (kind) {
		if (typeof kind !== 'string')
			throw new TypeError(Rules.ERROR.KIND.NOT_STRING);

		kind = kind.substr(kind.lastIndexOf(':') + 1);

		return this.__kinds._contains(kind);
	},

	kindShouldBadge: function (kind) {
		return !['special', 'user_script', 'disable']._contains(kind);
	},

	isRegExp: function (rule) {
		return (typeof rule === 'string' && rule._startsWith('^') && rule._endsWith('$'));
	},

	// Splits a simple rule (e.g. HTTP|.google.com) into its protocol and domain parts.
	partsForRule: function (rule) {
		var cached = this.__partsCache.get(rule);

		if (cached)
			return cached;

		var parts = {
			domain: rule,
			protocols: null
		};

		if (rule._contains('|')) {
			parts.domain = rule.substr(rule.indexOf('|') + 1);
			parts.protocols = {};

			var protoArray = rule.split('|')[0].split(',');

			for (var i = 0; i < protoArray.length; i++)
				parts.protocols[protoArray[i].toLowerCase() + ':'] = 1;
		}

		return this.__partsCache.set(rule, parts).get(rule);
	},

	// Check if the specified rule should be used on the source.
	matches: function (rule, regexp, source) {
		if (regexp) {
			var regExp = this.__regExpCache[rule] || (this.__regExpCache[rule] = new RegExp(rule.toLowerCase()));

			return regExp.test(source);
		} else {
			var sourceHost = Utilities.URL.extractHost(source);

			if (!sourceHost.length)
				return rule === source;

			var ruleParts = this.partsForRule(rule),
					sourceProtocol = Utilities.URL.protocol(source),
					sourceParts = Utilities.URL.hostParts(Utilities.URL.extractHost(source));

			if (ruleParts.protocols && !ruleParts.protocols.hasOwnProperty(sourceProtocol))
				return false;

			return (ruleParts.domain === '*' || ruleParts.domain === source || (ruleParts.domain._startsWith('.') && sourceParts._contains(ruleParts.domain.substr(1))) || sourceParts[0] === ruleParts.domain);
		}
	},

	// Load all rules contained in each list for a given location.
	// If the last argument is an array, it will be used to determine which lists to exclude.
	// Temporary rules are only included if the active set is the user set.
	forLocation: function (params) {
		var excludeLists = params.excludeLists ? params.excludeLists : [];

		excludeLists.push(this.list.active === this.list.user ? 'user' : 'temporary');

		var lists = {};

		for (var list in Rules.list)
			if (!excludeLists._contains(list))
				lists[list] = this.list[list].forLocation(params);

		return lists;
	},

	createRegExp: function (url, type) {
		if (typeof url !== 'string')
			throw new TypeError(url + ' is not a string.');

		var url = url._escapeRegExp(),
				endCapture = [];

		if (!(type & Rules.CREATE.EXACT)) {
			endCapture = ['((', [], ')+.*)?'];

			if (type & Rules.CREATE.HASH)
				endCapture[1].push('\\#');

			if (type & Rules.CREATE.SEARCH)
				endCapture[1].push('\\?');

			if (type & Rules.CREATE.PATH)
				endCapture[1].push('\\/');

			if (endCapture[1].length)
				endCapture[1] = endCapture[1].join('|');
			else
				endCapture = [];
		}

		return '^' + url + endCapture.join('') + '$';
	}
};

Object.defineProperty(Rules, '__kinds', {
	value: Object.freeze([
		'*', 'disable', 'script', 'frame', 'embed', 'video', 'image', 'xhr_get', 'xhr_post', 'xhr_put', 'special', 'user_script'
	])
});

Object.defineProperty(Rules, 'list', {
	value: Object.create({}, {
		temporary: {
			enumerable: true,

			value: new Rule('TemporaryRules')
		},

		__active: {
			writable: true,
			value: {}
		},

		active: {
			enumerable: true,

			get: function () {
				return this.__active;
			},

			set: function (rules) {
				if (!(rules instanceof Rule))
					throw new TypeError(rules + ' is not an instance of Rule.');

				var exclude = Special.__excludeLists.map(function (name) {
					return 'EasyRules-' + name;
				});

				exclude.push('Predefined', 'TemporaryRules');

				if (rules.rules.name && exclude._contains(rules.rules.name))
					throw new Error('active rules cannot be set to ' + rules.rules.name);

				if (this.active !== this.user && this.active.autoDestruct)
					this.active.destroy(true);

				if (this.__active instanceof Rule)
					Resource.canLoadCache.clear();

				if (rules === this.user)
					$$('.snapshot-info').empty();
				else
					$$('.snapshot-info').html('Snapshot in use?????????????????????');

				this.__active = rules;
			}
		},

		user: {
			enumerable: true,

			value: new Rule('Rules', {
				save: true,
				snapshot: true
			})
		},

		firstVisit: {
			enumerable: true,

			value: new Rule('FirstVisit', {
				save: true
			})
		},

		predefined: {
			enumerable: true,

			value: new Rule('Predefined', {
				save: true,
				private: true
			}, {
				longRuleAllowed: true
			})
		}
	})
});

Rules.list.active = Rules.list.user;

(function () {
	var easyLists = Settings.getItem('easyLists');

	for (var easyList in easyLists)
		if (easyLists[easyList].enabled)
			Object.defineProperty(Rules.list, easyList, {
				enumerable: true,

				value: new Rule('EasyRules-' + easyList, {
					save: true,
					private: true
				}, {
					longRuleAllowed: true
				})
			});

	for (var list in Rules.list) {
		if (list === 'active')
			continue;

		Rules.list[list].rules.all();

		Rules.list[list].rules.addCustomEventListener('storeDidSave', function () {
			Resource.canLoadCache.saveNow();
		});
	}
})();
