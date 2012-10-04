/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.promise4;

public class Test {
	static Promise<Integer> fibonacci(int n) {
		if (n <= 1)
			return new Constant<Integer>(n);
		else
			return new FutureCall2<Integer, Integer, Integer>(fibonacci(n - 1),
					fibonacci(n - 2)) {
				public Promise<Integer> execute(Integer arg1, Integer arg2) {
					return new Constant<Integer>(arg1 + arg2);
				}
			};
	}

	public static void main(String[] args) throws Exception {
		for(int i = 0; i < 10; ++i) {
			long start = System.currentTimeMillis();
			Promise<Integer> value = fibonacci(3);
			System.out.println(Executor.obtain(value) + " time=" + (System.currentTimeMillis() - start));
		}
	}
}
