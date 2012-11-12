package org.isis.webgme.core;

import java.lang.ref.*;
import java.util.*;

public class WeakNode {
	public final WeakNode parent;
	public final String relid;
	public final ArrayList<WeakReference<WeakNode>> children = new ArrayList<WeakReference<WeakNode>>();

	WeakNode(WeakNode parent, String relid) {
		this.parent = parent;
		this.relid = relid;
	}
}
