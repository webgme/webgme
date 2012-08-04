package org.isis.promisetest;

import org.isis.promise.Func2;
import org.isis.promise.Promise;

public class Test {

	public Promise<Integer> test() {
		return new Func2<Integer, Integer, Integer>(null, null) {
			protected Integer execute() {
				return arg1 + arg2;
			}
		};
	}
	
	public static void main(String[] args) {
		Promise<Integer> value = new Promise<Integer>(12);
	}
}
