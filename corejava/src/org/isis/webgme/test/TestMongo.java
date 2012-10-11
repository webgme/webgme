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

	static final Func2<Void, DBObject, Integer> TEST = new Func2<Void, DBObject, Integer>() {
		@Override
		public Promise<Void> call(DBObject arg0, Integer arg1) throws Exception {
			Integer val = (Integer) arg0.get("value");
			if (val.intValue() != arg1.intValue())
				throw new Exception("does not match");

			return Constant.VOID;
		}
	};

	public static void main(String[] args) throws Exception {

		final int COUNT = 50000;
		
		MongoDb.Options options = new MongoDb.Options();
		options.host = "129.59.105.195";
		options.collection = "garbage";
		MongoDb mongo = new MongoDb(options);

		Executors.obtain(mongo.open());
		System.out.println("opened");

		Promise<Void> done = Constant.VOID;
		for (int i = 0; i < COUNT; ++i) {
			DBObject obj1 = new BasicDBObject();
			obj1.put("_id", "*obj" + i);
			obj1.put("value", i);
			done = JOIN.call(done, mongo.save(obj1));
		}
		Executors.obtain(done);
		System.out.println("saved");

		done = Constant.VOID;
		for (int i = 0; i < COUNT; ++i) {
			Promise<DBObject> obj = mongo.load("*obj" + i);
			done = JOIN.call(done, TEST.call(obj, i));
		}
		Executors.obtain(done);
		System.out.println("loaded");

		Executors.obtain(mongo.close());
		System.out.println("closed");
	}
}
