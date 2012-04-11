/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

define([ "assert" ], function (ASSERT) {
	"use strict";

	// ----------------- listener -----------------

	var createListeners = function () {

		var listeners = [];

		var updateNotifier = function () {
			if( listeners.length === 0 ) {
				commands.notify = function () {
				};
			}
			else if( listeners.length === 1 ) {
				commands.notify = listeners[0];
			}
			else if( listeners.length === 2 ) {
				commands.notify = function (row, oldData, newData) {
					listeners[0](row, oldData, newData);
					listeners[1](row, oldData, newData);
				};
			}
			else {
				commands.notify = function (row, oldData, newData) {
					for( var i = 0; i < listeners.length; ++i ) {
						listeners[i](row, oldData, newData);
					}
				};
			}
		};

		var commands = {
			add: function (callback) {
				ASSERT(typeof callback === "function");

				listeners.push(callback);
				updateNotifier();
			},

			remove: function (callback) {
				var index = listeners.indexOf(callback);
				ASSERT(index >= 0);

				listeners.splice(index, 1);
				updateNotifier();
			},

			destroy: function () {
				ASSERT(listeners.length === 0);
			}
		};

		updateNotifier();

		return commands;
	};

	// ----------------- stage -----------------

	var stage = function (value) {
		ASSERT(value && value.table && value.get);

		var listeners = createListeners();
		var backup = value.table.createColumn();

		var notifier = function (row) {
			var oldData = backup.get(row);
			var newData = value.get(row);

			if( oldData !== newData ) {
				listeners.notify(row, oldData, newData);
			}
		};

		var updater = function (row, oldInput, newInput) {
			if( !backup.has(row) ) {
				backup.set(row, oldInput);
			}
		};

		value.addListener(updater);

		return {
			table: value.table,

			get: function (row) {
				if( backup.has(row) ) {
					return backup.get(row);
				}

				return value.get(row);
			},

			isDirty: function () {
				return !backup.isEmpty();
			},

			commit: function () {
				backup.deleteEach(notifier);
			},

			addListener: listeners.add,

			removeListener: listeners.remove,

			destroy: function () {
				value.removeListener(updater);
				value = null;

				updater = null;
				notifier = null;

				backup.destroy();
				backup = null;

				listeners.destroy();
				listeners = null;
			}
		};
	};

	// ----------------- compute -----------------

	var compute = function (map, arg1, arg2) {
		ASSERT(typeof map === "function");
		ASSERT(map.length >= 1 && map.length <= 2);

		var listeners = createListeners();

		var getData, listener1, listener2;

		if( map.length === 1 ) {
			ASSERT(arg1.get && arg1.addListener);
			ASSERT(arg2 === undefined);

			getData = function (row) {
				return map(arg1.get(row));
			};

			listener1 = function (row, oldInput, newInput) {
				var oldData = map(oldInput);
				var newData = map(newInput);

				if( oldData !== newData ) {
					listeners.notify(row, oldData, newData);
				}
			};
			arg1.addListener(listener1);
		}
		else {
			ASSERT(arg1.get && arg1.addListener);
			ASSERT(arg2.get && arg2.addListener);

			getData = function (row) {
				return map(arg1.get(row), arg2.get(row));
			};

			listener1 = function (row, oldInput, newInput) {
				var other = arg2.get(row);
				var oldData = map(oldInput, other);
				var newData = map(newInput, other);

				if( oldData !== newData ) {
					listeners.notify(row, oldData, newData);
				}
			};
			arg1.addListener(listener1);

			listener2 = function (row, oldInput, newInput) {
				var other = arg1.get(row);
				var oldData = map(other, oldInput);
				var newData = map(other, newInput);

				if( oldData !== newData ) {
					listeners.notify(row, oldData, newData);
				}
			};
			arg2.addListener(listener2);
		}

		return {
			table: arg1.table,

			get: getData,

			addListener: listeners.add,

			removeListener: listeners.remove,

			destroy: function () {
				listeners.destroy();
				listeners = null;

				arg1.removeListener(listener1);
				listener1 = null;

				if( listener2 ) {
					arg2.removeListener(listener2);
					listener2 = null;
				}

				map = null;
				arg1 = null;
				arg2 = null;
			}
		};
	};

	// ----------------- create -----------------

	var create = function (table) {

		var listeners = createListeners();
		var storage = table.createColumn();

		return {
			table: table,

			get: function (row) {
				return storage.get(row);
			},

			set: function (row, value) {
				var old = storage.get(row);
				storage.set(row, value);
				listeners.notify(row, old, value);
			},

			update: function (row, updater) {
				var old = storage.get(row);
				var value = updater(old);
				storage.set(row, value);
				listeners.notify(row, old, value);
			},

			addListener: listeners.add,

			removeListener: listeners.remove,

			destroy: function () {
				storage.destroy();
				storage = null;

				listeners.destroy();
				listeners = null;

				table = null;
			}
		};
	};

	// ----------------- refcount -----------------

	var refcount = function (table) {

		var listeners = createListeners();
		var storage = table.createColumn();

		return {
			table: table,

			get: function (row) {
				return storage.get(row) ? true : false;
			},

			increase: function (row) {
				var value = storage.get(row);
				ASSERT(value === undefined || value >= 1);
				
				if( value !== undefined ) {
					storage.set(row, value + 1);
				}
				else {
					storage.set(row, 1);
					listeners.notify(row, false, true);
				}
			},
			
			decrease: function (row) {
				var value = storage.get(row);
				ASSERT(value === undefined || value >= 1);
				
				if( value >= 2 ) {
					storage.set(value - 1);
				}
				else {
					storage.del(row);
					listeners.notify(row, true, false);
				}
			},

			addListener: listeners.add,

			removeListener: listeners.remove,

			destroy: function () {
				storage.destroy();
				storage = null;

				listeners.destroy();
				listeners = null;

				table = null;
			}
		};
	};

	// ----------------- readonly -----------------

	var readonly = function(value) {
		return {
			table: value.table,
			get: value.get,
			addListener: value.addListener,
			removeListener: value.removeListener
		};
	};
	
	// ----------------- interface -----------------

	return {
		create: create,
		compute: compute,
		stage: stage,
		refcount: refcount,
		readonly: readonly
	};
});
