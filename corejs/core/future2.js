/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

define([ "core/assert", "core/config" ], function (ASSERT, CONFIG) {
	"use strict";

	var MAX_DEPTH = CONFIG.future.maxDepth || 5;

	// ------- future -------

	function getLine (name, func) {
		if( func ) {
			return "\n    at " + (func.name || "anonymous") + " (" + name + ")";
		}
		else {
			return "\n    (" + name + ")";
		}
	}

	function FutureError (error, line) {
		this.error = error instanceof FutureError ? error.error : error;
		this.message = error.message;
		this.stack = error.stack;

		if( typeof line !== "undefined" ) {
			this.stack += line;
		}
	}

	FutureError.prototype = Object.create(Error.prototype, {
		name: {
			value: FutureError.name,
			enumerable: true
		},
		constructor: {
			value: FutureError
		}
	});

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
			if( typeof future.listeners === "function" ) {
				future.listeners(value);
			}
			else if( future.listeners instanceof Array ) {
				var i;
				for( i = 0; i < future.listeners.length; ++i ) {
					future.listeners[i](value);
				}
			}
		}
		catch(err) {
			console.log("FUTURE ERROR: this should not happen happen");
		}

		future.listeners = null;
	}

	function addListener (future, listener) {
		ASSERT(future instanceof Future && future.value === UNRESOLVED);
		ASSERT(typeof listener === "function");

		if( future.listeners === null ) {
			future.listeners = listener;
		}
		else if( typeof future.listeners === "function" ) {
			future.listeners = [ future.listeners, listener ];
		}
		else {
			future.listeners.push(listener);
		}
	}

	// ------- futurify -------

	function futurify (func) {
		ASSERT(typeof func === "function");

		if( typeof func.futurified === "function" ) {
			return func.futurified;
		}

		var futurified = function future_futurify () {
			var args = arguments;
			var future = new Future();

			args[args.length++] = function callback (error, value) {
				if( error ) {
					value = error instanceof Error ? error : new Error(error);

					value = new FutureError(value, "\nBacktrace:" + getLine("futurify", func));
				}
				setValue(future, value);
			};

			func.apply(this, args);

			if( future.value === UNRESOLVED ) {
				return future;
			}
			else if( future.value instanceof FutureError ) {
				throw new FutureError(future.value, getLine("rethrown"));
			}
			else {
				return future.value;
			}
		};

		futurified.callbackified = func;
		return futurified;
	}

	// ------- callbackify -------

	function callbackify (func) {
		ASSERT(typeof func === "function");

		if( typeof func.callbackified === "function" ) {
			return func.callbackified;
		}

		var callbackified = function future_callbackify () {
			var args = arguments;

			var callback = args[--args.length];
			ASSERT(typeof callback === "function");

			var value;
			try {
				value = func.apply(this, args);
			}
			catch(error) {
				setTimeout(callback, 0, error);
				return;
			}

			if( value instanceof Future ) {
				if( value.value === UNRESOLVED ) {
					addListener(value, function (result) {
						try {
							if( result instanceof FutureError ) {
								callback(new FutureError(result, getLine("callbackify", func)));
							}
							else {
								callback(null, result);
							}
						}
						catch(err) {
							console.log("FUTURE ERROR: callback should not throw exceptions");
							console.log(err.stack || (err.name + ": " + err.message));
						}
					});
				}
				else if( value.value instanceof FutureError ) {
					setTimeout(callback, 0, new FutureError(value.value, getLine("callbackify",
					func)));
				}
				else {
					setTimeout(callback, 0, null, value.value);
				}
			}
			else {
				setTimeout(callback, 0, null, value);
			}
		};

		callbackified.promisified = func;
		return callbackified;
	}

	// ------- array -------

	function lift (array) {
		ASSERT(array instanceof Array);

		var i;
		for( i = 0; i < array.length; ++i ) {
			if( array[i] instanceof Future ) {
				if( array[i].value === UNRESOLVED ) {
					var future = new Future();

					/*jshint loopfunc:true*/
					var setter = function (value) {
						if( value instanceof FutureError ) {
							setValue(future, new FutureError(value, getLine("lift")));
						}
						else {
							array[i] = value;

							while( ++i < array.length ) {
								if( array[i] instanceof Future ) {
									if( array[i].value === UNRESOLVED ) {
										addListener(array[i], setter);
										return;
									}
									else if( array[i].value instanceof FutureError ) {
										setValue(future, new FutureError(array[i].value,
										getLine("lift")));
										return;
									}
									else {
										array[i] = array[i].value;
									}
								}
							}

							setValue(future, array);
						}
					};

					addListener(array[i], setter);
					return future;
				}
				else if( array[i].value instanceof FutureError ) {
					throw new FutureError(array[i].value, getLine("rethrown at lift"));
				}
				else {
					array[i] = array[i].value;
				}
			}
		}

		return array;
	}

	// ------- async -------

	function async (func) {
		ASSERT(typeof func === "function");

		return function wrapper () {
			var i, array = arguments;
			for( i = 0; i < array.length; ++i ) {
				if( array[i] instanceof Future ) {
					if( array[i].value === UNRESOLVED ) {
						var future = new Future(), that = this;

						/*jshint loopfunc:true*/
						var setter = function (value) {
							if( value instanceof FutureError ) {
								setValue(future, new FutureError(value, getLine("async", func)));
							}
							else {
								array[i] = value;

								while( ++i < array.length ) {
									if( array[i] instanceof Future ) {
										if( array[i].value === UNRESOLVED ) {
											addListener(array[i], setter);
											return;
										}
										else if( array[i].value instanceof FutureError ) {
											setValue(future, new FutureError(array[i].value,
											getLine("async", func)));
											return;
										}
										else {
											array[i] = array[i].value;
											console.log(arguments);
										}
									}
								}

								try {
									value = func.apply(that, array);
								}
								catch(error) {
									value = error;
								}
								setValue(future, value);
							}
						};

						addListener(array[i], setter);
						return future;
					}
					else if( array[i].value instanceof FutureError ) {
						throw new FutureError(array[i].value, getLine("rethrow async", func));
					}
					else {
						array[i] = array[i].value;
					}
				}
			}

			return func.apply(this, arguments);
		};
	}

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
		if( value instanceof Error ) {
			setValue(future, value);
		}
		else if( --future.missing <= 0 ) {
			setValue(future, undefined);
		}
	};

	var join = function (first, second) {
		if( getValue(first) instanceof Future ) {
			if( getValue(second) instanceof Future ) {
				if( first instanceof Join ) {
					first.missing += 1;
					setListener(second, setJoinand, first);
					return first;
				}
				else if( second instanceof Join ) {
					second.missing += 1;
					setListener(first, setJoinand, second);
					return second;
				}
				else {
					return new Join(first, second);
				}
			}
			else {
				return first;
			}
		}
		else {
			return getValue(second);
		}
	};

	// -------

	return {
		futurify: futurify,
		callbackify: callbackify,
		lift: lift,
		async: async
	};
});
