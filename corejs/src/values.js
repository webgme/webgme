/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

define([ "assert" ], function (ASSERT) {
	"use strict";

	// ----------------- StoredValue -----------------

	var storedValue = function(table) {
		ASSERT(table && table.createColumn);
		
		var listeners = [];
		var storage = table.createColumn();
		var changes = table.createColumn();

		var notifyListeners = function (row) {
			var oldData = storage.get(row);
			var newData = changes.get(row);

			if( oldData !== newData ) {
				for( var i = 0; i < listeners.length; ++i ) {
					listeners[i](row, oldData, newData);
				}

				storage.set(row, newData);
			}
		};
		
		return {
			table: table,
			
			/**
			 * Returns the committed value for the given row. (Uncommitted changed
			 * cannot be accessed)
			 */
			get: function (row) {
				return storage.get(row);
			},
			
			/**
			 * Updates the current value for the given row and sets the dirty flag.
			 */
			set: function (row, value) {
				changes.set(row, value);
			},
			
			/**
			 * Retrieves the latest value (uncommitted changes), calls the updater
			 * function, and sets the new value to the return value.
			 */
			update: function (row, updater) {
				var value = changes.has(row) ? changes.get(row) : storage.get(row);
				changes.set(updater(value));
			},

			/**
			 * Returns true if there are uncommitted changes.
			 */
			isDirty: function () {
				return !changes.isEmpty();
			},
			
			addListener: function (callback) {
				ASSERT(typeof callback === "function");

				listeners.push(callback);
			},

			removeListener: function (callback) {
				var index = listeners.indexOf(callback);
				ASSERT(index >= 0);
				
				listeners.splice(index, 1);
			},

			commit: function () {
				changes.deleteEach(notifyListeners);
			},

			abort: function () {
				changes.removeAll();
			},
			
			destroy: function () {
				ASSERT(listeners.length === 0);
				
				storage.destroy();
				changes.destroy();
				
				table = null;
				listeners = null;
				storage = null;
				changes = null;
			}
		};
	};
	
	// ----------------- ComputedValue -----------------

	var computedValue = function (map, arg1, arg2) {
		ASSERT(typeof map === "function");
		ASSERT(map.length >= 1 && map.length <= 2);
		
		var listeners = [];
		
		ASSERT(arg1 && arg1.table);
		var backup = arg1.table.createColumn();

		var getOldData, getNewData;
		var listener1, listener2;
		
		if( map.length === 1 ) {
			ASSERT(arg1.get && arg1.addListener);
			ASSERT(arg2 === undefined);

			getOldData = function(row) {
				if( backup.has(row) ) {
					return backup.get(row);
				}

				return map(arg1.get(row));
			};
			
			getNewData = function(row) {
				return map(arg1.get(row));
			};

			listener1 = function(row, oldInput, newInput) {
				if( ! backup.has(row) ) {
					backup.set(row, map(oldInput));
				}
			};
			arg1.addListener(listener1);
		}
		else {
			ASSERT(arg1.get && arg1.addListener);
			ASSERT(arg2.get && arg2.addListener);
			
			getOldData = function(row) {
				if( backup.has(row) ) {
					return backup.get(row);
				}

				return map(arg1.get(row), arg2.get(row));
			};
			
			getNewData = function(row) {
				return map(arg1.get(row), arg2.get(row));
			};

			listener1 = function(row, oldInput, newInput) {
				if( ! backup.has(row) ) {
					backup.set(row, map(oldInput, arg2.get(row)));
				}
			};
			arg1.addListener(listener1);
			
			listener2 = function(row, oldInput, newInput) {
				if( ! backup.has(row) ) {
					backup.set(row, map(arg1.get(row), oldInput));
				}
			};
			arg2.addListener(listener2);
		};
		
		var notifyListeners = function(row) {
			var oldData = backup.get(row);
			var newData = getNewData(row);

			if(oldData !== newData) { 
				for( var i = 0; i < listeners.length; ++i ) {
					listeners[i](row, oldData, newData);
				}
			}
		};
		
		return {
			table: backup.table,

			get: getOldData,
			
			isDirty: function() {
				return !backup.isEmpty();
			},

			commit: function() {
				backup.deleteEach(notifyListeners);
			},

			addListener: function(callback) {
				ASSERT(typeof callback === "function");
				listeners.push(callback);
			},
			
			removeListener: function(callback) {
				var index = listeners.indexOf(callback);
				ASSERT(index >= 0);
				listeners.splice(index, 1);
			},
			
			destroy: function() {
				ASSERT(listeners.length === 0);
				
				backup.destroy();

				arg1.removeListener(listener1);
				if( listener2 ) {
					arg2.removeListener(listener2);
				}
				
				map = null;
				arg1 = null;
				arg2 = null;
				listeners = null;
				backup = null;
			}
		};
	};
	
	// ----------------- interface -----------------

	return {
		stored: storedValue,
		computed: computedValue
	};
});
