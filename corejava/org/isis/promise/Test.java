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
	
	public static void main(String[] args) {
		System.out.println("start");
		Printer<Integer> printer = new Printer<Integer>(fibonacci(25));
		printer.print();
		System.out.println("end");
	}
}
