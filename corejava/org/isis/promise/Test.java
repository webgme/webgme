/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.promise;

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

	static Promise<Integer> delayed(long delay, final int value) {
		Promise<Void> timeout = new Timeout(delay);
		return new FutureCall1<Integer, Void>(timeout) {
			public Promise<Integer> execute(Void arg1) {
				return new Constant<Integer>(value);
			}
		};
	}

	public static void main(String[] args) throws Exception {
		System.out.println("start");
		// Promise<Integer> value = fibonacci(25);
		Promise<Integer> value = delayed(1000, 10);
		
		System.out.println(Executor.obtain(value));
		
		System.out.println("end");
	}
}
