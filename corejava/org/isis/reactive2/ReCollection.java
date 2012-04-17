/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.reactive2;

public abstract class ReCollection<ObservableType extends ReObservable, TargetType extends ReObservable> extends ReValue<ObservableType, Integer> {
	protected ReValue<TargetType, ObservableType> pointer;

	protected Observer<TargetType, ObservableType> observer = new Observer<TargetType, ObservableType>() {
		public void modified(TargetType observable, ObservableType oldObject, ObservableType newObject) {
			assert(oldObject != newObject);

			java.util.Collection<TargetType> oldColl = rawGet(oldObject);
			assert(oldColl.contains(observable));
			oldColl.remove(observable);
			
			java.util.Collection<TargetType> newColl = rawGet(newObject);
			assert(!newColl.contains(observable));
			newColl.add(observable);

			notifyObservers(oldObject, oldColl.size()+1, oldColl.size());
			notifyObservers(newObject, newColl.size()-1, newColl.size());
		}
	};

	public ReCollection(ReValue<TargetType, ObservableType> pointer) {
		this.pointer = pointer;
		
		pointer.registerObserver(observer);
	}
	
	protected abstract java.util.Collection<TargetType> rawGet(ObservableType observable);
	
	public Integer get(ObservableType observable) {
		return rawGet(observable).size();
	}

	protected class ReExport<ValueType> extends ReValue<TargetType, ValueType> {
		
		ReValue<ObservableType, ValueType> value;
		
		public ReExport(ReValue<ObservableType, ValueType> value) {
			this.value = value;
		}
		
		public ValueType get(TargetType observable) {
			ObservableType obj = pointer.get(observable);
			if( obj == null )
				return null;
			
			return value.get(obj);
		}
	};
	
	public <ValueType> ReValue<TargetType, ValueType> declareExport(ReValue<ObservableType,ValueType> value) {
		return new ReExport<ValueType>(value);
	};
};
