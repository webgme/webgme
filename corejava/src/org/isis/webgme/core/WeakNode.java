package org.isis.webgme.core;

import java.lang.ref.*;
import java.util.*;

public class WeakNode {
	final WeakNode parent;
	final String relid;

	WeakNode(WeakNode parent, String relid) {
		this.parent = parent;
		this.relid = relid;
	}

	final ArrayList<WeakReference<WeakNode>> children = new ArrayList<WeakReference<WeakNode>>();
	Object data;
}
