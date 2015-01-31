"use strict";

function EasyList (listName, listURL) {
	if (!Rules.list[listName])
		throw new Error(listName + ' is not a valid EasyList.');

	EasyList.__updating++;

	this.name = listName;
	this.url = listURL;
	this.temporaryRules = EasyList.__temporary.get(this.name, new Rule('EasyTemporary', {
		private: true
	}));

	this.valid = true;

	this.temporaryRules.rules.clear();

	this.download().done(this.process.bind(this));
};

EasyList.__cancel = 0;
EasyList.__updating = 0;
EasyList.__updateInterval = TIME.ONE.DAY * 4;

EasyList.__temporary = new Store('EasyTemporary');

EasyList.cancelUpdate = function () {
	EasyList.__cancel = parseInt(EasyList.__updating, 10);
};

EasyList.updateCheck = function () {
	if (Date.now() - Settings.getItem('EasyListLastUpdate') > EasyList.__updateInterval)
		EasyList.fetch();
};

EasyList.fetch = function () {
	var lists = Settings.getItem('easyLists');

	for (var list in lists)
		if (lists[list].enabled)
			new EasyList(list, lists[list].value[0]);
		else
			Rules.__EasyRules.remove(list);
};

EasyList.prototype.merge = function () {
	Utilities.setImmediateTimeout(function (self) {
		if (EasyList.__cancel) {
			EasyList.__cancel--;
			EasyList.__updating--;

			return self.temporaryRules.rules.clear();
		}

		Rules.list[self.name].rules.addCustomEventListener('storeWouldHaveSaved', function (self) {
			EasyList.__updating--;

			if (EasyList.__updating === 0)
				Settings.setItem('EasyListLastUpdate', Date.now());

			self.temporaryRules.rules.clear();
		}.bind(null, self), true);

		Rules.list[self.name].rules.replaceWith(self.temporaryRules.rules);

		Predefined();
	}, [this]);
};

EasyList.prototype.download = function () {
	return $.get(this.url).fail(function (error) {
		EasyList.__updating--;

		LogError('failed to download easy list ' + this.name, error.statusText);
	});
};

EasyList.prototype.process = function (list) {
	var	lines = list.split(/\n/);

	var kindMap = {
		script: ['script'],
		image: ['image'],
		object: ['embed'],
		xmlhttprequest: ['xhr_get', 'xhr_post', 'xhr_put']
	};

	for (var i = 0, b = lines.length; i < b; i++) {
		if (this.valid && EasyList.__cancel === 0)
			Utilities.setImmediateTimeout(function (self, line, lineNumber) {
				if (line._contains('##') || line._contains('#@#') || line._contains('$popup') || !line.length)
					return; // Ignore element hiding rules, popup rules, and empty lines.

				var addType;

				var action = line._startsWith('@@') ? ACTION.WHITELIST : ACTION.BLACKLIST,
						line = action === ACTION.WHITELIST ? line.substr(2) : line;

				if (lineNumber === 0 && line[0] !== '[') {
					EasyList.__updating--;

					LogError('invalid Easy List - ' + self.name + ' - ' + self.url);

					self.valid = false;

					Settings.removeItem('easyLists', self.name);

					return;
				}

				if (line[0] === '!' || line[0] === '[')
					return; // Line is a comment or determines which version of AdBlock is required.

				var dollar = line.indexOf('$'),
						subLine = line.substr(0, ~dollar ? dollar : line.length),
						argCheck = line.split(/\$/),
						useKind = false,
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
					return; // Weirdly written rules that I refuse to parse.

				rule = '^' + rule;

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
							self.temporaryRules[addType](useKind[h], domains[g], {
								rule: rule,
								action: action
							});
					else
						self.temporaryRules[addType]('*', domains[g], {
							rule: rule,
							action: action
						});
				}
			}, [this, $.trim(lines[i]), i]);
	}

	Utilities.Timer.timeout('ReplaceNewEasyList-' + this.name, this.merge.bind(this), 2000);
};

EasyList.updateCheck();

Utilities.Timer.interval('EasyListUpdateCheck', EasyList.updateCheck, EasyList.__updateInterval);
