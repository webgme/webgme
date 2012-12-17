/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

define(function () {
	"use strict";

	var ASSERT = function (cond) {
		if( !cond ) {
			var error = new Error("future assertion failed");
			console.log(error.stack);
			throw error;
		}
	};

	// ------- Future -------

	var UNRESOLVED = {};

	var Future = function () {
		this.value = UNRESOLVED;
		this.listener = null;
		this.param = null;
	};

	var setValue = function (future, value) {
		ASSERT(future instanceof Future && future.value === UNRESOLVED);

		if( value instanceof Future ) {
			setListener(value, setValue, future);
		}
		else {
			future.value = value;

			if( future.listener !== null ) {
				future.listener(future.param, value);
			}
		}
	};

	var setListener = function (future, listener, param) {
		ASSERT(future instanceof Future && future.listener === null && future.value === UNRESOLVED);
		ASSERT(typeof listener === "function" && listener.length === 2);

		future.listener = listener;
		future.param = param;

		if( future.value !== UNRESOLVED ) {
			listener(param, future);
		}
	};

	var isUnresolved = function (value) {
		return (value instanceof Future) && value.value === UNRESOLVED;
	};

	var getValue = function (value) {
		if( value instanceof Future ) {
			if( value.value instanceof Error ) {
				throw value.value;
			}
			else if( value.value !== UNRESOLVED ) {
				return value.value;
			}
		}
		return value;
	};

	// ------- adapt

	var adapt = function (func) {
		ASSERT(typeof func === "function" && func.length >= 1);

		if( func.length === 1 ) {
			return function () {
				var future = new Future();
				func.call(this, function (error, value) {
					if( error !== null ) {
						value = error instanceof Error ? error : new Error(error);
					}
					else {
						ASSERT(!(value instanceof Error));
					}
					setValue(future, value);
				});
				return getValue(future);
			};
		}
		else if( func.length === 2 ) {
			return function (arg0) {
				var future = new Future();
				func.call(this, arg0, function (error, value) {
					if( error ) {
						value = error instanceof Error ? error : new Error(error);
					}
					else {
						ASSERT(!(value instanceof Error));
					}
					setValue(future, value);
				});
				return getValue(future);
			};
		}
	};

	var adapt2 = function (func) {
		ASSERT(typeof func === "function");

		return function () {
			var args = arguments;
			var future = new Future();

			args[args.length++] = function (error, value) {
				if( error ) {
					value = error instanceof Error ? error : new Error(error);
				}
				else {
					ASSERT(!(value instanceof Error));
				}
				setValue(future, value);
			};

			func.apply(this, args);

			return getValue(future);
		};
	};

	var unadapt = function (func) {
		ASSERT(typeof func === "function");

		return function () {
			var args = arguments;

			var callback = args[--args.length];
			ASSERT(typeof callback === "function");

			var value;

			try {
				value = func.apply(this, args);
			}
			catch(error) {
				callback(error);
				return;
			}

			if( isUnresolved(value) ) {
				setListener(value, function (nothing, value) {
					if( value instanceof Error ) {
						callback(value);
					}
					else {
						callback(null, value);
					}
				}, null);
			}
			else {
				callback(null, value);
			}
		};
	};

	var delay = function (delay, value) {
		var future = new Future();
		setTimeout(function () {
			setValue(future, value);
		}, delay);
		return future;
	};

	// ------- call -------

	var Func = function (func, that, args, index) {
		this.value = UNRESOLVED;
		this.listener = null;
		this.param = null;

		this.func = func;
		this.that = that;
		this.args = args;
		this.index = index;

		setListener(args[index], setArgument, this);
	};

	Func.prototype = Future.prototype;

	var setArgument = function (future, value) {
		if( !(value instanceof Error) ) {
			try {
				var args = future.args;
				args[future.index] = value;

				while( ++future.index < args.length ) {
					value = args[future.index];
					if( isUnresolved(value) ) {
						setListener(value, setArgument, future);
						return;
					}
					else {
						args[future.index] = getValue(value);
					}
				}

				value = future.func.apply(future.that, args);
				ASSERT(!(value instanceof Error));
			}
			catch(error) {
				value = error instanceof Error ? error : new Error(error);
			}
		}

		setValue(future, value);
	};

	var call = function () {
		var args = arguments;

		var func = args[--args.length];
		ASSERT(typeof func === "function");

		for( var i = 0; i < args.length; ++i ) {
			if( isUnresolved(args[i]) ) {
				return new Func(func, this, args, i);
			}
			else {
				args[i] = getValue(args[i]);
			}
		}
		return func.apply(this, args);
	};

	// ------- join -------

	var Join = function () {
		this.value = UNRESOLVED;
		this.listener = null;
		this.param = null;
	};

	Join.prototype = Future.prototype;

	var join = function (first, second) {
		ASSERT(typeof first === "undefined" || first instanceof Future);
		ASSERT(typeof second === "undefined" || second instanceof Future);

		if( typeof first === "undefined" ) {
			return second;
		}
		else if( typeof second === "undefined" ) {
			return first;
		}
		else {
			return new Join();
		}
	};

	// ------- hide -------

	var Hide = function (future, handler) {
		this.value = UNRESOLVED;
		this.listener = null;
		this.param = null;

		this.handler = handler;
		setListener(future, hideValue, this);
	};

	Hide.prototype = Future.prototype;

	var hideValue = function (future, value) {
		try {
			if( value instanceof Error ) {
				value = future.handler(value);
			}
		}
		catch(error) {
			value = error instanceof Error ? error : new Error(error);
		}

		setValue(future, value);
	};

	var printStack = function (error) {
		console.log(error.stack);
	};

	var hide = function (future, handler) {
		if( typeof handler !== "function" ) {
			handler = printStack;
		}

		if( isUnresolved(future) ) {
			return new Hide(future, handler);
		}
		else if( future.value instanceof Error ) {
			return handler(future.value);
		}
		else {
			return getValue(future);
		}
	};

	// ------- array -------

	var Arr = function (array, index) {
		this.value = UNRESOLVED;
		this.listener = null;
		this.param = null;

		this.array = array;
		this.index = index;

		setListener(array[index], setMember, this);
	};

	Arr.prototype = Future.prototype;

	var setMember = function (future, value) {
		if( !(value instanceof Error) ) {
			try {
				var array = future.array;
				array[future.index] = value;

				while( ++future.index < array.length ) {
					value = array[future.index];
					if( isUnresolved(value) ) {
						setListener(value, setMember, future);
						return;
					}
					else {
						array[future.index] = getValue(value);
					}
				}

				value = array;
			}
			catch(error) {
				value = error instanceof Error ? error : new Error(error);
			}
		}

		setValue(future, value);
	};

	var array = function (array) {
		ASSERT(array instanceof Array);

		for( var i = 0; i < array.length; ++i ) {
			if( isUnresolved(array[i]) ) {
				return new Arr(array, i);
			}
		}

		return array;
	};

	// -------

	return {
		adapt: adapt2,
		unadapt: unadapt,
		delay: delay,
		call: call,
		array: array,
		hide: hide
	};
});
