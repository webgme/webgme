/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.promise;

import java.util.*;

public abstract class Promise<Type> {

	protected abstract Constant<Type> getConstant() throws Exception;

	protected abstract void reject(Exception error);

	protected abstract void requestArgument(int index, Future<?> parent);

	public static <Type> Future<List<Type>> collect(
			Collection<Promise<Type>> collection) throws Exception {
		return new FutureArray<Type>(collection);
	}
}
