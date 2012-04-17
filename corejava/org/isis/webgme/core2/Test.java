package org.isis.webgme.core2;

import org.isis.reactive2.*;

public class Test extends ReObservable {

	protected int __value;
	public static ReField<Test,Integer> value = new ReField<Test,Integer>() {
		public Integer get(Test entry) {
			return entry.__value;
		}
		protected void rawSet(Test entry, Integer value) {
			entry.__value = value;
		}
	};

	protected String[] __patterns;
	public static ReField<Test,String[]> patterns = new ReField<Test,String[]>() {
		public String[] get(Test entry) {
			return entry.__patterns;
		}
		protected void rawSet(Test entry, String[] value) {
			entry.__patterns = value;
		}
	};
	
	public static ReValue<Test,Boolean> selfPatterns = new ReUnary<Test, Boolean, String[]>(ReUnary.CONTAINS("self"), patterns);
	public static ReValue<Test,Boolean> ancestorPatterns = new ReUnary<Test, Boolean, String[]>(ReUnary.CONTAINS("ancestor"), patterns);
	
	
}
