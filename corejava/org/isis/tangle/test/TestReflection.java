package org.isis.tangle.test;

import java.lang.reflect.*;

public class TestReflection {
	private static final int REPEATS = 1000;
	private static final int RUNS = 30000;

	public static class A {
	}

	public static Class<A> klass = A.class;

	public static abstract class Factory<ObjectType> {
		public abstract ObjectType create();
	};

	public static Factory<A> factory = new Factory<A>() {
		public A create() {
			return new A();
		}
	};

	public static Constructor<A> constructor;

	public static void main(String[] args) throws Exception {
		constructor = klass.getConstructor();

		for(int i = 0; i <10; ++i) {
			System.out.println("\n" + i);
			doRegular();
			doReflection();
			doFactory();
			doConstructor();
		}
	}

	public static void doRegular() throws Exception {
		A[] as = new A[RUNS];
		long start = System.nanoTime();
		for (int r = 0; r < REPEATS; r++) {
			for (int i = 0; i < RUNS; i++)
				as[i] = new A();
		}
		System.out.printf("new A(), %,f ns%n", 
				(System.nanoTime() - start) * 1.0 / RUNS / REPEATS);
	}

	public static void doReflection() throws Exception {
		A[] as = new A[RUNS];
		long start = System.nanoTime();
		for (int r = 0; r < REPEATS; r++) {
			for (int i = 0; i < RUNS; i++)
				as[i] = klass.newInstance();
		}
		System.out.printf("klass.newInstance(), %,f ns%n",
				(System.nanoTime() - start) * 1.0 / RUNS / REPEATS);
	}

	public static void doFactory() throws Exception {
		A[] as = new A[RUNS];
		long start = System.nanoTime();
		for (int r = 0; r < REPEATS; r++) {
			for (int i = 0; i < RUNS; i++)
				as[i] = factory.create();
		}
		System.out.printf("factory.create(), %,f ns%n",
				(System.nanoTime() - start) * 1.0 / RUNS / REPEATS);
	}

	public static void doConstructor() throws Exception {
		A[] as = new A[RUNS];
		long start = System.nanoTime();
		for (int r = 0; r < REPEATS; r++) {
			for (int i = 0; i < RUNS; i++)
				as[i] = constructor.newInstance();
		}
		System.out.printf("constructor.newInstance(), %,f ns%n",
				(System.nanoTime() - start) * 1.0 / RUNS / REPEATS);
	}

}