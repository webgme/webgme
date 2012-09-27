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

	static Promise<Integer> parallelFibonacci(final int n, final int d) {
		if (n <= 1 || d <= 0)
			return fibonacci(n);
		else {
			Promise<Integer> second = new BlockingCall<Integer>() {
				public Integer execute() throws Exception {
					return Executor.obtain(parallelFibonacci(n - 2, d - 1));
				}
			};
			Promise<Integer> first = parallelFibonacci(n - 1, d - 1);
			return new FutureCall2<Integer, Integer, Integer>(first, second) {
				public Promise<Integer> execute(Integer arg1, Integer arg2) {
					return new Constant<Integer>(arg1 + arg2);
				}
			};
		}
	}

	static Promise<Integer> delayed(final long delay, final int value) {
		Promise<Void> timeout1 = new BlockingCall<Void>() {
			public synchronized Void execute() throws Exception {
				this.wait(delay);
				return null;
			}
		};

		Promise<Void> timeout2 = new BlockingCall<Void>() {
			public synchronized Void execute() throws Exception {
				this.wait(1000);
				return null;
			}
		};

		return new FutureCall2<Integer, Void, Void>(timeout1, timeout2) {
			public Promise<Integer> execute(Void arg1, Void arg2) {
				return new Constant<Integer>(value);
			}
		};
	}

	public static void main(String[] args) throws Exception {
		for(int i = 0; i < 10; ++i) {
			long start = System.currentTimeMillis();
			Promise<Integer> value = fibonacci(37);
			//		Promise<Integer> value = parallelFibonacci(43, 5);
			//		Promise<Integer> value = delayed(2000, 10);
			System.out.println(Executor.obtain(value) + " time=" + (System.currentTimeMillis() - start));
		}
	}
}
