"use strict";

var Snapshots = new Store('Snapshots', {
	save: true
});

function Snapshot (store, props) {
	if (!(store instanceof Store))
		throw new TypeError('store is not an instance of Store');

	if (!(props instanceof Object))
		props = {};

	this.max = (typeof props.max === 'number') ? props.max : 15;

	this.store = store;

	this.snapshots = Snapshots.getStore(this.store.name, {
		private: true
	});

	store.addListener('save', function () {
		Utilities.Timer.timeout('CheckForChanges' + this.snapshots.name, function (snapshot) {
			snapshot.checkForChanges();
		}, TIME.ONE_SECOND, [this]);
	}.bind(this));
};

Snapshot.prototype.cleanStore = function () {
	return Store.promote(this.store.toJSON());
};

Snapshot.prototype.latest = function (returnID) {
	var ids = this.snapshots.ids().sort().reverse();

	return returnID ? ids[0] : this.snapshots.get(ids[0]);
};

Snapshot.prototype.first = function (returnID) {
	var ids = this.snapshots.ids().sort();

	return returnID ? ids[0] : this.snapshots.get(ids[0]);
};

Snapshot.prototype.checkForChanges = function () {
	if (this.snapshots.isEmpty())
		return this.add();

	var cleanStore = this.cleanStore();

	if (cleanStore.isEmpty())
		return;

	var comparison = Store.compare(cleanStore, this.latest());

	if (!comparison.equal)		
		this.add();

	comparison.store.destroy(true);
};

Snapshot.prototype.add = function () {
	var id = Date.now();

	var cloned = this.store.clone([this.snapshots.name, id].join(), {
		lock: true
	}).toJSON();

	if (cloned.data._isEmpty())
		return;

	Log('New snapshot:', id)

	this.snapshots.set(id, cloned);

	if (this.snapshots.keys().length > this.max)
		this.snapshots.remove(this.first(true));
};