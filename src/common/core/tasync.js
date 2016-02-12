/*globals define*/
/*jshint node: true, browser: true, camelcase: false*/

/**
 * @author mmaroti / https://github.com/mmaroti
 */

(function () {
    'use strict';

    // ------- assert -------

    var TASYNC_TRACE_ENABLE = true;

    function setTrace(value) {
        TASYNC_TRACE_ENABLE = value;
    }

    function assert(cond) {
        if (!cond) {
            throw new Error('tasync internal error');
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
        assert(typeof target === 'object' && target !== null);

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

    function delay(timeout, value) {
        if (timeout < 0) {
            return value;
        }

        var future = new Future();
        setTimeout(function () {
            future.resolve(value);
        }, timeout);
        return future;
    }

    // ------- Lift -------

    var FutureLift = function (array, index) {
        Future.call(this);

        this.array = array;
        this.index = index;
    };

    FutureLift.prototype = Object.create(Future.prototype);

    FutureLift.prototype.onResolved = function (value) {
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

    FutureLift.prototype.onRejected = function (error) {
        this.array = null;
        this.reject(error);
    };

    var lift = function (array) {
        if (!(array instanceof Array)) {
            throw new Error('array argument is expected');
        }

        var index;
        for (index = 0; index < array.length; ++index) {
            var value = array[index];
            if (value instanceof Future) {
                if (value.state === STATE_RESOLVED) {
                    array[index] = value.value;
                } else if (value.state === STATE_LISTEN) {
                    var future = new FutureLift(array, index);
                    value.register(future);
                    return future;
                } else {
                    assert(value.state === STATE_REJECTED);
                    return value;
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

    var FutureApply = function tasync_trace_end(func, that, args, index) {
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
    };

    FutureApply.prototype = Object.create(Future.prototype);

    FutureApply.prototype.getPath = function () {
        var future = this.caller,
            path = [this.position];

        while (future !== ROOT) {
            path.push(future.position);
            future = future.caller;
        }

        return path;
    };

    function getSlice(trace) {
        assert(typeof trace === 'string');

        var end = trace.indexOf('tasync_trace_start');
        if (end >= 0) {
            end = trace.lastIndexOf('\n', end) + 1;
        } else {
            if (trace.charAt(trace.length - 1) !== '\n') {
                // trace += '\n';
            }
            end = undefined;
        }

        var start = trace.indexOf('tasync_trace_end');
        if (start >= 0) {
            start = trace.indexOf('\n', start) + 1;
            if (start >= 0) {
                start = trace.indexOf('\n', start) + 1;
            }
        } else {
            start = 0;
        }

        return trace.substring(start, end);
    }

    function createError(error, future) {
        if (!(error instanceof Error)) {
            error = new Error(error);
        }

        if (TASYNC_TRACE_ENABLE) {
            error.trace = getSlice(error.stack);
            do {
                error.trace += '*** callback ***\n';
                error.trace += getSlice(future.trace.stack);
                future = future.caller;
            } while (future !== ROOT);
        }

        return error;
    }

    FutureApply.prototype.onRejected = function (error) {
        this.args = null;
        this.reject(error);
    };

    FutureApply.prototype.onResolved = function tasync_trace_start(value) {
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

            this.reject(createError(error, this));
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

    var apply = function (func, args, that) {
        if (typeof func !== 'function') {
            throw new Error('function argument is expected');
        } else if (!(args instanceof Array)) {
            throw new Error('array argument is expected');
        }

        var index = args.length;
        while (--index >= 0) {
            var value = args[index];
            if (value instanceof Future) {
                if (value.state === STATE_LISTEN) {
                    var future = new FutureApply(func, that, args, index);
                    value.register(future);
                    return future;
                } else if (value.state === STATE_RESOLVED) {
                    args[index] = value.value;
                } else {
                    assert(value.state === STATE_REJECTED);
                    return value;
                }
            }
        }

        return func.apply(that, args);
    };

    // ------- Call -------

    var FutureCall = function tasync_trace_end(args, index) {
        Future.call(this);

        this.caller = FRAME;
        this.position = ++FRAME.subframes;
        this.subframes = 0;

        if (TASYNC_TRACE_ENABLE) {
            this.trace = new Error();
        }

        this.args = args;
        this.index = index;
    };

    FutureCall.prototype = Object.create(Future.prototype);

    FutureCall.prototype.getPath = FutureApply.prototype.getPath;
    FutureCall.prototype.onRejected = FutureApply.prototype.onRejected;

    var FUNCTION_CALL = Function.call;

    FutureCall.prototype.onResolved = function tasync_trace_start(value) {
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
            var func = args[0];
            args[0] = null;
            value = FUNCTION_CALL.apply(func, args);
        } catch (error) {
            FRAME = ROOT;

            this.reject(createError(error, this));
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

    var call = function () {
        var index = arguments.length;
        while (--index >= 0) {
            var value = arguments[index];
            if (value instanceof Future) {
                if (value.state === STATE_LISTEN) {
                    var future = new FutureCall(arguments, index);
                    value.register(future);
                    return future;
                } else if (value.state === STATE_RESOLVED) {
                    arguments[index] = value.value;
                } else {
                    assert(value.state === STATE_REJECTED);
                    return value;
                }
            }
        }

        var func = arguments[0];
        return FUNCTION_CALL.apply(func, arguments);
    };

    // ------- TryCatch -------

    function FutureTryCatch(handler) {
        Future.call(this);

        this.handler = handler;
    }

    FutureTryCatch.prototype = Object.create(Future.prototype);

    FutureTryCatch.prototype.onRejected = function (error) {
        try {
            var value = this.handler(error);

            if (value instanceof Future) {
                this.onRejected = Future.prorotype.reject;
                value.register(this);
            } else {
                this.resolve(value);
            }
        } catch (err) {
            this.reject(err);
        }
    };

    FutureTryCatch.prototype.onResolved = Future.prototype.resolve;

    function trycatch(func, handler) {
        if (typeof func !== 'function' || typeof handler !== 'function') {
            throw new Error('function arguments are expected');
        }

        try {
            var value = func();

            if (value instanceof Future) {
                var future = new FutureTryCatch(handler);
                value.register(future);

                return future;
            } else {
                return value;
            }
        } catch (error) {
            return handler(error);
        }
    }

    // ------- Wrap -------

    function wrap(func) {
        if (typeof func !== 'function') {
            throw new Error('function argument is expected');
        }

        if (func.tasync_wraped === undefined) {
            func.tasync_wraped = function () {
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

            func.tasync_wraped.tasync_unwraped = func;
        }

        return func.tasync_wraped;
    }

    // ------- Unwrap -------

    function UnwrapListener(callback) {
        this.callback = callback;
    }

    UnwrapListener.prototype.onRejected = function (error) {
        this.callback(error);
    };

    UnwrapListener.prototype.onResolved = function (value) {
        this.callback(null, value);
    };

    function unwrap(func) {
        if (typeof func !== 'function') {
            throw new Error('function argument is expected');
        }

        if (func.tasync_unwraped === undefined) {
            func.tasync_unwraped = function () {
                var args = arguments;

                var callback = args[--args.length];
                assert(typeof callback === 'function');

                var value;
                try {
                    value = func.apply(this, args);
                } catch (error) {
                    callback(error);
                    return;
                }

                if (value instanceof Future) {
                    assert(value.state === STATE_LISTEN);

                    var listener = new UnwrapListener(callback);
                    value.register(listener);
                } else {
                    callback(null, value);
                }
            };

            func.tasync_unwraped.tasync_wraped = func;
        }

        return func.tasync_unwraped;
    }

    // ------- Throttle -------

    function FutureThrottle(func, that, args) {
        Future.call(this);

        this.func = func;
        this.that = that;
        this.args = args;

        this.caller = FRAME;
        this.position = ++FRAME.subframes;

        this.path = this.getPath();
    }

    FutureThrottle.prototype = Object.create(Future.prototype);

    FutureThrottle.prototype.execute = function () {
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

    FutureThrottle.prototype.getPath = FutureApply.prototype.getPath;
    FutureThrottle.prototype.onResolved = Future.prototype.resolve;
    FutureThrottle.prototype.onRejected = Future.prototype.reject;

    FutureThrottle.prototype.compare = function (second) {
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

    function ThrottleListener(limit) {
        this.running = 0;
        this.limit = limit;
        this.queue = [];
    }

    function priorityQueueInsert(queue, elem) {
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
            var future = new FutureThrottle(func, that, args);
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
    function throttle(func, limit) {
        if (typeof func !== 'function') {
            throw new Error('function argument is expected');
        } else if (typeof limit !== 'number') {
            throw new Error('number argument is expected');
        }

        var listener = new ThrottleListener(limit);

        return function () {
            return listener.execute(func, this, arguments);
        };
    }

    // ------- Join -------

    function FutureJoin(first) {
        Future.call(this);

        this.first = first;
        this.missing = first instanceof Future && first.state === STATE_LISTEN ? 1 : 0;
    }

    FutureJoin.prototype = Object.create(Future.prototype);

    FutureJoin.prototype.onResolved = function (/*value*/) {
        if (--this.missing === 0) {
            assert(this.state !== STATE_RESOLVED);

            if (this.state === STATE_LISTEN) {
                if (this.first instanceof Future) {
                    assert(this.first.state === STATE_RESOLVED);

                    this.resolve(this.first.value);
                } else {
                    this.resolve(this.first);
                }
            }
        }
    };

    FutureJoin.prototype.onRejected = function (error) {
        if (this.state === STATE_LISTEN) {
            this.reject(error);
        }
    };

    function join(first, second) {
        if (first instanceof Future && first.state === STATE_REJECTED) {
            return first;
        } else if (second instanceof Future) {
            if (second.state === STATE_RESOLVED) {
                return first;
            } else if (second.state === STATE_REJECTED) {
                return second;
            }
        } else {
            return first;
        }

        if (!(first instanceof FutureJoin)) {
            first = new FutureJoin(first);
        }

        first.missing += 1;
        second.register(first);

        return first;
    }

    // ------- TASYNC -------

    var TASYNC = {
        setTrace: setTrace,
        delay: delay,
        lift: lift,
        apply: apply,
        call: call,
        trycatch: trycatch,
        wrap: wrap,
        unwrap: unwrap,
        throttle: throttle,
        join: join
    };

    if (typeof define === 'function' && define.amd) {
        define([], function () {
            return TASYNC;
        });
    } else {
        module.exports = TASYNC;
    }
}());
