/*globals define*/
/*jshint node: true, browser: true*/

/**
 * @author kecso / https://github.com/kecso
 */

define(['common/util/assert'], function (ASSERT) {
    'use strict';

    var SETS_ID = '_sets';
    var REL_ID = 'member';

    function SetCore(innerCore, options) {
        ASSERT(typeof options === 'object');
        ASSERT(typeof options.globConf === 'object');
        ASSERT(typeof options.logger !== 'undefined');

        var logger = options.logger.fork('setcore');
        //help functions
        var setModified = function (node) {
            innerCore.setRegistry(node, '_sets_', (innerCore.getRegistry(node, '_sets_') || 0) + 1);
        };
        var getMemberPath = function (node, setElementNode) {
            var ownPath = innerCore.getPath(node),
                memberPath = innerCore.getPointerPath(setElementNode, REL_ID);

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
            memberPath = innerCore.getPointerPath(setElementNode, REL_ID);


            return memberPath;

        };
        var getMemberRelId = function (node, setName, memberPath) {
            ASSERT(typeof setName === 'string');
            var setNode = innerCore.getChild(innerCore.getChild(node, SETS_ID), setName);
            var elements = innerCore.getChildrenRelids(setNode);

            for (var i = 0; i < elements.length; i++) {
                if (getMemberPath(node, innerCore.getChild(setNode, elements[i])) === memberPath) {
                    return elements[i];
                }
            }
            return null;
        };
        var createNewMemberRelid = function (setNode) {
            var MAX_RELID = Math.pow(2, 31);
            var existingRelIds = innerCore.getChildrenRelids(setNode);
            var relid;
            do {
                relid = Math.floor(Math.random() * MAX_RELID);
            } while (existingRelIds.indexOf(relid) !== -1);
            return '' + relid;
        };

        var harmonizeMemberData = function (node, setName) {
            var setNode = innerCore.getChild(innerCore.getChild(node, SETS_ID), setName),
                base = innerCore.getBase(setNode),
                allMembers = innerCore.getChildrenRelids(setNode),
                ownMembers, inheritedMembers, i, j, path, names, ownMember, inheritedMember, k;
            if (base) {
                harmonizeMemberData(base, setName); //recursively harmonize base members first
                inheritedMembers = innerCore.getChildrenRelids(base);
                ownMembers = [];
                for (i = 0; i < allMembers.length; i++) {
                    if (inheritedMembers.indexOf(allMembers[i]) === -1) {
                        ownMembers.push(allMembers[i]);
                    }
                }

                for (i = 0; i < ownMembers.length; i++) {
                    ownMember = innerCore.getChild(setNode, ownMembers[i]);
                    path = innerCore.getPointerPath(ownMember, 'member');
                    for (j = 0; j < inheritedMembers.length; j++) {
                        inheritedMember = innerCore.getChild(setNode, inheritedMembers[j]);
                        if (getMemberPath(node, inheritedMember) === path) {
                            //redundancy...
                            names = innerCore.getAttributeNames(ownMember);
                            for (k = 0; k < names.length; k++) {
                                if (innerCore.getAttribute(ownMember, names[k]) !==
                                    innerCore.getAttribute(inheritedMember, names[k])) {

                                    innerCore.setAttribute(inheritedMember, names[k],
                                        innerCore.getAttribute(ownMember, names[k]));
                                }
                            }
                            names = innerCore.getRegistryNames(ownMember);
                            for (k = 0; k < names.length; k++) {
                                if (innerCore.getRegistry(ownMember, names[k]) !==
                                    innerCore.getRegistry(inheritedMember, names[k])) {

                                    innerCore.setRegistry(inheritedMember, names[k],
                                        innerCore.getRegistry(ownMember, names[k]));
                                }
                            }
                            innerCore.deleteNode(innerCore.getChild(setNode, ownMembers[i]), true);
                        }
                    }
                }
            }
        };

        //copy lower layer
        var setcore = {};
        for (var i in innerCore) {
            setcore[i] = innerCore[i];
        }
        logger.debug('initialized');
        //adding new functions
        setcore.getSetNumbers = function (node) {
            return this.getSetNames(node).length;
        };

        setcore.getSetNames = function (node) {
            return innerCore.getPointerNames(innerCore.getChild(node, SETS_ID)) || [];
        };

        setcore.getPointerNames = function (node) {
            var sorted = [],
                raw = innerCore.getPointerNames(node);
            for (var i = 0; i < raw.length; i++) {
                if (raw[i].indexOf(REL_ID) === -1) {
                    sorted.push(raw[i]);
                }
            }
            return sorted;
        };

        setcore.getCollectionNames = function (node) {
            var sorted = [],
                raw = innerCore.getCollectionNames(node);
            for (var i = 0; i < raw.length; i++) {
                if (raw[i].indexOf(REL_ID) === -1) {
                    sorted.push(raw[i]);
                }
            }
            return sorted;
        };

        setcore.getMemberPaths = function (node, setName) {
            ASSERT(typeof setName === 'string');
            harmonizeMemberData(node, setName);
            var setNode = innerCore.getChild(innerCore.getChild(node, SETS_ID), setName);
            var members = [];
            var elements = innerCore.getChildrenRelids(setNode);
            elements = elements.sort(); //TODO this should be removed at some point
            for (var i = 0; i < elements.length; i++) {
                var path = getMemberPath(node, innerCore.getChild(setNode, elements[i]));
                if (path) {
                    members.push(path);
                }
            }
            return members;
        };

        setcore.delMember = function (node, setName, memberPath) {
            ASSERT(typeof setName === 'string');
            harmonizeMemberData(node, setName);
            //we only need the path of the member so we allow to enter only it
            if (typeof memberPath !== 'string') {
                memberPath = innerCore.getPath(memberPath);
            }

            var setMemberRelId = getMemberRelId(node, setName, memberPath);
            if (setMemberRelId) {
                var setMemberNode = innerCore.getChild(
                    innerCore.getChild(innerCore.getChild(node, SETS_ID), setName), setMemberRelId);

                innerCore.deleteNode(setMemberNode, true);
                setModified(node);
            }
        };

        setcore.addMember = function (node, setName, member) {
            ASSERT(typeof setName === 'string');
            var setsNode = innerCore.getChild(node, SETS_ID);
            //TODO decide if the member addition should really create the set or it should fail...
            if (innerCore.getPointerPath(setsNode, setName) === undefined) {
                setcore.createSet(node, setName);
            }
            harmonizeMemberData(node, setName);
            var setNode = innerCore.getChild(setsNode, setName);
            var setMemberRelId = getMemberRelId(node, setName, setcore.getPath(member));
            if (setMemberRelId === null) {
                var setMember = innerCore.getChild(setNode, createNewMemberRelid(setNode));
                innerCore.setPointer(setMember, 'member', member);

                //TODO hack, somehow the empty children have been removed during persist
                innerCore.setRegistry(setMember, '_', '_');
                setModified(node);
            }
        };

        //TODO: Refactor out getMemberNode:
        //TODO: var memberNode = innerCore.getChild(
        //TODO: innerCore.getChild(innerCore.getChild(node, SETS_ID), setName), memberRelId);

        setcore.getMemberAttributeNames = function (node, setName, memberPath) {
            ASSERT(typeof setName === 'string');
            harmonizeMemberData(node, setName);
            var memberRelId = getMemberRelId(node, setName, memberPath);
            if (memberRelId) {
                var memberNode = innerCore.getChild(
                    innerCore.getChild(innerCore.getChild(node, SETS_ID), setName), memberRelId);

                return innerCore.getAttributeNames(memberNode);
            }
            return [];
        };

        setcore.getMemberOwnAttributeNames = function (node, setName, memberPath) {
            ASSERT(typeof setName === 'string');
            var memberRelId = getMemberRelId(node, setName, memberPath);
            if (memberRelId) {
                var memberNode = innerCore.getChild(
                    innerCore.getChild(innerCore.getChild(node, SETS_ID), setName), memberRelId);

                return innerCore.getOwnAttributeNames(memberNode);
            }
            return [];
        };

        setcore.getMemberAttribute = function (node, setName, memberPath, attrName) {
            ASSERT(typeof setName === 'string' && typeof attrName === 'string');
            harmonizeMemberData(node, setName);
            var memberRelId = getMemberRelId(node, setName, memberPath);
            if (memberRelId) {
                var memberNode = innerCore.getChild(
                    innerCore.getChild(innerCore.getChild(node, SETS_ID), setName), memberRelId);

                return innerCore.getAttribute(memberNode, attrName);
            }
        };

        setcore.setMemberAttribute = function (node, setName, memberPath, attrName, attrValue) {
            ASSERT(typeof setName === 'string' && typeof attrName === 'string' && attrValue !== undefined);
            harmonizeMemberData(node, setName);
            var memberRelId = getMemberRelId(node, setName, memberPath);
            if (memberRelId) {
                var memberNode = innerCore.getChild(
                    innerCore.getChild(innerCore.getChild(node, SETS_ID), setName), memberRelId);

                innerCore.setAttribute(memberNode, attrName, attrValue);
                setModified(node);
            }
        };

        setcore.delMemberAttribute = function (node, setName, memberPath, attrName) {
            ASSERT(typeof setName === 'string' && typeof attrName === 'string');
            harmonizeMemberData(node, setName);
            var memberRelId = getMemberRelId(node, setName, memberPath);
            if (memberRelId) {
                var memberNode = innerCore.getChild(
                    innerCore.getChild(innerCore.getChild(node, SETS_ID), setName), memberRelId);

                innerCore.delAttribute(memberNode, attrName);
                setModified(node);
            }
        };

        setcore.getMemberRegistryNames = function (node, setName, memberPath) {
            ASSERT(typeof setName === 'string');
            harmonizeMemberData(node, setName);
            var memberRelId = getMemberRelId(node, setName, memberPath);
            if (memberRelId) {
                var memberNode = innerCore.getChild(
                    innerCore.getChild(innerCore.getChild(node, SETS_ID), setName), memberRelId);

                return innerCore.getRegistryNames(memberNode);
            }
            return [];
        };
        setcore.getMemberOwnRegistryNames = function (node, setName, memberPath) {
            ASSERT(typeof setName === 'string');
            var memberRelId = getMemberRelId(node, setName, memberPath);
            if (memberRelId) {
                var memberNode = innerCore.getChild(
                    innerCore.getChild(innerCore.getChild(node, SETS_ID), setName), memberRelId);

                return innerCore.getOwnRegistryNames(memberNode);
            }
            return [];
        };
        setcore.getMemberRegistry = function (node, setName, memberPath, regName) {
            ASSERT(typeof setName === 'string' && typeof regName === 'string');
            harmonizeMemberData(node, setName);
            var memberRelId = getMemberRelId(node, setName, memberPath);
            if (memberRelId) {
                var memberNode = innerCore.getChild(
                    innerCore.getChild(innerCore.getChild(node, SETS_ID), setName), memberRelId);

                return innerCore.getRegistry(memberNode, regName);
            }
        };
        setcore.setMemberRegistry = function (node, setName, memberPath, regName, regValue) {
            ASSERT(typeof setName === 'string' && typeof regName === 'string' && regValue !== undefined);
            harmonizeMemberData(node, setName);
            var memberRelId = getMemberRelId(node, setName, memberPath);
            if (memberRelId) {
                var memberNode = innerCore.getChild(
                    innerCore.getChild(innerCore.getChild(node, SETS_ID), setName), memberRelId);

                innerCore.setRegistry(memberNode, regName, regValue);
                setModified(node);
            }
        };
        setcore.delMemberRegistry = function (node, setName, memberPath, regName) {
            ASSERT(typeof setName === 'string' && typeof regName === 'string');
            harmonizeMemberData(node, setName);
            var memberRelId = getMemberRelId(node, setName, memberPath);
            if (memberRelId) {
                var memberNode = innerCore.getChild(
                    innerCore.getChild(innerCore.getChild(node, SETS_ID), setName), memberRelId);

                innerCore.delRegistry(memberNode, regName);
                setModified(node);
            }
        };
        setcore.createSet = function (node, setName) {
            ASSERT(typeof setName === 'string');
            var setsNode = innerCore.getChild(node, SETS_ID),
                setNode = innerCore.getChild(setsNode, setName);

            //FIXME: hack, somehow the empty children have been removed during persist
            innerCore.setRegistry(setNode, '_', '_');

            innerCore.setPointer(innerCore.getChild(node, SETS_ID), setName, null);
            setModified(node);
        };
        setcore.deleteSet = function (node, setName) {
            ASSERT(typeof setName === 'string');
            var setsNode = innerCore.getChild(node, SETS_ID),
                setNode = innerCore.getChild(setsNode, setName);
            innerCore.deletePointer(setsNode, setName);
            innerCore.deleteNode(setNode, true);
            setModified(node);
        };

        setcore.isMemberOf = function (node) {
            //TODO we should find a proper way to do this - or at least some support from lower layers would be fine
            var coll = setcore.getCollectionPaths(node, REL_ID);
            var sets = {};
            for (var i = 0; i < coll.length; i++) {
                var pathArray = coll[i].split('/');
                if (pathArray.indexOf('_meta') === -1) {
                    //now we simply skip META sets...
                    var index = pathArray.indexOf(SETS_ID);
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

        /*setcore.getDataForSingleHash = function(node){
         ASSERT(setcore.isValidNode(node));
         var datas = innerCore.getDataForSingleHash(node);

         //now we should stir all the sets hashes into the node's hash to get changes deep inside
         var names = setcore.getSetNames(node);
         for(var i=0;i<names.length;i++){
         var setNode = setcore.getChild(setcore.getChild(node,SETS_ID),names[i]);
         var memberRelids = setcore.getChildrenRelids(setNode);
         for(var j=0;j<memberRelids.length;j++){
         datas = datas.concat(innerCore.getDataForSingleHash(setcore.getChild(setNode,memberRelids[j])));
         }
         }

         return datas;
         };*/

        return setcore;

    }

    return SetCore;
});


