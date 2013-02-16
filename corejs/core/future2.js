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

	var current = {
		depth: 0,
		next: 0
	};

	function Future () {
		this.value = UNRESOLVED;
		this.listeners = null;

		this.depth = current.depth + 1;
		this.index = ++current.next;
		this.next = 0;
		this.parent = current;

		this.stack = new Error();

		console.log("future created", getPath(this));
	}

	function getPath (future) {
		var path = [];
		while (future.depth !== 0) {
			path.push(future.index);
			future = future.parent;
		}
		return path;
	}

	function getStack (future) {
		var stack = "";
		while (future.depth !== 0) {
			stack += "*** future ***\n";
			stack += getStackSlice(future.stack.stack);
			future = future.parent;
		}
		return stack;
	}

	function getStackSlice (stack) {
		var end = stack.indexOf("__future__setValue");
		if (end >= 0) {
			end = stack.lastIndexOf("\n", end);
			end = stack.lastIndexOf("\n", end - 1) + 1;
		} else {
			end = undefined;
		}

		var start = stack.indexOf("__future__");
		start = stack.indexOf("\n", start) + 1;

		return stack.substring(start, end);
	}

	function getStackHead (stack, base) {
		ASSERT(base.substring(0, 10) === "__future__");
		
		var start = stack.indexOf(base);
		start = start >= 0 ? stack.lastIndexOf("\n", start) : undefined;

		return stack.substring(0, start);
	}

	function FutureError (future, error, base) {
		this.original = error;
		this.message = error.message;
		this.stack = getStackHead(error.stack, base) + "\n" + getStack(future);

		console.log("future error", getPath(future));
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

	function __future__setValue (future, value) {
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
			console.log("FUTURE ERROR: this should not happen happen");
			console.log(new Error().stack);
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

	// ------- wrap -------

	function wrap (func) {
		ASSERT(typeof func === "function");

		if (typeof func.wrapped === "function") {
			return func.wrapped;
		}

		var wrapped = function __future__wrap () {
			var args = arguments, future = new Future();

			args[args.length++] = function (error, value) {
				if (error) {
					error = error instanceof Error ? error : new Error(error);
					value = error instanceof FutureError ? error : new FutureError(future, error, wrapped.name);
				}
				__future__setValue(future, value);
			};

			func.apply(this, args);

			if (future.value === UNRESOLVED) {
				return future;
			} else if (future.value instanceof FutureError) {
				throw future.value;
			} else {
				return future.value;
			}
		};

		wrapped.unwrapped = func;
		return wrapped;
	}

	// ------- unwrap -------

	function unwrap (func) {
		ASSERT(typeof func === "function");

		if (typeof func.unwrapped === "function") {
			return func.unwrapped;
		}

		var unwrapped = function future_wrap () {
			var args = arguments;

			var callback = args[--args.length];
			ASSERT(typeof callback === "function");

			var value;
			try {
				value = func.apply(this, args);
			} catch (error) {
				setTimeout(callback, 0, error);
				return;
			}

			if (value instanceof Future) {
				if (value.value === UNRESOLVED) {
					addListener(value, function (result) {
						try {
							if (result instanceof FutureError) {
								callback(result);
							} else {
								callback(null, result);
							}
						} catch (err) {
							console.log("FUTURE ERROR: callback should not throw exceptions");
							console.log(err.stack || (err.name + ": " + err.message));
						}
					});
				} else if (value.value instanceof FutureError) {
					setTimeout(callback, 0, value.value);
				} else {
					setTimeout(callback, 0, null, value.value);
				}
			} else {
				setTimeout(callback, 0, null, value);
			}
		};

		unwrapped.wrapped = func;
		return unwrapped;
	}

	// ------- then -------

	function __future__then (value, func) {
		ASSERT(typeof func === "function");

		if (value instanceof Future) {
			if (value.value === UNRESOLVED) {
				addListener(value, function (result) {
					if (result instanceof FutureError) {
						func(result);
					} else {
						func(null, result);
					}
				});
			} else if (value.value instanceof FutureError) {
				func(value.value);
			} else {
				func(null, value.value);
			}
		} else {
			func(null, value);
		}
	}

	// ------- array -------

	function __future__array (array) {
		ASSERT(array instanceof Array);

		var i;
		for (i = 0; i < array.length; ++i) {
			if (array[i] instanceof Future) {
				if (array[i].value === UNRESOLVED) {
					var future = new Future();

					/*jshint loopfunc:true*/
					var setter = function (value) {
						if (value instanceof FutureError) {
							__future__setValue(value);
						} else {
							array[i] = value;

							while (++i < array.length) {
								if (array[i] instanceof Future) {
									if (array[i].value === UNRESOLVED) {
										addListener(array[i], setter);
										return;
									} else if (array[i].value instanceof FutureError) {
										__future__setValue(array[i].value);
										return;
									} else {
										array[i] = array[i].value;
									}
								}
							}

							__future__setValue(future, array);
						}
					};

					addListener(array[i], setter);
					return future;
				} else if (array[i].value instanceof FutureError) {
					throw array[i].value;
				} else {
					array[i] = array[i].value;
				}
			}
		}

		return array;
	}

	// ------- invoke -------

	function __future__invoke (func) {
		ASSERT(typeof func === "function");

		var i, array = arguments;
		array.length -= 1;

		for (i = 0; i < array.length; ++i) {
			array[i] = array[i + 1];

			if (array[i] instanceof Future) {
				if (array[i].value === UNRESOLVED) {
					var future = new Future();

					/*jshint loopfunc:true*/
					var setter = function __future__setter (value) {
						if (value instanceof FutureError) {
							__future__setValue(future, value);
						} else {
							array[i] = value;

							while (++i < array.length) {
								array[i] = array[i + 1];

								if (array[i] instanceof Future) {
									if (array[i].value === UNRESOLVED) {
										addListener(array[i], setter);
										return;
									} else if (array[i].value instanceof FutureError) {
										__future__setValue(future, array[i].value);
										return;
									} else {
										array[i] = array[i].value;
									}
								}
							}

							current = future;
							try {
								value = func.apply(null, array);
							} catch (error) {
								value = (error instanceof FutureError) ? error : new FutureError(future, error, setter.name);
							}
							current = future.parent;

							if (value instanceof Future) {
								if (value.value === UNRESOLVED) {
									addListener(value, function (result) {
										__future__setValue(future, result);
									});
								} else {
									__future__setValue(future, value.value);
								}
							} else {
								__future__setValue(future, value);
							}
						}
					};

					addListener(array[i], setter);
					return future;
				} else if (array[i].value instanceof FutureError) {
					throw array[i].value;
				} else {
					array[i] = array[i].value;
				}
			}
		}

		return func.apply(null, arguments);
	}

	// -------

	return {
		wrap: wrap,
		unwrap: unwrap,
		then: __future__then,
		array: __future__array,
		invoke: __future__invoke
	};
});
