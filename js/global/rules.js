"use strict";

var ACTION = Object.freeze({
	BLACKLIST: 4,
	blacklist: 4,
	WHITELIST: 5,
	whitelist: 5,
	ALLOW: 1,
	BLOCK: 0,
	ALLOW_WITHOUT_RULE: -1,
	BLOCK_WITHOUT_RULE: -2,
	KIND_DISABLED: -85,
	UNBLOCKABLE: -87
});

var Rule = function (store, storeProps, ruleProps) {
	this.props = {
		action: null
	};

	if (ruleProps instanceof Object)
		for (var key in ruleProps)
			if (this.props.hasOwnProperty(key))
				this.props[key] = ruleProps[key];

	if (typeof store === 'string')
		this.rules = new Store(store, storeProps);
	else if (store instanceof Store)
		this.rules = store;
	else if (store instanceof Object)
		this.rules = new Store(null, {
			defaultValue: store,
			lock: true
		});
	else
		this.rules = new Store(null, storeProps);

	this.addDomain = this.__add.bind(this, 'domain');
	this.addPage = this.__add.bind(this, 'page');

	this.removeDomain = this.__remove.bind(this, 'domain');
	this.removePage = this.__remove.bind(this, 'page');
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
				domains = allRules[ruleList][ruleKind][ruleType].data._sort(Rules.__prioritize);

				for (domain in domains)
					if (callback(ruleList, ruleKind, ruleType, domain, domains[domain].value))
						break matchingRulesLoop;
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

		rule.rule = [rule.rule.protocols.join(','), ':', rule.rule.domain].join('');
	} else if (typeof rule.rule !== 'string')
		throw new TypeError(rule.rule + ' is not a valid rule');

	if (!Rules.kindSupported(kind))
		throw new Error(Rules.ERROR.KIND.NOT_SUPPORTED);

	var types = this.kind(kind);

	if (!types.hasOwnProperty(type))
		throw new Error(Rules.ERROR.TYPE.NOT_SUPPORTED);

	if (type === 'page' && !Rules.isRegExp(domain))
		throw new TypeError(Rules.ERROR.TYPE.PAGE_NOT_REGEXP);

	var rules = types[type](domain);

	Resource.canLoadCache.clear();

	rules.set(rule.rule, {
		regexp: Rules.isRegExp(rule.rule),
		action: this.props.action === null ? rule.action : this.props.action
	});

	return rules;
};

Rule.prototype.__remove = function (type, kind, domain, rule) {
	if (typeof kind === 'undefined') {
		var self = this;

		this.rules.forEach(function (kind) {
			self.__remove(type, kind);
		});
	} else {
		var types = this.kind(kind);

		if (!types.hasOwnProperty(type))
			throw new Error(Rules.ERROR.TYPE.NOT_SUPPORTED);

		if (typeof domain === 'undefined')
			types[type]().clear();
		else if (typeof rule === 'undefined')
			types[type]().remove(domain);
		else
			types[type](domain).remove(rule);
	}

	Resource.canLoadCache.clear();
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

			rules = new Store([domains.name, domain.join()].join(), {
				selfDestruct: TIME.ONE_HOUR,
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

	return kind;
};

Rule.prototype.domain = function (domain) {
	var self = this,
			kinds = {},
			rules;

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

Rule.prototype.forLocation = function (kind, location, isAllowed, excludeAllDomains, excludeParts) {
	var kindIsArray = Array.isArray(kind),
			location = location.toLowerCase();

	if (!kindIsArray && !Rules.kindSupported(kind))
		throw new Error(Rules.ERROR.KIND.NOT_SUPPORTED);

	var host = Utilities.URL.extractHost(location),
			hostParts = excludeParts ? [host] : Utilities.URL.hostParts(host, true);

	if (!excludeAllDomains)
		hostParts.push('*');

	if (kindIsArray) {
		var rules = {};

		for (var i = 0; i < kind.length; i++)
			if (kind[i])
				rules[kind[i]] = this.forLocation(kind[i], location, isAllowed, excludeAllDomains, excludeParts);

		return rules;
	}

	var types = this.kind(kind);
	
	var rules = {
		page: types.page().filter(function (key) {
			try {
				return (new RegExp(key.toLowerCase())).test(location);
			} catch (error) {
				LogError(error);

				return false;
			}
		}, ['PageFilter', this.rules.name, kind, location].join()),

		domain: types.domain(hostParts)
	};

	if (typeof isAllowed === 'boolean') {
		var withEach = function (domain, rules, domainStore) {
			if (typeof isAllowed !== 'boolean')
				return rules;

			return rules.filter(function (rule, value, ruleStore) {
				return (!!(value.action % 2) === isAllowed);
			});
		};

		rules.page = rules.page.map(withEach);
		rules.domain = rules.domain.map(withEach);
	}

	return rules;
};

var Rules = {
	__ruleRegExps: {},
	__partsCache: new Store('RuleParts'),

	active: null,

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

	// Used to sort rules so that they are applied based on if the full host is matched or just a sub-domain.
	// lion.toggleable.com > .lion.toggleable.com > .toggleable.com > *
	__prioritize: function (a, b) {
		if (a === '*' || b.length > a.length || b[0] !== '.')
			return 1;

		if (b === '*' || a.length > b.length || a[0] !== '.')
			return -1;

		return 0;
	},

	setActive: function (rules) {
		if (!(rules instanceof Rule))
			throw new TypeError('rules is not an instance of Rule');

		if (rules.rules.name && ['Blacklist', 'Whitelist', 'TemporaryRules']._contains(rules.rules.name))
			throw new Error('rules cannot be set to Blacklist, Whitelist, or TemporaryRules');

		if (this.active !== this.list.user && this.active.autoDestruct)
			this.active.destroy();

		this.active = rules;

		Resource.canLoadCache.clear();

		return this;
	},

	useCurrent: function () {
		this.active = this.list.user;

		return this;
	},

	kindSupported: function (kind) {
		if (typeof kind !== 'string')
			throw new TypeError(Rules.ERROR.KIND.NOT_STRING);

		kind = kind.substr(kind.lastIndexOf(':') + 1);

		return this._kinds._contains(kind);
	},

	isRegExp: function (rule) {
		return (rule._startsWith('^') && rule._endsWith('$'));
	},

	// Splits a simple rule (e.g. HTTP:.google.com) into its protocol and domain parts.
	parts: function (rule) {
		var cached = this.__partsCache.get(rule);

		if (cached)
			return cached;

		var parts = {
			domain: rule,
			protocols: null
		};

		if (rule._contains(':')) {
			parts.domain = rule.substr(rule.indexOf(':') + 1);
			parts.protocols = {};

			var protoArray = rule.split(':')[0].split(',');

			for (var i = 0; i < protoArray.length; i++)
				parts.protocols[protoArray[i].toUpperCase()] = 1;
		}

		return this.__partsCache.set(rule, parts).get(rule);
	},

	// Check if the specified rule should be used on the source.
	matches: function (rule, regexp, source) {
		if (regexp) {
			var regExp = this.__ruleRegExps[rule];

			if (!regExp)
				regExp = this.__ruleRegExps[rule] = new RegExp(rule.toLowerCase());

			return regExp.test(source);
		} else {
			var ruleParts = this.parts(rule),
					sourceProtocol = Utilities.URL.protocol(source),
					sourceHost = Utilities.URL.extractHost(source);

			if (!sourceHost.length)
				return rule === source;

			var sourceParts = Utilities.URL.hostParts(Utilities.URL.extractHost(source));

			if (ruleParts.protocols && !ruleParts.protocols.hasOwnProperty(sourceProtocol))
				return false;

			return (ruleParts.domain === '*' || ruleParts.domain === source || (ruleParts.domain._startsWith('.') && sourceParts._contains(ruleParts.domain.substr(1))) || sourceParts[0] === ruleParts.domain);
		}
	},

	// Load all rules contained in each list for a given location.
	// Temporary rules are only included if the active set is the saved set.
	forLocation: function () {
		var list = this.list;

		return {
			temporary: (this.active === list.user) ? list.temporary.forLocation.apply(list.temporary, arguments) : {},
			active: this.active.forLocation.apply(this.active, arguments),
			whitelist: list.whitelist.forLocation.apply(list.whitelist, arguments),
			blacklist: list.blacklist.forLocation.apply(list.blacklist, arguments)
		};
	}
};

Object.defineProperty(Rules, '_kinds', {
	value: Object.freeze([
		'*', 'disable', 'script', 'frame', 'embed', 'video', 'image', 'ajax_get', 'ajax_post', 'ajax_put', 'special', 'user_script'
	])
});

Object.defineProperty(Rules, 'list', {
	value: Object.freeze({
		temporary: new Rule('TemporaryRules'),

		user: new Rule('Rules', {
			save: true,
			snapshot: true
		}),

		whitelist: new Rule('Whitelist', {
			save: true,
			private: true
		}, {
			action: 5
		}),

		blacklist: new Rule('Blacklist', {
			save: true,
			private: true
		}, {
			action: 4
		})
	})
});

Rules.active = Rules.list.user;