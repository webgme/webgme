/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.promise;

public interface Promise<Type> {

	Constant<Type> getConstant() throws Exception;

	void reject(Exception error);

	void requestArgument(short index, Future<?> parent);
}
