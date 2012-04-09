/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

define([ "assert" ], function (ASSERT) {
	"use strict";

	// ----------------- Notifier -----------------

	var Notifier = function (table, onnotify, onmodified) {
		ASSERT(table && onnotify);

		this.lists = table.createColumn();
		this.onnotify = onnotify;
		this.onmodified = onmodified || function () {
		};
	};

	Notifier.prototype.notify = function (row) {
		ASSERT(this.lists);

		var list = this.lists.get(row);
		if( list ) {
			for( var i = 0; i !== list.length; ++i ) {
				this.onnotify(row, list[i]);
			}
		}
	};

	Notifier.prototype.watched = function (row) {
		ASSERT(this.lists);

		var list = this.lists.get(row);
		ASSERT(list === undefined || list.length >= 1);

		return !!list;
	};

	Notifier.prototype.add = function (row, data) {
		ASSERT(this.lists);

		var list = this.lists.get(row);
		if( list ) {
			ASSERT(list.length >= 1);

			list.push(data);
		}
		else {
			this.lists.set(row, [ data ]);
			this.onmodified(row, false, true);
		}
	};

	Notifier.prototype.remove = function (row, data) {
		ASSERT(this.lists);

		var list = this.lists.get(row);
		ASSERT(list && list.length >= 1);

		if( list.length >= 2 ) {
			var index = list.indexOf(data);
			ASSERT(index >= 0);

			list.splice(index, 1);
		}
		else {
			ASSERT(list[0] === data);

			this.lists.del(row);
			this.onmodified(row, true, false);
		}
	};

	// ----------------- WatchedColumn -----------------

	var WatchedColumn = function () {
		this.watchers = [];
	};

	WatchedColumn.prototype.addWatcher = function (callback) {
		ASSERT(callback);
		ASSERT(this.watchers.indexOf(callback) === -1);

		this.watchers.push(callback);
	};

	WatchedColumn.prototype.removeWatcher = function (callback) {
		ASSERT(callback);

		var index = this.watchers.indexOf(callback);
		ASSERT(index >= 0);

		this.watchers.splice(index, 1);
	};

	WatchedColumn.prototype.notifyWatchers = function (row) {
		for( var i = 0; i < this.watchers; ++i ) {
			this.watchers[i](row);
		}
	};

	// ----------------- CalculatedColumn -----------------

	var columnValue = function() {
		return {
			get: function(row) {
			},
			
			set: function(row) {
			},
			
			destroy: function() {
			}
		};
	};
	
	var accumulator = function(value) {
		var dirty = column(value.table);
		
	};
	
	var binaryMap = function(combiner, arg1, arg2) {
		ASSERT()

		var get1 = arg1.get;
		var get2 = arg2.get;
		
		return {
			get: function(row) {
				return combiner(get1(row), get2(row));
			},

			addWatcher: function(watcher) {
				arg1.addWatcher(watcher);
				arg2.addWatcher(watcher);
			},
			
			removeWatcher: function(watcher) {
				arg1.removeWatcher(watcher);
				arg2.removeWatcher(watcher);
			},
			
			destroy: function() {
			},
			
			table: arg1.table
		};
	};
	
	// ----------------- Territory -----------------

	var Territory = function (table) {
		this.counters = table.createColumn();
	};

	Territory.prototype.addWatcher = WatchedColumn.prototype.addWatcher;
	Territory.prototype.removeWatcher = WatchedColumn.prototype.removeWatcher;
	Territory.prototype.notifyWatchers = WatchedColumn.prototype.notifyWatchers;

	Territory.prototype.get = function (row) {
		var counter = this.counters.get(row);
		ASSERT(counter === undefined || counter >= 1);

		return counter;
	};

	Territory.prototype.load = function (row) {
		var counter = this.counters.get(row);
		ASSERT(counter === undefined || counter >= 1);

		if( counter ) {
			this.counters.set(row, 1);
			this.notifyWatchers(row);
		}
		else {
			this.counters.set(row, counter + 1);
		}
	};

	Territory.prototype.unload = function (row) {
		var counter = this.counters.get(row);
		ASSERT(counter !== undefined && counter >= 1);

		if( counter === 1 ) {
			this.counters.del(row);
			this.notifyWatchers(row, true, false);
		}
		else {
			this.counters.set(row);
		}
	};

	// ----------------- Server -----------------

	var combine = function(serverData, clientTerritory) {
		return territory && data;
	};
	
	var Client = function(server) {
		this.territory = new Territory(server.table);
		this.territory.addWatcher(function(row, prev, curr) {
			ASSERT((prev === false) === curr);
			if( curr ) {
				server.territory.load(row);
			}
			else {
				server.territory.unload(row);
			}
		});
	};

	Client.prototype.destroy = function() {
	};
	
	var Server = function(table) {
		this.clients = [];
		this.territory = new Territory(table);
	};
	
	// ----------------- interface -----------------

	return Notifier;
});
