/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.webgme.storage;

import org.isis.promise.*;

public interface Storage {
	public Promise<Void> open();

	public boolean isOpened();

	public Promise<Void> close();

	public Promise<Object> load(String key);

	public Promise<Void> save(Object object);

	public Promise<Void> remove(String key);
}
