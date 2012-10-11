/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.promise.test;

import java.util.concurrent.*;
import org.isis.promise.*;
import org.isis.promise.Executors;

class TestSpeed {

	static Integer fibonacci1(int n) {
		if (n <= 1)
			return n;
		else
			return fibonacci1(n - 1) + fibonacci1(n - 2);
	}

	static Func2<Integer, Integer, Integer> SUM = new Func2<Integer, Integer, Integer>() {
		@Override
		public Promise<Integer> call(Integer arg0, Integer arg1) {
			return new Constant<Integer>(arg0 + arg1);
		}
	};

	static Promise<Integer> fibonacci2(int n) throws Exception {
		if (n <= 1)
			return new Constant<Integer>(n);
		else
			return SUM.call(fibonacci2(n - 1), fibonacci2(n - 2));
	}
/*
	static Executor executor = new ThreadPoolExecutor(0, 50, 1,
			TimeUnit.SECONDS, new LinkedBlockingQueue<Runnable>());
*/
	static Executor executor = Executors.THREAD_EXECUTOR;

	static Func1<Integer, Integer> FIBONACCI3 = new Func1<Integer, Integer>() {
		@Override
		public Promise<Integer> call(Integer arg0) throws Exception {
			if (arg0 <= 1)
				return new Constant<Integer>(arg0);

			Promise<Integer> sub0;
			Promise<Integer> sub1;

			if (arg0 <= 25) {
				sub0 = FIBONACCI3.call(arg0 - 1);
				sub1 = FIBONACCI3.call(arg0 - 2);
			} else {
				sub0 = FIBONACCI3.submit(executor, arg0 - 1);
				sub1 = FIBONACCI3.submit(executor, arg0 - 2);
			}

			return SUM.call(sub0, sub1);
		}
	};

	public static void main(String[] args) throws Exception {
		for (int i = 0; i < 10; ++i) {
			int depth = 35;
			Integer value;
			long start;

			start = System.currentTimeMillis();
			value = fibonacci1(depth);
			System.out.print("1: " + value + " time="
					+ (System.currentTimeMillis() - start));

			start = System.currentTimeMillis();
			value = Executors.obtain(fibonacci2(depth));
			System.out.print("\t2: " + value + " time="
					+ (System.currentTimeMillis() - start));

			start = System.currentTimeMillis();
			value = Executors.obtain(FIBONACCI3.call(depth));
			System.out.println("\t3: " + value + " time="
					+ (System.currentTimeMillis() - start));
		}
	}
}
