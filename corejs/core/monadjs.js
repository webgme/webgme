/*
 * Copyright (C) 2012, Miklos Maroti, MIT License
 */

define([ "core/assert" ], function (ASSERT) {
	"use strict";

	var isPromise = function (promise) {
		return typeof promise === "object" && promise.fulfill && promise.register;
	};

	var monadjs_create = function () {
		var waiters = [], error, value;

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

			fulfill: function (err, val) {
				ASSERT(!isPromise(val));

				if( waiters ) {
					// if this fails, then you have an unused promise
					ASSERT(waiters.length > 0);

					var list = waiters;
					waiters = null;
					error = err;
					value = val;

					for( var i = 0; i < list.length; ++i ) {
						list[i](err, val);
					}

					return true;
				}

				return false;
			}
		};
	};

	var monadjs_wrap = function (func, len) {
		ASSERT(typeof func === "function" && len === undefined || typeof len === "number");

		len = len || func.length;

		if( len === 1 ) {
			return function () {
				ASSERT(arguments.length === 0);
				var promise = monadjs_create();
				func(promise.fulfill);
				return promise;
			};
		}
		else if( len === 2 ) {
			return function (arg1) {
				ASSERT(arguments.length === 1);
				var promise = monadjs_create();
				func(arg1, promise.fulfill);
				return promise;
			};
		}
		else if( len === 3 ) {
			return function (arg1, arg2) {
				ASSERT(arguments.length === 2);
				var promise = monadjs_create();
				func(arg1, arg2, promise.fulfill);
				return promise;
			};
		}
		else if( len === 4 ) {
			return function (arg1, arg2, arg3) {
				ASSERT(arguments.length === 3);
				var promise = monadjs_create();
				func(arg1, arg2, arg3, promise.fulfill);
				return promise;
			};
		}
		else if( len === -2 ) {
			return function (arg1) {
				ASSERT(arguments.length === 1);
				var promise = monadjs_create();
				func(promise.fulfill, arg1);
				return promise;
			};
		}
		else {
			return function () {
				ASSERT(arguments.length === len - 1);
				var promise = monadjs_create();
				var args = Array.prototype.slice.call(arguments);
				args.push(promise.fulfill);
				func.apply(null, args);
				return promise;
			};
		}
	};

	var monadjs_call = function (args, fun) {
		ASSERT(typeof args === "object" && args.constructor === Array && typeof fun === "function"
		&& fun.length <= args.length);

		var result;
		var missing = 1;

		var monadjs_wait = function (index) {
			++missing;
			args[index].register(function (err, val) {
				if( missing > 0 ) {
					if( err ) {
						missing = 0;
						if( result ) {
							result.fulfill(err);
						}
						else {
							throw err;
						}
					}
					else {
						ASSERT(isPromise(args[index]));
						args[index] = val;
						if( --missing === 0 ) {
							ASSERT(result);
							try {
								val = fun.apply(null, args);
								if( isPromise(val) ) {
									val.register(result.fulfill);
								}
								else {
									result.fulfill(null, val);
								}
							}
							catch(err) {
								result.fulfill(err);
							}
						}
					}
				}
			});
		};

		for( var i = 0; i < args.length; ++i ) {
			if( isPromise(args[i]) ) {
				monadjs_wait(i);
			}
		}

		ASSERT(missing >= 1);
		if( --missing === 0 ) {
			return fun.apply(null, args);
		}
		else {
			result = monadjs_create();
			return result;
		}
	};

	var monadjs_check = function (promise) {
		if( isPromise(promise) ) {
			promise.register(function (err, val) {
				if( err ) {
					console.log(err.stack ? err.stack : err);
				}
			});
		}
	};

	return {
		wrap: monadjs_wrap,
		call: monadjs_call,
		check: monadjs_check
	};
});
