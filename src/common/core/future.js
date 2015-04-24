/*globals define*/
/*jshint node: true, browser: true*/

/**
 * @author mmaroti / https://github.com/mmaroti
 */

define([], function () {
    'use strict';

    var maxDepth = 5;

    var ASSERT = function (cond) {
        if (!cond) {
            var error = new Error('future assertion failed');
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

        if (value instanceof Future) {
            setListener(value, setValue, future);
        } else {
            future.value = value;

            if (future.listener !== null) {
                future.listener(future.param, value);
            }
        }
    };

    var setListener = function (future, listener, param) {
        ASSERT(future instanceof Future && future.listener === null && future.value === UNRESOLVED);
        ASSERT(typeof listener === 'function' && listener.length === 2);

        future.listener = listener;
        future.param = param;

        if (future.value !== UNRESOLVED) {
            listener(param, future);
        }
    };

    var isUnresolved = function (value) {
        return (value instanceof Future) && value.value === UNRESOLVED;
    };

    var getValue = function (value) {
        if (value instanceof Future) {
            if (value.value instanceof Error) {
                throw value.value;
            } else if (value.value !== UNRESOLVED) {
                return value.value;
            }
        }
        return value;
    };

    // ------- adapt

    var adapt = function (func) {
        ASSERT(typeof func === 'function');

        return function adaptx() {
            var args = arguments;
            var future = new Future();

            args[args.length++] = function adaptCallback(error, value) {
                if (error) {
                    value = error instanceof Error ? error : new Error(error);
                } else {
                    ASSERT(!(value instanceof Error));
                }
                setValue(future, value);
            };

            func.apply(this, args);

            return getValue(future);
        };
    };

    var unadapt = function (func) {
        ASSERT(typeof func === 'function');

        if (func.length === 0) {
            return function unadapt0(callback) {
                var value;
                try {
                    value = func.call(this);
                } catch (error) {
                    callback(error);
                    return;
                }
                then(value, callback);
            };
        } else if (func.length === 1) {
            return function unadapt1(arg, callback) {
                var value;
                try {
                    value = func.call(this, arg);
                } catch (error) {
                    callback(error);
                    return;
                }
                then(value, callback);
            };
        } else {
            return function unadaptx() {
                var args = arguments;

                var callback = args[--args.length];
                ASSERT(typeof callback === 'function');

                var value;
                try {
                    value = func.apply(this, args);
                } catch (error) {
                    callback(error);
                    return;
                }
                then(value, callback);
            };
        }
    };

    var delay = function (delay, value) {
        var future = new Future();
        setTimeout(setValue, delay, future, value);
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
        ASSERT(typeof func === 'function');

        for (var i = 0; i < args.length; ++i) {
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
            if (value instanceof Error) {
                value = future.handler(value);
            }
        } catch (error) {
            value = error instanceof Error ? error : new Error(error);
        }

        setValue(future, value);
    };

    var printStack = function (error) {
        console.log(error.stack);
    };

    var hide = function (future, handler) {
        if (typeof handler !== 'function') {
            handler = printStack;
        }

        if (isUnresolved(future)) {
            return new Hide(future, handler);
        } else if (future.value instanceof Error) {
            return handler(future.value);
        } else {
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

    var array = function (array) {
        ASSERT(array instanceof Array);

        for (var i = 0; i < array.length; ++i) {
            if (isUnresolved(array[i])) {
                return new Arr(array, i);
            }
        }

        return array;
    };

    // ------- then -------

    var thenHandler = function (callback, value) {
        if (value instanceof Error) {
            callback(value);
        } else {
            callback(null, value);
        }
    };

    var calldepth = 0;
    var then = function (future, callback) {
        var error = null,
            value;

        if (!(future instanceof Future)) {
            value = future;
        } else if (future.value === UNRESOLVED) {
            setListener(future, thenHandler, callback);
            return;
        } else if (future.value instanceof Error) {
            error = future.value;
        } else {
            value = future.value;
        }

        if (calldepth < maxDepth) {
            ++calldepth;
            try {
                callback(error, value);
            } catch (err) {
                console.log('unhandled error from callback', err);
            }
            --calldepth;
        } else {
            setTimeout(callback, 0, error, value);
        }
    };

    // -------

    return {
        adapt: adapt,
        unadapt: unadapt,
        delay: delay,
        call: call,
        array: array,
        join: join,
        hide: hide,
        then: then
    };
});
