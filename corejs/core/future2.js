/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

define([ "core/assert", "core/config" ], function (ASSERT, CONFIG) {
	"use strict";

	var MAX_DEPTH = CONFIG.future.maxDepth || 5;
	var DEBUG = true;

	// ------- future -------

	var getCaller = DEBUG ? function () {
		var i, trace = new Error().stack.split("\n");
		for (i = 0; i < trace.length - 1; ++i) {
			if (trace[i].indexOf("__future__") >= 0) {
				return trace[i + 1];
			}
		}
		return "unknown";
	} : function () {
	};

	function FutureError (error, name, func) {
		this.error = error instanceof FutureError ? error.error : error;
		this.message = error.message;
		this.stack = error.stack;

		if (this.error === error) {
			this.stack += "\nFuture Backtrace:";
		}

		if (typeof func === "function") {
			name += ": around " + (func.name || "anonymous");
		} else if (typeof func === "string") {
			name += ": " + func.trim();
		}

		this.stack += "\n    " + name;
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

		var wrapped = function __future__wrapped () {
			var args = arguments, future = new Future(), caller = getCaller();

			args[args.length++] = function callback (error, value) {
				if (error) {
					value = error instanceof Error ? error : new Error(error);

					value = new FutureError(value, "wrap", caller || func);
				}
				setValue(future, value);
			};

			func.apply(this, args);

			if (future.value === UNRESOLVED) {
				return future;
			} else if (future.value instanceof FutureError) {
				throw new FutureError(future.value, "wrap", getCaller() || func);
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
								callback(new FutureError(result, "unwrap", func));
							} else {
								callback(null, result);
							}
						} catch (err) {
							console.log("FUTURE ERROR: callback should not throw exceptions");
							console.log(err.stack || (err.name + ": " + err.message));
						}
					});
				} else if (value.value instanceof FutureError) {
					setTimeout(callback, 0, new FutureError(value.value, "unwrap", func));
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
				var caller = getCaller();
				addListener(value, function (result) {
					if (result instanceof FutureError) {
						func(new FutureError(result, "then", caller || func));
					} else {
						func(null, result);
					}
				});
			} else if (value.value instanceof FutureError) {
				func(new FutureError(value.value, "then", getCaller() || func));
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
					var future = new Future(), caller = getCaller();

					/*jshint loopfunc:true*/
					var setter = function (value) {
						if (value instanceof FutureError) {
							setValue(future, new FutureError(value, "array", caller));
						} else {
							array[i] = value;

							while (++i < array.length) {
								if (array[i] instanceof Future) {
									if (array[i].value === UNRESOLVED) {
										addListener(array[i], setter);
										return;
									} else if (array[i].value instanceof FutureError) {
										setValue(future, new FutureError(array[i].value, "array", caller));
										return;
									} else {
										array[i] = array[i].value;
									}
								}
							}

							setValue(future, array);
						}
					};

					addListener(array[i], setter);
					return future;
				} else if (array[i].value instanceof FutureError) {
					throw new FutureError(array[i].value, "array", getCaller());
				} else {
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
			for (i = 0; i < array.length; ++i) {
				if (array[i] instanceof Future) {
					if (array[i].value === UNRESOLVED) {
						var future = new Future(), that = this;

						/*jshint loopfunc:true*/
						var setter = function (value) {
							if (value instanceof FutureError) {
								setValue(future, new FutureError(value, "async", func));
							} else {
								array[i] = value;

								while (++i < array.length) {
									if (array[i] instanceof Future) {
										if (array[i].value === UNRESOLVED) {
											addListener(array[i], setter);
											return;
										} else if (array[i].value instanceof FutureError) {
											setValue(future, new FutureError(array[i].value, "async", func));
											return;
										} else {
											array[i] = array[i].value;
											console.log(arguments);
										}
									}
								}

								try {
									value = func.apply(that, array);
								} catch (error) {
									value = new FutureError(error, "async", func);
								}
								setValue(future, value);
							}
						};

						addListener(array[i], setter);
						return future;
					} else if (array[i].value instanceof FutureError) {
						throw new FutureError(array[i].value, "async", func);
					} else {
						array[i] = array[i].value;
					}
				}
			}

			return func.apply(this, arguments);
		};
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
					var future = new Future(), caller = getCaller();

					/*jshint loopfunc:true*/
					var setter = function (value) {
						if (value instanceof FutureError) {
							setValue(future, new FutureError(value, "invoke." + i, caller || func));
						} else {
							array[i] = value;

							while (++i < array.length) {
								array[i] = array[i + 1];

								if (array[i] instanceof Future) {
									if (array[i].value === UNRESOLVED) {
										addListener(array[i], setter);
										return;
									} else if (array[i].value instanceof FutureError) {
										setValue(future, new FutureError(array[i].value, "invoke." + i, caller || func));
										return;
									} else {
										array[i] = array[i].value;
										console.log(arguments);
									}
								}
							}

							try {
								value = func.apply(null, array);
							} catch (error) {
								value = new FutureError(error, "invoke.call", caller || func);
							}
							setValue(future, value);
						}
					};

					addListener(array[i], setter);
					return future;
				} else if (array[i].value instanceof FutureError) {
					throw new FutureError(array[i].value, "invoke." + i, getCaller() || func);
				} else {
					array[i] = array[i].value;
				}
			}
		}

		return func.apply(null, arguments);
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

	// -------

	return {
		wrap: wrap,
		unwrap: unwrap,
		then: __future__then,
		array: __future__array,
		async: async,
		invoke: __future__invoke
	};
});
