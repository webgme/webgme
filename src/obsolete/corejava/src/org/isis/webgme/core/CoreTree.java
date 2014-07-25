package org.isis.webgme.core;

import java.util.*;

public interface CoreTree<NODE> extends CorePath<NODE> {
	public final static JsonObject EMPTY = new JsonObject(new String[0],
			new Object[0]);

	/**
	 * Returns the data corresponding to this node, which is null (invalid
	 * path), an Integer, a String, EMPTY_DATA or a regular compound object
	 */
	public Object getData(NODE node);

	public boolean isMutable(NODE node);

	public void mutate(NODE node);

	/**
	 * Returns null (object is not hashed), or an empty string (hash is not yet
	 * calculated for mutable object) or a real hash string;
	 */
	public String getHash(NODE node);

	/**
	 * Sets the hash of the node directly with no verification.
	 */
	public void setHash(NODE node, String hash);

	public List<String> getProperties();

	// returns a String, an Integer or an immutable object
	public Object getProperty(String name);

	public void setProperty(String name, Object value);
}
