"use strict";

function FilterList (listName, listURL) {
	if (!Rules.list[listName])
		throw new Error(listName + ' is not a valid FilterList.');

	FilterList.__updating++;

	this.name = listName;
	this.url = listURL;
	this.temporaryRules = FilterList.__temporary.get(this.name, new Rule('FilterTemporary', {
		private: true
	}));

	this.valid = true;

	this.temporaryRules.rules.clear();

	this.download().done(this.process.bind(this));
};

FilterList.__cancel = 0;
FilterList.__updating = 0;
FilterList.__updateInterval = TIME.ONE.DAY * 4;

FilterList.__temporary = new Store('FilterTemporary');

FilterList.cancelUpdate = function () {
	FilterList.__cancel = parseInt(FilterList.__updating, 10);
};

FilterList.updateCheck = function () {
	if (Date.now() - Settings.getItem('FilterListLastUpdate') > FilterList.__updateInterval)
		FilterList.fetch();
};

FilterList.fetch = function () {
	var lists = Settings.getItem('filterLists');

	for (var list in lists)
		if (lists[list].enabled)
			new FilterList(list, lists[list].value[0]);
		else
			Rules.__FilterRules.remove(list);

	Command.event.addCustomEventListener('UIReady', function () {	
		UI.event.trigger('filterListsUpdateStarted');
	}, true);
};

FilterList.prototype.merge = function () {
	Utilities.setImmediateTimeout(function (self) {
		if (FilterList.__cancel) {
			FilterList.__cancel--;
			FilterList.__updating--;

			return self.temporaryRules.rules.clear();
		}

		Rules.list[self.name].rules.addCustomEventListener('storeWouldHaveSaved', function (self) {
			FilterList.__updating--;

			if (FilterList.__updating === 0)
				Settings.setItem('FilterListLastUpdate', Date.now());

			self.temporaryRules.rules.clear();
		}.bind(null, self), true);

		Rules.list[self.name].rules.replaceWith(self.temporaryRules.rules);

		Predefined();
	}, [this]);
};

FilterList.prototype.download = function () {
	return $.get(this.url).fail(function (error) {
		FilterList.__updating--;

		LogError('failed to download filter list ' + this.name, error.statusText);
	});
};

FilterList.prototype.process = function (list) {
	var	lines = list.split(/\n/);

	var kindMap = {
		script: ['script'],
		image: ['image'],
		object: ['embed'],
		xmlhttprequest: ['xhr_get', 'xhr_post', 'xhr_put']
	};

	for (var i = 0, b = lines.length; i < b; i++) {
		if (this.valid && FilterList.__cancel === 0)
			Utilities.setImmediateTimeout(function (self, line, lineNumber) {
				if (line._contains('##') || line._contains('#@#') || line._contains('$popup') || !line.length)
					return; // Ignore element hiding rules, popup rules, and empty lines.

				var addType;

				var action = line._startsWith('@@') ? ACTION.WHITELIST : ACTION.BLACKLIST,
						line = action === ACTION.WHITELIST ? line.substr(2) : line;

				if (lineNumber === 0 && line[0] !== '[') {
					FilterList.__updating--;

					LogError('invalid Filter List - ' + self.name + ' - ' + self.url);

					self.valid = false;

					Settings.removeItem('filterLists', self.name);

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

	Utilities.Timer.timeout('ReplaceNewFilterList-' + this.name, this.merge.bind(this), 2000);
};

Command.event.addCustomEventListener('UIReady', function () {
	UI.event.addCustomEventListener(['popoverOpened', 'filterListsUpdateStarted'], function (event) {
		if (FilterList.__updating) {
			var poppy = new Popover.window.Poppy(0.5, 0, true);

			poppy.setContent(Template.create('main', 'jsb-readable', {
				header: _('rules.filter_lists.updating'),
				string: _('rules.filter_lists.updating.description')
			}));

			poppy.stayOpenOnScroll().show();
		}
	});
}, true);

FilterList.updateCheck();

Utilities.Timer.interval('FilterListUpdateCheck', FilterList.updateCheck, FilterList.__updateInterval);
