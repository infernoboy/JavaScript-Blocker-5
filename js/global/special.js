"use strict";

var Special = {
	__enabled: null,

	get __excludeLists() {
		return ['predefined'].concat(Object.keys(Settings.getItem('easyLists')));
	},

	__forLocation: function (specials, kind, location, isFrame) {
		var rule,
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

		for (special in specials)
			Rule.withLocationRules(forLocation, function (list, listName, kind, type, domain, rules) {
				for (rule in rules.data) {
					if (Rules.matches(rule.toLowerCase(), rules.data[rule].value.regexp, special.toLowerCase(), location)) {
						if (rules.data[rule].value.action % 2) {
							if (isUserScript)
								enabled[special] = specials[special];
							else
								enabled[special].enabled = false;
						}

						enabled[special].action = rules.data[rule].value.action;

						return true;
					}
				}
			});

		return enabled;
	},

	forLocation: function (location, isFrame) {
		return this.__forLocation(this.enabled, 'special', location, isFrame);
	},

	get enabled () {
		if (this.__enabled)
			return this.__enabled._clone(true);

		var specials = Settings.getItem('enabledSpecials');

		this.__enabled = {};

		for (var special in specials)
			if (specials[special] !== false)
				this.__enabled[special] = {
					enabled: true,
					value: specials[special],
					action: ACTION.BLOCK_WITHOUT_RULE
				};

		return this.enabled;
	},
	
	set enabled () {
		this.__enabled = null;
	}
};
