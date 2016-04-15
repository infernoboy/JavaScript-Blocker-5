/*
JS Blocker 5 (http://jsblocker.toggleable.com) - Copyright 2015 Travis Lee Roman
*/

"use strict";

var window = self;

importScripts('../global/tlds.js');
importScripts('../utilities.js');

var ACTION = {
	WHITELIST: 5,
	BLACKLIST: 4
};

function processFilterList (list) {
	var	lines = list.list.split(/\n/);

	var kindMap = {
		script: ['script'],
		image: ['image'],
		object: ['embed'],
		xmlhttprequest: ['xhr_get', 'xhr_post', 'xhr_put']
	};

	var rules = {};

	for (var i = 0, b = lines.length; i < b; i++) {
		var line = lines[i].trim();

		if (line._contains('##') || line._contains('#@#') || line._contains('$popup') || !line.length)
			continue; // Ignore element hiding rules, popup rules, and empty lines.

		var addType;

		var action = line._startsWith('@@') ? ACTION.WHITELIST : ACTION.BLACKLIST,
				line = action === ACTION.WHITELIST ? line.substr(2) : line;

		if (i === 0 && line[0] !== '[') {
			postMessage({
				error: 'invalid Filter List',
				message: {
					name: list.name,
					url: list.url
				}
			});

			break;
		}

		if (line[0] === '!' || line[0] === '[')
			continue; // Line is a comment or determines which version of AdBlock is required.

		var dollar = line.indexOf('$'),
				subLine = line.substr(0, ~dollar ? dollar : line.length),
				argCheck = line.split(/\$/),
				useKind = false,
				args = [],
				exceptionHosts = {},
				domains = ['*'];

		var rule = subLine.replace(/\//g, '\\/')
			.replace(/\(/g, '\\(')
			.replace(/\[/g, '\\[')
			.replace(/\]/g, '\\]')
			.replace(/\)/g, '\\)')
			.replace(/\+/g, '\\+')
			.replace(/\?/g, '\\?')
			.replace(/\^/g, '([^a-zA-Z0-9_\.%-]+|$)')
			.replace(/\./g, '\\.')
			.replace(/\*/g, '.*');

		if (line._startsWith('||'))
			rule = rule.replace('||', 'https?:\\/\\/([^\\/]+\\.)?');
		else if (line[0] === '|')
			rule = rule.replace('|', '');
		else
			rule = '.*' + rule;

		if (rule.match(/\|[^$]/))
			continue; // Weirdly written rules that I refuse to parse.

		rule = '^' + rule;

		if (rule._endsWith('|'))
			rule = rule.substr(0, rule.length - 1) + '.*$';
		else
			rule += '.*$';

		rule = rule.replace(/\.\*\.\*/g, '.*');

		if (argCheck[1]) {
			args = argCheck[1].split(',');

			for (var j = 0; j < args.length; j++) {
				if (args[j]._startsWith('domain='))
					domains = args[j].substr(7).split('|').map(function (domain) {
						return '.' + domain;
					});
				else if (args[j] in kindMap)
					useKind = kindMap[args[j]];
			}
		}

		var exclusivelyExceptions = domains.every(function (domain) {
			return domain._startsWith('.~');
		});

		if (exclusivelyExceptions)
			domains.push('*');

		var topDomain,
				domainSubstr;

		var skipDomains = [];

		for (var g = 0; g < domains.length; g++) {
			if (domains[g]._startsWith('.~')) {
				domainSubstr = domains[g].substr(2);

				var topDomain = Utilities.URL.hostParts(domainSubstr).reverse()[0]

				if (topDomain !== domainSubstr && domains._contains('.' + topDomain)) {
					skipDomains.push(domainSubstr);

					exceptionHosts._getWithDefault(topDomain, []).push(domainSubstr);
				}
			}
		}

		for (var g = 0; g < domains.length; g++) {
			if (domains[g]._startsWith('.~')) {
				domainSubstr = domains[g].substr(2);

				if (skipDomains._contains(domainSubstr))
					continue;

				domains[g] = '.' + domainSubstr;

				addType = 'notDomain';
			} else
				addType = 'domain';

			if (useKind)
				for (var h = 0; h < useKind.length; h++) {
					rules
						._getWithDefault(useKind[h], {})
						._getWithDefault(addType, {})
						._getWithDefault(domains[g], {})[rule] = {
							action: action,
							thirdParty: args._contains('third-party'),
							exceptionHosts: exceptionHosts[domains[g].substr(1)]
						};
				}
			else
				rules
						._getWithDefault('*', {})
						._getWithDefault(addType, {})
						._getWithDefault(domains[g], {})[rule] = {
							action: action,
							thirdParty: args._contains('third-party'),
							exceptionHosts: exceptionHosts[domains[g].substr(1)]
						};
		}
	}

	self.postMessage({
		error: false,
		message: rules
	});
};

self.addEventListener('message', function (message) {
	processFilterList(message.data);
});
