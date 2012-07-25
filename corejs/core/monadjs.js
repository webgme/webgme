/*
 * Copyright (C) 2012, Miklos Maroti, MIT License
 */

define(function () {
	"use strict";

	var ASSERT = function (cond) {
		if( !cond ) {
			var error = new Error("ASSERT failed");
			var message = "ASSERT failed at " + error.stack;

			if( console ) {
				console.log(message);
			}

			throw error;
		}
	};

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

	var monadjs_wrap = function (func) {
		ASSERT(typeof func === "function" && func.length >= 1);

		if( func.length === 1 ) {
			return function () {
				ASSERT(arguments.length === 0);
				var promise = monadjs_create();
				func(promise.fulfill);
				return promise;
			}
		}
		else if( func.length === 2 ) {
			return function (arg1) {
				ASSERT(arguments.length === 1);
				var promise = monadjs_create();
				func(arg1, promise.fulfill);
				return promise;
			}
		}
		else if( func.length === 3 ) {
			return function (arg1, arg2) {
				ASSERT(arguments.length === 2);
				var promise = monadjs_create();
				func(arg1, arg2, promise.fulfill);
				return promise;
			}
		}
		else if( func.length === 4 ) {
			return function (arg1, arg2, arg3) {
				ASSERT(arguments.length === 3);
				var promise = monadjs_create();
				func(arg1, arg2, arg3, promise.fulfill);
				return promise;
			}
		}
		else {
			return function () {
				ASSERT(arguments.length + 1 === func.length);
				var promise = monadjs_create();
				var args = Array.prototype.slice.call(arguments);
				args.push(promise.fulfill);
				func.call(null, args);
				return promise;
			}
		}
	};

	var monadjs_call = function (args, fun) {
		ASSERT(typeof args === "object" && typeof fun === "function" && fun.length <= args.length);

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
			promise.register(function(err, val) {
				if(err) {
					console.log( err.stack ? err.stack : err );
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
