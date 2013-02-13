/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

define([ "core/assert", "core/config" ], function(ASSERT, CONFIG) {
	"use strict";

	var MAX_DEPTH = CONFIG.future.maxDepth || 5;

	// ------- future -------

	var UNRESOLVED = {};
	Object.seal(UNRESOLVED);

	function Future() {
		this.value = UNRESOLVED;
		this.listeners = null;
	}

	function setValue(future, value) {
		ASSERT(future instanceof Future && future.value === UNRESOLVED);
		ASSERT(!(value instanceof Future) && value !== UNRESOLVED);

		future.value = value;

		if (typeof future.listeners === "function") {
			future.listeners(value);
		} else if (future.listeners instanceof Array) {
			for ( var i = 0; i < future.listeners.length; ++i) {
				future.listeners[i](value);
			}
		}

		future.listeners = null;
	}

	function addListener(future, listener) {
		ASSERT(future instanceof Future && future.value === UNDEFINED);
		ASSERT(typeof listener === "function" && listener.length === 1);

		if (future.value !== UNDEFINED) {
			listener(future.value);
		} else if (future.listeners === null) {
			future.listeners = listener;
		} else if (typeof future.listeners === "function") {
			future.listeners = [ future.listeners, listener ];
		} else {
			future.listeners.push(listener);
		}
	}

	function getValue(value) {
		if (value instanceof Future) {
			if (value.value instanceof Error) {
				throw value.value;
			} else if (value.value !== UNRESOLVED) {
				return value.value;
			}
		}

		return value;
	}

	// ------- promisify -------

	function promisify(func) {
		ASSERT(typeof func === "function");

		if (typeof func.promisified === "function") {
			return func.promisified;
		}

		var promisified = function() {
			var args = arguments;
			var future = new Future();

			args[args.length++] = function callback(error, value) {
				if (error) {
					value = error instanceof Error ? error : new Error(error);
				}
				setValue(future, value);
			};

			func.apply(this, args);

			return getValue(future);
		};

		func.promisified = promisified;
		promisified.callbackified = func;

		return promisified;
	}

	// ------- callbackify -------

	function callbackify(func) {
		ASSERT(typeof func === "function");

		if (typeof func.callbackified === "function") {
			return func.callbackified;
		}

		var callbackified;
		if (func.length === 0) {
			callbackified = function(callback) {
				var value;
				try {
					value = func.call(this);
				} catch (error) {
					callback(error);
					return;
				}
				returnValue(callback, value);
			};
		} else if (func.length === 1) {
			callbackified = function(arg, callback) {
				var value;
				try {
					value = func.call(this, arg);
				} catch (error) {
					callback(error);
					return;
				}
				returnValue(callback, value);
			};
		} else {
			callbackified = function() {
				var args = arguments;

				var callback = args[--args.length];
				ASSERT(typeof callback === "function");

				var value;
				try {
					value = func.apply(this, args);
				} catch (error) {
					callback(error);
					return;
				}
				returnValue(callback, value);
			};
		}

		func.callbackified = callbackified;
		callbackified.promisified = func;

		return callbackified;
	}

	var returnCallback = function(callback, value) {
		if (value instanceof Error) {
			callback(value);
		} else {
			callback(null, value);
		}
	};

	var calldepth = 0;
	var returnValue = function(callback, value) {
		ASSERT(!(value instanceof Error));

		if (isUnresolved(value)) {
			setListener(value, returnCallback, callback);
		} else if (calldepth < maxDepth) {
			++calldepth;
			try {
				callback(null, value);
			} catch (error) {
				--calldepth;
				throw error;
			}
			--calldepth;
		} else {
			setTimeout(callback, 0, null, value);
		}
	};

	var delay = function(delay, value) {
		var future = new Future();
		setTimeout(setValue, delay, future, value);
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
		if (!(value instanceof Error)) {
			try {
				var args = future.args;
				args[future.index] = value;

				while (++future.index < args.length) {
					value = args[future.index];
					if (isUnresolved(value)) {
						setListener(value, setArgument, future);
						return;
					} else {
						args[future.index] = getValue(value);
					}
				}

				value = future.func.apply(future.that, args);
				ASSERT(!(value instanceof Error));
			} catch (error) {
				value = error instanceof Error ? error : new Error(error);
			}
		}

		setValue(future, value);
	};

	var call = function() {
		var args = arguments;

		var func = args[--args.length];
		ASSERT(typeof func === "function");

		for ( var i = 0; i < args.length; ++i) {
			if (isUnresolved(args[i])) {
				return new Func(func, this, args, i);
			} else {
				args[i] = getValue(args[i]);
			}
		}
		return func.apply(this, args);
	};

	// ------- join -------

	var Join = function(first, second) {
		this.value = UNRESOLVED;
		this.listener = null;
		this.param = null;

		this.missing = 2;
		setListener(first, setJoinand, this);
		setListener(second, setJoinand, this);
	};

	Join.prototype = Object.create(Future.prototype);

	var setJoinand = function(future, value) {
		if (value instanceof Error) {
			setValue(future, value);
		} else if (--future.missing <= 0) {
			setValue(future, undefined);
		}
	};

	var join = function(first, second) {
		if (getValue(first) instanceof Future) {
			if (getValue(second) instanceof Future) {
				if (first instanceof Join) {
					first.missing += 1;
					setListener(second, setJoinand, first);
					return first;
				} else if (second instanceof Join) {
					second.missing += 1;
					setListener(first, setJoinand, second);
					return second;
				} else {
					return new Join(first, second);
				}
			} else {
				return first;
			}
		} else {
			return getValue(second);
		}
	};

	// ------- array -------

	var Arr = function(array, index) {
		this.value = UNRESOLVED;
		this.listener = null;
		this.param = null;

		this.array = array;
		this.index = index;

		setListener(array[index], setMember, this);
	};

	Arr.prototype = Future.prototype;

	var setMember = function(future, value) {
		if (!(value instanceof Error)) {
			try {
				var array = future.array;
				array[future.index] = value;

				while (++future.index < array.length) {
					value = array[future.index];
					if (isUnresolved(value)) {
						setListener(value, setMember, future);
						return;
					} else {
						array[future.index] = getValue(value);
					}
				}

				value = array;
			} catch (error) {
				value = error instanceof Error ? error : new Error(error);
			}
		}

		setValue(future, value);
	};

	var array = function(array) {
		ASSERT(array instanceof Array);

		for ( var i = 0; i < array.length; ++i) {
			if (isUnresolved(array[i])) {
				return new Arr(array, i);
			}
		}

		return array;
	};

	// -------

	return {
		adapt : adapt,
		unadapt : unadapt,
		delay : delay,
		call : call,
		array : array,
		join : join,
		hide : hide
	};
});
