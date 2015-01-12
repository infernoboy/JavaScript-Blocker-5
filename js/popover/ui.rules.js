"use strict";

UI.Rules = {
	event: new EventListener,

	init: function () {
		UI.Rules.view = $('#main-views-rule', UI.view.views);

		UI.Rules.view.append(Template.create('rules', 'rule-container'));

		UI.Rules.toolbar = $('#rule-toolbar', UI.Rules.view);
		UI.Rules.viewContainer = $('#rule-views-container', UI.Rules.view);
		UI.Rules.views = $('#rule-views', UI.Rules.viewContainer);
		UI.Rules.noRules = $('#rule-views-no-rules', UI.Rules.viewContainer);

		var viewSwitcherData = {
			container: '#rule-views-container',
			views: {}
		};

		var lists = ['page', 'temporary', 'active', 'easy'];

		for (var i = 0; i < lists.length; i++)
			viewSwitcherData.views['#rule-views-' + lists[i]] = {
				value: _('rules.' + lists[i]),
				poppy: i > 0 ? (lists[i] + '-rules-menu') : null
			};

		UI.Rules.toolbar.append(Template.create('main', 'view-switcher', viewSwitcherData));

		UI.Rules.viewSwitcher = $('.view-switcher', UI.Rules.view);

		for (var i = 0; i < lists.length; i++)
			UI.view.create('rule-views', lists[i], UI.Rules.views);

		UI.Rules.events.rules();

		UI.Rules.setEasyRulesList(null, true);

		UI.view.switchTo('#rule-views-temporary');
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

	setEasyRulesList: function (listName, doNotSwitch) {
		var easyViewSwitcher = $('li[data-view="#rule-views-easy"]', UI.Rules.viewSwitcher),
				easyRules = UI.Rules.getEasyLists();

		if (easyRules._contains(listName)) {
			easyViewSwitcher
				.attr('data-easyList', listName)
				.find('.view-switcher-item-name')
				.text(_('rules.easy') + ' − ' + UI.Rules.getEasyListName(listName));

				if (!doNotSwitch)
					UI.view.switchTo('#rule-views-easy');
		} else if (easyRules.length)
			this.setEasyRulesList(easyRules[0], doNotSwitch);
	},

	groupRulesByDomain: function (rules) {
		var kind,
				type,
				domain,
				rule,
				typeGroup,
				domainSorted,
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

				groupedRules[type] = groupedRules[type]._sort(globalPage.Rules.__prioritize);
			}
		}

		return groupedRules;
	},

	buildRuleList: function (view, ruleList, doNotClear, useTheseRules, keepExpanded) {
		if (Object._isPlainObject(ruleList)) {
			var ruleListItem,
					ruleListItemLI;

			var container = $('<div>'),
					excludeLists = useTheseRules ? [] : globalPage.Special.__excludeLists._clone(),
					buildListCount = 0,
					builtListCount = 0,
					ruleListContainer = Template.create('rules', 'multi-list-container');

			excludeLists.push('firstVisit');

			UI.Rules.event.addCustomEventListener('rulesFinishedBuilding', function (event) {
				if (++builtListCount === buildListCount) {
					UI.Rules.event.trigger('multiListRulesFinishedBuilding', view);

					event.unbind();
				}
			});

			for (var listName in ruleList) {
				if (excludeLists._contains(listName))
					continue;

				buildListCount++;

				ruleListItem = Template.create('rules', 'multi-list-item', {
					expander: keepExpanded ? 0 : 'ruleList-' + listName,
					listName: listName
				});

				ruleListItemLI = $('.rule-group-list', ruleListItem);

				UI.Rules.buildRuleList(ruleListItemLI, ruleList[listName], doNotClear, useTheseRules ? useTheseRules[listName] : null, keepExpanded);

				ruleListItem.appendTo(ruleListContainer);
			}

			view.empty();

			ruleListContainer.appendTo(view);

			return view;
		}

		var type,
				typeExpander,
				ruleGroupType,
				typeUL,
				domain,
				domainExpander,
				domainListItem,
				domainUL,
				kind,
				kindExpander,
				kindListItem,
				kindHeader,
				kindUL,
				rule,
				ruleListItem;

		var domainGrouped = UI.Rules.groupRulesByDomain(useTheseRules ? useTheseRules : ruleList.rules.all()),
				container = $('<div>'),
				ruleTimeoutIndex = 1,
				domainTimeoutIndex = 1,
				typeTimeoutIndex = 1;

		view
			.attr('data-ruleListItems', '1')
			.data('ruleList', ruleList);

		if (!doNotClear)
			view.html('<p class="jsb-info">Loading rules... (this may take a while if you are trying to load Easy Rules)</p>');

		var types = ['page', 'domain', 'notPage', 'notDomain'];

		for (var i = 0; i < types.length; i++) {
			type = types[i];

			if (!(type in domainGrouped))
				continue;

			typeExpander = 'ruleGroupType-' + type;

			ruleGroupType = Template.create('rules', 'rule-group-type', {
				type: type,
				editable: (ruleList === globalPage.Rules.list.temporary || ruleList === globalPage.Rules.list.user),
				expander: keepExpanded ? 0 : typeExpander
			});
			
			typeUL = ruleGroupType.filter('.rule-group-type');

			for (domain in domainGrouped[type]) {
				domainExpander = typeExpander + '-ruleGroupDomain-' + domain;

				domainListItem = Template.create('rules', 'domain-list-item', {
					expander: keepExpanded ? 0 : domainExpander,
					domain: domain
				});

				domainUL = $('.rule-group-domain', domainListItem);

				for (kind in domainGrouped[type][domain]) {
					kindExpander = domainExpander + '-ruleGroupKind-' + kind;

					kindListItem = Template.create('rules', 'kind-list-item', {
						expander: keepExpanded ? 0 : domainExpander,
						kind: kind
					});

					kindUL = $('.rule-group-kind', kindListItem);

					for (rule in domainGrouped[type][domain][kind]) {
						ruleListItem = Template.create('rules', 'rule-list-item', {
							rule: rule,
							ruleInfo: domainGrouped[type][domain][kind][rule],
						});

						setTimeout(function (kindUL, ruleListItem) {
							kindUL.append(ruleListItem);
						}, 0.25 * ruleTimeoutIndex++, kindUL, ruleListItem);
					}

					setTimeout(function (kindListItem, kindUL, domainUL) {
						kindListItem.append(kindUL);

						domainUL.append(kindListItem);
					}, 0.25 * domainTimeoutIndex++, kindListItem, kindUL, domainUL);
				}

				setTimeout(function (domainListItem, domainUL, typeUL) {
					domainListItem.append(domainUL);

					typeUL.append(domainListItem);
				}, 0.25 * typeTimeoutIndex++, domainListItem, domainUL, typeUL);
			}

			setTimeout(function (ruleTimeoutIndex, ruleGroupType, container) {
				if (!ruleGroupType.filter('.rule-group-type').is(':empty'))
					ruleGroupType.appendTo(container);
			}, 0.25 * ruleTimeoutIndex, ruleTimeoutIndex, ruleGroupType, container);
		}

		setTimeout(function (view, ruleList, container) {
			view.empty().append(container);

			setTimeout(function (view) {
				UI.Rules.event.trigger('rulesFinishedBuilding', view);
			}, 0, view);
		}, 0.5 * ruleTimeoutIndex, view, ruleList, container);

		UI.Rules.noRules.toggleClass('jsb-hidden', ruleTimeoutIndex !== 1);
	},

	processRules: function (rules) {
		var input = $('<input>')

		input
			.attr({
				type: 'button',
				value: 'Remove'
			})
			.addClass('rule-item-remove');

		rules
			.addClass('rule-item-processed')
			.append(input);

		Poppy.setAllPositions();
	},

	events: {
		rules: function () {
			UI.container
				.on('click', '.rule-item-remove', function (event) {
					var self = $(this),
							view = self.parents('*[data-ruleListItems]'),
							ruleList = view.data('ruleList'),
							type = self.parents('.rule-group-type').attr('data-type'),
							kind = self.parents('.rule-group-kind').attr('data-kind'),
							domain = self.parents('.rule-group-domain').attr('data-domain'),
							rule = self.parents('.rule-item').attr('data-rule');

					ruleList.__remove(type, kind, domain, rule);

					if (view.is('.ui-view'))
						UI.Rules.buildRuleList(view, ruleList, true);
					else
						Poppy.closeAll();
				});
		},

		viewAlreadyActive: function (event) {
			if (event.detail.id._startsWith('#rule-views'))
				UI.Rules.events.viewDidSwitch(event);
		},


		viewDidSwitch: function (event) {
			if (!UI.Rules.views)
				return;

			$('.ui-view', UI.Rules.views).empty();

			var ruleList,
					useTheseRules,
					domainGrouped;

			var isMainSwitch = (event.detail.id === '#main-views-rule'),
					toView = isMainSwitch ? $('.active-view', UI.Rules.views) : event.detail.view,
					toID = isMainSwitch ? '#' + toView.attr('id') : event.detail.id;

			switch (toID) {
				case '#rule-views-page':
					var tab = Tabs.active();

					if (tab) {
						ruleList = {};

						useTheseRules = globalPage.Rules.forLocation({
							all: true,
							location: tab.url,
							searchKind: globalPage.Rules.fullKindList,
							excludeLists: globalPage.Special.__excludeLists
						});

						for (var listName in useTheseRules)
							ruleList[listName] = globalPage.Rules.list[listName];
					}
				break;

				case '#rule-views-temporary':
					ruleList = globalPage.Rules.list.temporary;
				break;

				case '#rule-views-active':
					ruleList = globalPage.Rules.list.active;
				break;

				case '#rule-views-easy':
					var easyList = $('li[data-view="#rule-views-easy"]', UI.Rules.viewSwitcher).attr('data-easyList');

					ruleList = globalPage.Rules.list[easyList];
				break;
			}

			if (ruleList)
				UI.Rules.buildRuleList(toView, ruleList, false, useTheseRules);
		},

		elementWasAdded: function (event) {
			if (event.detail.querySelectorAll) {
				var rules = $('.rule-group-type[data-editable="1"] .rule-group-kind li:not(.rule-item-processed)', event.detail);

				if (rules.length)
					UI.Rules.processRules(rules);
			}
		}
	}
};

UI.event.addCustomEventListener('viewAlreadyActive', UI.Rules.events.viewAlreadyActive);
UI.event.addCustomEventListener('viewDidSwitch', UI.Rules.events.viewDidSwitch);
UI.event.addCustomEventListener('elementWasAdded', UI.Rules.events.elementWasAdded);

document.addEventListener('DOMContentLoaded', UI.Rules.init, true);

Template.load('rules');
