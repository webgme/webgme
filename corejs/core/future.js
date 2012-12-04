/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

define(function() {
	"use strict";

	var ASSERT = function(cond) {
		if (!cond) {
			var error = new Error("future assertion failed");
			console.log(error.stack);
			throw error;
		}
	};

	// ------- Future -------

	var UNRESOLVED = {};

	var Future = function() {
		this.value = UNRESOLVED;
		this.listener = null;
		this.param = null;
	};

	var setValue = function(future, value) {
		ASSERT(future instanceof Future && future.value === UNRESOLVED);

		if (value instanceof Future) {
			setListener(value, setValue, future);
		} else {
			future.value = value;

			if (future.listener !== null) {
				future.listener(future.param, value);
			}
		}
	};

	var setListener = function(future, listener, param) {
		ASSERT(future instanceof Future && future.listener === null
				&& future.value === UNRESOLVED);
		ASSERT(typeof listener === "function" && listener.length === 2);

		future.listener = listener;
		future.param = param;

		if (future.value !== UNRESOLVED) {
			listener(param, future);
		}
	};

	var isUnresolved = function(value) {
		return (value instanceof Future) && value.value === UNRESOLVED;
	};

	var getValue = function(value) {
		if (value instanceof Future) {
			value = value.value;
			if (value instanceof Error) {
				throw value;
			} else {
				return value;
			}
		} else {
			return value;
		}
	};

	// ------- adapt

	var adapt = function(func) {
		ASSERT(typeof func === "function" && func.length >= 1);

		if (func.length === 1) {
			return function() {
				var future = new Future();
				func.call(this, function(error, value) {
					if (error !== null) {
						value = error instanceof Error ? error : new Error(
								error);
					} else {
						ASSERT(!(value instanceof Error));
					}
					setValue(future, value);
				});
				return getValue(future);
			};
		} else if (func.length === 2) {
			return function(arg0) {
				var future = new Future();
				func.call(this, arg0, function(error, value) {
					if (error !== null) {
						value = error instanceof Error ? error : new Error(
								error);
					} else {
						ASSERT(!(value instanceof Error));
					}
					setValue(future, value);
				});
				return getValue(future);
			};
		}
	};

	var delay = function(delay, value) {
		var future = new Future();
		setTimeout(function() {
			setValue(future, value);
		}, delay);
		return future;
	};

	// ------- call -------

	var Func = function(func, that, args, index) {
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

	var setArgument = function(future, value) {
		try {
			var args = future.args;
			args[future.index] = value;

			while (++future.index < args.length) {
				value = getValue(args[future.index]);
				if (value === UNRESOLVED) {
					setListener(args[future.index], setArgument, future);
					return;
				} else {
					args[future.index] = value;
				}
			}

			value = future.func.apply(future.that, future.args);
		} catch (error) {
			value = error instanceof Error ? error : new Error(error);
		}

		setValue(future, value);
	};

	var wrap = function(func) {
		ASSERT(typeof func === "function");

		switch (func.length) {
		case 0:
			return func;

		case 1:
			return function(arg0) {
				ASSERT(arguments.length === 1);
				if (isUnresolved(arg0)) {
					return new Func(func, this, arguments, 0);
				} else {
					return func.call(this, getValue(arg0));
				}
			};

		case 2:
			return function(arg0, arg1) {
				ASSERT(arguments.length === 2);
				if (isUnresolved(arg0)) {
					return new Func(func, this, arguments, 0);
				} else if (isUnresolved(arg1)) {
					return new Func(func, this, arguments, 1);
				} else {
					return func.call(this, arg0, arg1);
				}
			};

		default:
			return function() {
				ASSERT(arguments.length === func.length);
				for ( var i = 0; i < arguments.length; ++i) {
					if (isUnresolved(arguments[i])) {
						return new Func(func, this, arguments, i);
					}
				}
				return func.apply(this, arguments);
			};
		}
	};

	// -------

	return {
		adapt : adapt,
		delay : delay,
		wrap : wrap
	};
});
