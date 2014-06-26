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
				forLocation = Rules.forLocation([framedKind, kind], location, null, null, null, Special.__excludeLists);

		if (isUserScript)
			for (var script in specials)
				enabled[script] = false;

		Rule.withLocationRules(forLocation, function (ruleList, ruleKind, ruleType, domain, rules) {
			for (rule in rules.data)
				for (special in specials)
					if (Rules.matches(rule.toLowerCase(), rules.data[rule].value, special.toLowerCase(), location)) {
						if (rules.data[rule].value.action % 2) {
							if (isUserScript)
								enabled[special] = specials[special];
							else
								enabled[special] = false;
						}

						if ([ACTION.BLOCK, ACTION.ALLOW]._contains(rules.data[rule].value.action))
							return true;
					}
		});

		return enabled;
	},

	forLocation: function (location, isFrame) {
		return this.__forLocation(this.enabled, 'special', location, isFrame);
	},

	get enabled () {
		if (this.__enabled)
			return this.__enabled._clone();

		var specials = Settings.getItem('enabledSpecials');

		this.__enabled = {};

		for (var special in specials)
			if (specials[special] !== false)
				this.__enabled[special] = specials[special];

		return this.__enabled._clone();
	},
	set enabled () {
		this.__enabled = null;
	}
};
