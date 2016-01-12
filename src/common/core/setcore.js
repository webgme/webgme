/*globals define*/
/*jshint node: true, browser: true*/

/**
 * @author kecso / https://github.com/kecso
 */

define(['common/util/assert'], function (ASSERT) {
    'use strict';

    function SetCore(innerCore, options) {
        ASSERT(typeof options === 'object');
        ASSERT(typeof options.globConf === 'object');
        ASSERT(typeof options.logger !== 'undefined');

        var logger = options.logger.fork('setcore'),
            setCore = {};
        for (var i in innerCore) {
            setCore[i] = innerCore[i];
        }
        logger.debug('initialized');

        //help functions
        function setModified(node) {
            innerCore.setRegistry(node, '_sets_', (innerCore.getRegistry(node, '_sets_') || 0) + 1);
        }

        function relIdSelector(key) {
            if (key.indexOf('_') !== 0 &&
                key !== setCore.constants.REGISTRY_PROPERTY &&
                key !== setCore.constants.ATTRIBUTES_PROPERTY &&
                key !== setCore.constants.OVERLAYS_PROPERTY) {
                return true;
            }
            return false;
        }

        function getMemberPath(node, setElementNode) {
            var ownPath = innerCore.getPath(node),
                memberPath = innerCore.getPointerPath(setElementNode, setCore.constants.MEMBER_RELATION);

            //TODO this is a hack and should be solved some other way if possible
            ownPath = ownPath.substring(0, ownPath.indexOf('/_'));

            if (ownPath !== memberPath) {
                return memberPath;
            }

            //now we should check who really set this member as its own
            while (innerCore.getBase(node) !== null && innerCore.getBase(setElementNode) !== null &&
            innerCore.getRegistry(innerCore.getBase(setElementNode), '_') === '_') {

                node = innerCore.getBase(node);
                setElementNode = innerCore.getBase(setElementNode);
                ownPath = innerCore.getPath(node);

                //TODO this is a hack and should be solved some other way if possible
                ownPath = ownPath.substring(0, ownPath.indexOf('/_'));
            }
            memberPath = innerCore.getPointerPath(setElementNode, setCore.constants.MEMBER_RELATION);

            return memberPath;

        }

        function getMemberRelId(node, setName, memberPath) {
            var setInfo,
                keys, i;

            do {
                setInfo = setCore.getProperty(node, setCore.constants.ALL_SETS_PROPERTY);
                if (setInfo && setInfo[setName]) {
                    keys = setCore.getRawKeys(setInfo[setName], relIdSelector);
                    for (i = 0; i < keys.length; i += 1) {
                        if (innerCore
                                .getPointerPathFrom(node, '/' +
                                    setCore.constants.ALL_SETS_PROPERTY +
                                    '/' + setName + '/' + keys[i], setCore.constants.MEMBER_RELATION) ===
                            memberPath) {
                            return keys[i];
                        }
                    }
                }
                node = setCore.getBase(node);
            } while (node);

            return null;
        }

        function createNewMemberRelid(setNode) {
            var MAX_RELID = Math.pow(2, 31);
            var existingRelIds = innerCore.getChildrenRelids(setNode);
            var relid;
            do {
                relid = Math.floor(Math.random() * MAX_RELID);
            } while (existingRelIds.indexOf(relid) !== -1);
            return '' + relid;
        }

        function collectSetNames(node) {
            var sets = [],
                setsInfo,
                keys, i;
            do {
                setsInfo = setCore.getProperty(node, setCore.constants.ALL_SETS_PROPERTY);
                if (setsInfo &&
                    setsInfo[setCore.constants.OVERLAYS_PROPERTY] &&
                    setsInfo[setCore.constants.OVERLAYS_PROPERTY]['']) {
                    keys = Object.keys(setsInfo[setCore.constants.OVERLAYS_PROPERTY]['']);
                    for (i = 0; i < keys.length; i += 1) {
                        if (keys[i] !== '_mutable' && sets.indexOf(keys[i]) === -1) {
                            sets.push(keys[i]);
                        }
                    }
                }
                node = setCore.getBase(node);
            } while (node);

            return sets;
        }

        setCore.getSetNames = function (node) {
            //return innerCore.getPointerNames(innerCore.getChild(node, setCore.constants.ALL_SETS_PROPERTY)) || [];
            return collectSetNames(node);
        };

        setCore.getPointerNames = function (node) {
            var sorted = [],
                raw = innerCore.getPointerNames(node);
            for (var i = 0; i < raw.length; i++) {
                if (raw[i].indexOf(setCore.constants.MEMBER_RELATION) === -1) {
                    sorted.push(raw[i]);
                }
            }
            return sorted;
        };

        setCore.getCollectionNames = function (node) {
            var sorted = [],
                raw = innerCore.getCollectionNames(node);
            for (var i = 0; i < raw.length; i++) {
                if (raw[i].indexOf(setCore.constants.MEMBER_RELATION) === -1) {
                    sorted.push(raw[i]);
                }
            }
            return sorted;
        };

        function collectInternalMemberRelids(node, setName) {
            var setInfo,
                relids = [],
                keys, i;

            do {
                setInfo = setCore.getProperty(node, setCore.constants.ALL_SETS_PROPERTY);
                if (setInfo && setInfo[setName]) {
                    keys = setCore.getRawKeys(setInfo[setName], relIdSelector);
                    for (i = 0; i < keys.length; i += 1) {
                        if (relids.indexOf(keys[i]) === -1) {
                            relids.push(keys[i]);
                        }
                    }
                }
                node = setCore.getBase(node);
            } while (node);

            return relids;
        }

        function getContainerNodePath(node) {
            var ownPath = setCore.getPath(node);
            return ownPath.substring(0, ownPath.indexOf('/_'));
        }

        function collectMemberPath(node, setName, innerRelid) {
            var source = '/' + setCore.constants.ALL_SETS_PROPERTY + '/' + setName + '/' + innerRelid,
                path = undefined,
                tempPath;

            do {
                tempPath = innerCore.getPointerPathFrom(node, source, 'member');
                if (tempPath !== undefined) {
                    path = tempPath;
                    if (path !== getContainerNodePath(node)) {
                        break;
                    }
                }
                node = setCore.getBase(node);
            } while (node);

            return path;
        }

        setCore.getMemberPaths = function (node, setName) {
            var memberRelids = collectInternalMemberRelids(node, setName),
                pathPrefix = '/' + setCore.constants.ALL_SETS_PROPERTY + '/' + setName + '/',
                i, path,
                memberPaths = [];
            for (i = 0; i < memberRelids.length; i += 1) {
                path = collectMemberPath(node, setName, memberRelids[i]);
                if (path !== undefined && memberPaths.indexOf(path) === -1) { //null and '' are valid targets
                    memberPaths.push(path);
                }
            }
            return memberPaths;
        };

        setCore.getOwnMemberPaths = function (node, setName) {
            var setInfo = setCore.getProperty(node, setCore.constants.ALL_SETS_PROPERTY),
                relids = setInfo && setInfo[setName] ? setCore.getRawKeys(setInfo[setName], relIdSelector) : [],
                allPaths = setCore.getMemberPaths(node, setName),
                paths = [],
                i;

            for (i = 0; i < allPaths.length; i += 1) {
                if (relids.indexOf(getMemberRelId(node, setName, allPaths[i])) !== -1) {
                    paths.push(allPaths[i]);
                }
            }

            return paths;
        };

        setCore.delMember = function (node, setName, memberPath) {
            ASSERT(typeof setName === 'string');
            //we only need the path of the member so we allow to enter only it
            if (typeof memberPath !== 'string') {
                memberPath = innerCore.getPath(memberPath);
            }

            var setMemberRelId = getMemberRelId(node, setName, memberPath);
            if (setMemberRelId) {
                var setMemberNode = innerCore.getChild(
                    innerCore.getChild(innerCore.getChild(node, setCore.constants.ALL_SETS_PROPERTY), setName),
                    setMemberRelId);

                innerCore.deleteNode(setMemberNode, true);
                setModified(node);
            }
        };

        setCore.addMember = function (node, setName, member) {
            ASSERT(typeof setName === 'string');
            var setsNode = innerCore.getChild(node, setCore.constants.ALL_SETS_PROPERTY),
                setNode = innerCore.getChild(setsNode, setName),
                setMemberRelId = getMemberRelId(node, setName, setCore.getPath(member));
            if (setMemberRelId === null) {
                createSetOnDemand(node, setName);
                var setMember = innerCore.getChild(setNode, createNewMemberRelid(setNode));
                innerCore.setPointer(setMember, 'member', member);

                //TODO hack, somehow the empty children have been removed during persist
                innerCore.setRegistry(setMember, '_', '_');
                setModified(node);
            } else if (!setCore.isFullyOverriddenMember(node, setName, setCore.getPath(member))) {
                //it was an inherited member, now we override it
                var newMemberNode = innerCore.copyNode(innerCore.getChild(setNode, setMemberRelId), setNode);

                innerCore.deleteNode(innerCore.getChild(setNode, setMemberRelId), true);
                innerCore.setPointer(newMemberNode, 'member', member);
                //TODO hack, somehow the empty children have been removed during persist
                innerCore.setRegistry(newMemberNode, '_', '_');
                setModified(node);
            }
        };

        setCore.getMemberAttributeNames = function (node, setName, memberPath) {
            return collectPropertyNames(node, setName, memberPath, setCore.constants.ATTRIBUTES_PROPERTY);
        };

        setCore.getMemberOwnAttributeNames = function (node, setName, memberPath) {
            return collectOwnPropertyNames(node, setName, memberPath, setCore.constants.ATTRIBUTES_PROPERTY);
        };

        setCore.getMemberAttribute = function (node, setName, memberPath, attrName) {
            return getPropertyValue(node, setName, memberPath, setCore.constants.ATTRIBUTES_PROPERTY, attrName);
        };

        setCore.setMemberAttribute = function (node, setName, memberPath, attrName, attrValue) {
            ASSERT(typeof setName === 'string' && typeof attrName === 'string' && attrValue !== undefined);
            var memberRelId = getMemberRelId(node, setName, memberPath);
            if (memberRelId) {
                var memberNode = innerCore.getChild(
                    innerCore.getChild(innerCore.getChild(node, setCore.constants.ALL_SETS_PROPERTY), setName),
                    memberRelId);

                innerCore.setAttribute(memberNode, attrName, attrValue);
                setModified(node);
            }
        };

        setCore.delMemberAttribute = function (node, setName, memberPath, attrName) {
            ASSERT(typeof setName === 'string' && typeof attrName === 'string');
            var memberRelId = getMemberRelId(node, setName, memberPath);
            if (memberRelId) {
                var memberNode = innerCore.getChild(
                    innerCore.getChild(innerCore.getChild(node, setCore.constants.ALL_SETS_PROPERTY), setName),
                    memberRelId);

                innerCore.delAttribute(memberNode, attrName);
                setModified(node);
            }
        };

        function collectPropertyNames(node, setName, memberPath, propertyName) {
            var relId,
                names = [],
                memberInfo,
                keys, i;

            do {
                relId = getMemberRelId(node, setName, memberPath);
                if (relId) {
                    memberInfo = setCore.getProperty(node, setCore.constants.ALL_SETS_PROPERTY) || {};
                    memberInfo = memberInfo[setName] || {};
                    memberInfo = memberInfo[relId] || {};
                    memberInfo = memberInfo[propertyName] || {};
                    keys = innerCore.getRawKeys(memberInfo, relIdSelector);
                    for (i = 0; i < keys.length; i += 1) {
                        if (names.indexOf(keys[i]) === -1) {
                            names.push(keys[i]);
                        }
                    }
                } else {
                    return names; //because there is no more relation towards the given path
                }
                node = setCore.getBase(node);
            } while (node);

            return names;
        }

        function collectOwnPropertyNames(node, setName, memberPath, propertyName) {
            var relId,
                names = [],
                memberInfo,
                keys, i;

            relId = getMemberRelId(node, setName, memberPath);
            if (relId) {
                memberInfo = setCore.getProperty(node, setCore.constants.ALL_SETS_PROPERTY) || {};
                memberInfo = memberInfo[setName] || {};
                memberInfo = memberInfo[relId] || {};
                memberInfo = memberInfo[propertyName] || {};
                keys = innerCore.getRawKeys(memberInfo, relIdSelector);
                for (i = 0; i < keys.length; i += 1) {
                    if (names.indexOf(keys[i]) === -1) {
                        names.push(keys[i]);
                    }
                }
            }

            return names;
        }

        function getPropertyValue(node, setName, memberPath, propertyCollectionName, propertyName) {
            var relId,
                memberInfo,
                value;

            do {
                relId = getMemberRelId(node, setName, memberPath);
                if (relId) {
                    memberInfo = setCore.getProperty(node, setCore.constants.ALL_SETS_PROPERTY) || {};
                    memberInfo = memberInfo[setName] || {};
                    memberInfo = memberInfo[relId] || {};
                    memberInfo = memberInfo[propertyCollectionName] || {};
                    value = memberInfo[propertyName];
                    if (value !== undefined) {
                        return value;
                    }
                } else {
                    return undefined; //because there is no more relation towards the given path
                }
                node = setCore.getBase(node);
            } while (node);

            return undefined;
        }

        function getOwnPropertyValue(node, setName, memberPath, propertyCollectionName, propertyName) {
            var relId,
                memberInfo;

            relId = getMemberRelId(node, setName, memberPath);
            if (relId) {
                memberInfo = setCore.getProperty(node, setCore.constants.ALL_SETS_PROPERTY) || {};
                memberInfo = memberInfo[setName] || {};
                memberInfo = memberInfo[relId] || {};
                memberInfo = memberInfo[propertyCollectionName] || {};
                return memberInfo[propertyName];
            }

            return undefined;
        }

        setCore.getMemberRegistryNames = function (node, setName, memberPath) {
            return collectPropertyNames(node, setName, memberPath, setCore.constants.REGISTRY_PROPERTY);
        };
        setCore.getMemberOwnRegistryNames = function (node, setName, memberPath) {
            return collectOwnPropertyNames(node, setName, memberPath, setCore.constants.REGISTRY_PROPERTY);
        };
        setCore.getMemberRegistry = function (node, setName, memberPath, regName) {
            return getPropertyValue(node, setName, memberPath, setCore.constants.REGISTRY_PROPERTY, regName);
        };
        setCore.setMemberRegistry = function (node, setName, memberPath, regName, regValue) {
            ASSERT(typeof setName === 'string' && typeof regName === 'string' && regValue !== undefined);
            var memberRelId = getMemberRelId(node, setName, memberPath);
            if (memberRelId) {
                var memberNode = innerCore.getChild(
                    innerCore.getChild(innerCore.getChild(node, setCore.constants.ALL_SETS_PROPERTY), setName),
                    memberRelId);

                innerCore.setRegistry(memberNode, regName, regValue);
                setModified(node);
            }
        };
        setCore.delMemberRegistry = function (node, setName, memberPath, regName) {
            ASSERT(typeof setName === 'string' && typeof regName === 'string');
            var memberRelId = getMemberRelId(node, setName, memberPath);
            if (memberRelId) {
                var memberNode = innerCore.getChild(
                    innerCore.getChild(innerCore.getChild(node, setCore.constants.ALL_SETS_PROPERTY), setName),
                    memberRelId);

                innerCore.delRegistry(memberNode, regName);
                setModified(node);
            }
        };

        function createSetOnDemand(node, setName) {
            //the function checks if there is no set defined on the node's level and create it
            var setsNode = innerCore.getChild(node, setCore.constants.ALL_SETS_PROPERTY);
            if (innerCore.getOwnPointerPath(setsNode, setName) === undefined) {
                setCore.createSet(node, setName);
            }
        }

        setCore.createSet = function (node, setName) {
            ASSERT(typeof setName === 'string');
            var setsNode = innerCore.getChild(node, setCore.constants.ALL_SETS_PROPERTY),
                setNode = innerCore.getChild(setsNode, setName);

            //FIXME: hack, somehow the empty children have been removed during persist
            innerCore.setRegistry(setNode, '_', '_');

            innerCore.setPointer(innerCore.getChild(node, setCore.constants.ALL_SETS_PROPERTY), setName, null);
            setModified(node);
        };
        setCore.deleteSet = function (node, setName) {
            ASSERT(typeof setName === 'string');
            var setsNode = innerCore.getChild(node, setCore.constants.ALL_SETS_PROPERTY),
                setNode = innerCore.getChild(setsNode, setName);
            innerCore.deletePointer(setsNode, setName);
            innerCore.deleteNode(setNode, true);
            setModified(node);
        };

        setCore.isMemberOf = function (node) {
            //TODO we should find a proper way to do this - or at least some support from lower layers would be fine
            var coll = setCore.getCollectionPaths(node, setCore.constants.MEMBER_RELATION);
            var sets = {};
            for (var i = 0; i < coll.length; i++) {
                var pathArray = coll[i].split('/');
                if (pathArray.indexOf('_meta') === -1) {
                    //now we simply skip META sets...
                    var index = pathArray.indexOf(setCore.constants.ALL_SETS_PROPERTY);
                    if (index > 0 && pathArray.length > index + 1) {
                        //otherwise it is not a real set
                        var ownerPath = pathArray.slice(0, index).join('/');
                        if (sets[ownerPath] === undefined) {
                            sets[ownerPath] = [];
                        }
                        sets[ownerPath].push(pathArray[index + 1]);
                    }
                }
            }
            return sets;
        };

        setCore.isFullyOverriddenMember = function (node, setName, memberPath) {
            var setNames = collectSetNames(node),
                ownRelId,
                baseRelId;
            if (setNames.indexOf(setName) === -1) {
                return false;
            }
            if (innerCore.getBase(node) === null) {
                return false;
            }

            ownRelId = getMemberRelId(node, setName, memberPath);
            baseRelId = getMemberRelId(innerCore.getBase(node), setName, memberPath);

            if (ownRelId && baseRelId && ownRelId !== baseRelId) {
                return true;
            }
            return false;
        };

        return setCore;

    }

    return SetCore;
});


