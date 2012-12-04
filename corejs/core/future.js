/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

define([ "core/assert" ], function (ASSERT) {
	"use strict";

	// ------- Future -------

	var UNRESOLVED = new Error();

	var Future = function () {
		this.value = UNRESOLVED;
		this.listener = null;
		this.param = null;
	};

	var setValue = function (future, value) {
		ASSERT(future instanceof Future && future.value === UNRESOLVED);

		if( value instanceof Future ) {
			setListener(value, setValue, future);
		}
		else {
			future.value = value;

			if( future.listener !== null ) {
				future.listener(future.param, value);
			}
		}
	};

	var getValue = function (future) {
		if( future.value === UNRESOLVED ) {
			return future;
		}
		else if( future.value instanceof Error ) {
			throw future.value;
		}
		else {
			return future.value;
		}
	};

	var setListener = function (future, listener, param) {
		ASSERT(future instanceof Future && future.listener === null);
		ASSERT(typeof listener === "function" && listener.length === 2);

		future.listener = listener;
		future.param = param;

		if( future.value !== UNRESOLVED ) {
			listener(param, future);
		}
	};

	// ------- adapt

	var adapt = function (func) {
		ASSERT(typeof func === "function" && func.length >= 1);

		if( func.length === 1 ) {
			return function () {
				var future = new Future();
				func.call(this, function (error, value) {
					if( error !== null ) {
						value = error instanceof Error ? error : new Error(error);
					}
					else {
						ASSERT(!(value instanceof Error));
					}
					setValue(future, value);
				});
				return getValue(future);
			};
		}
		else if( func.length === 2 ) {
			return function (arg0) {
				var future = new Future();
				func.call(this, arg0, function (error, value) {
					if( error !== null ) {
						value = error instanceof Error ? error : new Error(error);
					}
					else {
						ASSERT(!(value instanceof Error));
					}
					setValue(future, value);
				});
				return getValue(future);
			};
		}
	};

	var wait = function (delay, value) {
		var future = new Future();
		setTimeout(function () {
			setValue(future, value);
		}, delay);
		return getValue(future);
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
	};

	Func.prototype = Future.prorotype;

	var func2 = function (func) {
		return function () {
			for( var i = 0; i < arguments.length; ++i ) {
				if( arguments[i] instanceof Future ) {
					return new Func(func, this, arguments, i);
				}
			}
			return func.apply(this, arguments);
		};
	};

	// ------- func -------

	var Call1 = function (func, that, arg0) {
		this.value = UNRESOLVED;
		this.listener = null;
		this.param = null;

		this.func = func;
		this.that = that;

		setListener(arg0, call1Listener, this);
	};

	var call1Listener = function (future, value) {
		ASSERT(!(value instanceof Future));

		try {
			value = future.func.call(future.that, value);
			setValue(future, value);
		}
		catch(error) {
			setValue(error instanceof Error ? error : new Error(error));
		}
	};

	Call1.prototype = Future.prototype;

	var func = function (func) {
		ASSERT(typeof func === "function");

		if( func.length === 0 ) {
			return func;
		}
		else if( func.length === 1 ) {
			return function (arg0) {
				if( arg0 instanceof Future ) {
					return new Call1(func, this, arg0);
				}
				else {
					return func.call(this, arg0);
				}
			};
		}
	};

	// ------- FutureArray -------

	var FutureArray = function (index, array) {
		this.value = UNRESOLVED;
		this.parent = null;
		this.resolved = setMember;
		this.index = index;
		this.array = array;
	};

	FutureArray.prototype = Object.create(Future.prototype);

	var setMember = function (value) {
		ASSERT(!(value instanceof Future));

		if( value instanceof Error ) {
			this.setValue(value);
		}
		else {
			this.array[this.index] = value;

			while( ++this.index < this.array.length ) {
				if( this.array[this.index] instanceof Future ) {
					this.array[this.index].setParent(this);
					return;
				}
			}

			this.setValue(this.array);
		}
	};

	var lift_array = function (array) {
		ASSERT(array instanceof Array);

		var i = 0;
		while( i < array.length ) {
			if( array[i] instanceof Future ) {
				break;
			}
		}

		if( i === array.length ) {
			return array;
		}

		var complete = function (value) {
			array[i] = value;
			do {
				if( array[i] instanceof Future ) {
					array[i].register(complete);
					return;
				}
			} while( ++i < array.length );
		};

		array[i].register(complete);

	};

	// ------- Call -------

	var FutureCall = function (func, args) {
		this.func = func;
		this.array = args;
		this.value = UNRESOLVED;
		this.parent = null;
		this.ready = null;
		this.index = 0;
	};

	FutureCall.prototype = new Future();

	FutureCall.prototype.resolved = function (value) {
		this.array[this.index] = value;

		while( this.index < this.array ) {
			if( this.array[this.index] instanceof Future ) {
				this.array[this.index].register(this);
				return;
			}

			this.index += 1;
		}

		value = this.func.apply(null, this.args);
		this.resolved = Future.prototype.resolved;
	};

	var call = function (func, arg0, arg1, arg2) {
		ASSERT(typeof func === "function");

		if( arguments.length === 1 ) {
			return func();
		}
		else if( !(arg0 instanceof Future) ) {
			if( arguments.length === 2 ) {
				return func(arg0);
			}
			else if( !(arg1 instanceof Future) ) {
				if( arguments.length === 3 ) {
					return func(arg0, arg1);
				}
			}
		}

	};

	// -------

	return {
		adapt: adapt,
		wait: wait,
		func: func
	};
});
