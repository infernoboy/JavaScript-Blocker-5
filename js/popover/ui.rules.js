"use strict";

UI.Rules = {
	__domainFilter: '',
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
			id: 'rule-views-switcher',
			container: '#rule-views-container',
			views: {}
		};

		for (var i = 0; i < UI.Rules.__lists.length; i++)
			viewSwitcherData.views['#rule-views-' + UI.Rules.__lists[i]] = {
				value: _('rules.' + UI.Rules.__lists[i]),
				poppy: i > 0 ? (UI.Rules.__lists[i] + '-rules-menu') : null
			};

		$('#rule-views-switcher', UI.Rules.toolbar).remove();

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
		if (view.is('.ui-view')) {
			var buildQueue = UI.Rules.views.data('buildQueue') || new Utilities.Queue(0.05);

			buildQueue.clear();

			UI.Rules.views.data('buildQueue', buildQueue);
		} else
			var buildQueue = new Utilities.Queue(0.05);

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
					listName: listName,
					editable: ((listName === 'active' && !globalPage.Rules.snapshotInUse()) || listName === 'temporary')
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
				hasRules = false;

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
			});
			
			typeUL = ruleGroupType.find('.rule-group-type');

			ruleGroupType.appendTo(container);

			for (domain in domainGrouped[type]) {
				if (UI.Rules.__domainFilter.length && !domain._contains(UI.Rules.__domainFilter))
					continue;

				domainExpander = typeExpander + '-ruleGroupDomain-' + domain;

				domainListItem = Template.create('rules', 'domain-list-item', {
					expander: keepExpanded ? 0 : domainExpander,
					domain: domain,
					editable: editable
				});

				domainUL = $('.rule-group-domain', domainListItem);

				buildQueue.push(function (typeUL, domainListItem) {
					typeUL.append(domainListItem);
				}, [typeUL, domainListItem]);

				for (kind in domainGrouped[type][domain]) {
					kindExpander = domainExpander + '-ruleGroupKind-' + kind;

					kindListItem = Template.create('rules', 'kind-list-item', {
						expander: keepExpanded ? 0 : kindExpander,
						kind: kind,
						editable: editable
					});

					kindUL = $('.rule-group-kind', kindListItem);

					buildQueue.push(function (domainUL, kindListItem) {
						domainUL.append(kindListItem);
					}, [domainUL, kindListItem]);

					var ruleKeyChunks = Object.keys(domainGrouped[type][domain][kind])._chunk(100);

					for (var j = 0, b = ruleKeyChunks.length; j < b; j++) {
						var ruleListItems = [];

						for (var k = 0; k < ruleKeyChunks[j].length; k++) {
							ruleListItems.push(Template.create('rules', 'rule-list-item', {
								type: type,
								kind: kind,
								rule: ruleKeyChunks[j][k],
								ruleInfo: domainGrouped[type][domain][kind][ruleKeyChunks[j][k]],
								editable: editable
							}));
						}

						buildQueue.push(function (kindUL, ruleListItems) {
							hasRules = true;
							kindUL.append(ruleListItems);
						}, [kindUL, ruleListItems]);
					}
				}
			}

			buildQueue.push(function (ruleGroupType) {
				if (ruleGroupType.find('.rule-group-type').is(':empty'))
					ruleGroupType.remove();
			}, [ruleGroupType]);
		}

		buildQueue.push(function (view, container) {			
			UI.Rules.event.trigger('rulesFinishedBuilding', {
				view: view,
				hasRules: hasRules
			});
		}, [view, container]);

		UI.Rules.noRules.toggleClass('jsb-hidden', buildQueue.queue.length > 4);

		buildQueue.start();
	},

	processRules: function (rules) {
		var input = $('<input>')

		input
			.attr({
				type: 'button',
				value: 'Delete'
			})
			.addClass('rule-item-delete blend-in double-click jsb-color-blocked');

		rules
			.addClass('rule-item-processed')
			.find('.rule-item-delete-container')
			.append(input);

		Poppy.setAllPositions();
	},

	events: {
		rules: function () {
			UI.container
				.on('search', '#rule-domain-search', function () {
					UI.Rules.__domainFilter = this.value;

					if ($('.active-view', UI.views).is('#main-views-rule'))
						UI.view.switchTo(UI.Rules.viewContainer.attr('data-activeView'));
				})

				.on('click', '.rule-item-delete', function (event) {
					var self = $(this),
							view = self.parents('*[data-ruleListItems]'),
							ruleList = view.data('ruleList'),
							typeWrapper = self.parents('.rule-group-type-wrapper'),
							type = typeWrapper.attr('data-type'),
							kindWrapper = self.parents('.rule-group-kind-wrapper'),
							kind = kindWrapper.attr('data-kind'),
							domainWrapper = self.parents('.rule-group-domain-wrapper'),
							domain = domainWrapper.attr('data-domain'),
							ruleContainer = self.parents('.rule-item-container'),
							rule = ruleContainer.attr('data-rule');

					ruleList.__remove(false, type, kind, domain, rule);

					Poppy.closeAll();

					ruleContainer.hide(225 * window.globalSetting.speedMultiplier, function () {
						ruleContainer.remove();

						if ($('ul', kindWrapper).is(':empty'))
							kindWrapper.parent().hide(225 * window.globalSetting.speedMultiplier, function () {
								$(this).remove();

								if ($('ul', domainWrapper).is(':empty'))
									domainWrapper.parent().hide(225 * window.globalSetting.speedMultiplier, function () {
										$(this).remove();

										if ($('ul', typeWrapper).is(':empty'))
											typeWrapper.hide(225 * window.globalSetting.speedMultiplier, function () {
												$(this).remove();
											});
									});
							});
					});
				})

				.on('click', '.multi-list-item-wrapper[data-editable="1"] .multi-list-item-header', function (event) {
					if (event.originalEvent.offsetX > this.offsetWidth)
						return;

					var ruleList = globalPage.Rules.list[this.parentNode.parentNode.getAttribute('data-listName')],
							originPoppy = Poppy.poppies[Object.keys(Poppy.poppies)[0]];

					var poppy = new Poppy(event.originalEvent.pageX, event.originalEvent.pageY, false, 'create-rule');

					if (originPoppy)
						poppy.linkTo(originPoppy);

					poppy.setContent(Template.create('poppy', 'create-rule', {
						editing: false,
						list: ruleList === globalPage.Rules.list.user ? 'user' : 'temporary',
						type: 'domain',
						domain: '',
						kind: '',
						rule: '',
						action: 0
					}));

					poppy.show();
				})

				.on('click', '.rule-group-type-wrapper[data-editable="1"] .rule-group-type-header', function (event) {
					if (event.originalEvent.offsetX > this.offsetWidth)
						return;

					var self = $(this),
							originPoppy = Poppy.poppies[Object.keys(Poppy.poppies)[0]],
							view = self.parents('*[data-ruleListItems]'),
							ruleList = view.data('ruleList'),
							type = this.parentNode.parentNode.getAttribute('data-type');

					var poppy = new Poppy(event.originalEvent.pageX, event.originalEvent.pageY, false, 'create-rule');

					if (originPoppy)
						poppy.linkTo(originPoppy);

					poppy.setContent(Template.create('poppy', 'create-rule', {
						editing: false,
						list: ruleList === globalPage.Rules.list.user ? 'user' : 'temporary',
						type: type,
						domain: '',
						kind: '',
						rule: '',
						action: 0
					}));

					poppy.show();
				})

				.on('click', '.rule-group-domain-wrapper[data-editable="1"] .rule-group-domain-header', function (event) {
					if (event.originalEvent.offsetX > this.offsetWidth)
						return;

					var self = $(this),
							originPoppy = Poppy.poppies[Object.keys(Poppy.poppies)[0]],
							view = self.parents('*[data-ruleListItems]'),
							ruleList = view.data('ruleList'),
							type = self.parents('.rule-group-type-wrapper').attr('data-type'),
							domain = this.parentNode.parentNode.getAttribute('data-domain');

					var poppy = new Poppy(event.originalEvent.pageX, event.originalEvent.pageY, false, 'create-rule');

					if (originPoppy)
						poppy.linkTo(originPoppy);

					poppy.setContent(Template.create('poppy', 'create-rule', {
						editing: false,
						list: ruleList === globalPage.Rules.list.user ? 'user' : 'temporary',
						type: type,
						domain: domain,
						kind: '',
						rule: '',
						action: 0
					}));

					poppy.show();
				})

				.on('click', '.rule-group-kind-wrapper[data-editable="1"] .rule-group-kind-header', function (event) {
					if (event.originalEvent.offsetX > this.offsetWidth)
						return;

					var self = $(this),
							originPoppy = Poppy.poppies[Object.keys(Poppy.poppies)[0]],
							view = self.parents('*[data-ruleListItems]'),
							ruleList = view.data('ruleList'),
							type = self.parents('.rule-group-type-wrapper').attr('data-type'),
							domain = self.parents('.rule-group-domain-wrapper').attr('data-domain'),
							kind = this.parentNode.parentNode.getAttribute('data-kind');

					var poppy = new Poppy(event.originalEvent.pageX, event.originalEvent.pageY, false, 'create-rule');

					if (originPoppy)
						poppy.linkTo(originPoppy);

					poppy.setContent(Template.create('poppy', 'create-rule', {
						editing: false,
						list: ruleList === globalPage.Rules.list.user ? 'user' : 'temporary',
						type: type,
						domain: domain,
						kind: kind,
						rule: '',
						action: 0
					}));

					poppy.show();
				})

				.on('click', '.rule-item-container[data-editable="1"] .rule-item-rule', function (event) {
					var self = $(this),
							originPoppy = Poppy.poppies[Object.keys(Poppy.poppies)[0]],
							view = self.parents('*[data-ruleListItems]'),
							ruleList = view.data('ruleList'),
							type = self.parents('.rule-group-type-wrapper').attr('data-type'),
							kind = self.parents('.rule-group-kind-wrapper').attr('data-kind'),
							domain = self.parents('.rule-group-domain-wrapper').attr('data-domain'),
							rule = self.parents('.rule-item-container').attr('data-rule'),
							action = parseInt(self.prev().attr('data-action'), 10);

					var poppy = new Poppy(event.originalEvent.pageX, event.originalEvent.pageY, false, 'create-rule');

					var templateArgs = {
						editing: true,
						list: ruleList === globalPage.Rules.list.user ? 'user' : 'temporary',
						type: type,
						domain: domain,
						kind: kind,
						rule: rule,
						action: action
					};

					poppy.templateArgs = templateArgs;

					if (originPoppy)
						poppy.linkTo(originPoppy);

					poppy
						.setContent(Template.create('poppy', 'create-rule', templateArgs))
						.show();
				});
		},

		poppyDidShow: function (event) {
			UI.Rules.viewContainer.unbind('scroll', Poppy.closeAll).one('scroll', Poppy.closeAll);
		},

		viewAlreadyActive: function (event) {
			if (event.detail.id._startsWith('#rule-views'))
				UI.Rules.events.viewDidSwitch(event);
		},

		viewWillSwitch: function (event) {
			if (event.detail.to.id._startsWith('#main-views'))
				$('#rule-domain-search', UI.Rules.view).val('').trigger('search');

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

UI.event.addCustomEventListener('poppyDidShow', UI.Rules.events.poppyDidShow);
UI.event.addCustomEventListener('viewAlreadyActive', UI.Rules.events.viewAlreadyActive);
UI.event.addCustomEventListener('viewWillSwitch', UI.Rules.events.viewWillSwitch);
UI.event.addCustomEventListener('viewDidSwitch', UI.Rules.events.viewDidSwitch);
UI.event.addCustomEventListener('elementWasAdded', UI.Rules.events.elementWasAdded);

document.addEventListener('DOMContentLoaded', UI.Rules.init, true);

Template.load('rules');
