/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.webgme.storage;

import org.isis.promise.*;
import com.mongodb.*;

public interface Storage {
	public Promise<Void> open();

	public boolean isOpened();

	public Promise<Void> close();

	public Promise<DBObject> load(String key);

	public Promise<Void> save(DBObject object);

	public Promise<Void> remove(String key);
}
