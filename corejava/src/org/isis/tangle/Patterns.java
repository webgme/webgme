package org.isis.tangle;

public class Patterns extends Node {

	public static class Pattern extends Node {

		public static final int SELF = 0x0001;
		public static final int CHILDREN = 0x0002;
		public static final int ANCESTORS = 0x0004;
		
		protected int flags;
		
		public int getFlags() {
			return flags;
		}
		
		public void setFlags(int flags) {
			assert(isMutable());
			this.flags = flags;
		}

		public Pattern() {
			super();
			flags = 0;
		}
		
		protected Pattern(Pattern pattern) {
			super(pattern);
			flags = pattern.flags;
		}
		
		protected Pattern clone() {
			return new Pattern(this);
		}

		public boolean has(int FLAG) {
			return (flags & FLAG) != 0;
		}
		
		public String toString() {
			String s = "";

			if( has(SELF) ) 
				s += "self: true, ";
			if( has(CHILDREN) )
				s += "children: true, ";
			if( has(ANCESTORS) )
				s += "ancestors: true, ";
			
			return s + super.toString();
		}
	};
	
	public static void main(String[] args) {
	}
}
