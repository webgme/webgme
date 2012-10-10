/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.webgme.test;

import org.isis.promise.*;
import org.isis.webgme.storage.*;

public class TestMongo {
	public static void main(String[] args) throws Exception {
		MongoDb mongo = new MongoDb(new MongoDb.Options());

		Void a = Executor.obtain(mongo.open());
		Void b = Executor.obtain(mongo.close());
		System.out.println("opened " + a + " " + b);
	}
}
