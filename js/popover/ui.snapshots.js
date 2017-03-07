/*
JS Blocker 5 (http://jsblocker.toggleable.com) - Copyright 2017 Travis Lee Roman
*/

'use strict';

UI.Snapshots = {
	__compareQueue: new Utilities.Queue(50),

	event: new EventListener,
	current: globalPage.Rules.list.user.rules,
	snapshot: globalPage.Rules.list.user.rules.snapshot,

	init: function () {
		UI.Snapshots.view = $('#main-views-snapshot', UI.view.views);

		UI.Snapshots.view.append(Template.create('snapshots', 'snapshot-container'));

		UI.Snapshots.container = $('#snapshot-container', UI.Snapshots.view);

		UI.Snapshots.container
			.on('click', '#snapshot-create-snapshot', function () {
				globalPage.Rules.list.user.rules.snapshot.add(true);

				UI.view.switchTo('#main-views-snapshot');
			})

			.on('click', '.snapshot-item-name', function (event, forceClickEvent, forceClick) {
				if (forceClickEvent)
					event = forceClickEvent;

				var self = $(this),
					kept = self.parents('.snapshot-list').is('#snapshot-kept-list'),
					snapshotID = self.parents('li').attr('data-snapshotID'),
					snapshots = self.parents('.snapshot-list').data('snapshots'),
					poppy = new Poppy(event.pageX, event.pageY, true, 'snapshot-item');

				poppy.scaleWithForce(forceClick);

				poppy.snapshotID = snapshotID;
				poppy.snapshots = snapshots;
				poppy.oppositeSnapshots = kept ? UI.Snapshots.snapshot.unkept : UI.Snapshots.snapshot.kept;

				poppy.setContent(Template.create('poppy.snapshots', 'snapshot-item', {
					kept: kept
				}));

				poppy.show();
			})

			.on('click', '.snapshot-item-close', function () {
				globalPage.Rules.useCurrent();

				UI.Snapshots.buildSnapshots();
			})

			.on('click', '.snapshot-item-preview', function () {
				var self = $(this),
					snapshotID = self.parents('li').attr('data-snapshotID'),
					snapshots = self.parents('.snapshot-list').data('snapshots');

				UI.Snapshots.useSnapshot(snapshotID, snapshots);
			})

			.on('click', '.snapshot-item-delete', function () {
				var self = $(this),
					snapshotID = self.parents('li').attr('data-snapshotID'),
					snapshots = self.parents('.snapshot-list').data('snapshots');

				snapshots.remove(snapshotID);

				UI.Snapshots.buildSnapshots();
			});
	},

	useSnapshot: function (snapshotID, snapshots, comparison) {
		var snapshot = snapshots.get(snapshotID);

		if (snapshot) {
			globalPage.Rules.list.active = new globalPage.Rule(Store.promote(snapshot.snapshot));

			globalPage.Rules.list.active.snapshot = {
				id: snapshotID,
				snapshots: snapshots,
				name: UI.Snapshots.getName(snapshotID, snapshots),
				comparison: comparison
			};

			UI.Rules.buildViewSwitcher();

			UI.view.switchTo('#main-views-rule');
			UI.view.switchTo('#rule-views-active');
		}
	},

	getName: function (snapshotID, snapshots) {
		var snapshot = snapshots.get(snapshotID);

		if (snapshot)
			return snapshot.name || (new Date(parseInt(snapshotID, 10))).toLocaleString();
	},

	buildList: function (listContainer, list) {
		var name,
			snapshotItem;

		var snapshotIDs = list.keys().sort();

		for (var i = snapshotIDs.length; i--;) {
			name = UI.Snapshots.getName(snapshotIDs[i], list);

			snapshotItem = Template.create('snapshots', 'snapshot-list-item', {
				id: snapshotIDs[i],
				name: name,
				equal: false,
				active: (globalPage.Rules.list.active.snapshot && globalPage.Rules.list.active.snapshot.id === snapshotIDs[i])
			});

			listContainer.append(snapshotItem);

			UI.Snapshots.__compareQueue.push(function (name, list, snapshotID, snapshotItem) {
				var snapshot = list.get(snapshotID),
					snapshotStore = Store.promote(snapshot.snapshot),
					compare = Store.compare(UI.Snapshots.current, snapshotStore);

				snapshotStore.destroy();
				compare.store.destroy();

				$('.snapshot-item-name', snapshotItem).toggleClass('current', compare.equal);
			}.bind(null, name, list, snapshotIDs[i], snapshotItem));
		}
	},

	buildSnapshots: function () {
		var storageInfo = $('#snapshot-storage-info', UI.Snapshots.container),
			keptList = $('#snapshot-kept-list', UI.Snapshots.container).empty(),
			unkeptList = $('#snapshot-unkept-list', UI.Snapshots.container).empty(),
			snapshotInfo = globalPage.Snapshot.storageInfo(),
			kept = UI.Snapshots.snapshot.kept,
			unkept = UI.Snapshots.snapshot.unkept;

		storageInfo.text(_('snapshots.count_size'._pluralize(snapshotInfo.count), [snapshotInfo.count, Utilities.byteSize(snapshotInfo.size)]));

		keptList.data('snapshots', kept);
		unkeptList.data('snapshots', unkept);

		UI.Snapshots.__compareQueue.clear();

		UI.Snapshots.buildList(keptList, kept);
		UI.Snapshots.buildList(unkeptList, unkept);

		setTimeout(function () {
			UI.Snapshots.__compareQueue.start();
		}, 300);
	},

	events: {
		viewWillSwitch: function (event) {
			var id = event.detail.id || event.detail.to.id;

			if (id === '#main-views-snapshot')
				UI.Snapshots.buildSnapshots();
			else
				UI.Snapshots.__compareQueue.clear();
		}
	}
};

UI.event.addCustomEventListener(['viewWillSwitch', 'viewAlreadyActive'], UI.Snapshots.events.viewWillSwitch);

document.addEventListener('DOMContentLoaded', UI.Snapshots.init, true);
