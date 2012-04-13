/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.webgme.reactive;

public class Counter extends Value<Integer> {

	protected int index;
	
	protected Counter(Class klass) {
		super(klass);
		
		index = klass.addDefValue(0);
	}

	protected final Observer<Integer> intObserver = new Observer<Integer>() {
		public final void modified(Object[] object, Integer oldValue, Integer newValue)
		{
			assert(oldValue != null && newValue != null && oldValue != newValue);
			
			int oldCounter = (Integer)(object[index]);
			int newCounter = oldCounter - oldValue + newValue;

			object[index] = newCounter;
			notifyObservers(object, oldCounter, newCounter);
		}
	};
	
	public void declareIntegerSummand(Value<Integer> value) {
		assert( !klass.isSealed() );
		assert( value.getDeclaringClass() == klass );
		value.registerObserver(intObserver);
	}

	protected final Observer<Boolean> boolObserver = new Observer<Boolean>() {
		public final void modified(Object[] object, Boolean oldValue, Boolean newValue)
		{
			assert(oldValue != null && newValue != null && oldValue != newValue);
			
			int oldCounter = (Integer)(object[index]);
			int newCounter = oldCounter;
			
			if( oldValue == true )
				newCounter -= 1;
			else if( newValue == true )
				newCounter += 1;

			object[index] = newCounter;
			notifyObservers(object, oldCounter, newCounter);
		}
	};
	
	public void declareBooleanSummand(Value<Boolean> value) {
		assert( !klass.isSealed() );
		assert( value.getDeclaringClass() == klass );
		
		value.registerObserver(boolObserver);
	}

	public final Integer get(Object[] object) {
		return (Integer)(object[index]);
	}
};
