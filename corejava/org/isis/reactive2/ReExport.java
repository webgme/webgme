/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.reactive2;

public class ReExport<ObservableType extends ReObservable, TargetType extends ReObservable, ValueType> extends ReValue<ObservableType,ValueType> {

	protected ReValue<ObservableType,TargetType> target;
	protected ReValue<TargetType,ValueType> value;

	protected Observer<ObservableType, TargetType> observer = new Observer<ObservableType, TargetType>() {
		public void modified(ObservableType observable, TargetType oldObject, TargetType newObject) {
			
			ValueType oldValue = oldObject != null ? value.get(oldObject) : null;
			ValueType newValue = newObject != null ? value.get(newObject) : null;
			
			notifyObservers(observable, oldValue, newValue);
		}
	};

	public ReExport(ReValue<ObservableType,TargetType> target, ReValue<TargetType,ValueType> value) {
		this.target = target;
		this.value = value;
		
		target.registerObserver(observer);
	}
	
	public ValueType get(ObservableType observable) {
		TargetType obj = target.get(observable);
		if( obj == null )
			return null;
		
		return value.get(obj);
	}
}
