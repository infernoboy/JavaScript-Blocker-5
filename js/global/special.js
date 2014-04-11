"use strict";

var Special = {
	__enabled: null,

	__locationEnabled: function (specials, kind, location, isFrame) {
		var rule,
				special;

		var isUserScript = kind === 'user_script',
				enabled = isUserScript ? {} : specials,
				framedKind = isFrame ? 'framed:' + kind : null,
				forLocation = Rules.forLocation([framedKind, kind], location);

		if (isUserScript)
			for (var script in specials)
				enabled[script] = false;

		Rule.withLocationRules(forLocation, function (ruleList, ruleKind, ruleType, domain, rules) {
			for (rule in rules.data)
				for (special in specials)
					if (Rules.matches(rule.toLowerCase(), rules.data[rule].value.regexp, special.toLowerCase()))
						if (rules.data[rule].value.action % 2) {
							if (isUserScript)
								enabled[special] = specials[special];
							else
								enabled[special] = false;
						}
		});

		return enabled;
	},

	locationEnabled: function (location, isFrame) {
		return this.__locationEnabled(this.enabled, 'special', location, isFrame);
	},

	get enabled () {
		if (this.__enabled)
			return this.__enabled._clone();

		this.__enabled = Settings.getStore('specials').filter(function (special, value) {
			return value.value !== false;
		}).all();

		return this.__enabled._clone();
	},
	set enabled () {
		this.__enabled = null;
	}
};