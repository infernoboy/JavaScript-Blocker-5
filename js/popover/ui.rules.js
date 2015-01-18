"use strict";

UI.Rules = {
	__lists: ['page', 'temporary', 'active', 'easy'],

	event: new EventListener,

	init: function () {
		UI.Rules.view = $('#main-views-rule', UI.view.views);

		UI.Rules.view.append(Template.create('rules', 'rule-container'));

		UI.Rules.toolbar = $('#rule-toolbar', UI.Rules.view);
		UI.Rules.viewContainer = $('#rule-views-container', UI.Rules.view);
		UI.Rules.views = $('#rule-views', UI.Rules.viewContainer);
		UI.Rules.noRules = $('#rule-views-no-rules', UI.Rules.viewContainer);

		UI.Rules.buildViewSwitcher();

		for (var i = 0; i < UI.Rules.__lists.length; i++)
			UI.view.create('rule-views', UI.Rules.__lists[i], UI.Rules.views);

		UI.Rules.events.rules();

		UI.Rules.setEasyRulesList(null, true);

		UI.view.switchTo('#rule-views-temporary');
	},

	buildViewSwitcher: function () {
		var viewSwitcherData = {
			container: '#rule-views-container',
			views: {}
		};

		for (var i = 0; i < UI.Rules.__lists.length; i++)
			viewSwitcherData.views['#rule-views-' + UI.Rules.__lists[i]] = {
				value: _('rules.' + UI.Rules.__lists[i]),
				poppy: i > 0 ? (UI.Rules.__lists[i] + '-rules-menu') : null
			};

		$('.view-switcher-container', UI.Rules.toolbar).remove();

		UI.Rules.toolbar.append(Template.create('main', 'view-switcher', viewSwitcherData));

		UI.Rules.viewSwitcher = $('.view-switcher', UI.Rules.view);
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
			}
		}

		for (type in groupedRules)
			groupedRules[type] = groupedRules[type]._sort(globalPage.Rules.__prioritize);

		return groupedRules;
	},

	buildRuleList: function (view, ruleList, useTheseRules, keepExpanded) {
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

				if (!event.detail.hasRules)
					event.detail.view.parents('.multi-list-item').hide();
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

				UI.Rules.buildRuleList(ruleListItemLI, ruleList[listName], useTheseRules ? useTheseRules[listName] : null, keepExpanded);

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
				editable = (ruleList === globalPage.Rules.list.temporary || ruleList === globalPage.Rules.list.user),
				ruleTimeoutIndex = 1,
				domainTimeoutIndex = 1,
				typeTimeoutIndex = 1;

		view
			.attr('data-ruleListItems', '1')
			.data('ruleList', ruleList)
			.empty()
			.append(container);

		var types = ['page', 'domain', 'notPage', 'notDomain'];

		for (var i = 0; i < types.length; i++) {
			type = types[i];

			if (!(type in domainGrouped))
				continue;

			typeExpander = 'ruleGroupType-' + type;

			ruleGroupType = Template.create('rules', 'rule-group-type', {
				type: type,
				editable: editable,
				expander: keepExpanded ? 0 : typeExpander
			}, true);
			
			typeUL = ruleGroupType.find('.rule-group-type');

			ruleGroupType.appendTo(container);

			for (domain in domainGrouped[type]) {
				domainExpander = typeExpander + '-ruleGroupDomain-' + domain;

				domainListItem = Template.create('rules', 'domain-list-item', {
					expander: keepExpanded ? 0 : domainExpander,
					domain: domain,
					editable: editable
				});

				domainUL = $('.rule-group-domain', domainListItem);

				typeUL.append(domainListItem);

				for (kind in domainGrouped[type][domain]) {
					kindExpander = domainExpander + '-ruleGroupKind-' + kind;

					kindListItem = Template.create('rules', 'kind-list-item', {
						expander: keepExpanded ? 0 : kindExpander,
						kind: kind,
						editable: editable
					});

					kindUL = $('.rule-group-kind', kindListItem);

					domainUL.append(kindListItem);

					for (rule in domainGrouped[type][domain][kind]) {
						ruleListItem = Template.create('rules', 'rule-list-item', {
							type: type,
							kind: kind,
							rule: rule,
							ruleInfo: domainGrouped[type][domain][kind][rule],
							editable: editable
						});

						setTimeout(function (kindUL, ruleListItem) {
							kindUL.append(ruleListItem);
						}, 0.5 * ruleTimeoutIndex++, kindUL, ruleListItem);
					}
				}
			}

			setTimeout(function (ruleGroupType) {
				if (ruleGroupType.find('.rule-group-type').is(':empty'))
					ruleGroupType.remove();
			}, 0.5 * ruleTimeoutIndex, ruleGroupType);
		}

		setTimeout(function (view, ruleList, container) {
			UI.Rules.event.trigger('rulesFinishedBuilding', {
				view: view,
				hasRules: ruleTimeoutIndex !== 1
			});
		}, 0.55 * ruleTimeoutIndex, view, ruleList, container);

		UI.Rules.noRules.toggleClass('jsb-hidden', ruleTimeoutIndex !== 1);
	},

	processRules: function (rules) {
		var input = $('<input>')

		input
			.attr({
				type: 'button',
				value: 'Delete'
			})
			.addClass('rule-item-delete blend-in double-click');

		rules
			.addClass('rule-item-processed')
			.find('.rule-item-delete-container')
			.append(input);

		Poppy.setAllPositions();
	},

	events: {
		rules: function () {
			UI.container
				.on('click', '.rule-item-delete', function (event) {
					var self = $(this),
							view = self.parents('*[data-ruleListItems]'),
							ruleList = view.data('ruleList'),
							type = self.parents('.rule-group-type').attr('data-type'),
							kind = self.parents('.rule-group-kind').attr('data-kind'),
							domain = self.parents('.rule-group-domain').attr('data-domain'),
							rule = self.parents('.rule-item-container').attr('data-rule');

					ruleList.__remove(type, kind, domain, rule);

					if (view.is('.ui-view'))
						UI.Rules.buildRuleList(view, ruleList);
					else
						Poppy.closeAll();
				});
		},

		viewAlreadyActive: function (event) {
			if (event.detail.id._startsWith('#rule-views'))
				UI.Rules.events.viewDidSwitch(event);
		},

		viewWillSwitch: function (event) {
			if (event.detail.to.id === '#main-views-rule' && $('.active-view', UI.Rules.views).is('#rule-views-easy'))
				UI.view.switchTo('#rule-views-temporary');
		},


		viewDidSwitch: function (event) {
			if (!UI.Rules.views)
				return;

			$('.ui-view', UI.Rules.views).empty();

			var ruleList,
					useTheseRules;

			var isMainSwitch = (event.detail.id === '#main-views-rule'),
					toView = isMainSwitch ? $('.active-view', UI.Rules.views) : event.detail.view,
					toID = isMainSwitch ? '#' + toView.attr('id') : event.detail.id;

			switch (toID) {
				case '#rule-views-page':
					toView.empty();

					var pageRulesContainer = $('<ul>').addClass('page-rules-container').appendTo(toView);

					UI.event.addCustomEventListener('receivedPage', function (pageEvent) {
						if (pageEvent.detail.page.info.protocol === 'data:' || pageEvent.detail.page.info.protocol === 'about:')
							return;

						pageEvent.unbind();

						var multiListPageItem = Template.create('rules', 'multi-list-page-item', {
							isFrame: pageEvent.detail.page.info.isFrame,
							location: pageEvent.detail.page.info.location
						});
						
						var ruleContainer = $('.multi-list-page-item-rules', multiListPageItem);

						ruleList = {};

						useTheseRules = globalPage.Rules.forLocation({
							all: true,
							location: pageEvent.detail.page.info.location,
							searchKind: globalPage.Rules.fullKindList,
							excludeLists: globalPage.Special.__excludeLists
						});

						for (var listName in useTheseRules)
							ruleList[listName] = globalPage.Rules.list[listName];

						UI.Rules.buildRuleList(ruleContainer, ruleList, useTheseRules);

						multiListPageItem.appendTo(pageRulesContainer);
					});

					globalPage.Page.requestPageFromActive();
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

					if (!ruleList)
						UI.Rules.noRules.show();
				break;
			}

			if (ruleList)
				UI.Rules.buildRuleList(toView, ruleList, useTheseRules);
		},

		elementWasAdded: function (event) {
			var rules = $('.rule-item-container[data-editable="1"]:not(.rule-item-processed)', UI.container);

			if (rules.length)
				UI.Rules.processRules(rules);
		}
	}
};

UI.event.addCustomEventListener('viewAlreadyActive', UI.Rules.events.viewAlreadyActive);
UI.event.addCustomEventListener('viewWillSwitch', UI.Rules.events.viewWillSwitch);
UI.event.addCustomEventListener('viewDidSwitch', UI.Rules.events.viewDidSwitch);
UI.event.addCustomEventListener('elementWasAdded', UI.Rules.events.elementWasAdded);

document.addEventListener('DOMContentLoaded', UI.Rules.init, true);

Template.load('rules');
