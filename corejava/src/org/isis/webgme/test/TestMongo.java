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

	static final Func2<Void, Object, Integer> TEST = new Func2<Void, Object, Integer>() {
		@Override
		public Promise<Void> call(Object arg0, Integer arg1) throws Exception {
			Integer val = 0;

			if (arg0 instanceof DBObject)
				val = (Integer) ((DBObject) arg0).get("value");

			if (val.intValue() != arg1.intValue())
				throw new Exception("does not match");

			return Constant.VOID;
		}
	};

	public static final class Test {
		public String id;
		public int value;

		public Test(String id, int value) {
			this.id = id;
			this.value = value;
		}
	};

	public static void main(String[] args) throws Exception {

		final int COUNT = 30000;
		long time;

		time = System.currentTimeMillis();
		MongoDb.Options options = new MongoDb.Options();
		options.host = "129.59.105.195";
		options.collection = "garbage";
		MongoDb mongo = new MongoDb(options);

		Executors.obtain(mongo.open());
		time = System.currentTimeMillis() - time;
		System.out.println("opened " + time);

		time = System.currentTimeMillis();
		FutureArray<Void> results = new FutureArray<Void>(Void.class);
		for (int i = 0; i < COUNT; ++i) {
			Test test = new Test("*obj" + i, i);
			results.add(mongo.save(test));
		}
		Executors.obtain(results.seal());
		time = System.currentTimeMillis() - time;
		System.out.println("saved " + time);

		time = System.currentTimeMillis();
		results = new FutureArray<Void>(Void.class);
		for (int i = 0; i < COUNT; ++i) {
			Promise<Object> obj = mongo.load("*obj" + i);
			results.add(TEST.call(obj, i));
		}
		Executors.obtain(results.seal());
		time = System.currentTimeMillis() - time;
		System.out.println("loaded " + time);

		time = System.currentTimeMillis();
		Executors.obtain(mongo.close());
		time = System.currentTimeMillis() - time;
		System.out.println("closed " + time);
	}
}
