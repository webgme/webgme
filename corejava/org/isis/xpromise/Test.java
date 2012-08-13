package org.isis.xpromise;

import org.isis.xpromise.*;

public class Test {

	public static void main(String[] args) {
		Promise<Integer> promise = new Constant3<Integer>(1);
		promise.register(null);
		System.out.println(promise.getValue());
	}

}
