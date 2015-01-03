"use strict";

var Upgrade = {
	__specialMap: {
		ajax_intercept: 'xhr_intercept',
		inline_scripts: 'inline_script_execution',
		navigator_override: 'environmental_information',
		canvas_fingerprinting: 'canvas_data_url'
	},

	importRulesFromJSB4: function (rules) {
		try {
			var rules = Object._isPlainObject(rules) ? rules : JSON.parse(rules);
		} catch (e) {
			return false;
		}

		var kind,
				newKind,
				domain,
				newDomain,
				addRule,
				rule,
				newRule,
				ruleProto,
				newRuleProto;

		for (kind in rules) {
			newKind = kind.replace(/ajax_/, 'xhr_').replace(/hide_/, 'hide:');

			for (domain in rules[kind]) {
				newDomain = domain === '.*' ? '*' : domain;
				addRule = Rules.isRegExp(newDomain) ? Rules.list.user.addPage : Rules.list.user.addDomain;

				for (rule in rules[kind][domain]) {
					if (newKind._endsWith('special')) {
						if (rule._contains(' ') || rule._contains(':'))
							continue;

						newRule = Upgrade.__specialMap.hasOwnProperty(rule) ? Upgrade.__specialMap[rule] : rule;
					} else if (Rules.isRegExp(rule))
						newRule = rule;
					else {
						ruleProto = rule.substr(0, rule.indexOf(':'));

						if (ruleProto.match(/^[A-Z,]+$/i)) {
							newRuleProto = ruleProto.split(/,/).map(function (proto) {
								return proto.toLowerCase() + ':';
							}).join(',');

							newRule = newRuleProto + '|' + rule.substr(ruleProto.length + 1);
						} else
							newRule = rule;
					}

					if (rule === '.*')
						newRule = '*';

					addRule(newKind, newDomain, {
						rule: newRule,
						action: rules[kind][domain][rule][0]
					});
				}				
			}
		}
	}
};
