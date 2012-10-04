/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.promise4;

public class TestRaces {

	static abstract class BinaryFunc extends Func2<Integer, Integer, Integer> {
	};

	static int DEPTH_LIMIT = 5;

	static BinaryFunc createFunc(int depth) {

		int count = depth >= DEPTH_LIMIT ? 2 : 10;

		int c = (int) (Math.random() * count);
		if (c == 0)
			return new SumFunc();
		else if (c == 1)
			return new ErrorFunc();
		else if (c == 2)
			return new Forward0(createFunc(depth + 1));
		else
			throw new IllegalStateException();
	};

	static class SumFunc extends BinaryFunc {
		@Override
		public Promise<Integer> call(Integer arg0, Integer arg1)
				throws Exception {
			return new Constant<Integer>(arg0 + arg1);
		}
	};

	static class ErrorFunc extends BinaryFunc {
		@Override
		public Promise<Integer> call(Integer arg0, Integer arg1)
				throws Exception {
			throw new Exception();
		}
	};

	static class Forward0 extends BinaryFunc {
		BinaryFunc func;

		Forward0(BinaryFunc func) {
			this.func = func;
		}

		@Override
		public Promise<Integer> call(Integer arg0, Integer arg1)
				throws Exception {
			return func.call(arg0, arg1);
		}
	}

	public static void main(String[] args) throws Exception {
	}
}
