/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

define([ "core/assert", "core/config" ], function (ASSERT, CONFIG) {
	"use strict";

	/**
	 * Returns the smallest index where comparator(element, array[index]) <= 0,
	 * that is array[index-1] < element <= array[index]. The returned value is
	 * always in the range [0, array.length].
	 */
	var binarySearch = function (array, elem, comparator) {
		ASSERT(Array.isArray(array) && typeof comparator === "function");

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
		ASSERT(Array.isArray(array) && typeof comparator === "function");

		var index = binarySearch(array, elem, comparator);
		array.splice(index, 0, elem);
		return index;
	};

	var binaryInsertUnique = function (array, elem, comparator) {
		ASSERT(Array.isArray(array) && typeof comparator === "function");

		var index = binarySearch(array, elem, comparator);
		if( array[index] === elem ) {
			return -1;
		}
		else {
			array.splice(index, 0, elem);
			return index;
		}
	};

	var stringComparator = function (a, b) {
		ASSERT(typeof a === "string" && typeof b === "string");
		return a.localeCompare(b);
	};

	var numberComparator = function (a, b) {
		ASSERT(typeof a === "number" && typeof b === "number");
		return a - b;
	};

	var deepCopy = function (o) {
		var c, k;
		if( o && typeof o === "object" ) {
			if( Array.isArray(o) ) {
				c = [];
				for( k = 0; k < o.length; ++k ) {
					c.push(deepCopy(o[k]));
				}
			}
			else {
				c = {};
				for( k in o ) {
					c[k] = deepCopy(o[k]);
				}
			}
			return c;
		}
		return o;
	};

	var copyOptions = function (defaults, options) {
		options = options || {};
		for( var key in defaults ) {
			if( options[key] === undefined ) {
				options[key] = defaults[key];
			}
		}
		return options;
	};

	/**
	 * Starting from node it recursively calls the loadChildren(node, callback2)
	 * method where callback2(err, children) returns an error or an array of
	 * children nodes. For each node it calls openNode(node, callback3), then
	 * other events for the children, then closeNode(node, callback4). The
	 * callback3(err) and callback4(err) callbacks must signal the end of
	 * processing of openNode and closeNode. Finally it calls callback(err) with
	 * the first error code encountered, or with no error if the depth first
	 * scan has completed normally. The number of out of order concurrent
	 * loadChildren calls are specified in CONFIG.reader.concurrentReads, but
	 * the order of calls to the openNode and closeNode functions are always in
	 * order.
	 */
	var depthFirstSearch = function (loadChildren, node, openNode, closeNode, callback) {
		ASSERT(typeof loadChildren === "function" && loadChildren.length === 2);
		ASSERT(typeof openNode === "function" && openNode.length === 2);
		ASSERT(typeof closeNode === "function" && closeNode.length === 2);
		ASSERT(typeof callback === "function" && callback.length === 1);

		var preloadChildren = function () {
			var selected = [];
			var pending = 0;

			for( var i = 0; i < requests.length && pending < CONFIG.reader.concurrentReads; ++i ) {
				var r = requests[i];

				if( r.s === 1 ) {
					r.s = 2;
					selected.push(r.n);
					++pending;
				}
				else if( r.s === 2 ) {
					++pending;
				}
			}

			for( i = 0; i < selected.length; ++i ) {
				loadChildren(selected[i], loadChildrenDone.bind(null, selected[i]));
			}
		};

		var loadChildrenDone = function (parent, err, children) {
			if( requests ) {
				if( err ) {
					requests = null;
					callback(err);
				}
				else {
					var i = 0;
					while( requests[i].n !== parent || requests[i].s !== 2 ) {
						++i;
						ASSERT(i < requests.length);
					}

					requests[i].s = 3;

					err = children.length;
					while( --err >= 0 ) {
						requests.splice(i, 0, {
							s: 0,
							n: children[err]
						}, {
							s: 1,
							n: children[err]
						});
					}

					if( requests[0].s === 0 ) {
						requests[0].s = 4;
						openNode(requests[0].n, openNodeDone);
					}
					else if( requests[0].s === 3 ) {
						requests[0].s = 4;
						closeNode(requests[0].n, openNodeDone);
					}

					if( requests ) {
						preloadChildren();
					}
				}
			}
		};

		var openNodeDone = function (err) {
			if( requests ) {
				if( err ) {
					requests = null;
					callback(err);
				}
				else {
					ASSERT(requests.length >= 1 && requests[0].s === 4);
					requests.shift();

					if( requests.length === 0 ) {
						callback(null);
					}
					else if( requests[0].s === 0 ) {
						requests[0].s = 4;
						openNode(requests[0].n, openNodeDone);
					}
					else if( requests[0].s === 3 ) {
						requests[0].s = 4;
						closeNode(requests[0].n, openNodeDone);
					}
				}
			}
		};

		var requests = [ {
			s: 4,
			n: node
		}, {
			s: 1,
			n: node
		} ];

		preloadChildren();
		openNode(node, openNodeDone);
	};

	var AsyncJoin = function (callback) {
		ASSERT(typeof callback === "function" && callback.length === 1);

		var missing = 1;

		var fire = function (err) {
			ASSERT(missing !== 0);

			if( missing > 0 ) {
				if( err ) {
					missing = -1;
					callback(err);
				}
				else if( --missing === 0 ) {
					callback(null);
				}
			}
		};

		return {
			add: function () {
				ASSERT(missing !== 0);

				if( missing > 0 ) {
					++missing;
				}

				return fire;
			},

			fail: function (err) {
				ASSERT(err);

				if( missing > 0 ) {
					missing = -1;
					callback(err);
				}
			},

			wait: function () {
				ASSERT(missing !== 0);

				fire(null);
			}
		};
	};

	var AsyncArray = function (callback) {
		ASSERT(typeof callback === "function" && callback.length === 2);

		var missing = 1, array = [];

		var setter = function (index) {
			return function (err, data) {
				ASSERT(missing !== 0);

				array[index] = data;

				if( missing > 0 ) {
					if( err ) {
						missing = -1;
						callback(err);
					}
					else if( --missing === 0 ) {
						callback(null, array);
					}
				}
			};
		};

		return {
			push: function (val) {
				ASSERT(missing !== 0);

				array.push(val);
			},

			asyncPush: function () {
				ASSERT(missing !== 0);

				if( missing > 0 ) {
					++missing;
				}

				return setter(array.length++);
			},

			wait: function () {
				ASSERT(missing !== 0);

				if( missing > 0 && --missing === 0 ) {
					callback(null, array);
				}
			}
		};
	};

	var AsyncObject = function (callback, object) {
		ASSERT(typeof callback === "function" && callback.length === 2);
		ASSERT(object === undefined || typeof object === "object");

		var missing = 1;
		object = object || {};

		var setter = function (prop) {
			return function (err, data) {
				ASSERT(missing !== 0);

				object[prop] = data;

				if( missing > 0 ) {
					if( err ) {
						missing = -1;
						callback(err);
					}
					else if( --missing === 0 ) {
						callback(null, object);
					}
				}
			};
		};

		return {
			set: function (prop, val) {
				ASSERT(missing !== 0);

				object[prop] = val;
			},

			asyncSet: function (prop) {
				ASSERT(typeof prop === "string" && missing >= 1);
				ASSERT(missing !== 0);

				if( missing > 0 ) {
					++missing;
				}

				return setter(prop);
			},

			fail: function (err) {
				ASSERT(err);

				if( missing > 0 ) {
					missing = -1;
					callback(err);
				}
			},

			wait: function () {
				ASSERT(missing !== 0);

				if( missing > 0 && --missing === 0 ) {
					callback(null, object);
				}
			}
		};
	};

	var callbackDepth = 10000 || CONFIG.callbacks.maxDepth || 5;
	var immediateCallback = function (callback, arg1, arg2) {
		ASSERT(typeof callback === "function");
		ASSERT(arguments.length >= 1 && arguments.length <= 3);

		if( callbackDepth > 0 ) {
			--callbackDepth;

			if( arguments.length === 1 ) {
				callback();
			}
			else if( arguments.length === 2 ) {
				callback(arg1);
			}
			else {
				callback(arg1, arg2);
			}

			++callbackDepth;
		}
		else {
			if( arguments.length === 1 ) {
				setTimeout(callback, 0);
			}
			else if( arguments.length === 2 ) {
				setTimeout(callback, 0, arg1);
			}
			else {
				setTimeout(callback, 0, arg1, arg2);
			}
		}
	};

	return {
		binarySearch: binarySearch,
		binaryInsert: binaryInsert,
		binaryInsertUnique: binaryInsertUnique,
		stringComparator: stringComparator,
		numberComparator: numberComparator,
		deepCopy: deepCopy,
		copyOptions: copyOptions,
		depthFirstSearch: depthFirstSearch,
		AsyncJoin: AsyncJoin,
		AsyncArray: AsyncArray,
		AsyncObject: AsyncObject,
		immediateCallback: immediateCallback
	};
});
