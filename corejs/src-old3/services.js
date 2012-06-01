/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

define([ "assert", "values" ], function (ASSERT, values) {
	"use strict";

	var forEachChild = function (table, data, callback) {
		if( data && data.children ) {
			for( var i in data.children ) {
				var rowid = data.children[i];
				callback(table.getRow(rowid));
			}
		}
	};

	var query = function (loadedData) {

		var table = loadedData.table;
		var territory = values.refcount(table);

		// ------- missing count
		
		var isMissing = values.compute(function(refcount, data) {
			return refcount && data === undefined;
		}, territory, loadedData);
		
		var missingCount = 0;
		isMissing.addListener(function (row, oldData, newData) {
			ASSERT((oldData === false) === (newData === true));
			
			missingCount += newData ? 1 : -1;
			ASSERT(missingCount >= 0);
		});
		
		// ------- children query
		
		var childrenRefcount = values.refcount(table);

		var childrenData = values.stage(values.compute(function (refcount, data) {
			return refcount ? data : undefined;
		}, childrenRefcount, loadedData));

		childrenData.addListener(function (row, oldData, newData) {
			
			console.log(oldData);
			console.log(newData);
			
			var childList = [];

			forEachChild(table, oldData, function (child) {
				childList.push(child);
			});

			forEachChild(table, newData, function (child) {
				var index = childList.indexOf(child);
				if( index >= 0 ) {
					childList.splice(index, 1);
				}
				else {
					territory.increase(child);
				}
			});

			for( var i = 0; i < childList.length; ++i ) {
				territory.decrease(childList[i]);
			}
		});

		// ------- user patterns
		
		var patterns = values.create(table);
		patterns.addListener(function (row, oldData, newData) {
			oldData = oldData || {};
			newData = newData || {};
			
			if( !oldData.self && newData.self ) {
				territory.increase(row);
			}
			else if( oldData.self && !newData.self ) {
				territory.decrease(row);
			}
			
			if( !oldData.children && newData.children ) {
				territory.increase(row);
				childrenRefcount.increase(row);
			}
			else if( oldData.children && !newData.children ) {
				territory.decrease(row);
				childrenRefcount.decrease(row);
			}
		});
		
		// ------- interface
		
		return {
			/**
			 * Writable value where the queries can be set.
			 */
			patterns: patterns,

			/**
			 * A read-only property showing which objects need to be loaded for
			 * this query.
			 */
			territory: values.readonly(territory),
			
			/**
			 * Returns true if the territory is not fully computed.
			 */
			isDirty: function() {
				return childrenData.isDirty();
			},

			execute: function() {
				childrenData.commit();
			},
			
			/**
			 * Returns true if the territory is fully computed and all objects
			 * in the territory are loaded.
			 */
			isLoaded: function() {
				return missingCount === 0;
			}
		};
	};

	// ----------------- interface -----------------

	return {
		query: query
	};
});
