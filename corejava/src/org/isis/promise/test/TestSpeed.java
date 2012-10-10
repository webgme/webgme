/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.promise.test;

import org.isis.promise.*;

class TestSpeed {

	static Integer fibonacci1(int n) {
		if (n <= 1)
			return n;
		else
			return fibonacci1(n - 1) + fibonacci1(n - 2);
	}

	static Func2<Integer, Integer, Integer> sum = new Func2<Integer, Integer, Integer>() {
		@Override
		public Promise<Integer> call(Integer arg0, Integer arg1) {
			return new Constant<Integer>(arg0 + arg1);
		}
	};

	static Promise<Integer> fibonacci2(int n) throws Exception {
		if (n <= 1)
			return new Constant<Integer>(n);
		else
			return sum.call(fibonacci2(n - 1), fibonacci2(n - 2));
	}

	public static void main(String[] args) throws Exception {
		for (int i = 0; i < 10; ++i) {
			int depth = 35;
			Integer value;

			long start = System.currentTimeMillis();
			value = fibonacci1(depth);
			System.out.print("\t2: " + value + " time="
					+ (System.currentTimeMillis() - start));

			start = System.currentTimeMillis();
			value = Executor.obtain(fibonacci2(depth));
			System.out.println("\t3: " + value + " time="
					+ (System.currentTimeMillis() - start));
		}
	}
}
