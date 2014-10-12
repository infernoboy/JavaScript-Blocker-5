"use strict";

function Page (page, tab) {
	if (!Page.isPage(page))
		throw new TypeError('page state is not an instance of Object');

	page.state.props = {
		destroyChildren: true
	};

	page.state = Store.promote(page.state);

	page.state.forEach(function (state, kinds, store) {
		kinds.forEach(function (kind, resources, store) {
			resources.getStore('source').map(function (location, source) {
				return source.map(function (sourceName, items) {
					return items.map(function (itemID, attributes) {
						return new Resource({
							kind: kind,
							pageLocation: location,
							source: sourceName,
							isFrame: attributes.isFrame,
							action: attributes.action,
							unblockable: attributes.unblockable,
							meta: attributes.meta
						});
					}, true);
				}, true);
			}, true);
		});
	});

	var storedPage = Page.pages.get(page.state.name);

	this.retries = storedPage ? storedPage.retries : 0;
	this.info = page;
	this.tab = tab;
	this.isTop = !page.isFrame;

	Page.pages.set(page.state.name, this);

	this.frames = Page.frames.getStore(page.state.name);
};

Object.defineProperty(Page, '__protocols', {
	value: Object.freeze(['http:', 'https:', 'ftp:', 'file:', 'safari-extension:', 'about:', 'data:', 'javascript:', 'blob:'])
});

Page.pages = new Store('Pages', {
	maxLife: TIME.ONE.SECOND * 5
});

Page.frames = new Store('Frames', {
	maxLife: TIME.ONE.SECOND * 5
});

Page.FIRST_VISIT = {
	NO_RULE: 1,
	BLOCKED: 2
};

Page.protocolSupported = function (protocol) {
	return Page.__protocols._contains(protocol);
};

Page.withActive = function (callback) {
	var activeTab = Tabs.active();

	var activePage = Page.pages.findLast(function (pageID, page, store) {
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

Page.removeMissingPages = function (event) {
	setTimeout(function () {
		var currentTabs = Tabs.array();

		Page.pages.only(function (pageID, page, store) {
			return currentTabs._contains(page.tab);
		});

		Page.frames.only(function (pageID, page, store) {
			return Page.pages.keyExist(pageID);
		});
	}, 50);
};

Page.requestPage = function (event) {
	if (window.globalSetting.disabled)
		return;

	if (event.type === 'activate' && Popover.visible())
		UI.view.toTop(UI.view.views);

	if (event.target instanceof SafariBrowserTab) {
		MessageTarget(event, 'sendPage');

		Page.awaitFromTab(event.target);
	}
};

Page.requestPageFromActive = function (event) {
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

	UI.event.trigger('awaitPageFromTab', this);

	Utilities.Timer.timeout(awaitTab, function () {
		Tabs.all(function (tab) {
			if (tab === awaitTab) {
				ToolbarItems.badge(0, tab);

				UI.event.trigger('awaitPageFromTabTimeout', tab);
			}
		});
	}, 600);
};

Page.blockFirstVisit = function (host, withoutNotification) {
	return Rules.list.firstVisit.addDomain('*', host, {
		rule: '*',
		action: withoutNotification ? ACTION.BLOCK_FIRST_VISIT_NO_NOTIFICATION : ACTION.BLOCK_FIRST_VISIT
	});
};

Page.unblockFirstVisit = function (host) {
	Rules.list.firstVisit.addDomain('*', host, {
		rule: '*',
		action: ACTION.ALLOW_AFTER_FIRST_VISIT
	});
};

Page.shouldBlockFirstVisit = function (host) {
	var blockFirstVisit = Settings.getItem('blockFirstVisit');

	if (blockFirstVisit === 'nowhere')
		return false;

	if (blockFirstVisit === 'domain')
		host = Resource.mapDomain(host, RESOURCE.DOMAIN);

	var rule = Rules.list.firstVisit.kind('*').domain(host).get('*');

	if (!rule)
		return {
			action: Page.FIRST_VISIT.NO_RULE,
			host: host
		};

	if (rule.action === ACTION.BLOCK_FIRST_VISIT)
		return {
			action: Page.FIRST_VISIT.BLOCKED,
			host: host
		};

	return false;
};

Page.lastPageForTab = function (tab) {
	return Page.pages.findLast(function (pageID, page) {
		return page.isTop && page.tab === tab;
	});
};

Page.prototype.addFrame = function (frame) {
	if (!(frame instanceof Page))
		frame = new Page(frame);

	if (this.info.id === frame.info.id)
		throw new Error('a page cannot be its own frame');

	var mergeInto;

	if (frame.info.protocol === 'about:' || frame.info.protocol === 'data:' || this.info.host === frame.info.host)
		mergeInto = this;
	else {
		this.frames.forEach(function (frameID, framePage, frameStore) {
			if (framePage.info.host === frame.info.host) {
				mergeInto = framePage;

				return Store.BREAK;
			}
		});
	}

	if (mergeInto) {
		frame.merged = true;

		var myState,
				myResources,
				myHosts;

		mergeInto.info.locations._pushMissing(frame.info.location);			

		frame.info.state.forEach(function (state, kinds, stateStore) {
			myState = mergeInto.info.state.getStore(state);

			kinds.forEach(function (kind, resources, kindStore) {
				if (!myState.keyExist(kind))
					myState.set(kind, resources);
				else {
					myResources = myState.getStore(kind);
					myHosts = myResources.getStore('hosts');

					myResources.getStore('source').merge(resources.getStore('source'), true);

					resources.getStore('hosts').forEach(function (host, count, hostStore) {
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
		var tree = self.tree(),
				count = 0;

		for (var kind in tree.state[state])
			if (Rules.kindShouldBadge(kind))
				count += Object.keys(tree.state[state][kind].hosts || []).length

		for (var frame in tree.frames) 
			for (kind in tree.frames[frame].state[state])
				if (Rules.kindShouldBadge(kind))
					count += Object.keys(tree.frames[frame].state[state][kind].hosts || []).length

		ToolbarItems.badge(count, self.tab);
	}, 50, [this]);
};

Page.prototype.tree = function () {
	if (!this.isTop)
		throw new Error('a tree can only be generated by a top page');

	var info = this.info._clone();

	info.state = info.state.all();

	info.frames = {};

	this.frames.forEach(function (frameID, frame, store) {
		if (!frame.merged) {
			info.frames[frameID] = frame.info._clone();

			info.frames[frameID].state = info.frames[frameID].state.all();
		}
	});

	return info;
};

Events.addApplicationListener('beforeNavigate', Page.clearBadge);
Events.addApplicationListener('beforeNavigate', Page.removePagesWithTab);
Events.addApplicationListener('close', Page.removeMissingPages);
Events.addApplicationListener('activate', Page.requestPage);
