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
        min: true,
        max: true
    };

    function diffPathStringToObject(path) {
        var object = {
                full: path,
                node: null,
                embeddedNode: null,
                pathArray: []
            },
            firstRun = path.split(CONSTANTS.PATH_SEP + CONSTANTS.PATH_SEP),
            i;

        ASSERT(firstRun.length === 1 || firstRun.length === 3);

        if (firstRun.length === 3) {
            object.embeddedNode = firstRun[1].length === 0 ? '' : CONSTANTS.PATH_SEP + firstRun[1];
            object.pathArray = firstRun[2].split(CONSTANTS.PATH_SEP);
            object.pathArray.unshift(object.embeddedNode);
            object.pathArray = firstRun[0].split(CONSTANTS.PATH_SEP).concat(object.pathArray);
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

        console.log(pathArray, memberPath);
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

    function getMetaValueFromNode(core, node, pathArray) {
        return undefined;
    }

    function getValueFromNode(core, node, subNodePath) {
        var pathObject = diffPathStringToObject(subNodePath);

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
                return getMetaValueFromNode(core, node, pathObject.pathArray.slice(1));
            default:
                return undefined;
        }
    }

    return {
        pathToObject: diffPathStringToObject,
        getValueFromNode: getValueFromNode,
        FORBIDDEN_WORDS: FORBIDDEN_WORDS
    };
});