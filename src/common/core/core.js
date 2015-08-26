/*globals define*/
/*jshint node: true, browser: true*/

/**
 * This class defines the public API of the WebGME-Core
 *
 * @author kecso / https://github.com/kecso
 */

define([
    'common/core/corerel',
    'common/core/setcore',
    'common/core/guidcore',
    'common/core/nullpointercore',
    'common/core/coreunwrap',
    'common/core/coretype',
    'common/core/constraintcore',
    'common/core/coretree',
    'common/core/metacore',
    'common/core/coretreeloader',
    'common/core/corediff',
    'common/core/metacachecore'
], function (CoreRel,
             Set,
             Guid,
             NullPtr,
             UnWrap,
             Type,
             Constraint,
             CoreTree,
             MetaCore,
             TreeLoader,
             CoreDiff,
             MetaCacheCore) {
    'use strict';

    /**
     * @typedef {object} Core~GmeCoreNode - the object that represents the atomic element of the containment hierarchy.
     */
    /**
     * @typedef {object} Core~GmePersisted - the result object of a persist which contains information about the newly
     * created data objects.
     */


    /**
     * @param {object} storageObject
     * @param {object} options - contains logging information
     * @alias Core
     * @constructor
     */
    function Core(storage, options) {
        var core,
            coreLayers = [];
        coreLayers.push(CoreRel);
        coreLayers.push(NullPtr);
        coreLayers.push(Type);
        coreLayers.push(NullPtr);
        coreLayers.push(Set);
        coreLayers.push(Guid);
        coreLayers.push(Constraint);
        coreLayers.push(MetaCore);
        coreLayers.push(CoreDiff);
        coreLayers.push(TreeLoader);
        coreLayers.push(MetaCacheCore);

        if (options.usertype !== 'tasync') {
            coreLayers.push(UnWrap);
        }

        core = coreLayers.reduce(function (inner, Class) {
            return new Class(inner, options);
        }, new CoreTree(storage, options));

        /**
         * Returns the parent of the node.
         * @param {Core~GmeCoreNode} node - the node in question
         *
         * @return {Core~GmeCoreNode} Returns the parent of the node or NULL if it has no parent.
         *
         * @func
         */
        this.getParent = core.getParent;

        /**
         * Returns the parent-relative identifier of the node.
         * @param {Core~GmeCoreNode} node - the node in question.
         *
         * @return {string} Returns the id string or return NULL and UNDEFINED if there is no such id for the node.
         *
         * @func
         */
        this.getRelid = core.getRelid;
        //this.getLevel = core.getLevel;

        /**
         * Returns the root node of the containment tree.
         * @param {Core~GmeCoreNode} node - the node in question.
         *
         * @return {Core~GmeCoreNode} Returns the root of the containment hierarchy (it can be the node itself).
         *
         * @func
         */
        this.getRoot = core.getRoot;

        /**
         * Retuns the complete path of the node in the containment hierarchy.
         * @param {Core~GmeCoreNode} node - the node in question.
         *
         * @return {string} Returns a path string where each portion is a relative id and they are separated by '/'.
         * The path can be empty as well if the node in question is the  root itself, otherwise it should be a chain
         * of relative ids from the root of the containment hierarchy.
         *
         * @func
         */
        this.getPath = core.getPath;
        //this.isValidPath = core.isValidPath;
        //this.splitPath = core.splitPath;
        //this.buildPath = core.buildPath;
        //this.joinPaths = core.joinPaths;
        //this.getCommonPathPrefixData = core.getCommonPathPrefixData;
        //this.normalize = core.normalize;
        //this.getAncestor = core.getAncestor;
        //this.isAncestor = core.isAncestor;
        //this.createRoot = core.createRoot;
        //this.createChild = core.createChild;
        this.getChild = core.getChild;
        //this.getDescendant = core.getDescendant;
        //this.getDescendantByPath = core.getDescendantByPath;
        //this.isMutable = core.isMutable;
        //this.isObject = core.isObject;
        this.isEmpty = core.isEmpty;
        //this.mutate = core.mutate;
        //this.getData = core.getData;
        //this.setData = core.setData;
        //this.deleteData = core.deleteData;
        //this.copyData = core.copyData;
        //this.getProperty = core.getProperty;
        //this.setProperty = core.setProperty;
        //this.deleteProperty = core.deleteProperty;
        //this.getKeys = core.getKeys;
        //this.getRawKeys = core.getRawKeys;
        //this.isHashed = core.isHashed;
        //this.setHashed = core.setHashed;
        /**
         * Returns the calculated database id of the data of the node.
         * @param {Core~GmeCoreNode} node - the node in question.
         *
         * @return {string} Returns the so called Hash value of the data of the given node. If the string is empty,
         * then it means that the node was mutated but not yet saved to the database, so it do not have a hash
         * temporarily.
         *
         * @func
         */
        this.getHash = core.getHash;
        this.persist = core.persist;
        /**
         * @callback Core~LoadRootCallback
         * @param {Error} resultError - in case of success it is NULL
         * @param {Core~GmeCoreNode} root - the loaded root
         */
        /**
         * Loads the data object with the given hash and makes it a root of a containment hierarchy.
         * @param {string} hash - the hash of the data object we like to load as root.
         * @param {Core~LoadRootCallback} callback
         *
         * @func
         */
        this.loadRoot = core.loadRoot;
        this.loadChild = core.loadChild;
        this.loadByPath = core.loadByPath;
        this.isValidNode = core.isValidNode;
        this.getChildHash = core.getChildHash;
        this.isValidRelid = core.isValidRelid;
        this.getChildrenRelids = core.getChildrenRelids;
        this.getChildrenPaths = core.getChildrenPaths;
        this.loadChildren = core.loadChildren;
        this.createNode = core.createNode;
        this.deleteNode = core.deleteNode;
        this.copyNode = core.copyNode;
        this.copyNodes = core.copyNodes;
        this.moveNode = core.moveNode;
        this.getAttributeNames = core.getAttributeNames;
        this.getAttribute = core.getAttribute;
        this.setAttribute = core.setAttribute;
        this.delAttribute = core.delAttribute;
        this.getRegistryNames = core.getRegistryNames;
        this.getRegistry = core.getRegistry;
        this.setRegistry = core.setRegistry;
        this.delRegistry = core.delRegistry;
        this.getPointerNames = core.getPointerNames;
        this.getPointerPath = core.getPointerPath;
        this.hasPointer = core.hasPointer;
        this.getOutsidePointerPath = core.getOutsidePointerPath;
        this.loadPointer = core.loadPointer;
        this.deletePointer = core.deletePointer;
        this.setPointer = core.setPointer;
        this.getCollectionNames = core.getCollectionNames;
        this.getCollectionPaths = core.getCollectionPaths;
        this.loadCollection = core.loadCollection;
        this.getCoreTree = core.getCoreTree;
        this.getChildrenHashes = core.getChildrenHashes;
        this.getBase = core.getBase;
        this.getBaseRoot = core.getBaseRoot;
        this.getOwnAttributeNames = core.getOwnAttributeNames;
        this.getOwnRegistryNames = core.getOwnRegistryNames;
        this.getOwnAttribute = core.getOwnAttribute;
        this.getOwnRegistry = core.getOwnRegistry;
        this.getOwnPointerNames = core.getOwnPointerNames;
        this.getOwnPointerPath = core.getOwnPointerPath;
        this.setBase = core.setBase;
        this.getTypeRoot = core.getTypeRoot;
        this.getSetNumbers = core.getSetNumbers;
        this.getSetNames = core.getSetNames;
        this.getMemberPaths = core.getMemberPaths;
        this.delMember = core.delMember;
        this.addMember = core.addMember;
        this.getMemberAttributeNames = core.getMemberAttributeNames;
        this.getMemberOwnAttributeNames = core.getMemberOwnAttributeNames;
        this.getMemberAttribute = core.getMemberAttribute;
        this.setMemberAttribute = core.setMemberAttribute;
        this.delMemberAttribute = core.delMemberAttribute;
        this.getMemberRegistryNames = core.getMemberRegistryNames;
        this.getMemberOwnRegistryNames = core.getMemberOwnRegistryNames;
        this.getMemberRegistry = core.getMemberRegistry;
        this.setMemberRegistry = core.setMemberRegistry;
        this.delMemberRegistry = core.delMemberRegistry;
        this.createSet = core.createSet;
        this.deleteSet = core.deleteSet;
        this.isMemberOf = core.isMemberOf;
        this.getMiddleGuid = core.getMiddleGuid;
        this.getGuid = core.getGuid;
        this.setGuid = core.setGuid;
        this.getConstraint = core.getConstraint;
        this.setConstraint = core.setConstraint;
        this.delConstraint = core.delConstraint;
        this.getConstraintNames = core.getConstraintNames;
        this.getOwnConstraintNames = core.getOwnConstraintNames;
        this.isTypeOf = core.isTypeOf;
        this.isValidChildOf = core.isValidChildOf;
        this.getValidPointerNames = core.getValidPointerNames;
        this.getValidSetNames = core.getValidSetNames;
        this.isValidTargetOf = core.isValidTargetOf;
        this.getValidAttributeNames = core.getValidAttributeNames;
        this.isValidAttributeValueOf = core.isValidAttributeValueOf;
        this.getValidAspectNames = core.getValidAspectNames;
        this.getAspectMeta = core.getAspectMeta;
        this.getJsonMeta = core.getJsonMeta;
        this.getOwnJsonMeta = core.getOwnJsonMeta;
        this.clearMetaRules = core.clearMetaRules;
        this.setAttributeMeta = core.setAttributeMeta;
        this.delAttributeMeta = core.delAttributeMeta;
        this.getAttributeMeta = core.getAttributeMeta;
        this.getValidChildrenPaths = core.getValidChildrenPaths;
        this.setChildMeta = core.setChildMeta;
        this.delChildMeta = core.delChildMeta;
        this.setChildrenMetaLimits = core.setChildrenMetaLimits;
        this.setPointerMetaTarget = core.setPointerMetaTarget;
        this.delPointerMetaTarget = core.delPointerMetaTarget;
        this.setPointerMetaLimits = core.setPointerMetaLimits;
        this.delPointerMeta = core.delPointerMeta;
        this.getPointerMeta = core.getPointerMeta;
        this.setAspectMetaTarget = core.setAspectMetaTarget;
        this.delAspectMetaTarget = core.delAspectMetaTarget;
        this.delAspectMeta = core.delAspectMeta;
        this.getBaseType = core.getBaseType;
        this.isInstanceOf = core.isInstanceOf;
        this.nodeDiff = core.nodeDiff;
        this.generateTreeDiff = core.generateTreeDiff;
        this.generateLightTreeDiff = core.generateLightTreeDiff;
        this.applyTreeDiff = core.applyTreeDiff;
        this.tryToConcatChanges = core.tryToConcatChanges;
        this.applyResolution = core.applyResolution;
        this.loadSubTree = core.loadSubTree;
        this.loadTree = core.loadTree;


    }

    return Core;
});
