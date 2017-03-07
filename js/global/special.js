/*
JS Blocker 5 (http://jsblocker.toggleable.com) - Copyright 2017 Travis Lee Roman
*/

'use strict';

var Special = {
	__enabled: null,

	get __excludeLists() {
		return ['predefined'].concat(Object.keys(Settings.getItem('filterLists')));
	},

	__forLocation: function (specials, kind, location, isFrame) {
		var rule,
			lowerSpecial,
			matcher,
			special;

		var isUserScript = kind === 'user_script',
			enabled = isUserScript ? {} : specials,
			framedKind = isFrame ? 'framed:' + kind : null,
			forLocation = Rules.forLocation({
				searchKind: [framedKind, kind],
				location: location,
				excludeLists: Special.__excludeLists
			});

		if (isUserScript)
			for (var script in specials)
				enabled[script] = {
					action: -2
				};

		for (special in specials) {
			lowerSpecial = special.toLowerCase();

			matcher = new Rules.SourceMatcher(lowerSpecial, lowerSpecial);

			Rule.withLocationRules(forLocation, function (list, listName, kind, type, domain, rules) {
				for (rule in rules.data)
					if (matcher.testRule(rule.toLowerCase(), rules.data[rule].value.regexp)) {
						if (rules.data[rule].value.action % 2)
							if (isUserScript)
								enabled[special] = specials[special];
							else
								enabled[special].enabled = false;
						else if (!isUserScript)
							enabled[special].enabled = true;

						enabled[special].action = rules.data[rule].value.action;

						return true;
					}
			});
		}

		return enabled;
	},

	forLocation: function (location, isFrame) {
		return this.__forLocation(this.enabled, 'special', location, isFrame);
	},

	get enabled () {
		if (this.__enabled)
			return this.__enabled._clone(true);

		var specials = Settings.getItem('enabledSpecials'),
			allowByDefault = ['page_blocker'];

		this.__enabled = {};

		for (var special in specials)
			if (specials[special] !== false)
				this.__enabled[special] = {
					enabled: !allowByDefault._contains(special),
					value: specials[special],
					action: allowByDefault._contains(special) ? ACTION.ALLOW_WITHOUT_RULE : ACTION.BLOCK_WITHOUT_RULE
				};

		return this.enabled;
	},
	
	set enabled (arg) {
		this.__enabled = null;
	}
};
