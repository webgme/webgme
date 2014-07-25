package org.isis.webgme.core3;

import java.util.*;

public abstract class CoreTree<NODE> extends CorePath<NODE> {

	public final static Object EMPTY_DATA = new Object();

	/**
	 * Returns the data corresponding to this node, which is null (invalid
	 * path), an Integer, a String, EMPTY_DATA or a regular compound object
	 */
	public abstract Object getData(NODE node);

	public abstract boolean isMutable(NODE node);

	public abstract void mutate(NODE node);
	
	/**
	 * Returns null (object is not hashed), or an empty string (hash is not yet
	 * calculated for mutable object) or a real hash string;
	 */
	public abstract String getHash(NODE node);

	/**
	 * Sets the hash of the node directly with no verification.
	 */
	protected abstract void setHash(NODE node, String hash);

	public abstract List<String> getProperties();

	// must return a String or an Integer
	public abstract Object getProperty(String name);

	public abstract void setProperty(String name, Object value);

}
