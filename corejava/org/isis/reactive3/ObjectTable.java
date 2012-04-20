package org.isis.reactive3;

import java.util.*;

public class ObjectTable extends Table<ObjectTable.Record> {

	protected static class Record extends Table.Record {
		int value;

		Record parent;
		List<Record> children = new ArrayList<Record>();
		
		Record basetype;
		
		boolean loadChildren;
	};
	
	public Field<Integer> value = new Field<Integer>() {
		public Integer get(Record record) {
			return record.value;
		}
	
		public void rawSet(Record record, Integer value) {
			record.value = value;
		}
	};
	
	public Field<Record> parent = new Field<Record>() {
		public Record get(Record record) {
			return record.parent;
		}
		protected void rawSet(Record record, Record value) {
			record.parent = value;
		}
	};

	public Collection<Record> children = new Collection<Record>(parent) {
	    protected List<Record> getList(Record record) {
		return record.children;
	    }
	};
	
	public Field<Boolean> loadChildren = new Field<Boolean>() {
		public Boolean get(Record record) {
			return record.loadChildren;
		}
		protected void rawSet(Record record, Boolean value) {
			record.loadChildren = value;
		}
	};
	
	public Value<Boolean> parentLoadChildren = children.export(loadChildren);
}
