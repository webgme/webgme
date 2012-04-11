/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

define([ "assert", "flattable", "values2" ], function (ASSERT, Table, values) {
	"use strict";

	var forEachChild = function (data, callback) {
		if( data && data.children ) {
			for( var child in data.children ) {
				callback(child);
			}
		}
	};

	var query = function (loadedData) {

		var table = loadedData.table;

		var territory = values.counter(table);

		var isUnloaded = values.compute(function(refcount, data) {
			return refcount && data === undefined;
		}, territory, loadedData);
		
		var unloadedCount = 0;
		isUnloaded.addListener(function (row, oldData, newData) {
			ASSERT((oldData === false) === (newData === true));
			
			unloadedCount += newData ? 1 : -1;
			ASSERT(unloadedCount >= 0);
		});
		
		var queries = values.create(table);
		var childrenRefcount = values.counter(table);

		var childrenData = values.staged(values.compute(function (refcount, data) {
			return refcount ? data : undefined;
		}, childrenRefcount, loadedData));

		childrenData.addListener(function (row, oldData, newData) {
			var childList = [];

			forEachChild(oldData, function (child) {
				childList.push(child);
			});

			forEachChild(newData, function (child) {
				var index = childList.indexOf(child);
				if( index >= 0 ) {
					childList.splice(index, 1);
				}
				else {
					territory.decrease(table.getRow(child));
				}
			});

			for( var i = 0; i < childList.length; ++i ) {
				territory.increase(table.getRow(childList[i]));
			}
		});

		return {
			/**
			 * Writable value where the queries can be set.
			 */
			queries: queries,

			/**
			 * A read-only property showing which objects need to be loaded for
			 * this query.
			 */
			territory: territory,
			
			/**
			 * Returns true if the territory is not fully computed.
			 */
			isDirty: function() {
			},

			/**
			 * Returns true if the territory is fully computed and all objects
			 * in the territory are loaded.
			 */
			isLoaded: function() {
			}
		};
	};

	// ----------------- interface -----------------

	return {
		query: query
	};
});
