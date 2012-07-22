/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

define(
[ "core/assert", "core/config" ],
function (ASSERT, CONFIG) {
	"use strict";

	/**
	 * Returns the smallest index where comparator(element, array[index]) <= 0,
	 * that is array[index-1] < element <= array[index]. The returned value is
	 * always in the range [0, array.length].
	 */
	var binarySearch = function (array, elem, comparator) {
		ASSERT(array.constructor === Array);
		ASSERT(elem && typeof comparator === "function");

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
		ASSERT(elem && typeof comparator === "function");

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

		/**
		 * We maintain an array of nodes with status codes. The status codes are
		 * 0 : waiting to be processed, 1 : loadChildren is called already, 2 :
		 * openNode needs to be called, 3 : closeNode needs to be called.
		 */
		var requests = [ {
			status: 0,
			node: node
		} ];

		var pending = 0;

		var process = function (currentNode, err, children) {
			var temp;
			if( callback ) {
				if( err ) {
					temp = callback;
					callback = null;
					temp(err);
				}
				else {
					temp = 0;
					while( requests[temp].node !== currentNode ) {
						++temp;
						ASSERT(temp < requests.length);
					}
					ASSERT(requests[temp].status === 1);

					requests[temp].status = 3;

					err = children.length;
					while( --err >= 0 ) {
						requests.splice(temp, 0, {
							status: 0,
							node: children[err]
						});
					}

					requests.splice(temp, 0, {
						status: 2,
						node: currentNode
					});

					ASSERT(pending >= 1);
					--pending;

					scan();
				}
			}
		};

		var processing = 0;
		var done = function (err) {
			if( callback && (err || (--processing === 0 && requests.length === 0 && pending === 0)) ) {
				var temp = callback;
				callback = null;
				temp(err);
			}
		};

		var scan = function () {
			// console.log("scan", pending, requests.length);

			while( requests.length !== 0 && requests[0].status >= 2 ) {
				++processing;
				if( requests[0].status === 2 ) {
					// TODO: here is a bug, we should wait for the completion
					// before calling other callbacks
					openNode(requests.shift().node, done);
				}
				else {
					closeNode(requests.shift().node, done);
				}
			}

			var selected = [];

			for( var i = 0; i < requests.length && pending < CONFIG.reader.concurrentReads; ++i ) {
				if( requests[i].status === 0 ) {
					ASSERT(pending >= 0);
					++pending;

					requests[i].status = 1;
					selected.push(requests[i].node);
				}
			}

			for( i = 0; i < selected.length; ++i ) {
				loadChildren(selected[i], process.bind(null, selected[i]));
			}
		};

		scan();
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
	var depthFirstSearch2 = function (loadChildren, node, openNode, closeNode, callback) {
		ASSERT(typeof loadChildren === "function" && loadChildren.length === 2);
		ASSERT(typeof openNode === "function" && openNode.length === 2);
		ASSERT(typeof closeNode === "function" && closeNode.length === 2);
		ASSERT(typeof callback === "function" && callback.length === 1);

		/**
		 * We maintain an array of nodes with status codes. The status codes are
		 * 0 : waiting to be processed, 1 : loadChildren is called already, 2 :
		 * openNode needs to be called, 3 : closeNode needs to be called.
		 */
		var requests = [ {
			status: 0,
			node: node
		} ];

		var pending = 0;

		var process = function (currentNode, err, children) {
			var temp;
			if( callback ) {
				if( err ) {
					temp = callback;
					callback = null;
					temp(err);
				}
				else {
					temp = 0;
					while( requests[temp].node !== currentNode ) {
						++temp;
						ASSERT(temp < requests.length);
					}
					ASSERT(requests[temp].status === 1);

					requests[temp].status = 3;

					err = children.length;
					while( --err >= 0 ) {
						requests.splice(temp, 0, {
							status: 0,
							node: children[err]
						});
					}

					requests.splice(temp, 0, {
						status: 2,
						node: currentNode
					});

					ASSERT(pending >= 1);
					--pending;

					scan();
				}
			}
		};

		var processing = 0;
		var done = function (err) {
			if( callback && (err || (--processing === 0 && requests.length === 0 && pending === 0)) ) {
				var temp = callback;
				callback = null;
				temp(err);
			}
		};

		var scan = function () {
			// console.log("scan", pending, requests.length);

			while( requests.length !== 0 && requests[0].status >= 2 ) {
				++processing;
				if( requests[0].status === 2 ) {
					// TODO: here is a bug, we should wait for the completion
					// before calling other callbacks
					openNode(requests.shift().node, done);
				}
				else {
					closeNode(requests.shift().node, done);
				}
			}

			var selected = [];

			for( var i = 0; i < requests.length && pending < CONFIG.reader.concurrentReads; ++i ) {
				if( requests[i].status === 0 ) {
					ASSERT(pending >= 0);
					++pending;

					requests[i].status = 1;
					selected.push(requests[i].node);
				}
			}

			for( i = 0; i < selected.length; ++i ) {
				loadChildren(selected[i], process.bind(null, selected[i]));
			}
		};

		scan();
	};

	var AsyncJoin = function (callback) {
		ASSERT(typeof callback === "function" && callback.length === 1);

		var missing = 1;
		var fire = function (err) {
			if( missing && (err || --missing === 0) ) {
				missing = 0;
				callback(err);
			}
		};

		return {
			add: function () {
				ASSERT(missing >= 1);
				++missing;
				return fire;
			},

			start: function () {
				ASSERT(missing >= 1);
				fire(null);
			}
		};
	};

	var AsyncArray = function (callback) {
		ASSERT(typeof callback === "function" && callback.length === 2);

		var missing = 1;
		var array = [];

		var fire = function (index, err, data) {
			if( missing ) {
				array[index] = data;
				if( err || --missing === 0 ) {
					missing = 0;
					callback(err, array);
				}
			}
		};

		return {
			add: function () {
				ASSERT(missing >= 1);

				++missing;
				return fire.bind(null, array.length++);
			},

			start: function () {
				ASSERT(missing >= 1);

				if( --missing === 0 ) {
					callback(null, array);
				}
			}
		};
	};

	return {
		binarySearch: binarySearch,
		binaryInsert: binaryInsert,
		deepCopy: deepCopy,
		copyOptions: copyOptions,
		depthFirstSearch: depthFirstSearch,
		AsyncJoin: AsyncJoin,
		AsyncArray: AsyncArray
	};
});
