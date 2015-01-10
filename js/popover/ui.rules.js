"use strict";

UI.Rules = {
	init: function () {
		UI.Rules.view = $('#main-views-rule', UI.view.views);

		UI.Rules.view.append(Template.create('rules', 'rule-container'));

		UI.Rules.toolbar = $('#rule-toolbar', UI.Rules.view);
		UI.Rules.viewContainer = $('#rule-views-container', UI.Rules.view);
		UI.Rules.views = $('#rule-views', UI.Rules.viewContainer);

		var viewSwitcherData = {
			container: '#rule-views-container',
			views: {}
		};

		var lists = ['temporary', 'active', 'easy'];

		for (var i = 0; i < lists.length; i++)
			viewSwitcherData.views['#rule-views-' + lists[i]] = {
				value: _('rules.' + lists[i]),
				poppy: lists[i] === 'easy' ? 'easy-menu' : null
			};

		UI.Rules.toolbar.append(Template.create('main', 'view-switcher', viewSwitcherData));

		UI.Rules.viewSwitcher = $('.view-switcher', UI.Rules.view);

		for (var i = 0; i < lists.length; i++)
			UI.view.create('rule-views', lists[i], UI.Rules.views);

		UI.Rules.events.viewSwitcher();

		UI.Rules.setEasyRulesList();

		UI.view.switchTo('#rule-views-active');
	},

	getEasyLists: function () {
		return Object.keys(globalPage.Rules.list).filter(function (listName) {
			return listName._startsWith('$');
		});
	},

	getEasyListName: function (listName) {
		var listReference = Settings.getItem('easyLists')[listName];

		if (listReference)
			return listReference.value[1];

		return null;
	},

	setEasyRulesList: function (listName) {
		var easyViewSwitcher = $('li[data-view="#rule-views-easy"]', UI.Rules.viewSwitcher),
				easyRules = UI.Rules.getEasyLists();

		if (easyRules._contains(listName)) {
			easyViewSwitcher
				.attr('data-easyList', listName)
				.find('.view-switcher-item-name')
				.text(_('rules.easy') + ' − ' + UI.Rules.getEasyListName(listName));

				UI.view.switchTo('#rule-views-easy');
		} else if (easyRules.length)
			this.setEasyRulesList(easyRules[0]);
	},

	groupRulesByDomain: function (rules) {
		var kind,
				type,
				domain,
				rule,
				typeGroup,
				domainGroup;

		var groupedRules = {};

		for (kind in rules) {
			for (type in rules[kind]) {
				typeGroup = groupedRules._getWithDefault(type, {});

				for (domain in rules[kind][type]) {
					domainGroup = typeGroup._getWithDefault(domain, {});

					for (rule in rules[kind][type][domain])
						domainGroup._getWithDefault(kind, {})[rule] = rules[kind][type][domain][rule];
				}
			}
		}

		return groupedRules;
	},

	events: {
		viewSwitcher: function (event) {

		},

		viewAlreadyActive: function (event) {
			if (event.detail.id._startsWith('#rule-views')) {
				event.detail.to = event.detail;

				UI.Rules.events.viewWillSwitch(event);
			}
		},

		viewWillSwitch: function (event) {
			var viewContent,
					domainGrouped;

			var isMainSwitch = (event.detail.to.id === '#main-views-rule'),
					toView = isMainSwitch ? $('.active-view', UI.Rules.views) : event.detail.to.view,
					toID = isMainSwitch ? '#' + toView.attr('id') : event.detail.to.id;

			switch (toID) {
				case '#rule-views-temporary':
					domainGrouped = UI.Rules.groupRulesByDomain(globalPage.Rules.list.temporary.rules.all());
				break;

				case '#rule-views-active':
					domainGrouped = UI.Rules.groupRulesByDomain(globalPage.Rules.list.active.rules.all());				
				break;

				case '#rule-views-easy':
					var easyList = $('li[data-view="#rule-views-easy"]', UI.Rules.viewSwitcher).attr('data-easyList');

					domainGrouped = UI.Rules.groupRulesByDomain(globalPage.Rules.list[easyList].rules.all());
				break;
			}

			if (domainGrouped) {
				toView.html('Loading rules... (this may take a while if you are trying to load Easy Rules)');

				var container = $('<div>');

				var i = 1,
						b = 1,
						c = 1;

				for (var type in domainGrouped) {
					var typeExpander = 'ruleGroupType-' + type,
							typeHeader = $('<header data-expander="' + typeExpander + '"><h4>' + _('rules.type.' + type) + '</h4></header>');

					var typeUL = $('<ul>').addClass('rule-group-type');

					for (var domain in domainGrouped[type]) {
						var domainExpander = typeExpander + '-ruleGroupDomain-' + domain,
								domainListItem = $('<li>'),
								domainHeader = $('<header data-expander="' + domainExpander + '"><h4>' + (domain === '*' ? _('rules.all_domains') : domain) + '</h4></header>');

						domainListItem.append(domainHeader);

						var domainUL = $('<ul>').addClass('rule-group-domain');

						for (var kind in domainGrouped[type][domain]) {
							var kindExpander = domainExpander + '-ruleGroupKind-' + kind,
									kindListItem = $('<li>'),
									kindHeader = $('<header data-expander="' + kindExpander + '"><h4>' + _('view.page.host.kind.' + kind) + '</h4></header>');

							kindListItem.append(kindHeader);

							var kindUL = $('<ul>').addClass('rule-group-kind');

							for (var rule in domainGrouped[type][domain][kind]) {
								var ruleListItem = $('<li>');

								ruleListItem.text(domainGrouped[type][domain][kind][rule].action + ' - ' + rule);

								setTimeout(function (kindUL, ruleListItem) {
									kindUL.append(ruleListItem);
								}, 0.5 * i++, kindUL, ruleListItem);
							}

							setTimeout(function (kindListItem, kindUL, domainUL) {
								kindListItem.append(kindUL);

								domainUL.append(kindListItem);
							}, 0.5 * b++, kindListItem, kindUL, domainUL);
						}

						setTimeout(function (domainListItem, domainUL, typeUL) {
							domainListItem.append(domainUL);

							typeUL.append(domainListItem);
						}, 0.5 * c++, domainListItem, domainUL, typeUL);
					}

					setTimeout(function (typeHeader, typeUL, container) {
						typeHeader.add(typeUL).appendTo(container);
					}, 0.5 * i++, typeHeader, typeUL, container);
				}

				setTimeout(function (toView, container) {
					toView.html('<p class="jsb-info">Rule management is not yet available.</p>');

					toView.append(container);
				}, 0.5 * i, toView, container);
			}
		},

		viewDidSwitch: function (event) {
			if (UI.Rules.views)
				$('.ui-view:not(.active-view)', UI.Rules.views).empty();
		}
	}
};

UI.event.addCustomEventListener('viewWillSwitch', UI.Rules.events.viewWillSwitch);
UI.event.addCustomEventListener('viewAlreadyActive', UI.Rules.events.viewAlreadyActive);
UI.event.addCustomEventListener('viewDidSwitch', UI.Rules.events.viewDidSwitch);

document.addEventListener('DOMContentLoaded', UI.Rules.init, true);

Template.load('rules');
