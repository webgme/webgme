/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

define([ "assert" ], function (ASSERT) {
	"use strict";

	/**
	 * Returns the smallest index where comparator(element, array[index]) <= 0,
	 * that is array[index-1] < element <= array[index]. The returned value is
	 * always in the range [0, array.length].
	 */
	var search = function (array, elem, comparator) {
		ASSERT(array.constructor === Array);
		ASSERT(elem && comparator);

		var low = 0;
		var high = array.length;

		while( low < high ) {
			var mid = Math.floor((low + high) / 2);
			ASSERT(low <= mid && mid < high);

			if( comparator(elem, array[mid]) > 0 ) {
				low = mid + 1;
			}
			else {
				high = mid;
			}
		}

		return low;
	};

	var insert = function (array, elem, comparator) {
		ASSERT(array.constructor === Array);
		ASSERT(elem && comparator);

		var index = search(array, elem, comparator);
		array.splice(index, 0, elem);
	};
	
	var sort = function (array, comparator) {
		ASSERT(array.constructor === Array);
		ASSERT(comparator);
		
		array.sort(comparator);
	};
	
	return {
		search: search,
		insert: insert,
		sort: sort
	};
});
