package org.isis.reactive3;

public class ObjectTable extends Table<ObjectTable.Record> {

	protected static class Record extends Table.Record {
		int value;

		Record parent;
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

	public Field<Boolean> loadChildren = new Field<Boolean>() {
		public Boolean get(Record record) {
			return record.loadChildren;
		}
		protected void rawSet(Record record, Boolean value) {
			record.loadChildren = value;
		}
	};
	
	public Value<Boolean> descendantRefCount;
	
	public Value<Boolean> parentLoadChildren = new Import<Record, Boolean>(parent, loadChildren);
}
