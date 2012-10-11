/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.webgme.test;

import org.isis.promise.*;
import org.isis.webgme.storage.*;
import com.mongodb.*;

public class TestMongo {

	static final Func2<Void, Void, Void> JOIN = new Func2<Void, Void, Void>() {
		@Override
		public Promise<Void> call(Void arg0, Void arg1) throws Exception {
			return Constant.VOID;
		}
	};

	public static void main(String[] args) throws Exception {
		MongoDb mongo = new MongoDb(new MongoDb.Options());

		Executors.obtain(mongo.open());
		System.out.println("opened");

		Promise<Void> done = Constant.VOID;
		for(int i = 0; i < 10000; ++i) {
			DBObject obj1 = new BasicDBObject();
			obj1.put("value", i);
			obj1.put("_id", "*obj" + i);
			done = JOIN.call(done, mongo.save(obj1));
		}
		Executors.obtain(done);
		System.out.println("saved");

		DBObject obj2 = Executors.obtain(mongo.load("*object"));
		System.out.println("loaded " + obj2.toString());

		Executors.obtain(mongo.close());
		System.out.println("closed");
	}
}
