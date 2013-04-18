/**
 * The MIT License (MIT)
 * Copyright (c) 2013, Miklos Maroti
 */

(function () {
	"use strict";

	// ------- assert -------

	var TASYNC_TRACE_ENABLE = true;

	function setTrace (value) {
		TASYNC_TRACE_ENABLE = value;
	}

	function assert (cond) {
		if (!cond) {
			throw new Error("tasync internal error");
		}
	}

	// ------- Future -------

	var STATE_LISTEN = 0;
	var STATE_REJECTED = 1;
	var STATE_RESOLVED = 2;

	var Future = function () {
		this.state = STATE_LISTEN;
		this.value = [];
	};

	Future.prototype.register = function (target) {
		assert(this.state === STATE_LISTEN);
		assert(typeof target === "object" && target != null);

		this.value.push(target);
	};

	Future.prototype.resolve = function (value) {
		assert(this.state === STATE_LISTEN && !(value instanceof Future));

		var listeners = this.value;

		this.state = STATE_RESOLVED;
		this.value = value;

		var i;
		for (i = 0; i < listeners.length; ++i) {
			listeners[i].onResolved(value);
		}
	};

	Future.prototype.reject = function (error) {
		assert(this.state === STATE_LISTEN && error instanceof Error);

		var listeners = this.value;

		this.state = STATE_REJECTED;
		this.value = error;

		var i;
		for (i = 0; i < listeners.length; ++i) {
			listeners[i].onRejected(error);
		}
	};

	// ------- Delay -------

	function delay (timeout, value) {
		if (timeout < 0) {
			return value;
		}

		var future = new Future();
		setTimeout(function () {
			future.resolve(value);
		}, timeout);
		return future;
	}

	// ------- Array -------

	var ArrayFuture = function (array, index) {
		Future.call(this);

		this.array = array;
		this.index = index;
	};

	ArrayFuture.prototype = Object.create(Future.prototype);

	ArrayFuture.prototype.onResolved = function (value) {
		assert(this.state === STATE_LISTEN);

		var array = this.array;
		array[this.index] = value;

		while (++this.index < array.length) {
			value = array[this.index];
			if (value instanceof Future) {
				if (value.state === STATE_RESOLVED) {
					array[this.index] = value.value;
				} else if (value.state === STATE_LISTEN) {
					value.register(this);
					return;
				} else {
					assert(value.state === STATE_REJECTED);
					this.reject(value.value);
					return;
				}
			}
		}

		this.array = null;
		this.resolve(array);
	};

	ArrayFuture.prototype.onRejected = function (error) {
		this.array = null;
		this.reject(error);
	};

	var array = function (array) {
		assert(array instanceof Array);

		var index;
		for (index = 0; index < array.length; ++index) {
			var value = array[index];
			if (value instanceof Future) {
				if (value.state === STATE_RESOLVED) {
					array[index] = value.value;
				} else if (value.state === STATE_LISTEN) {
					var future = new ArrayFuture(array, index);
					value.register(future);
					return future;
				} else {
					assert(value.state === STATE_REJECTED);
					throw value.value;
				}
			}
		}

		return array;
	};

	// ------- Apply -------

	var ROOT = {
		subframes: 0
	};

	var FRAME = ROOT;

	function ApplyFuture (func, that, args, index) {
		Future.call(this);

		this.caller = FRAME;
		this.position = ++FRAME.subframes;
		this.subframes = 0;

		if (TASYNC_TRACE_ENABLE) {
			this.trace = new Error();
		}

		this.func = func;
		this.that = that;
		this.args = args;
		this.index = index;
	}

	ApplyFuture.prototype = Object.create(Future.prototype);

	ApplyFuture.prototype.getPath = function () {
		var future = this.caller, path = [ this.position ];

		while (future !== ROOT) {
			path.push(future.position);
			future = future.caller;
		}

		return path;
	};

	function getSlice (trace) {
		assert(typeof trace === "string");

		var end = trace.indexOf("_trace_start");
		if (end >= 0) {
			end = trace.lastIndexOf("\n", end) + 1;
		} else {
			if (trace.charAt(trace.length - 1) !== "\n") {
				// trace += "\n";
			}
			end = undefined;
		}

		var start = trace.indexOf("_trace_end");
		if (start >= 0) {
			start = trace.indexOf("\n", start) + 1;
		} else {
			start = 0;
		}

		return trace.substring(start, end);
	}

	ApplyFuture.prototype.onRejected = function (error) {
		this.args = null;
		this.reject(error);
	};

	ApplyFuture.prototype.onResolved = function apply_on_resolved_trace_start (value) {
		assert(this.state === STATE_LISTEN);

		var args = this.args;
		args[this.index] = value;

		while (--this.index >= 0) {
			value = args[this.index];
			if (value instanceof Future) {
				if (value.state === STATE_RESOLVED) {
					args[this.index] = value.value;
				} else if (value.state === STATE_LISTEN) {
					value.register(this);
					return;
				} else {
					assert(value.state === STATE_REJECTED);
					this.reject(value.value);
					return;
				}
			}
		}

		assert(FRAME === ROOT);
		FRAME = this;

		this.args = null;
		try {
			value = this.func.apply(this.that, args);
		} catch (error) {
			FRAME = ROOT;

			value = error instanceof Error ? error : new Error(error);

			if (TASYNC_TRACE_ENABLE) {
				value.trace = getSlice(value.stack);
				var future = this;
				do {
					value.trace += "*** callback ***\n";
					value.trace += getSlice(future.trace.stack);
					future = future.caller;
				} while (future !== ROOT);
			}

			this.reject(value);
			return;
		}

		FRAME = ROOT;

		if (value instanceof Future) {
			assert(value.state === STATE_LISTEN);

			this.onResolved = this.resolve;
			value.register(this);
		} else {
			this.resolve(value);
		}
	};

	var apply = function apply_trace_end (func, args, that) {
		assert(typeof func === "function" && args instanceof Array);

		var index = args.length;
		while (--index >= 0) {
			var value = args[index];
			if (value instanceof Future) {
				if (value.state === STATE_LISTEN) {
					var future = new ApplyFuture(func, that, args, index);
					value.register(future);
					return future;
				} else if (value.state === STATE_RESOLVED) {
					args[index] = value.value;
				} else {
					assert(value.state === STATE_REJECTED);
					throw value.value;
				}
			}
		}

		return func.apply(that, args);
	};

	// ------- Then -------

	function ThenFuture (func, that, value) {
		ApplyFuture.call(this, func, that, [ null, value ], 1);
	}

	ThenFuture.prototype = Object.create(ApplyFuture.prototype);

	ThenFuture.prototype.onRejected = function (error) {
		this.args[0] = error;
		this.onResolved(null);
	};

	function then (value, func, that) {
		assert(typeof func === "function");

		if (value instanceof Future) {
			if (value.state === STATE_LISTEN) {
				var future = new ThenFuture(func, that, value);
				value.register(future);
				return future;
			} else if (value.state instanceof STATE_RESOLVED) {
				return func(null, value.value);
			} else {
				assert(value.state === STATE_REJECTED);
				return func(value.value);
			}
		} else {
			return func(null, value);
		}
	}

	// ------- Adapt -------

	function adapt (func) {
		assert(typeof func === "function");

		if (typeof func.tasync_adapted === "undefined") {
			func.tasync_adapted = function () {
				var args = arguments;
				var future = new Future();

				args[args.length++] = function (error, value) {
					if (error) {
						future.reject(error instanceof Error ? error : new Error(error));
					} else {
						future.resolve(value);
					}
				};

				func.apply(this, args);

				if (future.state === STATE_LISTEN) {
					return future;
				} else if (future.state === STATE_RESOLVED) {
					return future.value;
				} else {
					assert(future.state === STATE_REJECTED);
					throw future.value;
				}
			};

			func.tasync_adapted.tasync_unadapted = func;
		}

		return func.tasync_adapted;
	}

	// ------- Unadapt -------

	function UnadaptListener (callback) {
		this.callback = callback;
	}

	UnadaptListener.prototype.onRejected = function (error) {
		this.callback(error);
	};

	UnadaptListener.prototype.onResolved = function (value) {
		this.callback(null, value);
	};

	function unadapt (func) {
		assert(typeof func === "function");

		if (typeof func.tasync_unadapted === "undefined") {
			func.tasync_unadapted = function () {
				var args = arguments;

				var callback = args[--args.length];
				assert(typeof callback === "function");

				var value;
				try {
					value = func.apply(this, args);
				} catch (error) {
					callback(error);
					return;
				}

				if (value instanceof Future) {
					assert(value.state === STATE_LISTEN);

					var listener = new UnadaptListener(callback);
					value.register(listener);
				} else {
					callback(null, value);
				}
			};

			func.tasync_unadapted.tasync_adapted = func;
		}

		return func.tasync_unadapted;
	}

	// ------- Throttle -------

	function ThrottleFuture (func, that, args) {
		Future.call(this);

		this.func = func;
		this.that = that;
		this.args = args;

		this.caller = FRAME;
		this.position = ++FRAME.subframes;

		this.path = this.getPath();
	}

	ThrottleFuture.prototype = Object.create(Future.prototype);

	ThrottleFuture.prototype.execute = function () {
		var value;
		try {
			assert(FRAME === ROOT);
			FRAME = this;

			value = this.func.apply(this.that, this.args);

			FRAME = ROOT;
		} catch (error) {
			FRAME = ROOT;

			this.reject(error);
			return;
		}

		if (value instanceof Future) {
			assert(value.state === STATE_LISTEN);
			value.register(this);
		} else {
			this.resolve(value);
		}
	};

	ThrottleFuture.prototype.getPath = ApplyFuture.prototype.getPath;
	ThrottleFuture.prototype.onResolved = Future.prototype.resolve;
	ThrottleFuture.prototype.onRejected = Future.prototype.reject;

	ThrottleFuture.prototype.compare = function (second) {
		var first = this.path;
		second = second.path;

		var i, limit = first.length < second.length ? first.length : second.length;
		for (i = 0; i < limit; ++i) {
			if (first[i] !== second[i]) {
				return first[i] - second[i];
			}
		}

		return first.length - second.length;
	};

	function ThrottleListener (limit) {
		this.running = 0;
		this.limit = limit;
		this.queue = [];
	}

	function priorityQueueInsert (queue, elem) {
		var low = 0;
		var high = queue.length;

		while (low < high) {
			var mid = Math.floor((low + high) / 2);
			assert(low <= mid && mid < high);

			if (elem.compare(queue[mid]) < 0) {
				low = mid + 1;
			} else {
				high = mid;
			}
		}

		queue.splice(low, 0, elem);
	}

	ThrottleListener.prototype.execute = function (func, that, args) {
		if (this.running < this.limit) {
			var value = func.apply(that, args);

			if (value instanceof Future) {
				assert(value.state === STATE_LISTEN);

				++this.running;
				value.register(this);
			}

			return value;
		} else {
			var future = new ThrottleFuture(func, that, args);
			priorityQueueInsert(this.queue, future);

			return future;
		}
	};

	ThrottleListener.prototype.onResolved = function () {
		if (this.queue.length > 0) {
			var future = this.queue.pop();
			future.register(this);

			future.execute();
		} else {
			--this.running;
		}
	};

	ThrottleListener.prototype.onRejected = ThrottleListener.prototype.onResolved;

	// TODO: prevent recursion, otheriwise throttle will not work
	function throttle (func, limit) {
		assert(typeof func === "function" && typeof limit === "number");

		var listener = new ThrottleListener(limit);

		return function () {
			return listener.execute(func, this, arguments);
		};
	}

	// ------- TASYNC -------

	var TASYNC = {
		setTrace: setTrace,
		delay: delay,
		array: array,
		apply: apply,
		then: then,
		adapt: adapt,
		unadapt: unadapt,
		throttle: throttle
	};

	if (typeof define === "function" && define.amd) {
		define([], function () {
			return TASYNC;
		});
	} else {
		module.exports = TASYNC;
	}
}());
