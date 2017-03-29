/*globals define*/
/*jshint node: true, browser: true*/

/**
 * @author kecso / https://github.com/kecso
 */
define(['common/core/CoreAssert', 'common/core/constants'], function (ASSERT, CONSTANTS) {
    'use strict';

    var FORBIDDEN_WORDS = {
        guid: true,
        hash: true,
        attr: true,
        reg: true,
        pointer: true,
        set: true,
        meta: true,
        removed: true,
        movedFrom: true,
        childrenListChanged: true,
        oGuids: true,
        ooGuids: true,
        oBaseGuids: true,
        ooBaseGuids: true,
        min: true,
        max: true
    };

    /**
     *
     * @param {string} path - arbitrary string where the legs of the path are separated with '/' character.
     * @return {object} The function returns an object with processed information about the path.
     *
     * @example
     * {
     *  full: "/a/b/set/mySet//a/c//reg/position",
     *  node: "/a/b",
     *  embededdNode: "/a/c",
     *  pathArray:["a","b","set","mySet","/a/c","reg","position"]
     *  }
     *
     */
    function pathToObject(path) {
        var object = {
                full: path,
                node: null,
                embeddedNode: null,
                pathArray: []
            },
            firstRun = path.split(CONSTANTS.PATH_SEP + CONSTANTS.PATH_SEP),
            i;

        ASSERT(firstRun.length >= 1 && firstRun.length <= 3);

        if (firstRun.length === 3) {
            object.embeddedNode = firstRun[1].length === 0 ? '' : CONSTANTS.PATH_SEP + firstRun[1];
            object.pathArray = firstRun[2].split(CONSTANTS.PATH_SEP);
            object.pathArray.unshift(object.embeddedNode);
            object.pathArray = firstRun[0].split(CONSTANTS.PATH_SEP).concat(object.pathArray);
        } else if (firstRun.length === 2) {
            object.embeddedNode = firstRun[1].length === 0 ? '' : CONSTANTS.PATH_SEP + firstRun[1];
            object.pathArray = firstRun[0].split(CONSTANTS.PATH_SEP);
            object.pathArray.push(object.embeddedNode);
        } else {
            object.pathArray = path.split(CONSTANTS.PATH_SEP);
        }
        object.pathArray.shift();

        object.node = '';
        for (i = 0; i < object.pathArray.length; i += 1) {
            if (FORBIDDEN_WORDS[object.pathArray[i]] !== true && object.pathArray[i].length > 0) {
                object.node += CONSTANTS.PATH_SEP + object.pathArray[i];
            } else {
                break;
            }
        }

        return object;
    }

    function getSetValueFromNode(core, node, memberPath, pathArray) {
        var setName = pathArray[0];

        if (typeof memberPath === 'string') {
            switch (pathArray[2]) {
                case 'attr':
                    return core.getMemberOwnAttribute(node, setName, memberPath, pathArray[3]);
                case 'reg':
                    return core.getMemberOwnRegistry(node, setName, memberPath, pathArray[3]);
            }
        } else {
            switch (pathArray[1]) {
                case 'attr':
                    return core.getOwnSetAttribute(node, setName, pathArray[2]);
                case 'reg':
                    return core.getOwnSetRegistry(node, setName, pathArray[2]);
            }
        }

        return undefined;
    }

    function getObjectValue(object, pathArray) {
        var value = object;
        while (value !== null && value !== undefined && pathArray.length > 0) {
            value = value[pathArray.shift()];
        }

        return value;
    }

    function getMetaValueFromNode(core, node, embeddedPath, pathArray) {
        switch (pathArray[0]) {
            case 'children':
                return getObjectValue(core.getChildrenMeta(node), pathArray.slice(1));
            case 'pointers':
                return getObjectValue(core.getPointerMeta(node, pathArray[1]), pathArray.slice(2));
            case 'attributes':
                return getObjectValue(core.getAttributeMeta(node, pathArray[1]), pathArray.slice(2));
            case 'aspects':
                // aspect changes cannot generate conflicts
                break;
            case 'constraints':
                return getObjectValue((core.getConstraint(node, pathArray[1])), pathArray.slice(2));
        }

        return undefined;
    }

    /**
     *
     * @param {object} core - the core object that allows access to the Core API
     * @param (module:Core~Node) node - the node whose value we are interested in
     * @param {string} subNodePath - a string that has the path structure and represents the sub-node location
     * of the value we are interested in.
     * @returns {undefined|*} - if the value is undefined, that means there is no such value, otherwise the value will
     * be returned back.
     */
    function getValueFromNode(core, node, subNodePath) {
        var pathObject = pathToObject(subNodePath);

        ASSERT(pathObject.node === '');
        ASSERT(FORBIDDEN_WORDS[pathObject.pathArray[0]] === true);

        switch (pathObject.pathArray[0]) {
            case 'guid':
                return core.getGuid(node);
            case 'attr':
                return core.getOwnAttribute(node, pathObject.pathArray[1]);
            case 'reg':
                return core.getOwnRegistry(node, pathObject.pathArray[1]);
            case 'pointer':
                return core.getOwnPointerPath(node, pathObject.pathArray[1]);
            case 'set':
                return getSetValueFromNode(core, node, pathObject.embeddedNode, pathObject.pathArray.slice(1));
            case 'meta':
                return getMetaValueFromNode(core, node, pathObject.embeddedNode, pathObject.pathArray.slice(1));
            default:
                return undefined;
        }
    }

    /**
     *
     * @param {object} completeDiff - a diff object, that we would like to process and gather information from.
     * @returns {string[]} An array of string of the paths of the affected nodes are returned. No partial update nodes
     * are returned as we cannot gather that intel completely.
     */
    function getChangedNodePaths(completeDiff) {
        var changedNodes = {},
            recGetNodePath = function (path, diff) {
                var key;

                changedNodes[path] = true;

                for (key in diff) {
                    if (FORBIDDEN_WORDS[key] !== true) {
                        recGetNodePath(path + CONSTANTS.PATH_SEP + key, diff[key]);
                    }
                }
            };

        recGetNodePath('', completeDiff);
        return Object.keys(changedNodes);
    }

    return {
        pathToObject: pathToObject,
        getValueFromNode: getValueFromNode,
        getChangedNodePaths: getChangedNodePaths,
        FORBIDDEN_WORDS: FORBIDDEN_WORDS
    };
});