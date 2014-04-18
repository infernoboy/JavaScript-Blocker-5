"use strict";

var EasyList = function (listName, listURL) {
	this.name = listName;
	this.url = listURL;

	this.download().done(this.process.bind(this));
};

EasyList.__updateInterval = TIME.ONE_DAY * 4;

EasyList.blacklist = new Rule('EasyListBlacklist', {
	private: true
});

EasyList.whitelist = new Rule('EasyListWhitelist', {
	private: true
});

EasyList.updateCheck = function () {
	if (Date.now() - Settings.getItem('EasyListLastUpdate') > EasyList.__updateInterval)
		EasyList.fetch();
};

EasyList.fetch = function () {
	var lists = Settings.getJSON('easyLists');

	for (var list in lists)
		if (lists[list][0])
			new EasyList(list, lists[list][1]);

	Settings.setItem('EasyListLastUpdate', Date.now());
};

EasyList.prototype.merge = function () {
	Utilities.setImmediateTimeout(function () {
		Rules.list.blacklist.rules.replaceWith(EasyList.blacklist.rules);
		Rules.list.whitelist.rules.replaceWith(EasyList.whitelist.rules);

		Predefined();

		EasyList.blacklist.rules.clear();
		EasyList.whitelist.rules.clear();
	});
};

EasyList.prototype.download = function () {
	return $.get(this.url).fail(function (error) {
		LogError(error);
	});
};

EasyList.prototype.process = function (list) {
	var	lines = list.split(/\n/);

	var kindMap = {
		script: ['script'],
		image: ['image'],
		object: ['embed'],
		xmlhttprequest: ['ajax_get', 'ajax_post', 'ajax_put']
	};

	for (var i = 0, b = lines.length; i < b; i++) {
		Utilities.setImmediateTimeout(function (line) {
			if (line._contains('##') || line._contains('#@#') || !line.length)
				return; // Ignore element hiding rules and empty lines.

			var addType;

			var ruleList = line._startsWith('@@') ? EasyList.whitelist : EasyList.blacklist,
					oppositeRuleList = ruleList === EasyList.whitelist ? EasyList.blacklist : EasyList.whitelist,
					line = ruleList === EasyList.whitelist ? line.substr(2) : line;

			if (line[0] === '!' || line[0] === '[')
				return; // Line is a comment or determines which version of AdBlock is required.

			var dollar = line.indexOf('$'),
					subLine = line.substr(0, ~dollar ? dollar : line.length),
					argCheck = line.split(/\$/),
					useKind = false,
					domains = ['*'];

			rule = subLine.replace(/\//g, '\\/')
				.replace(/\(/g, '\\(')
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
				return; // Weirdly written rules that I refuse to parse.

			rule = '^' + rule

			if (rule._endsWith('|'))
				rule = rule.substr(0, rule.length - 1) + '.*$';
			else
				rule += '.*$';

			rule = rule.replace(/\.\*\.\*/g, '.*');

			if (argCheck[1]) {
				var args = argCheck[1].split(',');

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

			for (var g = 0; g < domains.length; g++) {
				if (domains[g]._startsWith('.~')) {
					domains[g] = '.' + domains[g].substr(2);

					addType = 'addNotDomain';
				} else
					addType = 'addDomain';

				if (useKind)
					for (var h = 0; h < useKind.length; h++)
						ruleList[addType](useKind[h], domains[g], {
							rule: rule
						});
				else
					ruleList[addType]('*', domains[g], {
						rule: rule
					});
			}
		}, [$.trim(lines[i])]);
	}

	Utilities.Timer.timeout('MergeNewEasylist', this.merge.bind(this), 2000);
};

Utilities.Timer.interval('EasyListUpdateCheck', EasyList.updateCheck, EasyList.__updateInterval);
