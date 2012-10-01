/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.promise3;

public class FutureCall2<Type, Arg0, Arg1> implements Promise<Type> {

	private Object value = this;
	private Promise<?> parent = null;

	private Object arg0;
	private Object arg1;
	
	public FutureCall2(Promise<Arg0> arg0, Promise<Arg1> arg1) {

		this.arg0 = arg0;
		this.arg1 = arg1;
		
		arg0.setParent(this);
		arg1.setParent(this);
	}
	
	public void setParent(Promise<?> parent) {
		assert(parent != null && this.parent == null);

		Object value;
		synchronized(this) {
			this.parent = parent;
			value = this.value;
		}
		
		if( value != this )
			parent.setValue(this, value);
	}

	public void setValue(Promise<?> old, Object value) {
		
	}
}
