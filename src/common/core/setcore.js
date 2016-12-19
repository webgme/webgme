/*globals define*/
/*jshint node: true, browser: true*/

/**
 * @author kecso / https://github.com/kecso
 */

define(['common/core/CoreAssert', 'common/core/constants'], function (ASSERT, CONSTANTS) {
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

        function getSetNodeByName(node, setName) {
            return innerCore.getChild(innerCore.getChild(node, CONSTANTS.ALL_SETS_PROPERTY), setName);
        }

        function getSetInfoByName(node, setName) {
            ASSERT(typeof setName === 'string');
            var setsInfo = innerCore.getProperty(node, CONSTANTS.ALL_SETS_PROPERTY);

            return setsInfo && setsInfo[setName];
        }

        function getOwnMemberRelId(node, setName, memberPath) {
            var setInfo,
                keys,
                i;

            setInfo = getSetInfoByName(node, setName);
            if (setInfo) {
                keys = self.getRawKeys(setInfo, self.isValidRelid);
                for (i = 0; i < keys.length; i += 1) {
                    if (innerCore.getPointerPathFrom(node,
                            '/' + CONSTANTS.ALL_SETS_PROPERTY + '/' + setName + '/' + keys[i],
                            CONSTANTS.MEMBER_RELATION) === memberPath) {

                        return keys[i];
                    }
                }
            }

            return null;
        }

        function getMemberRelId(node, setName, memberPath) {
            var relid = null;

            do {
                relid = getOwnMemberRelId(node, setName, memberPath);
                if (relid) {
                    return relid;
                }

                node = self.getBase(node);
            } while (node);

            return relid;
        }

        function getSetMemberNode(node, setName, memberPath) {
            var memberRelId = getMemberRelId(node, setName, memberPath);

            return typeof memberRelId === 'string' && innerCore.getChild(getSetNodeByName(node, setName), memberRelId);
        }

        function getOwnSetMemberNode(node, setName, memberPath) {
            var memberRelId = getOwnMemberRelId(node, setName, memberPath);

            return typeof memberRelId === 'string' && innerCore.getChild(getSetNodeByName(node, setName), memberRelId);
        }

        function collectOwnSetNames(node) {
            var sets = [],
                setsInfo,
                keys,
                i;

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

            return sets;
        }

        function collectSetNames(node) {
            var sets = [],
                keys,
                i;

            do {
                keys = collectOwnSetNames(node);

                for (i = 0; i < keys.length; i += 1) {
                    if (sets.indexOf(keys[i]) === -1) {
                        sets.push(keys[i]);
                    }
                }

                node = self.getBase(node);
            } while (node);

            return sets;
        }

        function hasOwnSet(node, setName) {
            ASSERT(typeof setName === 'string');
            var setsInfo = self.getProperty(node, CONSTANTS.ALL_SETS_PROPERTY);
            if (setsInfo &&
                setsInfo[CONSTANTS.OVERLAYS_PROPERTY] &&
                setsInfo[CONSTANTS.OVERLAYS_PROPERTY][''] &&
                setsInfo[CONSTANTS.OVERLAYS_PROPERTY][''][setName]) {

                return true;
            }

            return false;
        }

        function hasSet(node, setName) {
            do {
                if (hasOwnSet(node, setName)) {
                    return true;
                }

                node = self.getBase(node);
            } while (node);

            return false;
        }

        function collectInternalMemberRelids(node, setName) {
            var setInfo,
                relids = [],
                keys,
                i;

            do {
                setInfo = getSetInfoByName(node, setName);
                if (setInfo) {

                    keys = self.getRawKeys(setInfo, self.isValidRelid);

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
                path,
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

        function getPropertyCollectionInfo(node, propertyCollectionName, setName, memberPath) {
            var setInfo = getSetInfoByName(node, setName),
                propertyCollectionInfo,
                relid;

            if (setInfo) {
                if (typeof memberPath === 'string') {
                    relid = getMemberRelId(node, setName, memberPath);
                    propertyCollectionInfo = relid && setInfo[relid] && setInfo[relid][propertyCollectionName];
                } else {
                    propertyCollectionInfo = setInfo[propertyCollectionName];
                }
            }

            return propertyCollectionInfo;
        }

        function collectOwnPropertyNames(node, propertyCollectionName, setName, memberPath) {
            var propertyCollectionInfo = getPropertyCollectionInfo(node, propertyCollectionName, setName, memberPath);

            return propertyCollectionInfo ? innerCore.getRawKeys(propertyCollectionInfo) : [];
        }

        function collectPropertyNames(node, propertyCollectionName, setName, memberPath) {
            var names = [],
                keys,
                i;

            do {
                keys = collectOwnPropertyNames(node, propertyCollectionName, setName, memberPath);

                for (i = 0; i < keys.length; i += 1) {
                    if (names.indexOf(keys[i]) === -1) {
                        names.push(keys[i]);
                    }
                }

                node = self.getBase(node);
            } while (node);

            return names;
        }

        function getOwnPropertyValue(node, propertyCollectionName, propertyName, setName, memberPath) {
            var propertyCollectionInfo = getPropertyCollectionInfo(node, propertyCollectionName, setName, memberPath);

            return propertyCollectionInfo ? propertyCollectionInfo[propertyName] : undefined;
        }

        function getPropertyValue(node, propertyCollectionName, propertyName, setName, memberPath) {
            var value;

            do {
                value = getOwnPropertyValue(node,  propertyCollectionName, propertyName, setName, memberPath);
                if (value !== undefined) {
                    return value;
                }

                node = self.getBase(node);
            } while (node);

            return undefined;
        }

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
            return collectSetNames(node);
        };

        this.getOwnSetNames = function (node) {
            return collectOwnSetNames(node);
        };

        this.createSet = function (node, setName) {
            var setNode = getSetNodeByName(node, setName);
            innerCore.setPointer(innerCore.getChild(node, CONSTANTS.ALL_SETS_PROPERTY), setName, null);
            // Ensure the set-node is not deleted at persist.
            innerCore.setRegistry(setNode, '_', '_');
            setModified(node);
        };

        this.deleteSet = function (node, setName) {
            var setsNode = innerCore.getChild(node, CONSTANTS.ALL_SETS_PROPERTY),
                setNode = innerCore.getChild(setsNode, setName);

            innerCore.deletePointer(setsNode, setName);
            innerCore.deleteNode(setNode, true);
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
            var setInfo = getSetInfoByName(node, setName),
                relids = setInfo ? self.getRawKeys(setInfo, self.isValidRelid) : [],
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
            var setMemberNode;

            setMemberNode = getOwnSetMemberNode(node, setName, memberPath);
            if (setMemberNode) {
                innerCore.deleteNode(setMemberNode, true);
            }
        };

        this.addMember = function (node, setName, member) {
            var setNode = getSetNodeByName(node, setName),
                setMemberRelId = getMemberRelId(node, setName, self.getPath(member)),
                setMemberNode;

            if (setMemberRelId === null) {
                createSetOnDemand(node, setName);
                setMemberNode = innerCore.createChild(setNode, CONSTANTS.MAXIMUM_STARTING_RELID_LENGTH + 1);
            } else if (!self.isFullyOverriddenMember(node, setName, self.getPath(member))) {
                //it was an inherited member, now we override it
                // TODO: We pin down the expected behavior here..
                setMemberNode = innerCore.copyNode(innerCore.getChild(setNode, setMemberRelId),
                    setNode, CONSTANTS.MAXIMUM_STARTING_RELID_LENGTH + 1);
                innerCore.deleteNode(innerCore.getChild(setNode, setMemberRelId), true);
            }

            if (setMemberNode) {
                innerCore.setPointer(setMemberNode, CONSTANTS.MEMBER_RELATION, member);

                // Ensure the member-node entry is not deleted at persist.
                innerCore.setRegistry(setMemberNode, '_', '_');
                setModified(node);
            } else {
                logger.warn('member already in set');
            }
        };

        this.getMemberAttributeNames = function (node, setName, memberPath) {
            ASSERT(typeof memberPath === 'string');
            return collectPropertyNames(node, CONSTANTS.ATTRIBUTES_PROPERTY, setName, memberPath);
        };

        this.getMemberOwnAttributeNames = function (node, setName, memberPath) {
            ASSERT(typeof memberPath === 'string');
            return collectOwnPropertyNames(node, CONSTANTS.ATTRIBUTES_PROPERTY, setName, memberPath);
        };

        this.getMemberAttribute = function (node, setName, memberPath, attrName) {
            ASSERT(typeof memberPath === 'string');
            return getPropertyValue(node, CONSTANTS.ATTRIBUTES_PROPERTY, attrName, setName, memberPath);
        };

        this.getMemberOwnAttribute = function (node, setName, memberPath, attrName) {
            ASSERT(typeof memberPath === 'string');
            return getOwnPropertyValue(node, CONSTANTS.ATTRIBUTES_PROPERTY, attrName, setName, memberPath);
        };

        this.setMemberAttribute = function (node, setName, memberPath, attrName, attrValue) {
            ASSERT(attrValue !== undefined);
            var setMemberNode = getSetMemberNode(node, setName, memberPath);

            if (setMemberNode) {
                innerCore.setAttribute(setMemberNode, attrName, attrValue);
                setModified(node);
            }
        };

        this.delMemberAttribute = function (node, setName, memberPath, attrName) {
            var setMemberNode = getOwnSetMemberNode(node, setName, memberPath);

            if (setMemberNode) {
                innerCore.delAttribute(setMemberNode, attrName);
            }
        };

        this.getMemberRegistryNames = function (node, setName, memberPath) {
            ASSERT(typeof memberPath === 'string');
            return collectPropertyNames(node, CONSTANTS.REGISTRY_PROPERTY, setName, memberPath);
        };

        this.getMemberOwnRegistryNames = function (node, setName, memberPath) {
            ASSERT(typeof memberPath === 'string');
            return collectOwnPropertyNames(node, CONSTANTS.REGISTRY_PROPERTY, setName, memberPath);
        };

        this.getMemberRegistry = function (node, setName, memberPath, regName) {
            ASSERT(typeof memberPath === 'string');
            return getPropertyValue(node, CONSTANTS.REGISTRY_PROPERTY, regName, setName, memberPath);
        };

        this.getMemberOwnRegistry = function (node, setName, memberPath, regName) {
            ASSERT(typeof memberPath === 'string');
            return getOwnPropertyValue(node, CONSTANTS.REGISTRY_PROPERTY, regName, setName, memberPath);
        };

        this.setMemberRegistry = function (node, setName, memberPath, regName, regValue) {
            ASSERT(regValue !== undefined);
            var setMemberNode = getSetMemberNode(node, setName, memberPath);

            if (setMemberNode) {
                innerCore.setRegistry(setMemberNode, regName, regValue);
                setModified(node);
            }
        };

        this.delMemberRegistry = function (node, setName, memberPath, regName) {
            var setMemberNode = getOwnSetMemberNode(node, setName, memberPath);

            if (setMemberNode) {
                innerCore.delRegistry(setMemberNode, regName);
            }
        };

        this.getSetAttributeNames = function (node, setName) {
            return collectPropertyNames(node, CONSTANTS.ATTRIBUTES_PROPERTY, setName);
        };

        this.getOwnSetAttributeNames = function (node, setName) {
            return collectOwnPropertyNames(node, CONSTANTS.ATTRIBUTES_PROPERTY, setName);
        };

        this.getSetAttribute = function (node, setName, attrName) {
            return getPropertyValue(node, CONSTANTS.ATTRIBUTES_PROPERTY, attrName, setName);
        };

        this.getOwnSetAttribute = function (node, setName, attrName) {
            return getOwnPropertyValue(node, CONSTANTS.ATTRIBUTES_PROPERTY, attrName, setName);
        };

        this.setSetAttribute = function (node, setName, attrName, attrValue) {
            if (hasSet(node, setName)) {
                self.setAttribute(getSetNodeByName(node, setName), attrName, attrValue);
                setModified(node);
            }
        };

        this.delSetAttribute = function (node, setName, attrName) {
            var setInfo = getSetInfoByName(node, setName);
            if (setInfo) {
                self.delAttribute(getSetNodeByName(node, setName), attrName);
            }
        };

        this.getSetRegistryNames = function (node, setName) {
            return collectPropertyNames(node, CONSTANTS.REGISTRY_PROPERTY, setName);
        };

        this.getOwnSetRegistryNames = function (node, setName) {
            return collectOwnPropertyNames(node, CONSTANTS.REGISTRY_PROPERTY, setName);
        };

        this.getSetRegistry = function (node, setName, regName) {
            return getPropertyValue(node, CONSTANTS.REGISTRY_PROPERTY, regName, setName);
        };

        this.getOwnSetRegistry = function (node, setName, regName) {
            return getOwnPropertyValue(node, CONSTANTS.REGISTRY_PROPERTY, regName, setName);
        };

        this.setSetRegistry = function (node, setName, regName, regValue) {
            if (hasSet(node, setName)) {
                self.setRegistry(getSetNodeByName(node, setName), regName, regValue);
                setModified(node);
            }
        };

        this.delSetRegistry = function (node, setName, regName) {
            var setInfo = getSetInfoByName(node, setName);
            if (setInfo) {
                self.delRegistry(getSetNodeByName(node, setName), regName);
            }
        };

        //</editor-fold>
    }

    return SetCore;
});


