/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.xpromise2;

abstract class PromiseBase {
	abstract void cancel();

	abstract void setObserver(Promise observer);

	abstract void setValue(Object value);
}
