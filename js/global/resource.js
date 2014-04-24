"use strict";

var RESOURCE = {
	DOMAIN: 1,
	HOST: 2,
	ALL: 3
};

function Resource (resource) {
	this.kind = resource.kind;
	this.framedKind = 'framed:' + this.kind;
	this.sourceIsURL = Rules.kindShouldBadge(this.kind) ? Utilities.URL.isURL(resource.source) : false;
	this.isFrame = resource.isFrame;
	this.searchKinds = this.isFrame ? [this.framedKind, 'framed:*', this.kind, '*'] : [this.kind, '*'];
	this.pageLocation = resource.pageLocation.toLowerCase();
	this.pageHost = Utilities.URL.extractHost(this.pageLocation);
	this.source = this.sourceIsURL ? resource.source.toLowerCase() : resource.source;
	this.sourceHost = Utilities.URL.extractHost(this.source);
	this.ruleAction = resource.ruleAction;
	this.unblockable = resource.unblockable;
	this.meta = resource.meta;

	this.block = this.__addRule.bind(this, 0);
	this.allow = this.__addRule.bind(this, 1);

	if (this.sourceIsURL) {
		var protos = ['http:', 'https:', 'ftp:', 'sftp:', 'safari-extension:'],
				sourceProto = Utilities.URL.protocol(this.source),
				locationProto = Utilities.URL.protocol(this.pageLocation);

		if (protos._contains(sourceProto))
			this.source = Utilities.URL.strip(this.source);

		if (protos._contains(locationProto))
			this.pageLocation = Utilities.URL.strip(this.pageLocation);
	}
};

Resource.longRegExps = new Store('LongRegExps');
Resource.canLoadCache = new Store('ResourceCanLoad', {
	save: true,
	maxLife: TIME.ONE_HOUR * 12,
	saveDelay: TIME.ONE_SECOND * 30
});

Resource.canLoadCache.addEventListener('save', function () {
	LogDebug('ResourceCanLoad Size: ' + Utilities.byteSize(SettingStore.getItem('Storage-ResourceCanLoad').length));
});

Resource.__many = function (action, resources, domain, rule, framed) {
	if (!Array.isArray(resources))
		throw new TypeError(resources + ' is not an array');

	for (var i = 0; i < resources.length; i++) {
		if (!(resources[i] instanceof Resource)) {
			LogError(resources[i] + ' is not an instance of Resource');

			continue;
		}

		resources[i][action](domain, rule, framed);
	}
};

Resource.blockMany = Resource.__many.bind(null, 'block');
Resource.allowMany = Resource.__many.bind(null, 'allow');

Resource.prototype.__addRule = function (action, domain, rule, framed) {
	if (this.unblockable)
		return false;

	domain = this.__mapDomain(this.pageHost, domain);

	if (this.sourceIsURL)
		rule = this.__mapDomain(this.sourceHost, rule);
	else if (!Rules.isRegExp(rule))
		rule = this.source;

	return Rules.list.active.__add(Rules.isRegExp(domain) ? 'page' : 'domain', framed ? this.framedKind : this.kind, domain, {
		rule: rule,
		action: action
	});
};

Resource.prototype.__mapDomain = function (host, domain) {
	var parts = Utilities.URL.hostParts(host, true);

	switch (domain) {
		case RESOURCE.DOMAIN:
			domain = parts[parts.length - 1];
		break;

		case RESOURCE.HOST:
		case undefined:
		case null:
			domain = parts[0];
		break;

		case RESOURCE.ALL:
			domain = '*';
		break;
	}

	return domain;
};

Resource.prototype.__humanize = function (allow, rule, framed, temporary) {
	if (this.sourceIsURL)
		rule = this.__mapDomain(this.sourceHost, rule);
	else
		rule = Rules.isRegExp(rule) ? rule : this.source;

	var action = allow ? 'allow' : 'block',
			from = (this.sourceIsURL && rule._startsWith('.')) ? 'within' : (Rules.isRegExp(rule) ? 'matching' : 'from'),
			rule = (this.sourceIsURL && rule._startsWith('.')) ? rule.substr(1) : rule,
			message = [temporary ? 'Temporarily ' + action : action._ucfirst(), framed ? this.framedKind : this.kind, from, rule];

	return message.join(' ');
};

Resource.prototype.allowedBySettings = function () {
	var enabledKinds = Settings.getJSON('enabledKinds'),
			canLoad = {
				isAllowed: true,
				action: ACTION.ALLOW_WITHOUT_RULE,
				pageRule: false
			};

	if (!enabledKinds[this.kind])
		return canLoad;

	var blockFrom = Settings.getJSON('alwaysBlock')[this.kind],
			sourceProtocol = this.sourceIsURL ? Utilities.URL.protocol(this.source) : null;

	if (blockFrom === 'trueNowhere' || blockFrom === 'nowhere' || (Settings.getItem('allowExtensions') && sourceProtocol === 'safari-extension:'))
		return canLoad;
	else {
		var pageProtocol = Utilities.URL.protocol(this.pageLocation),
				pageParts = Utilities.URL.hostParts(this.pageHost),
				sourceParts = Utilities.URL.hostParts(this.sourceHost);
				
		if (sourceProtocol === 'about:' && blockFrom !== 'everywhere')
			return canLoad;
		else if ((blockFrom === 'topLevel' && pageParts[0] !== sourceParts[0]) || 
			(blockFrom === 'domain' && pageParts[pageParts.length - 1] !== sourceParts[sourceParts.length - 1]) ||
			(blockFrom === 'everywhere') ||
			(pageProtocol === 'https:' && (Settings.getItem('secureOnly') && sourceProtocol !== pageProtocol))) {

			canLoad.action = ACTION.BLOCK_WITHOUT_RULE;
			canLoad.isAllowed = false;
		}
	}

	return canLoad;
};

Resource.prototype.matchingRules = function (isAllowed) {
	return Rules.forLocation(this.searchKinds, this.pageLocation, isAllowed);
};

Resource.prototype.canLoad = function () {
	if (!Rules.kindSupported(this.kind))
		throw new Error(Rules.ERROR.KIND.NOT_SUPPORTED);

	var canLoad = {
				isAllowed: true,
				action: ACTION.ALLOW_WITHOUT_RULE,
				pageRule: false
			};

	if (this.unblockable) {
		canLoad.action = ACTION.UNBLOCKBABLE;

		return canLoad;
	}

	if (!Settings.getJSON('enabledKinds')[this.kind]) {
		canLoad.action = ACTION.KIND_DISABLED;

		return canLoad;
	}

	var storeKind = this.isFrame ? this.framedKind : this.kind,
			store = Resource.canLoadCache.getStore(storeKind),
			hostSources = store.getStore(this.pageHost),
			cached = hostSources.get(this.source);

	if (cached)
		return cached;

	var pageSources = store.getStore(this.pageLocation),
			cached = pageSources.get(this.source);

	if (cached)
		return cached;

	var pageRule,
			longAllowed,
			rule,
			longRules,
			longKindStore,
			longStore,
			longRegExps,
			i,
			b;

	var self = this;

	Rule.withLocationRules(this.matchingRules(), function (ruleList, ruleKind, ruleType, domain, rules) {
		pageRule = (ruleType === 'page' || ruleType === 'notPage');
		longAllowed = (!pageRule && (ruleList in ACTION));

		if (longAllowed) {
			longKindStore = Resource.longRegExps.getStore(ruleList);
			longStore = longKindStore.getStore(ruleKind);
			longRegExps = longStore.get(domain);
		}

		if (longAllowed && longRegExps) {
			for (i = 0, b = longRegExps.regExps.length; i < b; i++) {
				if (longRegExps.regExps[i].test(self.source)) {
					canLoad = longRegExps.canLoad;

					break;
				}
			}
		} else {
			longRules = [];

			for (rule in rules.data) {
				if (longAllowed)
					longRules.push(rule.toLowerCase());
				else {
					if (Rules.matches(rule, rules.data[rule].value.regexp, self.source))
						canLoad = {
							isAllowed: !!(rules.data[rule].value.action % 2),
							action: rules.data[rule].value.action,
							pageRule: pageRule
						};
				}
			}

			if (longAllowed && longRules.length) {
				longRules = longRules._chunk(740);
				longRegExps = [];

				for (i = 0, b = longRules.length; i < b; i++)
					longRegExps.push(new RegExp(longRules[i].join('|')));

				longStore.set(domain, {
					regExps: longRegExps,
					canLoad: {
						isAllowed: !!(ACTION[ruleList] % 2),
						action: ACTION[ruleList],
						pageRule: false
					}
				});

				for (i = 0, b = longRegExps.length; i < b; i++) {
					if (longRegExps[i].test(self.source)) {
						canLoad = longStore.get(domain).canLoad;

						break;
					}
				}
			}
		}

		if (canLoad.action > ACTION.ALLOW_WITHOUT_RULE)
			return true;
	});
	
	self = undefined;

	if (canLoad.action === ACTION.ALLOW_WITHOUT_RULE)
		canLoad = this.allowedBySettings.apply(this, arguments);

	setTimeout(function (canLoad, store, source) {
		store.set(source, canLoad);
	}, 50, canLoad, canLoad.pageRule ? pageSources : hostSources, this.source);

	return canLoad;
};

Resource.prototype.toJSON = function () {
	return {
		ruleAction: this.ruleAction,
		unblockable: this.unblockable || undefined,
		meta: this.meta || undefined
	};
};
