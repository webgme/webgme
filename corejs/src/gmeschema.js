/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

define(function () {
	"use strict";

	// ----------------- Database objects -----------------

	var hash = {
		type: "string",
		minLength: 40,
		maxLength: 40
	};

	var relid = {
		type: "string"
	};

	var db_pointers = {
		type: "object",
		properties: {
			children: {
				type: "object",
				description: "The property names are relids, the values are pointer hashes.",
				additionalProperties: hash
			}
		},
		additionalProperties: false
	};

	var db_collection = {
		type: "object",
		properties: {
			relid: relid,
			parent: hash
		}
	};

	var db_node = {
		type: "object",
		properties: {
			attributes: {
				type: "object",
				additionalProperties: {
					type: "string"
				}
			},
			children: {
				type: "object",
				description: "the property names are relids, the values are object hashes.",
				additionalProperties: hash
			}
		},
		additionalProperties: false
	};

	// ----------------- Memory objects -----------------

	var node = {
		id: "node",
		type: "object",
		properties: {
			hash: {
				id: "hash",
				type: "string",
				minLength: 40,
				maxLength: 40,
				required: false
			},
			attributes: {
				type: "object",
				additionalProperties: {
					type: "string"
				}
			},
			children: {
				type: {
					$ref: "#x"
				}
			}
		},
		additionalProperties: false
	};

	return {
		node: node
	};
});
