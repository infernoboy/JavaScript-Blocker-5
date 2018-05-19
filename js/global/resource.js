/*
JS Blocker 5 (http://jsblocker.toggleable.com) - Copyright 2017 Travis Lee Roman
*/

'use strict';

var RESOURCE = {
	DOMAIN: 1,
	HOST: 2,
	ALL: 3
};

function Resource (resource) {
	if (typeof resource.pageLocation !== 'string') {
		LogDebug('resource failure', resource);

		throw new Error('resource page location is not a string.');
	}

	var kindShouldBadge = Rules.kindShouldBadge(this.kind);

	this.strict = resource.strict;
	this.kind = resource.kind;
	this.framedKind = 'framed:' + this.kind;
	this.sourceIsURL = kindShouldBadge ? Utilities.URL.isURL(resource.source) : false;
	this.isFrame = resource.isFrame;
	this.pageLocation = resource.pageLocation;
	this.fullLocation = resource.pageLocation;
	this.pageHost = Utilities.URL.extractHost(this.pageLocation);
	this.pageDomain = Utilities.URL.domain(this.pageLocation);
	this.source = resource.source;
	this.baseSource = this.source;
	this.fullSource = this.source;
	this.sourceHost = kindShouldBadge ? Utilities.URL.extractHost(this.source) : '';
	this.sourceDomain = Utilities.URL.domain(this.source);
	this.action = resource.action;
	this.unblockable = resource.unblockable;
	this.meta = resource.meta;
	this.private = resource.private;

	if (this.strict)
		this.searchKinds = this.isFrame ? [this.framedKind, this.kind] : [this.kind];
	else {
		this.searchKinds = this.isFrame ? [this.framedKind, 'framed:*', this.kind, '*'] : [this.kind, '*'];

		if (this.kind === 'special')
			this.searchKinds.pop();
	}

	this.hideKinds = this.searchKinds.map(function (kind) {
		return 'hide:' + kind;
	});

	if (this.sourceIsURL) {
		var protos = ['http:', 'https:', 'ftp:', 'sftp:', 'safari-extension:', 'safari-resource:'];

		this.sourceProto = Utilities.URL.protocol(this.source),
		this.locationProto = Utilities.URL.protocol(this.pageLocation);

		if (protos._contains(this.sourceProto))
			this.baseSource = Utilities.URL.strip(this.source);

		if (protos._contains(this.locationProto))
			this.pageLocation = Utilities.URL.strip(this.pageLocation);
	}

	this.lowerSource = this.source.toLowerCase();
}

Resource.USE_CACHE = true;

Resource.longRegExps = new Store('LongRegExps');

Settings.map.allowCache.props.onChange(null, null, Settings.getItem('allowCache'));

Resource.canLoadCache.addCustomEventListener('storeDidClear', function () {
	Rule.listCache.clear();
});

Maintenance.event.addCustomEventListener('idle', function () {
	Resource.canLoadCache.clear();
});

Resource.__many = function (action, resources, domain, rule, framed, temporary) {
	if (!Array.isArray(resources))
		throw new TypeError(resources + ' is not an array');

	for (var i = 0; i < resources.length; i++) {
		if (!(resources[i] instanceof Resource)) {
			LogError(Error(resources[i] + ' is not an instance of Resource'));

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
		rule.rule = this.lowerSource;

	return Rules.list[temporary ? 'temporary' : 'user'].__add(Rules.isRegExp(domain) ? 'page' : 'domain', framed ? this.framedKind : this.kind, domain, rule);
};

Resource.prototype.block = function () {
	return this.__addRule.apply(this, [0].concat(Utilities.makeArray(arguments)));
};

Resource.prototype.allow = function () {
	return this.__addRule.apply(this, [1].concat(Utilities.makeArray(arguments)));
};

Resource.prototype.allowedBySettings = function (enforceNowhere) {
	var canLoad = {
		pageRule: false,
		action: ACTION.ALLOW_WITHOUT_RULE
	};

	if (!Settings.getItem('enabledKinds', this.kind))
		return canLoad;

	var blockFrom = enforceNowhere ? 'nowhere' : Settings.getItem('alwaysBlock', this.kind);

	if (blockFrom === 'nowhere' || blockFrom === 'blacklist' || this.sourceProto === 'safari-extension:' || this.sourceProto === 'safari-resource:')
		return canLoad;
	else {
		var pageParts = Utilities.URL.hostParts(this.pageHost),
			sourceParts = Utilities.URL.hostParts(this.sourceHost);
				
		if (this.sourceProto === 'about:' && blockFrom !== 'everywhere')
			return canLoad;
		else if ((blockFrom === 'host' && pageParts[0] !== sourceParts[0]) || 
			(blockFrom === 'domain' && pageParts[pageParts.length - 1] !== sourceParts[sourceParts.length - 1]) ||
			(blockFrom === 'everywhere'))
			canLoad.action = ACTION.BLOCK_WITHOUT_RULE;
	}

	return canLoad;
};

Resource.prototype.rulesForLocation = function (isAllowed, onlyRulesOfType, useHideKinds, excludeLists, includeLists) {
	return Rules.forLocation({
		searchKind: useHideKinds ? this.hideKinds : this.searchKinds,
		location: this.pageLocation,
		isAllowed: isAllowed,
		onlyRulesOfType: onlyRulesOfType,
		excludeLists: excludeLists,
		includeLists: includeLists
	});
};

Resource.prototype.rulesForResource = function (isAllowed, excludeLists, includeLists, onlyRulesOfType) {
	var matchedList,
		domainRules,
		rule,
		testedRule;

	excludeLists = ['temporaryFirstVisit', 'firstVisit'] || excludeLists;

	var matcher = new Rules.SourceMatcher(this.lowerSource, this.source, this.pageHost, this.pageDomain),
		matchedRules = {},
		checkAction = typeof isAllowed === 'boolean';

	Rule.withLocationRules(this.rulesForLocation(null, onlyRulesOfType, false, excludeLists, includeLists), function (ruleList, ruleListName, ruleKind, ruleType, domain, rules) {
		matchedList = matchedRules._getWithDefault(ruleListName, {});

		for (rule in rules.data) {
			if (checkAction && !!(rules.data[rule].value.action % 2) !== isAllowed)
				continue;

			testedRule = matcher.testRule(rule, rules.data[rule].value.regexp, rules.data[rule].value.thirdParty, rules.data[rule].value.exceptionHosts);

			if (testedRule > -1 && testedRule) {
				domainRules = matchedList
					._getWithDefault(ruleKind, {})
					._getWithDefault(ruleType, {})
					._getWithDefault(domain, {});
				
				domainRules[rule] = {
					action: rules.data[rule].value.action,
					meta: rules.data[rule].value.meta,
					regexp: rules.data[rule].value.regexp,
					thirdParty: rules.data[rule].value.thirdParty,
					exceptionHosts: rules.data[rule].value.exceptionHosts,
					ruleList: ruleList
				};
			}
		}

		if (matchedList._isEmpty())
			delete matchedRules[ruleListName];
		else
			Object.defineProperty(matchedList, 'rule', {
				value: ruleList
			});
	});

	return matchedRules;
};

Resource.prototype.descriptionsForResource = function (isAllowed) {
	var kind,
		type,
		domain,
		rule;

	var descriptionList = [];

	if (this.sourceProto === 'data:')
		return descriptionList;

	var descriptions = this.rulesForResource(isAllowed, null, ['description'], Rules.DOMAIN_RULES_ONLY);

	if (descriptions.description)
		for (kind in descriptions.description)
			for (type in descriptions.description[kind])
				for (domain in descriptions.description[kind][type])
					for (rule in descriptions.description[kind][type][domain])
						descriptions.description[kind][type][domain][rule].meta.map(function (value) {
							descriptionList._pushMissing(_('description.' + value));
						});

	return descriptionList;
};

Resource.prototype.shouldHide = function () {
	if (this.sourceProto === 'data:')
		return false;

	var filterHideBlacklist = this.action === ACTION.BLACKLIST && Settings.getItem('autoHideBlacklist'),
		filterHideWhitelist = this.action === ACTION.WHITELIST && Settings.getItem('autoHideWhitelist'),
		ruleHide = (this.kind !== 'special' && this.kind !== 'user_script' && (this.action === 0 || this.action === 1) && this.action !== ACTION.AWAIT_XHR_PROMPT && Settings.getItem('autoHideRule')),
		noRuleHide = (this.kind !== 'special' && this.kind !== 'user_script' && this.action < 0 && this.action !== ACTION.AWAIT_XHR_PROMPT && Settings.getItem('autoHideNoRule'));
	
	return (!this.unblockable && (filterHideBlacklist || filterHideWhitelist || ruleHide || noRuleHide)) || !this.canLoad(false, true, Special.__excludeLists).isAllowed;
};

Resource.prototype.canLoad = function (detailed, useHideKinds, excludeLists) {
	if (!Rules.kindSupported(this.kind))
		throw new Error(Rules.ERROR.KIND.NOT_SUPPORTED);

	var canLoad = {
		action: ACTION.ALLOW_WITHOUT_RULE,
		isAllowed: true
	};

	excludeLists = excludeLists || [];

	if (this.kind === 'disable')
		excludeLists = excludeLists.concat(Special.__excludeLists);

	if (this.unblockable) {
		canLoad.action = ACTION.UNBLOCKBABLE;

		return canLoad;
	}

	if (!Settings.getItem('enabledKinds', this.kind)) {
		canLoad.action = ACTION.KIND_DISABLED;

		return canLoad;
	}

	var shouldBlockFirstVisit = Settings.getItem('blockFirstVisit') !== 'nowhere';

	if (!shouldBlockFirstVisit)
		excludeLists._pushMissing(['temporaryFirstVisit', 'firstVisit']);

	var searchKinds = useHideKinds ? this.hideKinds : this.searchKinds,
		domainCached = false;

	if (Resource.USE_CACHE && !this.private) {
		var canUseCache = !detailed && Rules.list.active === Rules.list.user,
			store = Resource.canLoadCache.getStore(searchKinds.concat(excludeLists).join('-')),
			pageSources = store.getStore(this.pageLocation),
			pageCached = pageSources.get(this.lowerSource);

		if (pageCached && canUseCache)
			return pageCached;

		var hostSources = store.getStore(this.pageHost);
		
		domainCached = hostSources.get(this.lowerSource);

		if (domainCached && canUseCache)
			return domainCached;
	}

	var pageRule,
		longAllowed,
		rule,
		longRules,
		longStore,
		longRegExps,
		i,
		b,
		party,
		action,
		testedRule;

	var self = this,
		matcher = new Rules.SourceMatcher(this.lowerSource, this.source, this.pageHost, this.pageDomain),
		ignoreBlacklist = Settings.getItem('ignoreBlacklist'),
		ignoreWhitelist = Settings.getItem('ignoreWhitelist'),
		ignoreAllResources = shouldBlockFirstVisit && Settings.getItem('simplifiedUI');

	Rule.withLocationRules(this.rulesForLocation(null, !!domainCached, useHideKinds, excludeLists), function (ruleList, ruleListName, ruleKind, ruleType, domain, rules) {
		if (ruleList === Rules.list.allResources && ignoreAllResources)
			return;

		if (ruleList === Rules.list.temporaryFirstVisit && !self.private)
			return;

		if (ruleList === Rules.list.firstVisit && self.private)
			return;

		pageRule = (ruleType === 'page' || ruleType === 'notPage');
		longAllowed = (!pageRule && Rules.list[ruleListName].longRuleAllowed);

		if (longAllowed) {			
			longStore = Resource.longRegExps.getStore(ruleListName).getStore(ruleKind);
			longRegExps = longStore.get(domain);
		}

		if (longAllowed && longRegExps)
			for (party in longRegExps.data) {
				if (party === 'third-party' && self.sourceDomain === self.pageDomain)
					continue;

				actionLoop:
				for (action in longRegExps.data[party].value.data) {
					if ((ignoreBlacklist && Number(action) === ACTION.BLACKLIST) || (ignoreWhitelist && Number(action) === ACTION.WHITELIST))
						continue;

					if (longRegExps.data[party].value.data[action].value.exceptionHosts && longRegExps.data[party].value.data[action].value.exceptionHosts._contains(self.pageHost))
						continue;

					for (i = 0, b = longRegExps.data[party].value.data[action].value.regExps.length; i < b; i++)
						if (longRegExps.data[party].value.data[action].value.regExps[i].test(self.lowerSource)) {
							canLoad = longRegExps.data[party].value.data[action].value.canLoad;

							if (action % 2)
								break actionLoop;
							else
								continue actionLoop;
						}
				}
			}
		else {
			if (longAllowed)
				longRules = {};

			for (rule in rules.data)
				if (longAllowed)
					longRules
						._getWithDefault(rules.data[rule].value.thirdParty ? 'third-party' : 'first-party', {})
						._getWithDefault(rules.data[rule].value.action, []).push({
							rule: rule.toLowerCase(),
							exceptionHosts: rules.data[rule].value.exceptionHosts
						});
				else {
					testedRule = matcher.testRule(rule, rules.data[rule].value.regexp, rules.data[rule].value.thirdParty, rules.data[rule].value.exceptionHosts);

					if (testedRule > -1 && testedRule)
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

			if (longAllowed)
				for (party in longRules)
					actionLoop:
					for (action in longRules[party]) {
						longRegExps = longRules[party][action]._chunk(3000).map(function (chunk) {
							return new RegExp(chunk.map(function (piece) {
								return piece.rule;
							}).join('|'));
						});

						longStore.getStore(domain).getStore(party).set(action, {
							regExps: longRegExps,
							exceptionHosts: longRules[party][action][0].exceptionHosts,
							canLoad: {
								pageRule: pageRule,
								action: parseInt(action, 10),
								list: ruleListName
							}
						});

						if (party === 'third-party' && self.sourceDomain === self.pageDomain)
							continue;

						if (longRules[party][action][0].exceptionHosts && longRules[party][action][0].exceptionHosts._contains(self.pageHost))
							continue;

						if ((ignoreBlacklist && Number(action) === ACTION.BLACKLIST) || (ignoreWhitelist && Number(action) === ACTION.WHITELIST))
							continue;

						for (i = 0, b = longRegExps.length; i < b; i++)
							if (longRegExps[i].test(self.lowerSource)) {
								canLoad = {
									pageRule: pageRule,
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

		if (canLoad.action > ACTION.ALLOW_WITHOUT_RULE)
			return true;
	});
	
	self = undefined;

	if (canLoad.action === ACTION.ALLOW_WITHOUT_RULE || canLoad.action === ACTION.ALLOW_AFTER_FIRST_VISIT)
		canLoad = (Resource.USE_CACHE && !this.private && domainCached) ? domainCached : this.allowedBySettings(useHideKinds);

	canLoad.isAllowed = !!(canLoad.action % 2);

	if (Resource.USE_CACHE && !this.private && !detailed && canLoad.list !== 'temporary' && Rules.list.active === Rules.list.user)
		Utilities.setImmediateTimeout(function (canLoad, store, source) {
			store.set(source, canLoad);
		}, [canLoad, canLoad.pageRule ? pageSources : hostSources, this.lowerSource]);

	return canLoad;
};

Resource.prototype.toJSON = function () {
	return {
		action: this.action,
		unblockable: this.unblockable || undefined,
		meta: this.meta || undefined
	};
};
