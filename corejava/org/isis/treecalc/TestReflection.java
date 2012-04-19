package org.isis.treecalc;

import java.lang.reflect.*;

public class TestReflection {
    private static final int RUNS = 3000000;

    public static class A {
    }

    public static Class<A> klass = A.class;

    public static abstract class Factory<Type> {
	public abstract Type create();
    };
    
    public static Factory<A> factory = new Factory<A>() {
	public A create() {
	    return new A();
	}
    };
    
    public static Constructor<A> constructor;
    
    public static void main(String[] args) throws Exception {
	constructor = klass.getConstructor();
	
        doRegular();
        doReflection();
        doFactory();
        doConstructor();
        doRegular();
        doReflection();
        doFactory();
        doConstructor();
    }

    public static void doRegular() throws Exception {
        A[] as = new A[RUNS];
        long start = System.nanoTime();
        for (int i = 0; i < RUNS; i++) {
            as[i] = new A();
        }
        System.out.printf("new A(), %,d ns%n", (System.nanoTime() - start)/RUNS);
    }

    public static void doReflection() throws Exception {
        A[] as = new A[RUNS];
        long start = System.nanoTime();
        for (int i = 0; i < RUNS; i++) {
            as[i] = klass.newInstance();
        }
        System.out.printf("klass.newInstance(), %,d ns%n", (System.nanoTime() - start)/RUNS);
    }
    
    public static void doFactory() throws Exception {
        A[] as = new A[RUNS];
        long start = System.nanoTime();
        for (int i = 0; i < RUNS; i++) {
            as[i] = factory.create();
        }
        System.out.printf("factory.create(), %,d ns%n", (System.nanoTime() - start)/RUNS);
    }

    public static void doConstructor() throws Exception {
        A[] as = new A[RUNS];
        long start = System.nanoTime();
        for (int i = 0; i < RUNS; i++) {
            as[i] = constructor.newInstance();
        }
        System.out.printf("constructor.newInstance(), %,d ns%n", (System.nanoTime() - start)/RUNS);
    }
    
    
}