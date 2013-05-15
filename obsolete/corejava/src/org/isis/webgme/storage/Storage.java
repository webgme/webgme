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

	public <Type> Promise<Type> load(Encoder<Type> encoder, String key);

	public <Type> Promise<Void> save(Encoder<Type> encoder, Type object);

	public Promise<Void> remove(String key);
}
