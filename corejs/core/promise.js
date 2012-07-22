/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

define([ "core/assert" ], function (ASSERT) {
	"use strict";

	var isPromise = function (promise) {
		return typeof promise === "object" && typeof promise.fulfill === "function";
	};

	var create = function () {
		var waiters = [], error, value;

		var fulfill = function (err, val) {
			ASSERT(waiters && !isPromise(val));

			var list = waiters;
			waiters = undefined;
			error = err;
			value = val;

			for( var i = 0; i < list.length; ++i ) {
				list[i](err, val);
			}
		};

		return {
			register: function (callback) {
				ASSERT(typeof callback === "function" && callback.length === 2);

				if( waiters ) {
					waiters.push(callback);
				}
				else {
					callback(error, value);
				}
			},

			fulfill: fulfill,

			set: function (val) {
				fulfill(null, val);
			}
		};
	};

	var call = function (fun) {
		ASSERT(typeof fun === "function" && fun.length === arguments.length - 1);

		var result = create();

		var missing = 1;
		var args = new Array(arguments.length - 1);

		var setter = function (index, err, val) {
			if( missing > 0 ) {
				if( err ) {
					missing = 0;
					result.fulfill(err);
				}
				else {
					if( index >= 0 ) {
						args[index] = val;
					}

					if( --missing === 0 ) {
						result.set(fun.apply(null, args));
					}
				}
			}
		};

		for( var i = 1; i < arguments.length; ++i ) {
			if( isPromise(arguments[i]) ) {
				++missing;
				arguments[i].register(setter.bind(null, i - 1));
			}
			else {
				args[i - 1] = arguments[i];
			}
		}

		return result;
	};

	return {
		create: create,
		call: call
	};
});
