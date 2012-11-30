/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

define([ "core/assert" ], function (ASSERT) {
	"use strict";

	// ------- Promise -------

	var UNRESOLVED = new Error();

	var Promise = function () {
		this.value = UNRESOLVED;
		this.parent = null;
	};

	var setValue = function (value) {
		ASSERT(this.value === UNRESOLVED && value !== UNRESOLVED);

		if( value instanceof Promise ) {
			this.ready = setValue;
			getValue(value);
		}
		else if( this.parent !== null ) {
			this.parent.ready(value);
		}
		else {
			this.value = value;
		}
	};

	var getValue = function(child) {
		ASSERT(child.parent === null);
		
		child.parent = this;
		if( child.value instanceof Error ) {
			if( child.value )
		}
		if( this.value !== )
	}
	
	Promise.prototype.setValue = setValue;


	var setParent = function (promise, parent) {
		if( promise.value instanceof Error ) {
			if( promise.value === UNRESOLVED ) {
			}
			else {
				throw promise.value;
			}
		}
	}

	var setListener = function (promise, listener) {
		if( promise.value instanceof Error ) {
			if( promise.value === UNRESOLVED ) {
				promise.listener = listener;
			}
			else {
				throw promise.value;
			}
		}
		else {
			listener(target, promise.value);
			promise.value = null;
		}
	};

	// ------- Call1 -------

	var Call1 = function (func, arg0) {
		this.value = UNRESOLVED;
		this.listener = null;
		this.func = func;

		arg0.register(this);
	};

	Call1.prototype = Promise.prototype;

	var call1_execute = function (arg0) {
		ASSERT(!(arg0 instanceof Promise));

		if( arg0 instanceof Error ) {
			promise_resolve(this, arg0);
		}
		else {
			try {
				var temp = this.func;
				temp = temp(arg0);
				promise_resolve(this, temp);
			}
			catch(error) {
				promise_resolve(this, error instanceof Error ? error : new Error(error));
			}
		}
	};

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
});
