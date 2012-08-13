/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.xpromise;

abstract class Observer {
	abstract void fulfilled();
	abstract void broken(Throwable error);
}
