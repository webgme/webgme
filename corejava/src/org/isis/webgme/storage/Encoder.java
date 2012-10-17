/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.webgme.storage;

import com.mongodb.DBObject;
import com.allanbank.mongodb.bson.Document;

public interface Encoder<Type> {
	public Type decodeMongo1(DBObject document) throws Exception;

	public DBObject encodeMongo1(Type object) throws Exception;

	public Type decodeMongo2(Document document) throws Exception;

	public Document encodeMongo2(Type object) throws Exception;
}
