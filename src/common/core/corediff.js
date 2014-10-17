/*
 * Copyright (C) 2014 Vanderbilt University, All rights reserved.
 *
 * Author: Tamas Kecskes
 */
define(['util/canon', 'core/tasync', 'util/assert'], function (CANON, TASYNC, ASSERT) {
  "use strict";


  function diffCore(_innerCore) {
    var _core = {},
      _yetToCompute = {},
      _DIFF = {},
      _needChecking = true,
      _rounds = 0,
      TODELETESTRING = "*to*delete*",
    /*EMPTYGUID = "00000000-0000-0000-0000-000000000000",
     EMPTYNODE = _innerCore.createNode({base: null, parent: null, guid: EMPTYGUID}),*/
      toFrom = {}, //TODO should not be global
      fromTo = {}, //TODO should not be global
      _concat_dictionary,
      _concat_moves,
      _concat_result;

    for (var i in _innerCore) {
      _core[i] = _innerCore[i];
    }

    function normalize(obj) {
      if (!obj) {
        return obj;
      }
      var keys = Object.keys(obj),
        i;
      for (i = 0; i < keys.length; i++) {
        if (Array.isArray(obj[keys[i]])) {
          if (obj[keys[i]].length === 0) {
            delete obj[keys[i]];
          }
        } else if (typeof obj[keys[i]] === 'object') {
          normalize(obj[keys[i]]);
          if (obj[keys[i]] && Object.keys(obj[keys[i]]).length === 0) {
            delete obj[keys[i]];
          }
        }
      }
    }

    function attr_diff(source, target) {
      var sNames = _core.getOwnAttributeNames(source),
        tNames = _core.getOwnAttributeNames(target),
        i,
        diff = {};

      for (i = 0; i < sNames.length; i++) {
        if (tNames.indexOf(sNames[i]) === -1) {
          diff[sNames[i]] = TODELETESTRING;
        }
      }

      for (i = 0; i < tNames.length; i++) {
        if (_core.getAttribute(source, tNames[i]) === undefined) {
          diff[tNames[i]] = _core.getAttribute(target, tNames[i]);
        } else {
          if (CANON.stringify(_core.getAttribute(source, tNames[i])) !== CANON.stringify(_core.getAttribute(target, tNames[i]))) {
            diff[tNames[i]] = _core.getAttribute(target, tNames[i]);
          }
        }
      }

      return diff;
    }

    function reg_diff(source, target) {
      var sNames = _core.getOwnRegistryNames(source),
        tNames = _core.getOwnRegistryNames(target),
        i,
        diff = {};

      for (i = 0; i < sNames.length; i++) {
        if (tNames.indexOf(sNames[i]) === -1) {
          diff[sNames[i]] = TODELETESTRING;
        }
      }

      for (i = 0; i < tNames.length; i++) {
        if (_core.getRegistry(source, tNames[i]) === undefined) {
          diff[tNames[i]] = _core.getRegistry(target, tNames[i]);
        } else {
          if (CANON.stringify(_core.getRegistry(source, tNames[i])) !== CANON.stringify(_core.getRegistry(target, tNames[i]))) {
            diff[tNames[i]] = _core.getRegistry(target, tNames[i]);
          }
        }
      }

      return diff;
    }

    function children_diff(source, target) {
      var sRelids = _core.getChildrenRelids(source),
        tRelids = _core.getChildrenRelids(target),
        tHashes = _core.getChildrenHashes(target),
        sHashes = _core.getChildrenHashes(source),
        i,
        diff = {added: [], removed: []};

      for (i = 0; i < sRelids.length; i++) {
        if (tRelids.indexOf(sRelids[i]) === -1) {
          diff.removed.push({relid: sRelids[i], hash: sHashes[sRelids[i]]});
        }
      }

      for (i = 0; i < tRelids.length; i++) {
        if (sRelids.indexOf(tRelids[i]) === -1) {
          diff.added.push({relid: tRelids[i], hash: tHashes[tRelids[i]]});
        }
      }

      return diff;

    }

    function pointer_diff(source, target) {
      var sNames = _core.getPointerNames(source),
        tNames = _core.getPointerNames(target),
        i, pTarget,
        diff = {};

      for (i = 0; i < sNames.length; i++) {
        if (tNames.indexOf(sNames[i]) === -1) {
          diff[sNames[i]];
        }
      }

      for (i = 0; i < tNames.length; i++) {
        pTarget = _core.getPointerPath(target, tNames[i]);
        if (sNames.indexOf(tNames[i]) === -1) {
          diff[tNames[i]] = pTarget;
        } else {
          if (_core.getPointerPath(source, tNames[i]) !== pTarget) {
            diff[tNames[i]] = pTarget;
          }
        }
      }

      return diff;
    }

    function set_diff(source, target) {
      var sNames = _core.getSetNames(source),
        tNames = _core.getSetNames(target),
        sMembers, tMembers, i, j, memberDiff, sData, tData,
        diff = {},
        getMemberData = function (node, setName, memberPath) {
          var keys,
            data = {attr: {}, reg: {}},
            i;

          keys = _core.getMemberOwnAttributeNames(node, setName, memberPath);
          for (i = 0; i < keys.length; i++) {
            data.attr[keys[i]] = _core.getMemberAttribute(node, setName, memberPath, keys[i]);
          }

          keys = _core.getMemberOwnRegistryNames(node, setName, memberPath);
          for (i = 0; i < keys.length; i++) {
            data.attr[keys[i]] = _core.getMemberRegistry(node, setName, memberPath, keys[i]);
          }

          return data;
        };

      for (i = 0; i < sNames.length; i++) {
        if (tNames.indexOf(sNames[i]) === -1) {
          diff[sNames[i]] = TODELETESTRING;
        }
      }

      for (i = 0; i < tNames.length; i++) {
        if (sNames.indexOf(tNames[i]) === -1) {
          sMembers = [];
        } else {
          sMembers = _core.getMemberPaths(source, tNames[i]);
        }
        tMembers = _core.getMemberPaths(target, tNames[i]);
        memberDiff = {};
        for (j = 0; j < sMembers.length; j++) {
          if (tMembers.indexOf(sMembers[j]) === -1) {
            memberDiff[sMembers[j]] = TODELETESTRING;
          }
        }

        for (j = 0; j < tMembers.length; j++) {
          sData = sMembers.indexOf(tMembers[j]) === -1 ? {} : getMemberData(source, tNames[i], tMembers[j]);
          tData = getMemberData(target, tNames[i], tMembers[j]);
          if (CANON.stringify(sData) !== CANON.stringify(tData)) {
            memberDiff[tMembers[j]] = getMemberData(target, tNames[i], tMembers[j]);
          }
        }
        diff[tNames[i]] = memberDiff;
      }

      return diff;
    }

    function ovr_diff(source, target) {
      // structure: path:{pointername:"targetpath"}
      // diff structure: path:{pointername:{target:path,type:updated/removed/added}}
      var i, j, paths, pNames,
        diff = {},
        basePath = _core.getPath(source),
        sOvr = _core.getProperty(source, 'ovr') || {},
        tOvr = _core.getProperty(target, 'ovr') || {};

      //removals
      paths = Object.keys(sOvr);
      for (i = 0; i < paths.length; i++) {
        if (paths[i].indexOf("_") === -1) {
          //we do not care about technical relations - sets are handled elsewhere
          pNames = Object.keys(sOvr[paths[i]]);
          for (j = 0; j < pNames.length; j++) {
            if (pNames[j].slice(-4) !== "-inv") {
              //we only care about direct pointer changes and to real nodes
              if (sOvr[paths[i]][pNames[j]].indexOf("_") === -1) {
                if (!(tOvr[paths[i]] && tOvr[paths[i]][pNames[j]])) {
                  diff[paths[i]] = diff[paths[i]] || {};
                  diff[paths[i]][pNames[j]] = {target: null, type: "removed"};
                }
              }

            }
          }
        }

      }

      //updates and additions
      paths = Object.keys(tOvr);
      for (i = 0; i < paths.length; i++) {
        if (paths[i].indexOf("_") === -1) {
          //we do not care about technical relations - sets are handled elsewhere
          pNames = Object.keys(tOvr[paths[i]]);
          for (j = 0; j < pNames.length; j++) {
            if (pNames[j].slice(-4) !== "-inv") {
              //we only care about direct pointer changes and to real nodes
              if (tOvr[paths[i]][pNames[j]].indexOf("_") === -1) {
                if (!(sOvr[paths[i]] && sOvr[paths[i]][pNames[j]])) {
                  diff[paths[i]] = diff[paths[i]] || {};
                  diff[paths[i]][pNames[j]] = {target: _core.joinPaths(basePath, tOvr[paths[i]][pNames[j]]), type: "added"};
                } else if (sOvr[paths[i]][pNames[j]] !== tOvr[paths[i]][pNames[j]]) {
                  diff[paths[i]] = diff[paths[i]] || {};
                  diff[paths[i]][pNames[j]] = {target: _core.joinPaths(basePath, tOvr[paths[i]][pNames[j]]), type: "updated"};
                }
              }
            }
          }
        }

      }

      return diff;
    }

    function meta_diff(source, target) {
      var diff = {};
      if (CANON.stringify(_core.getOwnJsonMeta(source)) !== CANON.stringify(_core.getOwnJsonMeta(target))) {
        diff = _core.getOwnJsonMeta(target);
        if(Object.keys(diff).length <1){
          diff = {empty:true};
        }//TODO this is just a hack, if we would provide real diff it would not be needed
      }
      return diff;
    }

    function isEmptyDiff(diff) {
      if (diff.removed && diff.removed.length > 0) {
        return false;
      }
      if (diff.added && (diff.added.length > 0 || Object.keys(diff.added).length > 0)) {
        return false;
      }
      if (diff.updated && Object.keys(diff.updated).length > 0) {
        return false;
      }
      return true;
    }

    function isEmptyNodeDiff(diff) {
      if (
        Object.keys(diff.children || {}).length > 0 ||
        Object.keys(diff.attr || {}).length > 0 ||
        Object.keys(diff.reg || {}).length > 0 ||
        Object.keys(diff.pointer || {}).length > 0 ||
        Object.keys(diff.set || {}).length > 0 ||
        diff.meta
        ) {
        return false;
      }
      return true;
    }

    function getPathOfDiff(diff, path) {
      var pathArray = (path || "").split('/'),
        i;
      pathArray.shift();
      for (i = 0; i < pathArray.length; i++) {
        diff[pathArray[i]] = diff[pathArray[i]] || {};
        diff = diff[pathArray[i]];
      }

      return diff;
    }

    function extendDiffWithOvr(diff, oDiff) {
      var i, j, keys = Object.keys(oDiff || {}),
        names, tDiff, oDiffObj;
      for (i = 0; i < keys.length; i++) {
        tDiff = getPathOfDiff(diff, keys[i]);
        if (tDiff.removed !== true) {
          names = Object.keys(oDiff[keys[i]]);
          for (j = 0; j < names.length; j++) {
            oDiffObj = oDiff[keys[i]][names[j]];
            if (oDiffObj.type === 'added' || oDiffObj.type === 'updated') {
              tDiff.pointer = tDiff.pointer || {};
              tDiff.pointer[names[j]] = oDiffObj.target;
            } else if (!tDiff.pointer || !tDiff.pointer[names[j]]) {
              tDiff.pointer = tDiff.pointer || {};
              tDiff.pointer[names[j]] = TODELETESTRING;
            }
          }
        }
      }
    }

    function updateDiff(sourceRoot, targetRoot) {
      var sChildrenHashes = _core.getChildrenHashes(sourceRoot),
        tChildrenHAshes = _core.getChildrenHashes(targetRoot),
        sRelids = Object.keys(sChildrenHashes),
        tRelids = Object.keys(tChildrenHAshes),
        diff = _core.nodeDiff(sourceRoot, targetRoot) || {},
        oDiff = ovr_diff(sourceRoot, targetRoot),
        getChild = function (childArray, relid) {
          for (var i = 0; i < childArray.length; i++) {
            if (_core.getRelid(childArray[i]) === relid) {
              return childArray[i];
            }
          }
          return null;
        };
      return TASYNC.call(function (sChildren, tChildren) {
        ASSERT(sChildren.length >= 0 && tChildren.length >= 0);

        var i, child, done, tDiff, guid;

        tDiff = diff.children ? diff.children.removed || [] : [];
        for (i = 0; i < tDiff.length; i++) {
          diff.childrenListChanged = true;
          child = getChild(sChildren, tDiff[i].relid);
          guid = _core.getGuid(child);
          diff[tDiff[i].relid] = {guid: guid, removed: true, hash: _core.getHash(child)};
          _yetToCompute[guid] = _yetToCompute[guid] || {};
          _yetToCompute[guid].from = child;
          _yetToCompute[guid].fromExpanded = false;
        }

        tDiff = diff.children ? diff.children.added || [] : [];
        for (i = 0; i < tDiff.length; i++) {
          diff.childrenListChanged = true;
          child = getChild(tChildren, tDiff[i].relid);
          guid = _core.getGuid(child);
          diff[tDiff[i].relid] = {guid: guid, removed: false, hash: _core.getHash(child)};
          _yetToCompute[guid] = _yetToCompute[guid] || {};
          _yetToCompute[guid].to = child;
          _yetToCompute[guid].toExpanded = false;
        }

        for (i = 0; i < tChildren.length; i++) {
          child = getChild(sChildren, _core.getRelid(tChildren[i]));
          if (child && _core.getHash(tChildren[i]) !== _core.getHash(child)) {
            done = TASYNC.call(function (cDiff, relid, d) {
              diff[relid] = cDiff;
              return null;
            }, updateDiff(child, tChildren[i]), _core.getRelid(child), done);
          }
        }
        return TASYNC.call(function () {
          delete diff.children;
          extendDiffWithOvr(diff, oDiff);
          normalize(diff);
          if (Object.keys(diff).length > 0) {
            diff.guid = _core.getGuid(targetRoot);
            diff.hash = _core.getHash(targetRoot);
            return TASYNC.call(function (finalDiff) {
              return finalDiff;
            }, fillMissingGuid(targetRoot, '', diff));
          } else {
            return diff;
          }

        }, done);
      }, _core.loadChildren(sourceRoot), _core.loadChildren(targetRoot));
    }

    function fillMissingGuid(root, path, diff) {
      var relids = getDiffChildrenRelids(diff),
        i,
        done;

      for (i = 0; i < relids.length; i++) {
        done = TASYNC.call(function (cDiff, relid) {
          diff[relid] = cDiff;
          return null;
        }, fillMissingGuid(root, path + '/' + relids[i], diff[relids[i]]), relids[i]);
      }
      return TASYNC.call(function () {
        if (diff.guid) {
          return diff;
        } else {
          return TASYNC.call(function (child) {
            diff.guid = _core.getGuid(child);
            diff.hash = _core.getHash(child);
            return diff;
          }, _core.loadByPath(root, path));
        }
      }, done);
    }

    function expandDiff(root, isDeleted) {
      var diff = {
        guid: _core.getGuid(root),
        hash: _core.getHash(root),
        removed: isDeleted === true
      };
      return TASYNC.call(function (children) {
        var guid;
        for (var i = 0; i < children.length; i++) {
          guid = _core.getGuid(children[i]);
          diff[_core.getRelid(children[i])] = {
            guid: guid,
            hash: _core.getHash(children[i]),
            removed: isDeleted === true
          };

          if (isDeleted) {
            _yetToCompute[guid] = _yetToCompute[guid] || {};
            _yetToCompute[guid].from = children[i];
            _yetToCompute[guid].fromExpanded = false;
          } else {
            _yetToCompute[guid] = _yetToCompute[guid] || {};
            _yetToCompute[guid].to = children[i];
            _yetToCompute[guid].toExpanded = false;
          }
        }
        return diff;
      }, _core.loadChildren(root));
    }

    function insertIntoDiff(path, diff) {
      var pathArray = path.split('/'),
        relid = pathArray.pop(),
        sDiff = _DIFF,
        i;
      pathArray.shift();
      for (i = 0; i < pathArray.length; i++) {
        sDiff = sDiff[pathArray[i]];
      }
      //sDiff[relid] = diff;
      sDiff[relid] = mergeObjects(sDiff[relid], diff);
    }

    function mergeObjects(source, target) {
      var merged = {},
        sKeys = Object.keys(source),
        tKeys = Object.keys(target);
      for (i = 0; i < sKeys.length; i++) {
        merged[sKeys[i]] = source[sKeys[i]];
      }
      for (i = 0; i < tKeys.length; i++) {
        if (sKeys.indexOf(tKeys[i]) === -1) {
          merged[tKeys[i]] = target[tKeys[i]];
        } else {
          if (typeof target[tKeys[i]] === typeof source[tKeys[i]] && typeof target[tKeys[i]] === 'object' && !(target instanceof Array)) {
            merged[tKeys[i]] = mergeObjects(source[tKeys[i]], target[tKeys[i]]);
          } else {
            merged[tKeys[i]] = target[tKeys[i]];
          }
        }
      }

      return merged;
    }

    function removePathFromDiff(diff,path){
      var relId,i;
      if(path === ''){
        diff = null;
      } else {
        path = path.split('/');
        path.shift();
        relId = path.pop();
        for(i=0;i<path.length;i++){
          diff = diff[path[i]];
        }
        delete diff[relId];
      }
    }
    function shrinkDiff(rootDiff){
      var _shrink = function(diff){
        if(diff){
          var keys = getDiffChildrenRelids(diff),
            i;
          if(typeof diff.movedFrom === 'string'){
            removePathFromDiff(rootDiff,diff.movedFrom);
          }
          if(diff.removed === true){
            for(i=0;i<keys.length;i++){
              delete diff[keys[i]];
            }
          } else {
            for(i=0;i<keys.length;i++){
              _shrink(diff[keys[i]]);
            }
          }
        }
      };
      _shrink(rootDiff);
    }
    function checkRound() {
      var guids = Object.keys(_yetToCompute),
        done, ytc,
        i;
      if (_needChecking !== true || guids.length < 1) {
        shrinkDiff(_DIFF);
        return _DIFF;
      }
      _needChecking = false;
      for (i = 0; i < guids.length; i++) {
        ytc = _yetToCompute[guids[i]];
        if (ytc.from && ytc.to) {
          //move
          _needChecking = true;
          delete _yetToCompute[guids[i]];
          done = TASYNC.call(function (mDiff, info) {
            mDiff.movedFrom = _core.getPath(info.from);
            insertIntoDiff(_core.getPath(info.to), mDiff);
            return null;
          }, updateDiff(ytc.from, ytc.to), ytc);
        } else {
          if (ytc.from && ytc.fromExpanded === false) {
            //expand from
            ytc.fromExpanded = true;
            _needChecking = true;
            done = TASYNC.call(function (mDiff, info) {
              mDiff.hash = _core.getHash(info.from);
              mDiff.removed = true;
              insertIntoDiff(_core.getPath(info.from), mDiff);
              return null;
            }, expandDiff(ytc.from, true), ytc);
          } else if (ytc.to && ytc.toExpanded === false) {
            //expand to
            ytc.toExpanded = true;
            _needChecking = true;
            done = TASYNC.call(function (mDiff, info) {
              mDiff.hash = _core.getHash(info.to);
              mDiff.removed = false;
              insertIntoDiff(_core.getPath(info.to), mDiff);
              return null;
            }, expandDiff(ytc.to, false), ytc);
          }
        }
      }
      return TASYNC.call(function () {
        return checkRound();
      }, done);
    }

    _core.nodeDiff = function (source, target) {
      var diff = {
        children: children_diff(source, target),
        attr: attr_diff(source, target),
        reg: reg_diff(source, target),
        pointer: pointer_diff(source, target),
        set: set_diff(source, target),
        meta: meta_diff(source, target)
      };

      normalize(diff);
      return isEmptyNodeDiff(diff) ? null : diff;
    };

    _core.generateTreeDiff = function (sRoot, tRoot) {
      _yetToCompute = {};
      _DIFF = {};
      _needChecking = true;
      _rounds = 0;
      return TASYNC.call(function (d) {
        _DIFF = d;
        return checkRound();
      }, updateDiff(sRoot, tRoot));
    };

    _core.generateLightTreeDiff = function (sRoot, tRoot) {
      return updateDiff(sRoot, tRoot);
    };

    function getDiffChildrenRelids(diff) {
      var keys = Object.keys(diff),
        i,
        filteredKeys = [],
        forbiddenWords = {
          guid: true,
          hash: true,
          attr: true,
          reg: true,
          pointer: true,
          set: true,
          meta: true,
          removed: true,
          movedFrom: true,
          childrenListChanged: true
        };
      for (i = 0; i < keys.length; i++) {
        if (!forbiddenWords[keys[i]]) {
          filteredKeys.push(keys[i]);
        }
      }
      return filteredKeys;
    }

    function getMoveSources(diff, path, toFrom, fromTo) {
      var relids = getDiffChildrenRelids(diff),
        i, paths = [];

      for (i = 0; i < relids.length; i++) {
        getMoveSources(diff[relids[i]], path + '/' + relids[i], toFrom, fromTo);
      }

      if (typeof diff.movedFrom === 'string') {
        toFrom[path] = diff.movedFrom;
        fromTo[diff.movedFrom] = path;
      }
    }

    function getAncestor(node,path){
      var ownPath = _core.getPath(node),
        ancestorPath='',
        i;
      path=path.split('/');
      ownPath=ownPath.split('/');
      ownPath.shift();
      path.shift();
      for(i=0;i<ownPath.length;i++){
        if(ownPath[i] === path[i]){
          ancestorPath= ancestorPath+'/'+ownPath[i];
        } else {
          break;
        }
      }
      ownPath = _core.getPath(node);
      while(ownPath !== ancestorPath){
        node = _core.getParent(node);
        ownPath = _core.getPath(node);
      }
      return node;
    }
    function setBaseOfNewNode(node,relid,basePath){
      //TODO this is a kind of low level hack so maybe there should be another way to do this
      var ancestor = getAncestor(node,basePath),
        sourcePath = _core.getPath(node).substr(_core.getPath(ancestor).length),
        targetPath = basePath.substr(_core.getPath(ancestor).length);
      sourcePath = sourcePath+'/'+relid;
      _innerCore.overlayInsert(_core.getChild(ancestor,'ovr'),sourcePath,'base',targetPath);
    }
    function createNewNodes(node, diff) {
      var relids = getDiffChildrenRelids(diff),
        i,
        done;

      for (i = 0; i < relids.length; i++) {
        if (diff[relids[i]].removed === false && !diff[relids[i]].movedFrom) {
          //we have to create the child with the exact hash and then recursively call the function for it
          if(!(node.data[relids[i]] && node.data[relids[i]] === diff[relids[i]].hash)){
            //if it is a child of a new node we probably do not have to create it again...
            _core.setProperty(node,relids[i],diff[relids[i]].hash);
          }
          if(diff[relids[i]].pointer && diff[relids[i]].pointer.base){
            //we can set base if the node has one, otherwise it is 'inheritance internal' node
            setBaseOfNewNode(node,relids[i],diff[relids[i]].pointer.base);
          }
        }

        done = TASYNC.call(function (a, b, c) {
          return createNewNodes(a, b);
        }, _core.loadChild(node, relids[i]), diff[relids[i]], done);

      }

      return TASYNC.call(function (d) {
        return null;
      },done);
    }

    function getMovedNode(root, from, to) {
      ASSERT(typeof from === 'string' && typeof to === 'string' && to !== '');
      var parentPath = to.substring(0, to.lastIndexOf('/')),
        parent = _core.loadByPath(root, fromTo[parentPath] || parentPath),
        old = _core.loadByPath(root, from);

      //clear the directories
      delete fromTo[from];
      delete toFrom[to];

      return TASYNC.call(function (p, o) {
        return _core.moveNode(o, p);
      }, parent, old);

    }

    function applyNodeChange(root, path, nodeDiff) {
      //check for move
      var node;
      if (typeof nodeDiff.movedFrom === 'string') {
        node = getMovedNode(root, nodeDiff.movedFrom, path);
      } else {
        node = _core.loadByPath(root, path);
      }

      TASYNC.call(function (n) {
        var done,
          relids = getDiffChildrenRelids(nodeDiff),
          i;
        if (nodeDiff.removed === true) {
          _core.deleteNode(n);
          return;
        }
        applyAttributeChanges(n, nodeDiff.attr || {});
        applyRegistryChanges(n, nodeDiff.reg || {});
        done = applyPointerChanges(n, nodeDiff.pointer || {});
        done = TASYNC.call(applySetChanges,n, nodeDiff.set || {},done);
        if(nodeDiff.meta){
          delete nodeDiff.meta.empty;
          done = TASYNC.call(applyMetaChanges,n, nodeDiff.meta,done);
        }
        for (i = 0; i < relids.length; i++) {
          done = TASYNC.call(function (d, d2) {
            return null;
          }, applyNodeChange(root, path + '/' + relids[i], nodeDiff[relids[i]]), done);
        }
        TASYNC.call(function (d) {
          return done;
        }, done);
      }, node);
    }

    function applyAttributeChanges(node, attrDiff) {
      var i, keys;
      keys = Object.keys(attrDiff);
      for (i = 0; i < keys.length; i++) {
        if (attrDiff[keys[i]] === TODELETESTRING) {
          _core.delAttribute(node, keys[i]);
        } else {
          _core.setAttribute(node, keys[i], attrDiff[keys[i]]);
        }
      }
    }

    function applyRegistryChanges(node, regDiff) {
      var i, keys;
      keys = Object.keys(regDiff);
      for (i = 0; i < keys.length; i++) {
        if (regDiff[keys[i]] === TODELETESTRING) {
          _core.delRegistry(node, keys[i]);
        } else {
          _core.setRegistry(node, keys[i], regDiff[keys[i]]);
        }
      }
    }

    function setPointer(node, name, target) {
      var targetNode;
      if(target === null){
        targetNode = null;
      } else {
        targetNode = _core.loadByPath(_core.getRoot(node),target);
      }
      return TASYNC.call(function (t) {
        //if (name === 'base') { //TODO watch if handling of base changes!!!
        //  console.log('setting base',_core.getPath(node),_core.getPath(t));
        //  _core.setBase(node, t);
        //} else {
        console.log('setting pointer',name,_core.getPath(node),_core.getPath(t));
          _core.setPointer(node, name, t);
        //}
        return;
      }, targetNode);
    }

    function applyPointerChanges(node, pointerDiff) {
      var done,
        keys = Object.keys(pointerDiff),
        i;
      for (i = 0; i < keys.length; i++) {
        if (pointerDiff[keys[i]] === TODELETESTRING) {
          _core.deletePointer(node, keys[i]);
        } else {
          done = setPointer(node, keys[i], pointerDiff[keys[i]]);
        }
      }

      return TASYNC.call(function (d) {
        return null;
      }, done);

    }

    function addMember(node, name, target, data) {
      var memberAttrSetting = function (diff) {
          var keys = _core.getMemberOwnAttributeNames(node, name, target),
            i;
          for (i = 0; i < keys.length; i++) {
            _core.delMemberAttribute(node, name, target, keys[i]);
          }

          keys = Object.keys(diff);
          for (i = 0; i < keys.length; i++) {
            _core.setMemberAttribute(node, name, target, keys[i], diff[keys[i]]);
          }
        },
        memberRegSetting = function (diff) {
          var keys = _core.getMemberOwnRegistryNames(node, name, target),
            i;
          for (i = 0; i < keys.length; i++) {
            _core.delMemberRegistry(node, name, target, keys[i]);
          }

          keys = Object.keys(diff);
          for (i = 0; i < keys.length; i++) {
            _core.setMemberRegistry(node, name, target, keys[i], diff[keys[i]]);
          }
        };
      return TASYNC.call(function (t) {
        _core.addMember(node, name, t);
        memberAttrSetting(data.attr || {});
        memberRegSetting(data.reg || {});
        return;
      }, _core.loadByPath(_core.getRoot(node), target));
    }

    function applySetChanges(node, setDiff) {
      var done,
        setNames = Object.keys(setDiff),
        elements, i, j;
      for (i = 0; i < setNames.length; i++) {
        if (setDiff[setNames[i]] === TODELETESTRING) {
          _core.deleteSet(node, setNames[i]);
        } else {
          elements = Object.keys(setDiff[setNames[i]]);
          for (j = 0; j < elements.length; j++) {
            if (setDiff[setNames[i]][elements[j]] === TODELETESTRING) {
              _core.delMember(node, setNames[i], elements[j]);
            } else {
              done = addMember(node, setNames[i], elements[j], setDiff[setNames[i]][elements[j]]);
            }
          }
        }
      }

      return TASYNC.call(function (d) {
        return null;
      }, done);

    }

    function applyMetaAttributes(node,metaAttrDiff){
      var keys = Object.keys(metaAttrDiff || {}),
        i;
      for(i=0;i<keys.length;i++){
        _core.setAttributeMeta(node,keys[i],metaAttrDiff[keys[i]]);
      }
    }

    function applyMetaContraints(node,metaConDiff){
      var keys,
        i;
      keys = _core.getOwnConstraintNames(node);
      for(i=0;i<keys.length;i++){
        _core.delConstraint(node,keys[i]);
      }

      keys = Object.keys(metaConDiff || {});
      for(i=0;i<keys.length;i++){
        _core.setConstraint(node,keys[i],metaConDiff[keys[i]]);
      }
    }

    function applyMetaChildren(node,metaChildrenDiff){
      var applyChild = function(child,min,max){
          _core.setChildMeta(node,child,min,max);
        },
        keys = (metaChildrenDiff || {}).items || [],
        done,
        i;

      for(i=0;i<keys.length;i++){
        done = TASYNC.call(
          applyChild,
          _core.loadByPath(_core.getRoot(node),keys[i]),
          metaChildrenDiff.minItems[i],
          metaChildrenDiff.maxItems[i],
          done
        );
      }

      TASYNC.call(function(d){
        _core.setChildrenMetaLimits(node, metaChildrenDiff.min, metaChildrenDiff.max);
        return null;
      },done);
    }

    function applyMetaPointers(node,metaPointerDiff){
      var applyPointer = function(name,target,min,max){
          _core.setPointerMetaTarget(node,name,target,min,max);
        },
        i, j,done,names = Object.keys(metaPointerDiff || {}),paths;

      for(i=0;i<names.length;i++){
        paths = metaPointerDiff[names[i]].items || [];
        _core.setPointerMetaLimits(node,names[i],metaPointerDiff[names[i]].min,metaPointerDiff[names[i]].max);
        for(j=0;j<paths.length;j++){
          done = TASYNC.call(
            applyPointer,
            names[i],
            _core.loadByPath(_core.getRoot(node),paths[j]),
            (metaPointerDiff[names[i]].minItems || [])[j],
            (metaPointerDiff[names[i]].maxItems || [])[j],
            done
          );
        }
      }

      TASYNC.call(function(d){
        return null;
      },done);
    }

    function applyMetaAspects(node,metaAspectsDiff){
      var applyTarget = function(name,target){
          _core.setAspectMetaTarget(node,name,target);
        },
        i, j,done,names = Object.keys(metaAspectsDiff || {}),paths;

      for(i=0;i<names.length;i++){
        paths = metaAspectsDiff[names[i]];
        for(j=0;j<paths.length;j++){
          done = TASYNC.call(
            applyTarget,
            names[i],
            _core.loadByPath(_core.getRoot(node),paths[j]),
            done
          );
        }
      }

      TASYNC.call(function(d){
        return null;
      },done);
    }

    function applyMetaChanges(node, metaDiff) {
      var done;
      _core.clearMetaRules(node);
      applyMetaAttributes(node,metaDiff.attributes);
      applyMetaContraints(node,metaDiff.constraints);
      done = applyMetaChildren(node,metaDiff.children);
      done = TASYNC.call(applyMetaPointers,node,metaDiff.pointers,done);
      done = TASYNC.call(applyMetaAspects,node,metaDiff.aspects,done);

      TASYNC.call(function(d){
        return null;
      },done);
    }

    _core.applyTreeDiff = function (root, diff) {
      var done;

      toFrom = {};
      fromTo = {};
      getMoveSources(diff, '', toFrom, fromTo);

      done = createNewNodes(root, diff);
      //done = TASYNC.call(function(d){_core.persist(root)},done);
      TASYNC.call(function (d) {
        return applyNodeChange(root, '', diff);
      }, done);


      return null;
    };


    //concat diffs is needed to make 3-way merge
    function getDiffTreeDictionray(treeDiff){
      var dictionary = {pathToGuid:{},guidToPath:{}},
        addElement = function(path,diff){
          var keys = getDiffChildrenRelids(diff),
            i;
          for(i=0;i<keys.length;i++){
            addElement(path+'/'+keys[i],diff[keys[i]]);
          }
          if(diff.guid){
            dictionary.pathToGuid[path] = diff.guid;
            if(!dictionary.guidToPath[diff.guid] || diff.movedFrom){
              dictionary.guidToPath[diff.guid] = path;
            }
          }
        };

      addElement('',treeDiff);
      return dictionary;
    }

    function concatNodeChanges(base,dictionary,addition){

    }
    function getNodeByGuid(guid){
      var path = _concat_dictionary.guidToPath[guid],
        object = _concat_result,
        i;
      if(typeof path === 'string'){
        if(path === ''){
          return _concat_result;
        }

        path = path.split('/');
        path.shift();
        for(i=0;i<path.length;i++){
          object = object[path[i]];
        }
        return object;
      } else {
        return null;
      }
    }
    function insertAtPath(path,object){
      ASSERT(typeof path === 'string');
      var i,base,relid;
      if(path === ''){
        _concat_result = JSON.parse(JSON.stringify(object));
        return;
      }
      path = path.split('/');
      path.shift();
      relid = path.pop();
      base = _concat_result;
      for(i=0;i<path.length;i++){
        base[path[i]] = base[path[i]] || {};
        base = base[path[i]];
      }
      base[relid] = JSON.parse(JSON.stringify(object));
      return;
    }
    function getSingleNode(node){
      //removes the children from the node
      var result = JSON.parse(JSON.stringify(node)),
        keys = getDiffChildrenRelids(result),
        i;
      for(i=0;i<keys.length;i++){
        delete result[keys[i]];
      }
      return result;
    }
    function processConcatNode(path,node){
      var base = getNodeByGuid(node.guid),
        singleNode = getSingleNode(node),
        childrenRelids = getDiffChildrenRelids(node),
        basePath = _concat_dictionary.guidToPath[node.guid],
        i;
      if(base === null){
        //there is no such object in the base of the concat so we simply insert it
        insertAtPath(path,singleNode);
      } else {
        //simple removal
        if(node.removed === true){
          base.removed = true
        } else {
          if(base.removed === true){
            delete base.removed;
          }
          insertAtPath(_concat_dictionary.guidToPath[node.guid],jsonConcat(base,singleNode));
          //if we add a move we also have to move :)
          if(node.movedFrom){
            //we have to get base again
            base = getNodeByGuid(node.guid);
            insertAtPath(path,base);
            removePathFromDiff(_concat_result,basePath);
            _concat_dictionary = getDiffTreeDictionray(_concat_result); //we have to recalculate
          }
        }
      }

      for(i=0;i<childrenRelids.length;i++){
        processConcatNode(path+'/'+childrenRelids[i],node[childrenRelids[i]]);
      }

    }
    function jsonConcat(base,extension){
      var baseKeys = Object.keys(base),
        extKeys = Object.keys(extension),
        concat = JSON.parse(JSON.stringify(base)),
        i;
      for(i=0;i<extKeys.length;i++){
        if(baseKeys.indexOf(extKeys[i]) === -1){
          concat[extKeys[i]] = JSON.parse(JSON.stringify(extension[extKeys[i]]));
        } else {
          if(typeof base[extKeys[i]] === 'object' && typeof extension[extKeys[i]] === 'object'){
            concat[extKeys[i]] = jsonConcat(base[extKeys[i]],extension[extKeys[i]]);
          } else { //either from value to object or object from value we go with the extension
            concat[extKeys[i]] = JSON.parse(JSON.stringify(extension[extKeys[i]]));
          }
        }
      }
      return concat;
    }

    _core.concatTreeDiff = function(base,extension) {
      _concat_result = JSON.parse(JSON.stringify(base || {}));
      _concat_dictionary = getDiffTreeDictionray(base);
      _concat_moves = {toFrom:{},fromTo:{},base:{fromTo:{},toFrom:{}}};
      getMoveSources(extension,'',_concat_moves.toFrom,_concat_moves.fromTo);
      processConcatNode('',extension);
      return _concat_result;
    };

    _core.isEqualDifferences = function(diffOne,diffTwo){
      var keysOne = Object.keys(diffOne),
        keysTwo = Object.keys(diffTwo),
        i,result = true;
      if(keysOne.sort().join() !== keysTwo.sort().join()){
        return false;
      }

      for(i=0;i<keysOne.length;i++){
        if(keysOne[i] !== 'hash'){
          if(typeof diffOne[keysOne[i]] === 'object' && typeof diffTwo[keysOne[i]] === 'object'){
            if(!_core.isEqualDifferences(diffOne[keysOne[i]],diffTwo[keysOne[i]])){
              result = false;
            }
          } else {
            if(diffOne[keysOne[i]] !== diffTwo[keysOne[i]]){
              result = false;
            }
          }
        }
      }

      return result;
    };

    //we remove some low level functions as they should not be used on high level
    delete _core.overlayInsert;

    return _core;
  }

  return diffCore;
});
