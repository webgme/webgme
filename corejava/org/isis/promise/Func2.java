/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.promise;

public abstract class Func2<Type, Arg1, Arg2> extends Promise<Type> {
	
	private int missing = 2;
	protected Arg1 arg1;
	protected Arg2 arg2;
	
	public Func2(Promise<Arg1> arg1, Promise<Arg2> arg2) {
		arg1.register(this);
		arg2.register(this);
	}

	protected abstract Type execute();
}
