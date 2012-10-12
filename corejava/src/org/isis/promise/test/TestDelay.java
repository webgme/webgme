/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.promise.test;

import org.isis.promise.*;

class TestDelay {

	static class DelayedInt extends Func0<Integer> {
		long delay;
		int value;

		public DelayedInt(long delay, int value) {
			this.delay = delay;
			this.value = value;
		}

		@Override
		public Promise<Integer> call() throws Exception {
			Thread.sleep(delay);
			return new Constant<Integer>(value);
		}
	}

	public static void main(String[] args) throws Exception {
		DelayedInt func = new DelayedInt(1000, 20);
		Integer value = Executors.obtain(func
				.submit(Executors.NEW_THREAD_EXECUTOR));
		System.out.println(value);
	}
}
