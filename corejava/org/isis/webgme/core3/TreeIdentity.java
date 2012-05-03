package org.isis.webgme.core3;

public class TreeIdentity implements Comparable<TreeIdentity> {
	private TreeIdentity parent;

	public TreeIdentity getParent() {
		return parent;
	}
	
	private int relid;

	public int getRelid() {
		return relid;
	}
	
	private int level;
	
	public int getLevel() {
		return level;
	}

	private TreeIdentity(TreeIdentity parent, int relid, int level) {
		assert(level >= 0 );

		this.parent = parent;
		this.relid = relid;
		this.level = level;
	}
	
	public static final TreeIdentity ROOT = new TreeIdentity(null, 0, 0);
	
	public TreeIdentity getChild(int relid) {
		return new TreeIdentity(this, relid, level+1);
	}
	
	public int compareTo(TreeIdentity other) {
		if( level != other.level )
			return level - other.level;
		
		TreeIdentity identity = this;
		while( identity != other ) {
			if( identity.relid != other.relid )
				return identity.relid - other.relid;
			
			other = other.parent;
			identity = identity.parent;
		}
		
		return 0;
	}
	
	public boolean equals(Object other) {
		if(other instanceof TreeIdentity)
			return compareTo((TreeIdentity)other) == 0;

		return false;
	}

	public int hashCode() {
		int hash0 = 0x12a3fe2d + level;
		int hash1 = 0x37abe8f9;

		TreeIdentity identity = this;
		while( identity.parent != null )
		{
			int hash = hash1 + (hash0 ^ (identity.relid * 71523));
			if (hash < 0) 
				hash -= 0x7fffffff;
				
			hash1 = hash0;
			hash0 = hash;
		}

		return hash0;
	}
}
