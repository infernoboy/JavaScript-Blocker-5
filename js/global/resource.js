"use strict";

var RESOURCE = {
	DOMAIN: 1,
	HOST: 2,
	ALL: 3
};

function Resource (resource) {
	this.strict = resource.strict;
	this.kind = resource.kind;
	this.framedKind = 'framed:' + this.kind;
	this.sourceIsURL = Rules.kindShouldBadge(this.kind) ? Utilities.URL.isURL(resource.source) : false;
	this.isFrame = resource.isFrame;
	this.pageLocation = resource.pageLocation;
	this.fullLocation = resource.pageLocation;
	this.pageHost = Utilities.URL.extractHost(this.pageLocation);
	this.source = this.sourceIsURL ? resource.source : resource.source;
	this.fullSource = this.source;
	this.sourceHost = Rules.kindShouldBadge(this.kind) ? Utilities.URL.extractHost(this.source) : '';
	this.action = resource.action;
	this.unblockable = resource.unblockable;
	this.meta = resource.meta;

	if (this.strict)
		this.searchKinds = [this.kind];
	else
		this.searchKinds = this.isFrame ? [this.framedKind, 'framed:*', this.kind, '*'] : [this.kind, '*'];

	this.hideKinds = this.searchKinds.map(function (kind, i) {
		return 'hide:' + kind;
	});

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
	private: true,
	maxLife: TIME.ONE.HOUR * 36,
	saveDelay: TIME.ONE.SECOND * 30
});

Resource.__many = function (action, resources, domain, rule, framed, temporary) {
	if (!Array.isArray(resources))
		throw new TypeError(resources + ' is not an array');

	for (var i = 0; i < resources.length; i++) {
		if (!(resources[i] instanceof Resource)) {
			LogError(resources[i] + ' is not an instance of Resource');

			continue;
		}

		resources[i].__addRule(action, domain, rule, framed, temporary);
	}
};

Resource.mapDomain = function (host, domain) {
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

Resource.blockMany = Resource.__many.bind(null, 0);
Resource.allowMany = Resource.__many.bind(null, 1);

Resource.prototype.__addRule = function (action, domain, rule, framed, temporary) {
	if (this.unblockable)
		return false;

	rule = {
		rule: rule,
		action: action
	};

	domain = Resource.mapDomain(this.pageHost, domain);

	if (this.sourceIsURL)
		rule.rule = Resource.mapDomain(this.sourceHost, rule.rule);
	else if (!Rules.isRegExp(rule.rule))
		rule.rule = this.source;

	return Rules.list[temporary ? 'temporary' : 'active'].__add(Rules.isRegExp(domain) ? 'page' : 'domain', framed ? this.framedKind : this.kind, domain, rule);
};

Resource.prototype.__humanize = function (allow, rule, framed, temporary) {
	if (this.sourceIsURL)
		rule = Resource.mapDomain(this.sourceHost, rule);
	else
		rule = Rules.isRegExp(rule) ? rule : this.source;

	var action = allow ? 'allow' : 'block',
			from = (this.sourceIsURL && rule._startsWith('.')) ? 'within' : (Rules.isRegExp(rule) ? 'matching' : 'from'),
			rule = (this.sourceIsURL && rule._startsWith('.')) ? rule.substr(1) : rule,
			message = [temporary ? 'Temporarily ' + action : action._ucfirst(), framed ? this.framedKind : this.kind, from, rule];

	return message.join(' ');
};

Resource.prototype.block = function () {
	return this.__addRule.apply(this, [0].concat(Utilities.makeArray(arguments)));
};

Resource.prototype.allow = function () {
	return this.__addRule.apply(this, [1].concat(Utilities.makeArray(arguments)));
};

Resource.prototype.allowedBySettings = function (enforceNowhere) {
	var canLoad = {
		action: ACTION.ALLOW_WITHOUT_RULE
	};

	if (!Settings.getItem('enabledKinds', this.kind))
		return canLoad;

	var blockFrom = enforceNowhere ? 'nowhere' : Settings.getItem('alwaysBlock', this.kind),
			sourceProtocol = this.sourceIsURL ? Utilities.URL.protocol(this.source) : null;

	if (blockFrom === 'nowhere' || blockFrom === 'blacklist' || (Settings.getItem('allowExtensions') && sourceProtocol === 'safari-extension:'))
		return canLoad;
	else {
		var pageProtocol = Utilities.URL.protocol(this.pageLocation),
				pageParts = Utilities.URL.hostParts(this.pageHost),
				sourceParts = Utilities.URL.hostParts(this.sourceHost);
				
		if (sourceProtocol === 'about:' && blockFrom !== 'everywhere')
			return canLoad;
		else if ((blockFrom === 'domain' && pageParts[0] !== sourceParts[0]) || 
			(blockFrom === 'host' && pageParts[pageParts.length - 1] !== sourceParts[sourceParts.length - 1]) ||
			(blockFrom === 'everywhere') ||
			(pageProtocol === 'https:' && (Settings.getItem('secureOnly') && sourceProtocol !== pageProtocol))) {

			canLoad.action = ACTION.BLOCK_WITHOUT_RULE;
		}
	}

	return canLoad;
};

Resource.prototype.rulesForLocation = function (isAllowed, pageRulesOnly, useHideKinds, excludeLists) {
	return Rules.forLocation({
		searchKind: useHideKinds ? this.hideKinds : this.searchKinds,
		location: this.pageLocation,
		isAllowed: isAllowed,
		pageRulesOnly: pageRulesOnly,
		excludeLists: excludeLists
	});
};

Resource.prototype.rulesForResource = function (isAllowed) {
	var matchedList,
			domainRules,
			rule;

	var self = this,
			matchedRules = {},
			checkAction = typeof isAllowed === 'boolean',
			ignoreBlacklist = Settings.getItem('ignoreBlacklist'),
			ignoreWhitelist = Settings.getItem('ignoreWhitelist');

	Rule.withLocationRules(this.rulesForLocation(null, false, false, ['firstVisit']), function (ruleList, ruleListName, ruleKind, ruleType, domain, rules) {
		matchedList = matchedRules._getWithDefault(ruleListName, {});

		for (rule in rules.data) {
			if (checkAction && !!(rules.data[rule].value.action % 2) !== isAllowed)
				continue;

			if (Rules.matches(rule, rules.data[rule].value.regexp, self.source, self.pageLocation)) {
				domainRules = matchedList
					._getWithDefault(ruleKind, {})
					._getWithDefault(ruleType, {})
					._getWithDefault(domain, {});
				
				domainRules[rule] = {
					action: rules.data[rule].value.action,
					// ruleList: ruleList
				};
			}
		}

		if (matchedList._isEmpty())
			delete matchedRules[ruleListName];
	});

	return matchedRules;
};

Resource.prototype.shouldHide = function () {
	var easyHide = (this.action === ACTION.BLACKLIST || this.action === ACTION.WHITELIST) && Settings.getItem('autoHideEasyList');

	return easyHide || !this.canLoad(false, true, Special.__excludeLists).isAllowed;
};

Resource.prototype.canLoad = function (detailed, useHideKinds, excludeLists) {
	if (!Rules.kindSupported(this.kind))
		throw new Error(Rules.ERROR.KIND.NOT_SUPPORTED);

	var canLoad = {
		action: ACTION.ALLOW_WITHOUT_RULE,
		isAllowed: true
	};

	excludeLists = excludeLists || [];

	if (this.unblockable) {
		canLoad.action = ACTION.UNBLOCKBABLE;

		return canLoad;
	}

	if (!Settings.getItem('enabledKinds', this.kind)) {
		canLoad.action = ACTION.KIND_DISABLED;

		return canLoad;
	}

	var searchKinds = useHideKinds ? this.hideKinds : this.searchKinds,
			store = Resource.canLoadCache.getStore(searchKinds.concat(excludeLists).join('-')),
			pageSources = store.getStore(this.pageLocation),
			pageCached = pageSources.get(this.source);

	if (pageCached && !detailed && Rules.list.active === Rules.list.user)
		return pageCached;

	var hostSources = store.getStore(this.pageHost),
			domainCached = hostSources.get(this.source);

	if (domainCached && domainCached.action >= 0 && !detailed && Rules.list.active === Rules.list.user)
		return domainCached;

	var pageRule,
			longAllowed,
			rule,
			longRules,
			longStore,
			longRegExps,
			i,
			b,
			action;

	var self = this,
			ignoreBlacklist = Settings.getItem('ignoreBlacklist'),
			ignoreWhitelist = Settings.getItem('ignoreWhitelist');

	Rule.withLocationRules(this.rulesForLocation(null, !!domainCached, useHideKinds, excludeLists), function (ruleList, ruleListName, ruleKind, ruleType, domain, rules) {
		pageRule = (ruleType === 'page' || ruleType === 'notPage');
		longAllowed = (!pageRule && Rules.list[ruleListName].longRuleAllowed);

		if (longAllowed) {			
			longStore = Resource.longRegExps.getStore(ruleListName).getStore(ruleKind);
			longRegExps = longStore.get(domain);
		}

		if (longAllowed && longRegExps) {
			actionLoop:
			for (action in longRegExps.data) {
				if ((ignoreBlacklist && action == ACTION.BLACKLIST) || (ignoreWhitelist && action == ACTION.WHITELIST))
					continue;

				for (i = 0, b = longRegExps.data[action].value.regExps.length; i < b; i++) {
					if (longRegExps.data[action].value.regExps[i].test(self.source)) {
						canLoad = longRegExps.data[action].value.canLoad;

						if (action % 2)
							break actionLoop;
						else
							continue actionLoop;
					}
				}
			}
		} else {
			if (longAllowed)
				longRules = {};

			for (rule in rules.data) {
				if (longAllowed)
					longRules._getWithDefault(rules.data[rule].value.action, []).push(rule.toLowerCase());
				else if (Rules.matches(rule, rules.data[rule].value.regexp, self.source, self.pageLocation))
					canLoad = {
						pageRule: pageRule,
						action: rules.data[rule].value.action,
						list: ruleListName,
						detail: !detailed ? undefined : {
							ruleKind: ruleKind,
							ruleType: ruleType,
							domain: domain,
							rule: rule,
							ruleList: ruleList
						}
					};
			}

			if (longAllowed) {
				actionLoop:
				for (action in longRules) {
					longRegExps = longRules[action]._chunk(740).map(function (chunk) {
						return new RegExp(chunk.join('|'));
					});

					longStore.getStore(domain).set(action, {
						regExps: longRegExps,
						canLoad: {
							action: parseInt(action, 10),
							list: ruleListName
						}
					});

					if ((ignoreBlacklist && action == ACTION.BLACKLIST) || (ignoreWhitelist && action == ACTION.WHITELIST))
						continue;

					for (i = 0, b = longRegExps.length; i < b; i++) {
						if (longRegExps[i].test(self.source)) {
							canLoad = {
								action: parseInt(action, 10),
								list: ruleListName
							};

							if (action % 2)
								break actionLoop;
							else
								continue actionLoop;
						}
					}
				}
			}
		}

		if (canLoad.action > ACTION.ALLOW_WITHOUT_RULE)
			return true;
	});
	
	self = undefined;

	if (canLoad.action === ACTION.ALLOW_WITHOUT_RULE || canLoad.action === ACTION.ALLOW_AFTER_FIRST_VISIT)
		canLoad = domainCached ? domainCached : this.allowedBySettings(useHideKinds);

	canLoad.isAllowed = !!(canLoad.action % 2);

	if (!detailed && canLoad.list !== 'temporary' && Rules.list.active === Rules.list.user)
		Utilities.setImmediateTimeout(function (canLoad, store, source) {
			store.set(source, canLoad);
		}, [canLoad, canLoad.pageRule ? pageSources : hostSources, this.source]);

	return canLoad;
};

Resource.prototype.toJSON = function () {
	return {
		action: this.action,
		unblockable: this.unblockable || undefined,
		meta: this.meta || undefined
	};
};
