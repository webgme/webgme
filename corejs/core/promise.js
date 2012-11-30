/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

define([ "core/assert" ], function (ASSERT) {
	"use strict";

	var UNRESOLVED = new Error();

	var Promise = function () {
		this.value = UNRESOLVED;
		this.callback = null;
	};

	Promise.prototype.register = function (listener) {
		ASSERT(typeof callback === "function" && callback.length === 1);

		if( this.value instanceof Error ) {
			
		}
		else {
			callback(object, this.value);
		}
		if( this.value === UNRESOLVED ) {
			ASSERT(this.callback === null);
			this.callback = callback;
		}
		else if( this.value instanceof Error ) {
			throw this.value;
		}
	};

	Promise.prototype.resolve = function (value) {
		ASSERT(!(value instanceof Promise));

		if( this.callback !== null ) {
			this.callback(value);
			this.callback = null;
		}
		else {
			ASSERT(this.value === UNRESOLVED);
			this.value = value;
		}
	};

	var array = function (array) {
		ASSERT(Array.isArray(array));

		for( var i = 0; i < array.length; ++i ) {
			if( array[i] instanceof Promise ) {
				if( array[i].value !== UNRESOLVED ) {
					array[i] = array[i].value;
				}
				else {
					break;
				}
			}
		}

		if( i === array.length ) {
			return array;
		}

		var promise = new Promise(UNRESOLVED);

		var callback = function (value) {
			ASSERT(!(value instanceof Promise));

			if( value instanceof Error ) {
				promise.resolve(value);
			}
			else {
				array[i] = value;

				while( ++i < array.length ) {
					if( array[i] instanceof Promise ) {
						value = array[i].value;

						if( value instanceof Error ) {

						}
						if( value !== UNRESOLVED ) {
							array[i] = array[i].value;
						}

						array[i].register(callback);
						return;
					}
				}

				promise.resolve(array);
			}
		};

		array[i].register(callback);

		return promise;
	};

	var wrap = function (func) {
		ASSERT(typeof func === "function");

		if( func.length === 1 ) {
			return function (arg0) {
				if( arg0 instanceof Promise ) {
					if( arg0.value === UNRESOLVED ) {
						return new Call1(func, arg0);
					}
					else {
						arg0 = arg0.value;
					}
				}

				return func(arg0);
			};
		}
		else if( func.length === 2 ) {
			return function (arg0, arg1) {
				if( arg0 instanceof Promise ) {
					if( arg0.value === UNRESOLVED ) {
						return new Call2(func, 0, arg0, arg1);
					}
					else {
						arg0 = arg0.value;
					}
				}

				if( arg1 instanceof Promise ) {
					if( arg1.value === UNRESOLVED ) {
						return new Call2(func, 1, arg0, arg1);
					}
					else {
						arg1 = arg1.value;
					}
				}

				return func(arg0, arg1);
			};
		}
		else {
			// maybe throw an error
			return func;
		}
	};

	var Call1 = function (func, arg0) {
		this.value = UNRESOLVED;
		this.func = func;

		arg0.register(this);
	};

	Call1.prototype = Promise.prototype;

	var call1 = function (func, arg0) {
		ASSERT(typeof func === "function" && func.length === 1);

		if( arg0 instanceof Promise ) {
			if( arg0.value instanceof Error ) {
				return new Call1(func, arg0);
			}
			else {
				arg0 = arg0.value;
			}
		}

		return func(arg0);
	};

	return {
		array: array
	};
});
