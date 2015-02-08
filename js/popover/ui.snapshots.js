"use strict";

UI.Snapshots = {
	__queue: new Utilities.Queue(false),

	event: new EventListener,
	current: globalPage.Rules.list.user.rules,
	snapshot: globalPage.Rules.list.user.rules.snapshot,

	init: function () {
		UI.Snapshots.view = $('#main-views-snapshot', UI.view.views);

		UI.Snapshots.view.append(Template.create('snapshots', 'snapshot-container'));

		UI.Snapshots.container = $('#snapshot-container', UI.Snapshots.view);

		UI.Snapshots.container
			.on('click', '.snapshot-item-name', function (event) {
				var self = $(this),
						kept = self.parents('.snapshot-list').is('#snapshot-kept-list'),
						snapshotID = self.parents('li').attr('data-snapshotID'),
						snapshots = self.parents('.snapshot-list').data('snapshots'),
						poppy = new Poppy(event.originalEvent.pageX, event.originalEvent.pageY, true, 'snapshot-item');

				poppy.snapshotID = snapshotID;
				poppy.snapshots = snapshots;
				poppy.oppositeSnapshots = kept ? UI.Snapshots.snapshot.unkept : UI.Snapshots.snapshot.kept;

				poppy.setContent(Template.create('poppy', 'snapshot-item', {
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
			})
	},

	useSnapshot: function (snapshotID, snapshots) {
		var snapshot = snapshots.get(snapshotID);

		if (snapshot) {
			globalPage.Rules.list.active = new globalPage.Rule(Store.promote(snapshot.snapshot));

			globalPage.Rules.list.active.snapshot = {
				id: snapshotID,
				snapshots: snapshots
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
		list.findLast(function (date, snapshot) {
			UI.Snapshots.__queue.push(function (listContainer, date, list, snapshot) {
				var name = UI.Snapshots.getName(date, list);

				snapshot.snapshot.name = 'Snapshot-' + date;

				var snapshotStore = Store.promote(snapshot.snapshot),
						compare = Store.compare(UI.Snapshots.current, snapshotStore);

				snapshotStore.destroy();
				compare.store.destroy();

				listContainer.append(Template.create('snapshots', 'snapshot-list-item', {
					id: date,
					name: name,
					equal: compare.equal,
					active: (globalPage.Rules.list.active.snapshot && globalPage.Rules.list.active.snapshot.id === date)
				}));
			}, [listContainer, date, list, snapshot]);
		});
	},

	buildSnapshots: function () {
		UI.Snapshots.__queue.clear();

		var keptList = $('#snapshot-kept-list', UI.Snapshots.container).empty(),
				unkeptList = $('#snapshot-unkept-list', UI.Snapshots.container).empty(),
				kept = UI.Snapshots.snapshot.kept,
				unkept = UI.Snapshots.snapshot.unkept;

		keptList.data('snapshots', kept);
		unkeptList.data('snapshots', unkept);

		setTimeout(function (keptList, kept, unkeptList, unkept) {
			UI.Snapshots.buildList(keptList, kept);
			UI.Snapshots.buildList(unkeptList, unkept);

			UI.Snapshots.__queue.push(function () {
				Store.compareCache.destroy(true);
			});

			UI.Snapshots.__queue.start();
		}, 225, keptList, kept, unkeptList, unkept);
	},


	events: {
		viewWillSwitch: function (event) {
			var id = event.detail.id || event.detail.to.id;

			if (id === '#main-views-snapshot')
				UI.Snapshots.buildSnapshots();
			else
				UI.Snapshots.__queue.stop();
		},

		viewDidSwitch: function (event) {

		},

		elementWasAdded: function (event) {

		}
	}
};

UI.event.addCustomEventListener(['viewWillSwitch', 'viewAlreadyActive'], UI.Snapshots.events.viewWillSwitch);
UI.event.addCustomEventListener('viewDidSwitch', UI.Snapshots.events.viewDidSwitch);
UI.event.addCustomEventListener('elementWasAdded', UI.Snapshots.events.elementWasAdded);

document.addEventListener('DOMContentLoaded', UI.Snapshots.init, true);

Template.load('snapshots');
