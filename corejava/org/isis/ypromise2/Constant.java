/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.ypromise2;

public class Constant<Type> extends Promise<Type> {
	public Constant(Type value) {
	}

	protected void cancel() {
	}
}
