/*globals define*/
/*jshint node: true, browser: true*/

/**
 * @author kecso / https://github.com/kecso
 */

define(['common/util/assert', 'common/core/constants'], function (ASSERT, CONSTANTS) {
    'use strict';

    function SetCore(innerCore, options) {
        ASSERT(typeof options === 'object');
        ASSERT(typeof options.globConf === 'object');
        ASSERT(typeof options.logger !== 'undefined');

        var logger = options.logger,
            self = this,
            key;

        for (key in innerCore) {
            this[key] = innerCore[key];
        }

        logger.debug('initialized SetCore');

        //<editor-fold=Helper Functions>
        function setModified(node) {
            innerCore.setRegistry(node, CONSTANTS.SET_MODIFIED_REGISTRY,
                (innerCore.getRegistry(node, CONSTANTS.SET_MODIFIED_REGISTRY) || 0) + 1);
        }

        function getMemberRelId(node, setName, memberPath) {
            var setInfo,
                keys, i;

            do {
                setInfo = self.getProperty(node, CONSTANTS.ALL_SETS_PROPERTY);
                if (setInfo && setInfo[setName]) {
                    keys = self.getRawKeys(setInfo[setName], self.isValidRelid);
                    for (i = 0; i < keys.length; i += 1) {
                        if (innerCore.getPointerPathFrom(node, '/' + CONSTANTS.ALL_SETS_PROPERTY +
                                    '/' + setName + '/' + keys[i], CONSTANTS.MEMBER_RELATION) ===
                            memberPath) {

                            return keys[i];
                        }
                    }
                }
                node = self.getBase(node);
            } while (node);

            return null;
        }

        function collectSetNames(node) {
            var sets = [],
                setsInfo,
                keys, i;
            do {
                setsInfo = self.getProperty(node, CONSTANTS.ALL_SETS_PROPERTY);
                if (setsInfo &&
                    setsInfo[CONSTANTS.OVERLAYS_PROPERTY] &&
                    setsInfo[CONSTANTS.OVERLAYS_PROPERTY]['']) {
                    keys = Object.keys(setsInfo[CONSTANTS.OVERLAYS_PROPERTY]['']);
                    for (i = 0; i < keys.length; i += 1) {
                        if (keys[i] !== CONSTANTS.MUTABLE_PROPERTY && sets.indexOf(keys[i]) === -1) {
                            sets.push(keys[i]);
                        }
                    }
                }
                node = self.getBase(node);
            } while (node);

            return sets;
        }

        function collectInternalMemberRelids(node, setName) {
            var setInfo,
                relids = [],
                keys, i;

            do {
                setInfo = self.getProperty(node, CONSTANTS.ALL_SETS_PROPERTY);
                if (setInfo && setInfo[setName]) {
                    keys = self.getRawKeys(setInfo[setName], self.isValidRelid);
                    for (i = 0; i < keys.length; i += 1) {
                        if (relids.indexOf(keys[i]) === -1) {
                            relids.push(keys[i]);
                        }
                    }
                }
                node = self.getBase(node);
            } while (node);

            return relids;
        }

        function getContainerNodePath(node) {
            var ownPath = self.getPath(node);
            return ownPath.substring(0, ownPath.indexOf('/_'));
        }

        function collectMemberPath(node, setName, innerRelid) {
            var source = '/' + CONSTANTS.ALL_SETS_PROPERTY + '/' + setName + '/' + innerRelid,
                path = undefined,//jshint ignore: line
                tempPath;

            do {
                tempPath = innerCore.getPointerPathFrom(node, source, CONSTANTS.MEMBER_RELATION);
                if (tempPath !== undefined) {
                    path = tempPath;
                    if (path !== getContainerNodePath(node)) {
                        break;
                    }
                }
                node = self.getBase(node);
            } while (node);

            return path;
        }

        function collectPropertyNames(node, setName, memberPath, propertyName) {
            var relId,
                names = [],
                memberInfo,
                keys, i;

            do {
                relId = getMemberRelId(node, setName, memberPath);
                if (relId) {
                    memberInfo = self.getProperty(node, CONSTANTS.ALL_SETS_PROPERTY) || {};
                    memberInfo = memberInfo[setName] || {};
                    memberInfo = memberInfo[relId] || {};
                    memberInfo = memberInfo[propertyName] || {};
                    keys = innerCore.getRawKeys(memberInfo, self.isValidRelid);
                    for (i = 0; i < keys.length; i += 1) {
                        if (names.indexOf(keys[i]) === -1) {
                            names.push(keys[i]);
                        }
                    }
                } else {
                    return names; //because there is no more relation towards the given path
                }
                node = self.getBase(node);
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
                memberInfo = self.getProperty(node, CONSTANTS.ALL_SETS_PROPERTY) || {};
                memberInfo = memberInfo[setName] || {};
                memberInfo = memberInfo[relId] || {};
                memberInfo = memberInfo[propertyName] || {};
                keys = innerCore.getRawKeys(memberInfo, self.isValidRelid);
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
                    memberInfo = self.getProperty(node, CONSTANTS.ALL_SETS_PROPERTY) || {};
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
                node = self.getBase(node);
            } while (node);

            return undefined;
        }

        //function getOwnPropertyValue(node, setName, memberPath, propertyCollectionName, propertyName) {
        //    var relId,
        //        memberInfo;
        //
        //    relId = getMemberRelId(node, setName, memberPath);
        //    if (relId) {
        //        memberInfo = core.getProperty(node, CONSTANTS.ALL_SETS_PROPERTY) || {};
        //        memberInfo = memberInfo[setName] || {};
        //        memberInfo = memberInfo[relId] || {};
        //        memberInfo = memberInfo[propertyCollectionName] || {};
        //        return memberInfo[propertyName];
        //    }
        //
        //    return undefined;
        //}

        function createSetOnDemand(node, setName) {
            //the function checks if there is no set defined on the node's level and create it
            var setsNode = innerCore.getChild(node, CONSTANTS.ALL_SETS_PROPERTY);
            if (innerCore.getOwnPointerPath(setsNode, setName) === undefined) {
                self.createSet(node, setName);
            }
        }
        //</editor-fold>

        //<editor-fold=Modified Methods>
        this.getCollectionNames = function (node) {
            var result = innerCore.getCollectionNames(node),
                i;

            for (i = 0; i < result.length; i++) {
                // The member collection is coming from being a member of a set and is not a defined relationship.
                if (result[i] === CONSTANTS.MEMBER_RELATION) {
                    result.splice(i, 1);
                    break;
                }
            }

            return result;
        };
        //</editor-fold>

        //<editor-fold=Added Methods>
        this.getSetNames = function (node) {
            //return innerCore.getPointerNames(innerCore.getChild(node, CONSTANTS.ALL_SETS_PROPERTY)) || [];
            return collectSetNames(node);
        };

        this.getMemberPaths = function (node, setName) {
            var memberRelids = collectInternalMemberRelids(node, setName),
                //pathPrefix = '/' + CONSTANTS.ALL_SETS_PROPERTY + '/' + setName + '/',
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

        this.getOwnMemberPaths = function (node, setName) {
            var setInfo = self.getProperty(node, CONSTANTS.ALL_SETS_PROPERTY),
                relids = setInfo && setInfo[setName] ? self.getRawKeys(setInfo[setName], self.isValidRelid) : [],
                allPaths = self.getMemberPaths(node, setName),
                paths = [],
                i;

            for (i = 0; i < allPaths.length; i += 1) {
                if (relids.indexOf(getMemberRelId(node, setName, allPaths[i])) !== -1) {
                    paths.push(allPaths[i]);
                }
            }

            return paths;
        };

        this.delMember = function (node, setName, memberPath) {
            ASSERT(typeof setName === 'string');
            //we only need the path of the member so we allow to enter only it
            if (typeof memberPath !== 'string') {
                memberPath = innerCore.getPath(memberPath);
            }

            var setMemberRelId = getMemberRelId(node, setName, memberPath);
            if (setMemberRelId) {
                var setMemberNode = innerCore.getChild(
                    innerCore.getChild(innerCore.getChild(node, CONSTANTS.ALL_SETS_PROPERTY), setName),
                    setMemberRelId);

                innerCore.deleteNode(setMemberNode, true);
                setModified(node);
            }
        };

        this.addMember = function (node, setName, member) {
            ASSERT(typeof setName === 'string');
            var setsNode = innerCore.getChild(node, CONSTANTS.ALL_SETS_PROPERTY),
                setNode = innerCore.getChild(setsNode, setName),
                setMemberRelId = getMemberRelId(node, setName, self.getPath(member)),
                setMemberNode;

            if (setMemberRelId === null) {
                createSetOnDemand(node, setName);
                setMemberNode = innerCore.createChild(setNode);
            } else if (!self.isFullyOverriddenMember(node, setName, self.getPath(member))) {
                //it was an inherited member, now we override it
                // TODO: We pin down the expected behavior here..
                setMemberNode = innerCore.copyNode(innerCore.getChild(setNode, setMemberRelId), setNode);
                innerCore.deleteNode(innerCore.getChild(setNode, setMemberRelId), true);
            }

            if (setMemberNode) {
                innerCore.setPointer(setMemberNode, CONSTANTS.MEMBER_RELATION, member);

                //TODO hack, somehow the empty children have been removed during persist
                innerCore.setRegistry(setMemberNode, '_', '_');
                setModified(node);
            } else {
                logger.warn('member already in set');
            }
        };

        this.getMemberAttributeNames = function (node, setName, memberPath) {
            return collectPropertyNames(node, setName, memberPath, CONSTANTS.ATTRIBUTES_PROPERTY);
        };

        this.getMemberOwnAttributeNames = function (node, setName, memberPath) {
            return collectOwnPropertyNames(node, setName, memberPath, CONSTANTS.ATTRIBUTES_PROPERTY);
        };

        this.getMemberAttribute = function (node, setName, memberPath, attrName) {
            return getPropertyValue(node, setName, memberPath, CONSTANTS.ATTRIBUTES_PROPERTY, attrName);
        };

        this.setMemberAttribute = function (node, setName, memberPath, attrName, attrValue) {
            ASSERT(typeof setName === 'string' && typeof attrName === 'string' && attrValue !== undefined);
            var memberRelId = getMemberRelId(node, setName, memberPath);
            if (memberRelId) {
                var memberNode = innerCore.getChild(
                    innerCore.getChild(innerCore.getChild(node, CONSTANTS.ALL_SETS_PROPERTY), setName),
                    memberRelId);

                innerCore.setAttribute(memberNode, attrName, attrValue);
                setModified(node);
            }
        };

        this.delMemberAttribute = function (node, setName, memberPath, attrName) {
            ASSERT(typeof setName === 'string' && typeof attrName === 'string');
            var memberRelId = getMemberRelId(node, setName, memberPath);
            if (memberRelId) {
                var memberNode = innerCore.getChild(
                    innerCore.getChild(innerCore.getChild(node, CONSTANTS.ALL_SETS_PROPERTY), setName),
                    memberRelId);

                innerCore.delAttribute(memberNode, attrName);
                setModified(node);
            }
        };

        this.getMemberRegistryNames = function (node, setName, memberPath) {
            return collectPropertyNames(node, setName, memberPath, CONSTANTS.REGISTRY_PROPERTY);
        };

        this.getMemberOwnRegistryNames = function (node, setName, memberPath) {
            return collectOwnPropertyNames(node, setName, memberPath, CONSTANTS.REGISTRY_PROPERTY);
        };

        this.getMemberRegistry = function (node, setName, memberPath, regName) {
            return getPropertyValue(node, setName, memberPath, CONSTANTS.REGISTRY_PROPERTY, regName);
        };

        this.setMemberRegistry = function (node, setName, memberPath, regName, regValue) {
            ASSERT(typeof setName === 'string' && typeof regName === 'string' && regValue !== undefined);
            var memberRelId = getMemberRelId(node, setName, memberPath);
            if (memberRelId) {
                var memberNode = innerCore.getChild(
                    innerCore.getChild(innerCore.getChild(node, CONSTANTS.ALL_SETS_PROPERTY), setName),
                    memberRelId);

                innerCore.setRegistry(memberNode, regName, regValue);
                setModified(node);
            }
        };

        this.delMemberRegistry = function (node, setName, memberPath, regName) {
            ASSERT(typeof setName === 'string' && typeof regName === 'string');
            var memberRelId = getMemberRelId(node, setName, memberPath);
            if (memberRelId) {
                var memberNode = innerCore.getChild(
                    innerCore.getChild(innerCore.getChild(node, CONSTANTS.ALL_SETS_PROPERTY), setName),
                    memberRelId);

                innerCore.delRegistry(memberNode, regName);
                setModified(node);
            }
        };

        this.createSet = function (node, setName) {
            ASSERT(typeof setName === 'string');
            var setsNode = innerCore.getChild(node, CONSTANTS.ALL_SETS_PROPERTY),
                setNode = innerCore.getChild(setsNode, setName);

            //FIXME: hack, somehow the empty children have been removed during persist
            innerCore.setRegistry(setNode, '_', '_');

            innerCore.setPointer(innerCore.getChild(node, CONSTANTS.ALL_SETS_PROPERTY), setName, null);
            setModified(node);
        };

        this.deleteSet = function (node, setName) {
            ASSERT(typeof setName === 'string');
            var setsNode = innerCore.getChild(node, CONSTANTS.ALL_SETS_PROPERTY),
                setNode = innerCore.getChild(setsNode, setName);
            innerCore.deletePointer(setsNode, setName);
            innerCore.deleteNode(setNode, true);
            setModified(node);
        };

        this.isMemberOf = function (node) {
            //TODO we should find a proper way to do this - or at least some support from lower layers would be fine
            var coll = self.getCollectionPaths(node, CONSTANTS.MEMBER_RELATION);
            var sets = {};
            for (var i = 0; i < coll.length; i++) {
                var pathArray = coll[i].split('/');
                if (pathArray.indexOf(CONSTANTS.META_NODE) === -1) {
                    //now we simply skip META sets...
                    var index = pathArray.indexOf(CONSTANTS.ALL_SETS_PROPERTY);
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

        this.isFullyOverriddenMember = function (node, setName, memberPath) {
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
        //</editor-fold>
    }

    return SetCore;
});


