/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

define([ "core/assert", "core/config" ], function (ASSERT, CONFIG) {
	"use strict";

	var MAX_DEPTH = CONFIG.future.maxDepth || 5;

	// ------- future -------

	var UNRESOLVED = {};
	Object.seal(UNRESOLVED);

	function Future () {
		this.value = UNRESOLVED;
		this.listeners = null;
	}

	function setValue (future, value) {
		ASSERT(future instanceof Future && future.value === UNRESOLVED);
		ASSERT(!(value instanceof Future) && value !== UNRESOLVED);

		future.value = value;

		try {
			if (typeof future.listeners === "function") {
				future.listeners(value);
			} else if (future.listeners instanceof Array) {
				var i;
				for (i = 0; i < future.listeners.length; ++i) {
					future.listeners[i](value);
				}
			}
		} catch (err) {
			console.log("This cannot happen");
		}

		future.listeners = null;
	}

	function addListener (future, listener) {
		ASSERT(future instanceof Future && future.value === UNRESOLVED);
		ASSERT(typeof listener === "function");

		if (future.listeners === null) {
			future.listeners = listener;
		} else if (typeof future.listeners === "function") {
			future.listeners = [ future.listeners, listener ];
		} else {
			future.listeners.push(listener);
		}
	}

	// ------- futurify -------

	function futurify (func) {
		ASSERT(typeof func === "function");

		if (typeof func.futurified === "function") {
			return func.futurified;
		}

		var futurified = function () {
			var args = arguments;
			var future = new Future();

			args[args.length++] = function callback (error, value) {
				if (error) {
					value = error instanceof Error ? error : new Error(error);
				}
				setValue(future, value);
			};

			func.apply(this, args);

			if (future.value === UNRESOLVED) {
				return future;
			} else if (future.value instanceof Error) {
				throw future.value;
			} else {
				return future.value;
			}
		};

		futurified.callbackified = func;
		return futurified;
	}

	// ------- callbackify -------

	function callbackify (func) {
		ASSERT(typeof func === "function");

		if (typeof func.callbackified === "function") {
			return func.callbackified;
		}

		var callbackified = function () {
			var args = arguments;

			var callback = args[--args.length];
			ASSERT(typeof callback === "function");

			var value;
			try {
				value = func.apply(this, args);
			} catch (error) {
				setTimeout(callback, 0, null, error);
				return;
			}

			if (value instanceof Future) {
				if (value.value === UNRESOLVED) {
					addListener(value, function (result) {
						if (result instanceof Error) {
							callback(result);
						} else {
							callback(null, result);
						}
					});
				} else if (value.value instanceof Error) {
					setTimeout(callback, 0, null, value.value);
				} else {
					setTimeout(callback, 0, null, null, value.value);
				}
			} else {
				setTimeout(callback, 0, null, null, value);
			}
		};

		callbackified.promisified = func;
		return callbackified;
	}

	// ------- array -------

	function liftArray (array) {
		ASSERT(array instanceof Array);

		var i;
		for (i = 0; i < array.length; ++i) {
			if (array[i] instanceof Future) {
				if (array[i].value === UNRESOLVED) {
					var future = new Future();

					/*jshint loopfunc:true*/
					var setter = function (value) {
						if (value instanceof Error) {
							setValue(future, value);
						} else {
							array[i] = value;

							while (++i < array.length) {
								if (array[i] instanceof Future) {
									if (array[i].value === UNRESOLVED) {
										addListener(array[i], setter);
									} else if (array[i].value instanceof Error) {
										setValue(future, value);
									} else {
										array[i] = array[i].value;
									}
								}
							}
						}
					};

					addListener(array[i], setter);
					return future;
				} else if (array[i].value instanceof Error) {
					throw array[i].value;
				} else {
					array[i] = array[i].value;
				}
			}
		}

		return array;
	}

	// -------

	return {
		futurify: futurify,
		callbackify: callbackify,
//		asyncify: asyncify,
		lift: liftArray
	};
});

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

var call = function () {
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

var Join = function (first, second) {
	this.value = UNRESOLVED;
	this.listener = null;
	this.param = null;

	this.missing = 2;
	setListener(first, setJoinand, this);
	setListener(second, setJoinand, this);
};

Join.prototype = Object.create(Future.prototype);

var setJoinand = function (future, value) {
	if (value instanceof Error) {
		setValue(future, value);
	} else if (--future.missing <= 0) {
		setValue(future, undefined);
	}
};

var join = function (first, second) {
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
