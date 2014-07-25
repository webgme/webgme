/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

define([ "util/assert" ], function (ASSERT) {
	"use strict";

	var MAX_DEPTH = 5;

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

	function future_array (arr) {
		ASSERT(typeof arr === "object" && typeof arr.length === "number");

		for ( var i = 0; i < arr.length; ++i) {
			if (arr[i] instanceof Future) {
				if (arr[i].value === UNRESOLVED) {
					var future = new Future();

					/*jshint loopfunc:true*/
					var setter = function (value) {
						if (value instanceof FutureError) {
							__future__setValue(future, value);
						} else {
							arr[i] = value;

							while (++i < arr.length) {
								if (arr[i] instanceof Future) {
									if (arr[i].value === UNRESOLVED) {
										addListener(arr[i], setter);
										return;
									} else if (arr[i].value instanceof FutureError) {
										__future__setValue(arr[i].value);
										return;
									} else {
										arr[i] = arr[i].value;
									}
								}
							}

							__future__setValue(future, arr);
						}
					};

					addListener(arr[i], setter);
					return future;
				} else if (arr[i].value instanceof FutureError) {
					throw arr[i].value;
				} else {
					arr[i] = arr[i].value;
				}
			}
		}

		return arr;
	}

	// ------- ncall -------

	function future_ncall (func, obj) {
		ASSERT(typeof func === "function");

		var future = new Future();
		var callback = function (err, value) {
			if (err) {
				err = err instanceof Error ? err : new Error(err);
				value = err instanceof FutureError ? err : new FutureError(future, err, "__future__");
			}
			__future__setValue(future, err);
		};

		var args = arguments;
		args[args.length] = arguments[1];

		for ( var i = 2; i <= args.length; ++i) {
			if (args[i] instanceof Future) {
				if (args[i].value === UNRESOLVED) {

					/*jshint loopfunc:true*/
					var setter = function (value) {
						if (value instanceof FutureError) {
							__future__setValue(future, value);
						} else {
							args[i - 2] = value;

							while (++i <= args.length) {
								if (args[i] instanceof Future) {
									if (args[i].value === UNRESOLVED) {
										addListener(args[i], setter);
										return;
									} else if (args[i].value instanceof FutureError) {
										__future__setValue(future, args[i].value);
										return;
									} else {
										args[i - 2] = args[i].value;
									}
								} else {
									args[i - 2] = args[i];
								}
							}

							obj = args[args.length - 2];
							args[args.length - 2] = callback;
							args.length -= 1;

							try {
								current = future;
								func.apply(obj, args);
								current = future.parent;
							} catch (err) {
								current = future.parent;
								value = err instanceof Error ? err : new Error(err);
								__future__setValue(future, (value instanceof FutureError) ? value : new FutureError(future, value, "__future__"));
							}
						}
					};

					addListener(args[i], setter);
					return future;
				} else if (args[i].value instanceof FutureError) {
					throw args[i].value;
				} else {
					args[i - 2] = args[i].value;
				}
			} else {
				args[i - 2] = args[i];
			}
		}

		obj = args[args.length - 2];
		args[args.length - 2] = callback;
		args.length -= 1;

		current = future;
		try {
			func.apply(obj, args);
		} finally {
			current = future.parent;
		}

		if (future.value === UNRESOLVED) {
			return future;
		} else if (future.value instanceof FutureError) {
			throw future.value;
		} else {
			return future.value;
		}
	}

	// ------- fcall -------

	function future_fcall (func, obj) {
		ASSERT(typeof func === "function");

		var args = arguments;
		args[args.length] = arguments[1];

		for ( var i = 2; i <= args.length; ++i) {
			if (args[i] instanceof Future) {
				if (args[i].value === UNRESOLVED) {
					var future = new Future();

					/*jshint loopfunc:true*/
					var setter = function (value) {
						if (value instanceof FutureError) {
							__future__setValue(future, value);
						} else {
							args[i - 2] = value;

							while (++i <= args.length) {
								if (args[i] instanceof Future) {
									if (args[i].value === UNRESOLVED) {
										addListener(args[i], setter);
										return;
									} else if (args[i].value instanceof FutureError) {
										__future__setValue(future, args[i].value);
										return;
									} else {
										args[i - 2] = args[i].value;
									}
								} else {
									args[i - 2] = args[i];
								}
							}

							args.length -= 2;
							obj = args[args.length];

							try {
								current = future;
								value = func.apply(obj, args);
								current = future.parent;
							} catch (err) {
								current = future.parent;
								value = err instanceof Error ? err : new Error(err);
								__future__setValue(future, (value instanceof FutureError) ? value : new FutureError(future, value, "__future__"));
							}

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

					addListener(args[i], setter);
					return future;
				} else if (args[i].value instanceof FutureError) {
					throw args[i].value;
				} else {
					args[i - 2] = args[i].value;
				}
			} else {
				args[i - 2] = args[i];
			}
		}

		args.length -= 2;
		obj = args[args.length];

		return func.apply(obj, args);
	}

	// ------- join -------

	function future_join (left, right) {
		// TODO: do it in general
		ASSERT(!(left instanceof Future));

		if (left instanceof Future && left.value instanceof FutureError) {
			throw left.value;
		} else if (right instanceof Future) {
			if (right.value === UNRESOLVED) {
				var future = new Future();
				addListener(right, function (value) {
					__future__setValue(future, value instanceof FutureError ? value : left);
				});
				return future;
			} else if (right.value instanceof FutureError) {
				throw right.value;
			}
		}

		return left;
	}

	// -------

	return {
		array: future_array,
		ncall: future_ncall,
		fcall: future_fcall,
		join: future_join,

		wrap: wrap,
		unwrap: unwrap,
		then: __future__then
	};
});
