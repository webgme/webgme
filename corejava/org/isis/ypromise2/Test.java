/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.ypromise2;

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
	
	static void main(String[] args) {
		
	}
}
