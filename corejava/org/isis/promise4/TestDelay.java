/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.promise4;

public class TestDelay {

	static class Delayed extends Future<Integer> implements Runnable {
		long delay;
		int value;

		public Delayed(long delay, int value) {
			this.delay = delay;
			this.value = value;

			Thread thread = new Thread(this);
			thread.start();
		}

		@Override
		public void run() {
			try {
				Thread.sleep(delay);
				resolve(new Constant<Integer>(value));
			} catch (Exception error) {
				reject(error);
			}
		}

		@Override
		protected <Arg> void argumentResolved(short index, Promise<Arg> argument) {
			assert (false);
		}

		@Override
		protected void rejectChildren(Exception error) {
		}
	}

	public static void main(String[] args) throws Exception {
		Integer value = Executor.obtain(new Delayed(1000, 20));
		System.out.println(value);
	}
}
