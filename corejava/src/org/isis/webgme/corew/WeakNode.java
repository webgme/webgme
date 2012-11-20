package org.isis.webgme.corew;

import java.lang.ref.*;
import java.util.*;

public class WeakNode {
	final static Object UNINITIALIZED_DATA = new Object();

	final WeakNode parent;
	final String relid;
	Object data = UNINITIALIZED_DATA;

	WeakNode(WeakNode parent, String relid) {
		this.parent = parent;
		this.relid = relid;
	}

	final ArrayList<WeakReference<WeakNode>> children = new ArrayList<WeakReference<WeakNode>>();
}
