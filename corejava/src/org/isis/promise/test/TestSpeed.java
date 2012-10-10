/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.promise.test;

import org.isis.promise.*;

class TestSpeed {
	
	static Promise<Integer> fibonacci(int n) {
		if (n <= 1)
			return new Constant<Integer>(n);
		else {
			Future<Integer> future = new FutureCall2<Integer, Integer, Integer>(fibonacci(n - 1),
					fibonacci(n - 2)) {
				@Override
				public Promise<Integer> execute(Integer arg1, Integer arg2) {
					return new Constant<Integer>(arg1 + arg2);
				}
			};
			future.run();
			return future;
		}
	}

	static Integer fibonacci2(int n) {
		if (n <= 1)
			return n;
		else
			return fibonacci2(n - 1) + fibonacci2(n - 2);
	}

	static Func2<Integer, Integer, Integer> sum = new Func2<Integer, Integer, Integer>() {
		@Override
		public Promise<Integer> call(Integer arg0, Integer arg1) {
			return new Constant<Integer>(arg0 + arg1);
		}
	};

	static Promise<Integer> fibonacci3(int n) throws Exception {
		if (n <= 1)
			return new Constant<Integer>(n);
		else
			return sum.call(fibonacci3(n - 1), fibonacci3(n - 2));
	}

	public static void main(String[] args) throws Exception {
		for (int i = 0; i < 10; ++i) {
			int depth = 30;
			Integer value;
			
			long start = System.currentTimeMillis();
			value = Executor.obtain(fibonacci(depth));
			System.out.print("1: " + value + " time="
					+ (System.currentTimeMillis() - start));

			start = System.currentTimeMillis();
			value = fibonacci2(depth);
			System.out.print("\t2: " + value + " time="
					+ (System.currentTimeMillis() - start));
			
			start = System.currentTimeMillis();
			value = Executor.obtain(fibonacci3(depth));
			System.out.println("\t3: " + value + " time="
					+ (System.currentTimeMillis() - start));
		}
	}
}
