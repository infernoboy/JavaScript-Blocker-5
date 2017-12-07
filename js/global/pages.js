/*
JS Blocker 5 (http://jsblocker.toggleable.com) - Copyright 2017 Travis Lee Roman
*/

'use strict';

function Page (page, tab) {
	if (!Page.isPage(page))
		throw new TypeError('page state is not an instance of Object');

	page.state = Store.promote(page.state);

	var state,
		kinds,
		kind,
		sources,
		location,
		source,
		sourceName,
		items,
		itemID,
		attributes;

	for (state in page.state.data) {
		kinds = page.state.get(state);

		for (kind in kinds.data) {
			sources = kinds.get(kind).getStore('source');

			for (location in sources.data) {
				source = sources.get(location);

				for (sourceName in source.data) {
					items = source.get(sourceName);

					for (itemID in items.data) {
						attributes = items.get(itemID);

						items.set(itemID, new Resource({
							kind: kind,
							pageLocation: location,
							source: sourceName,
							isFrame: page.isFrame,
							action: attributes.action,
							unblockable: attributes.unblockable,
							meta: attributes.meta,
							private: tab.private
						}));
					}
				}
			}
		}
	}

	var storedPage = Page.pages.get(page.state.name);

	this.retries = storedPage ? storedPage.retries : 0;
	this.info = page;
	this.tab = tab;
	this.isTop = !page.isFrame;

	Page.pages.set(page.state.name, this);

	this.frames = Page.frames.getStore(page.state.name);
}

Object.defineProperty(Page, '__protocols', {
	value: Object.freeze(['http:', 'https:', 'ftp:', 'file:', 'safari-extension:', 'about:', 'data:', 'javascript:', 'blob:'])
});

Page.pages = new Store('Pages', {
	maxLife: TIME.ONE.SECOND * 5
});

Page.frames = new Store('Frames', {
	maxLife: TIME.ONE.SECOND * 5
});


Page.protocolSupported = function (protocol) {
	return Page.__protocols._contains(protocol);
};

Page.withActive = function (callback) {
	var activeTab = Tabs.active();

	var activePage = Page.pages.findLast(function (pageID, page) {
		return (page.isTop && page.tab === activeTab);
	});

	if (activePage && typeof callback === 'function')
		callback(activePage);
};

Page.isPage = function (page) {
	return (page && page.state instanceof Object);
};

Page.clearBadge = function (event) {
	ToolbarItems.badge(0, event.target);
};

Page.removePagesWithTab = function (event) {
	Page.pages.forEach(function (pageID, page, store) {
		if (page.tab === event.target) {
			store.remove(pageID);
			
			Page.frames.remove(pageID);
		}
	});
};

Page.removeMissingPages = function () {
	setTimeout(function () {
		var currentTabs = Tabs.array();

		Page.pages.only(function (pageID, page) {
			return currentTabs._contains(page.tab);
		});

		Page.frames.only(function (pageID) {
			return Page.pages.keyExist(pageID);
		});
	}, 50);
};

Page.requestPage = function (event) {
	if (window.globalSetting.disabled)
		return;

	if (event.type === 'activate' && Popover.visible() && UI.Page.view && UI.Page.view.is('.active-view'))
		UI.view.toTop(UI.view.views);

	if (event.target instanceof BrowserTab) {
		MessageTarget(event, 'sendPage');

		Page.awaitFromTab(event.target);
	}
};

Page.requestPageFromActive = function () {
	if (window.globalSetting.disabled)
		return;

	Tabs.messageActive('sendPage');

	Page.awaitFromTab(Tabs.active());
};

Page.awaitFromTab = function (awaitTab, done) {
	if (done) {
		UI.event.trigger('awaitPageFromTabDone', this);

		return Utilities.Timer.remove('timeout', awaitTab);
	}

	Utilities.Timer.timeout(awaitTab, function () {
		Tabs.all(function (tab) {
			if (tab === awaitTab) {
				ToolbarItems.badge(0, tab);

				UI.event.trigger('awaitPageFromTabTimeout', tab);
			}
		});
	}, 600);
};

Page.blockFirstVisit = function (host, withoutNotification, isPrivate) {
	var list = isPrivate ? Rules.list.temporaryFirstVisit : Rules.list.firstVisit;

	return list.addDomain('*', host, {
		rule: '*',
		action: withoutNotification ? ACTION.BLOCK_FIRST_VISIT_NO_NOTIFICATION : ACTION.BLOCK_FIRST_VISIT
	});
};

Page.unblockFirstVisit = function (host, isPrivate) {
	var list = isPrivate ? Rules.list.temporaryFirstVisit : Rules.list.firstVisit;

	list.addDomain('*', host, {
		rule: '*',
		action: ACTION.ALLOW_AFTER_FIRST_VISIT
	});
};

Page.blockFirstVisitStatus = function (host, isPrivate) {
	var blockFirstVisit = Settings.getItem('blockFirstVisit');

	if (blockFirstVisit === 'nowhere' || host === 'srcdoc')
		return {
			blocked: false,
			action: -1,
			host: host
		};

	var domain = Resource.mapDomain(host, RESOURCE.DOMAIN);

	if (blockFirstVisit === 'domain')
		host = domain;

	var list = isPrivate ? Rules.list.temporaryFirstVisit : Rules.list.firstVisit,
		rule = list.kind('*').domain(host).get('*'),
		rule2 = list.kind('*').domain(domain).get('*');

	if (!rule && !rule2)
		return {
			blocked: true,
			action: -ACTION.BLOCK_FIRST_VISIT,
			host: host,
			domain: domain
		};

	if (blockFirstVisit === 'host' && rule2)
		rule = rule2;

	return {
		blocked: (rule.action === ACTION.BLOCK_FIRST_VISIT || rule.action === ACTION.BLOCK_FIRST_VISIT_NO_NOTIFICATION),
		action: rule.action,
		host: host,
		domain: domain
	};
};

Page.lastPageForTab = function (tab) {
	return Page.pages.findLast(function (pageID, page) {
		return page.isTop && page.tab === tab;
	});
};

Page.prototype.clearFrames = function () {
	this.frames.clear();
};

Page.prototype.addFrame = function (frame) {
	if (!(frame instanceof Page))
		frame = new Page(frame);

	if (this.info.id === frame.info.id)
		throw new Error('a page cannot be its own frame');

	var mergeInto;

	var protoMerge = (frame.info.protocol === 'about:' || frame.info.protocol === 'data:');

	if (protoMerge || this.info.host === frame.info.host)
		mergeInto = this;
	else
		this.frames.forEach(function (frameID, framePage) {
			if (framePage.info.host === frame.info.host) {
				mergeInto = framePage;

				return Store.BREAK;
			}
		});

	if (mergeInto && ((!mergeInto.info.disabled && !frame.info.disabled) || (mergeInto.info.disabled && frame.info.disabled)) && !frame.info.frameBlocked) {
		frame.merged = true;

		var myState,
			myResources,
			myHosts;

		mergeInto.info.locations._pushMissing(frame.info.location);			

		frame.info.state.forEach(function (state, kinds) {
			myState = mergeInto.info.state.getStore(state);

			kinds.forEach(function (kind, resources) {
				if (!myState.keyExist(kind))
					myState.set(kind, resources);
				else {
					myResources = myState.getStore(kind);
					myHosts = myResources.getStore('hosts');

					myResources.getStore('source').merge(resources.getStore('source'), true);

					resources.getStore('hosts').forEach(function (host, count) {
						myHosts.increment(host, count);
					});
				}
			});
		});
	} else
		this.frames.set(frame.info.id, frame);
	
	return this;
};

Page.prototype.badgeState = function (state) {
	if (!this.isTop || window.globalSetting.disabled)
		return;

	Utilities.Timer.timeout('badgeToolbar', function (self) {
		var pageHost;

		var showResourceURLs = Settings.getItem('showResourceURLs'),
			tree = self.tree(),
			count = 0;

		for (var kind in tree.state[state])
			if (Rules.kindShouldBadge(kind))
				if (showResourceURLs) {
					for (pageHost in tree.state[state][kind].hosts)
						count += tree.state[state][kind].hosts[pageHost];
				} else
					count += Object.keys(tree.state[state][kind].hosts || []).length;

		for (var frame in tree.frames) 
			for (kind in tree.frames[frame].state[state])
				if (Rules.kindShouldBadge(kind))
					if (showResourceURLs) {
						for (pageHost in tree.frames[frame].state[state][kind].hosts)
							count += tree.frames[frame].state[state][kind].hosts[pageHost];
					} else
						count += Object.keys(tree.frames[frame].state[state][kind].hosts || []).length;

		ToolbarItems.badge(count, self.tab);

		UI.event.trigger('pageDidBadge');
	}, 50, [this]);
};

Page.prototype.tree = function () {
	if (!this.isTop)
		throw new Error('a tree can only be generated by a top page');

	var frame;

	var info = this.info._clone();

	info.state = info.state.all();

	info.frames = {};

	for (var frameID in this.frames.data) {
		frame = this.frames.get(frameID);

		if (!frame.merged) {
			info.frames[frameID] = frame.info._clone();

			info.frames[frameID].state = info.frames[frameID].state.all();
		}

	}

	return info;
};

Events.addApplicationListener('beforeNavigate', Page.clearBadge);
Events.addApplicationListener('beforeNavigate', Page.removePagesWithTab);
Events.addApplicationListener('close', Page.removeMissingPages);
Events.addApplicationListener('activate', Page.requestPage);
