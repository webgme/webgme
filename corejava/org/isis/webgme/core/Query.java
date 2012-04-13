package org.isis.webgme.core;

import org.isis.webgme.reactive.*;
import org.isis.webgme.reactive.Class;

public class Query
{
	protected Class reactive = new Class();

	protected Field<Object> data = reactive.declareField(null);
	protected Field<Object> patterns = reactive.declareField(null);

}
