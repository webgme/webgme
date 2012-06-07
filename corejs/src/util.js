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
	var binarySearch = function (array, elem, comparator) {
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

	var binaryInsert = function (array, elem, comparator) {
		ASSERT(array.constructor === Array);
		ASSERT(elem && comparator);

		var index = binarySearch(array, elem, comparator);
		array.splice(index, 0, elem);
	};

	var deepCopy = function (o) {
		var c, k;
		if( o && typeof o === "object" ) {
			if( o.constructor !== Array ) {
				c = {};
				for( k in o ) {
					c[k] = deepCopy(o[k]);
				}
			}
			else {
				c = [];
				for( k = 0; k < o.length; ++k ) {
					c.push(deepCopy(o[k]));
				}
			}
			return c;
		}
		return o;
	};

	var copyOptions = function (defaults, options) {
		options = options || {};
		for( var key in defaults ) {
			if( !options.hasOwnProperty(key) ) {
				options[key] = defaults[key];
			}
		}
		return options;
	};

	var nullCallback = function () {
	};

	var errorHandler = function (callback) {
		ASSERT(callback && callback.constructor === Function && callback.length === 1);

		var pending = 0;

		return function (process) {
			ASSERT(arguments.length === 1);

			if( callback ) {
				if( process && process.constructor === Function ) {
					++pending;
					
					return function (err, arg1, arg2, arg3) {
						if( err ) {
							callback(err);
							callback = nullCallback;
						}
						else {
							process(arg1, arg2, arg3);

							if( --pending === 0 ) {
								callback(null);
								callback = null;
							}
						}
					};
				}
				else if( process || pending === 0 ) {
					callback(process);
					callback = null;
				}
			}
		};
	};
	
	/**
	 * Constructs a priority queue object that calls enqueued processes, and
	 * returns the enqueue function. The priority queue object calls at most
	 * maxPending enqueued processes concurrently. The comparator(pri1, pri2)
	 * function is used to compare the priorities of processes. The
	 * callback(err) function is called when all enqueued processes are done or
	 * if an error occurs (in which case all pending processes are cancelled).
	 * This method returns an enqueue(pri, proc, arg) function that can be used
	 * to enqueue the first (and subsequent) processes. The proc(pri, done, arg)
	 * function will be called eventually with the specified priority and
	 * argument. The process must call the done(err) function to complete the
	 * process.
	 */
	var priorityEnqueue = function (maxPending, comparator, callback) {
		ASSERT(maxPending >= 1);
		ASSERT(comparator && callback);

		var queue = [], pending = 0;

		var comp = function (a, b) {
			ASSERT(a.pri && b.pri);

			return comparator(b.pri, a.pri);
		};

		var done = function (err) {
			if( queue ) {
				ASSERT(pending > 0);
				--pending;

				if( err || (pending === 0 && queue.length === 0) ) {
					queue = null;

					callback(err);
					callback = nullCallback;
				}
				else if( pending < maxPending && queue.length !== 0 ) {
					call();
				}
			}
		};

		var call = function () {
			ASSERT(pending < maxPending);
			ASSERT(queue.length > 0);

			++pending;
			var entry = queue.pop();
			entry.proc(entry.pri, done, entry.arg);
		};

		return function (pri, proc, arg) {
			ASSERT(pri && proc);

			binaryInsert(queue, {
				pri: pri,
				proc: proc,
				arg: arg
			}, comp);

			if( pending < maxPending ) {
				call();
			}
		};
	};

	return {
		binarySearch: binarySearch,
		binaryInsert: binaryInsert,
		deepCopy: deepCopy,
		copyOptions: copyOptions,
		errorHandler: errorHandler,
		priorityEnqueue: priorityEnqueue
	};
});
