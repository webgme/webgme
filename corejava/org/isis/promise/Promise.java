/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.promise;

public interface Promise<Type> {
	void setParent(Observer<Type> parent);

	Type getValue() throws Exception;

	void finished();
	
	void cancelPromise();
}
