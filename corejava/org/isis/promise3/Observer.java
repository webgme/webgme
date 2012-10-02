/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.promise3;

public interface Observer<Type> {
	public void finished(Type value);

	public void failed(Exception error);
}
