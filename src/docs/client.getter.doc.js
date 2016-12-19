/**
 * @author kecso / https://github.com/kecso
 */

/**
 * @description This class provides the API for getting information about a gme node
 * in the model. To get hold of such object use the [getNode]{@link Client#getNode} function.
 * !!! The documentation of the functions of the class are not complete!!! The functions of this class
 * are aligned with the functions of the [Core]{@link Core}.
 * @class GMENode
 *
 * @param {string} _id - Path of node.
 * @param {GmeLogger} logger - logger.
 * @param {object} state - state of the client.
 * @param {function} storeNode - invoked when storing new nodes.
 */

/**
 * @description Returns the path of the parent of the node.
 * @function getParentId
 * @memberOf GMENode
 * @instance
 *
 * @return {string|null} The path of the parent.
 */

/**
 * @description Returns the path of the given node.
 * @function getId
 * @memberOf GMENode
 * @instance
 *
 * @return {string} The path of the node.
 */

/**
 * @description Returns the relative id of the node.
 * @function getRelid
 * @memberOf GMENode
 * @instance
 *
 * @return {(string|null|undefined)} The relative id of the node.
 */

/**
 * @description Get the GUID of a node.
 * @function getGuid
 * @memberOf GMENode
 * @instance
 *
 * @return {Core.GUID} Returns the globally unique identifier.
 */

/**
 * @description Collects the relative ids of all the children of the given node.
 * @function getChildrenRelids
 * @memberOf GMENode
 * @instance
 *
 * @return {string[]} The function returns an array of the relative ids.
 */

/**
 * @description Collects the paths of all the children of the given node.
 * @function getChildrenIds
 * @memberOf GMENode
 * @instance
 *
 * @return {string[]} The function returns an array of the absolute paths of the children.
 */

/**
 * @description Returns the path of the base of the node.
 * @function getBaseId
 * @memberOf GMENode
 * @instance
 *
 * @return {string} The paths of the base of the node.
 */

/**
 * @description Check if the given node would be a valid base for the node.
 * @memberOf GMENode
 * @instance
 *
 * @param {string} basePath - the path of the intended new base node.
 *
 * @return {boolean}
 */

/**
 * @description Checks if the given node would be a valid parent of the node.
 * @memberOf GMENode
 * @instance
 *
 * @param {string} parentPath - path of the intended new parent node.
 *
 * @return {boolean}
 */

/**
 * @description Gathers the paths of instances of the node.
 * @function getInheritorIds
 * @memberOf GMENode
 * @instance
 *
 * @return {string[]} The paths of the instances of the node.
 */

/**
 * @description Retrieves the value of the given attribute of the given node.
 * @function getAttribute
 * @memberOf GMENode
 * @instance
 *
 * @param {string} name - the name of the attribute.
 *
 * @return {(object|primitive|null|undefined)} The function returns the value of the attribute of the node.
 * The value can be an object or any primitive type. If the value is undefined that means the node do not have
 * such attribute defined. [The retrieved attribute should not be modified as is - it should be copied first!!]
 */

/**
 * @description Returns the value of the attribute defined for the given node.
 * @function getOwnAttribute
 * @memberOf GMENode
 * @instance
 *
 * @param {string} name - the name of the attribute.
 *
 * @return {(object|primitive|null|undefined)} Returns the value of the attribute defined specifically for
 * the node. If undefined then it means that there is no such attribute defined directly for the node, meaning
 * that it either inherits some value or there is no such attribute at all.
 * [The retrieved attribute should not be modified as is - it should be copied first!!]
 */

/**
 * @description Retrieves the value of the given attribute of the given node.
 * @function getEditableAttribute
 * @memberOf GMENode
 * @instance
 *
 * @param {string} name - the name of the attribute.
 *
 * @return {(object|primitive|null|undefined)} The function returns the value of the attribute of the node.
 * The value can be an object or any primitive type. If the value is undefined that means the node do not have
 * such attribute defined.
 */

/**
 * @description Returns the value of the attribute defined for the given node.
 * @function getOwnEditableAttribute
 * @memberOf GMENode
 * @instance
 *
 * @param {string} name - the name of the attribute.
 *
 * @return {(object|primitive|null|undefined)} Returns the value of the attribute defined specifically for
 * the node. If undefined then it means that there is no such attribute defined directly for the node, meaning
 * that it either inherits some value or there is no such attribute at all.
 */

/**
 * @description Returns the value of the given registry entry.
 * Please note that this return value should not be mutated!
 * @function getRegistry
 * @memberOf GMENode
 * @instance
 *
 * @param {string} name - The name of the registry entry.
 *
 * @return {primitive|object|null|undefined} The value of the registry entry.
 */

/**
 * @description Returns the value of the registry entry defined for the given node.
 * Please note that this return value should not be mutated!
 * @function getOwnRegistry
 * @memberOf GMENode
 * @instance
 *
 * @param {string} name - The name of the registry entry.
 *
 * @return {primitive|object|null|undefined} The value of the registry entry.
 */

/**
 * @description Returns the value of the given registry entry.
 * @function getEditableRegistry
 * @memberOf GMENode
 * @instance
 *
 * @param {string} name - The name of the registry entry.
 *
 * @return {primitive|object|null|undefined} The value of the registry entry.
 */

/**
 * @description Returns the value of the registry entry defined for the given node.
 * @function getOwnEditableRegistry
 * @memberOf GMENode
 * @instance
 *
 * @param {string} name - The name of the registry entry.
 *
 * @return {primitive|object|null|undefined} The value of the registry entry.
 */

/**
 * @description Returns information about the given pointer of the node.
 * @function getPointer
 * @memberOf GMENode
 * @instance
 *
 * @param {string} name - The name of the pointer.
 *
 * @return {object} Returns a special object with fields 'to' and 'from'. The value of 'to' is a string that
 * is the path of the target node. The 'from' is always an empty array.
 *
 * @example
 * {
 *  to: '/a/3',
 *  from:[]
 * }
 */

/**
 * @description Returns the path of the target node of the given pointer.
 * @function getPointerId
 * @memberOf GMENode
 * @instance
 *
 * @param {string} name - The name of the pointer.
 *
 * @return {string|null|undefined} The path of the target node. If the response is null, then the pointer
 * is defined but has no target, if undefined, it is not defined.
 */

/**
 * @description Returns information about the pointer specifically set for the node.
 * @function getOwnPointer
 * @memberOf GMENode
 * @instance
 *
 * @param {string} name - The name of the pointer.
 *
 * @return {object} Returns a special object with fields 'to' and 'from'. The value of 'to' is a string that
 * is the path of the target node. The 'from' is always an empty array.
 *
 * @example
 * {
 *  to: '/a/3',
 *  from:[]
 * }
 */

/**
 * @description Returns the path of the target node of the given pointer defined for this specific node.
 * @function getOwnPointerId
 * @memberOf GMENode
 * @instance
 *
 * @param {string} name - The name of the pointer.
 *
 * @return {string|null|undefined} The path of the target node. If the response is null, then the pointer
 * is defined but has no target, if undefined, it is not defined.
 */

/**
 * @description Retrieves a list of the defined pointer names of the node.
 * @function getPointerNames
 * @memberOf GMENode
 * @instance
 *
 * @return {string[]} The function returns an array of the names of the pointers of the node.
 */

/**
 * @description Returns the list of the names of the pointers that were defined specifically for the node.
 * @function getOwnPointerNames
 * @memberOf GMENode
 * @instance
 *
 * @return {string[]} Returns an array of names of pointers defined specifically for the node.
 */

/**
 * @description Returns the names of the defined attributes of the node.
 * @function getAttributeNames
 * @memberOf GMENode
 * @instance
 *
 * @return {string[]} The function returns an array of the names of the attributes of the node.
 */

/**
 * @description Returns the list of the META defined attribute names of the node.
 * @function getValidAttributeNames
 * @memberOf GMENode
 * @instance
 *
 * @return {string[]} The function returns all the attribute names that are defined among the META rules of the
 * node.
 */

/**
 * @description Returns the names of the attributes of the node that have been first defined for
 * the node and not for its bases.
 * @function getOwnAttributeNames
 * @memberOf GMENode
 * @instance
 *
 * @return {string[]} The function returns an array of the names of the own attributes of the node.
 */

/**
 * @description Returns the list of the META defined attribute names of
 * the node that were specifically defined for the node.
 * @function getOwnValidAttributeNames
 * @memberOf GMENode
 * @instance
 *
 * @return {string[]} The function returns the attribute names that are defined specifically for the node.
 */

/**
 * @description Returns the definition object of an attribute from the META rules of the node.
 * @function getAttributeMeta
 * @memberOf Core
 * @instance
 *
 * @param {string} name - the name of the attribute.
 *
 * @return {object} The function returns the definition object, where type is always defined. For examples
 * see the similar [Core]{@link Core#getAttributeMeta} definition.
 */
// expect(typeof node.getRegistryNames).to.equal('function');
// expect(typeof node.getOwnRegistryNames).to.equal('function');
// expect(typeof node.getMemberIds).to.equal('function');
// expect(typeof node.getSetNames).to.equal('function');
// expect(typeof node.getMemberAttributeNames).to.equal('function');
// expect(typeof node.getMemberAttribute).to.equal('function');
// expect(typeof node.getEditableMemberAttribute).to.equal('function');
// expect(typeof node.getMemberRegistryNames).to.equal('function');
// expect(typeof node.getMemberRegistry).to.equal('function');
// expect(typeof node.getEditableMemberRegistry).to.equal('function');
// expect(typeof node.getSetRegistry).to.equal('function');
// expect(typeof node.getSetRegistryNames).to.equal('function');
// expect(typeof node.getSetAttribute).to.equal('function');
// expect(typeof node.getSetAttributeNames).to.equal('function');
// expect(typeof node.getValidChildrenTypes).to.equal('function');
// expect(typeof node.getValidAttributeNames).to.equal('function');
// expect(typeof node.isValidAttributeValueOf).to.equal('function');
// expect(typeof node.getValidPointerNames).to.equal('function');
// expect(typeof node.getValidSetNames).to.equal('function');
// expect(typeof node.getConstraintNames).to.equal('function');
// expect(typeof node.getOwnConstraintNames).to.equal('function');
// expect(typeof node.getConstraint).to.equal('function');
// expect(typeof node.toString).to.equal('function');
// expect(typeof node.getCollectionPaths).to.equal('function');
// expect(typeof node.getInstancePaths).to.equal('function');
// expect(typeof node.getJsonMeta).to.equal('function');
// expect(typeof node.isConnection).to.equal('function');
// expect(typeof node.isAbstract).to.equal('function');
// expect(typeof node.isLibraryRoot).to.equal('function');
// expect(typeof node.isLibraryElement).to.equal('function');
// expect(typeof node.getFullyQualifiedName).to.equal('function');
// expect(typeof node.getNamespace).to.equal('function');
// expect(typeof node.getLibraryGuid).to.equal('function');
// expect(typeof node.getCrosscutsInfo).to.equal('function');
// expect(typeof node.getValidChildrenTypesDetailed).to.equal('function');
// expect(typeof node.getValidSetMemberTypesDetailed).to.equal('function');
// expect(typeof node.getMetaTypeId).to.equal('function');
// expect(typeof node.isMetaNode).to.equal('function');
// expect(typeof node.isTypeOf).to.equal('function');
// expect(typeof node.isValidChildOf).to.equal('function');
// expect(typeof node.getValidChildrenIds).to.equal('function');
// expect(typeof node.isValidTargetOf).to.equal('function');
// expect(typeof node.getValidAspectNames).to.equal('function');
// expect(typeof node.getOwnValidAspectNames).to.equal('function');
// expect(typeof node.getAspectMeta).to.equal('function');
// expect(typeof node.getMixinPaths).to.equal('function');
// expect(typeof node.canSetAsMixin).to.equal('function');
// expect(typeof node.isReadOnly).to.equal('function');