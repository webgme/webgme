package org.isis.webgme.core3;

import java.util.*;

public class AgedNode {
	public AgedNode parent;
	public final String relid;
	public int age = 0;
	public final ArrayList<AgedNode> children = new ArrayList<AgedNode>();

	AgedNode(AgedNode parent, String relid) {
		this.parent = parent;
		this.relid = relid;
	}
}
