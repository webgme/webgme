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
      EMPTYGUID = "00000000-0000-0000-0000-000000000000",
      EMPTYNODE = _innerCore.createNode({base: null, parent: null, guid: EMPTYGUID}),
      toFrom = {}, //TODO should not be global
      fromTo = {}; //TODO should not be global

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
      var sNames = _core.getAttributeNames(source),
        tNames = _core.getAttributeNames(target),
        i,
        diff = {updated: {}, removed: [], added: []};

      for (i = 0; i < sNames.length; i++) {
        if (tNames.indexOf(sNames[i]) === -1) {
          diff.removed.push(sNames[i]);
        }
      }

      for (i = 0; i < tNames.length; i++) {
        if (_core.getAttribute(source, tNames[i]) === undefined) {
          diff.updated[tNames[i]] = _core.getAttribute(target, tNames[i]);
          diff.added.push(tNames[i]);
        } else {
          if (CANON.stringify(_core.getAttribute(source, tNames[i])) !== CANON.stringify(_core.getAttribute(target, tNames[i]))) {
            diff.updated[tNames[i]] = _core.getAttribute(target, tNames[i]);
          }
        }
      }

      return diff;
    }

    function reg_diff(source, target) {
      var sNames = _core.getRegistryNames(source),
        tNames = _core.getRegistryNames(target),
        i,
        diff = {updated: {}, removed: [], added: []};

      for (i = 0; i < sNames.length; i++) {
        if (tNames.indexOf(sNames[i]) === -1) {
          diff.removed.push(sNames[i]);
        }
      }

      for (i = 0; i < tNames.length; i++) {
        if (_core.getRegistry(source, tNames[i]) === undefined) {
          diff.updated[tNames[i]] = _core.getRegistry(target, tNames[i]);
          diff.added.push(tNames[i]);
        } else {
          if (CANON.stringify(_core.getRegistry(source, tNames[i])) !== CANON.stringify(_core.getRegistry(target, tNames[i]))) {
            diff.updated[tNames[i]] = _core.getRegistry(target, tNames[i]);
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
        i,
        diff = {added: [], updated: {}, removed: []};

      for (i = 0; i < sNames.length; i++) {
        if (tNames.indexOf(sNames[i]) === -1) {
          diff.removed.push(sNames[i]);
        }
      }

      for (i = 0; i < tNames.length; i++) {
        if (sNames.indexOf(tNames[i]) === -1) {
          diff.added.push(tNames[i]);
          diff.updated[tNames[i]] = _core.getPointerPath(target, tNames[i]);
        } else {
          if (_core.getPointerPath(source, tNames[i]) !== _core.getPointerPath(target, tNames[i])) {
            diff.updated[tNames[i]] = _core.getPointerPath(target, tNames[i]);
          }
        }
      }

      return diff;
    }

    function set_diff(source, target) {
      var sNames = _core.getSetNames(source),
        tNames = _core.getSetNames(target),
        sMembers, tMembers, i, j, memberDiff,
        diff = {added: [], updated: {}, removed: []};

      for (i = 0; i < sNames.length; i++) {
        if (tNames.indexOf(sNames[i]) === -1) {
          diff.removed.push(sNames[i]);
        }
      }

      for (i = 0; i < tNames.length; i++) {
        if (sNames.indexOf(tNames[i]) === -1) {
          diff.added.push(tNames[i]);
          diff.updated[tNames[i]] = _core.getMemberPaths(target, tNames[i]);
        } else {
          sMembers = _core.getMemberPaths(source, tNames[i]);
          tMembers = _core.getMemberPaths(target, tNames[i]);
          memberDiff = {added: [], removed: []}; //TODO are we interested in member change (when some data of the member changes
          for (j = 0; j < sMembers.length; j++) {
            if (tMembers.indexOf(sMembers[j]) === -1) {
              memberDiff.removed.push(sMembers[j]);
            }
          }
          for (j = 0; j < tMembers.length; j++) {
            if (sMembers.indexOf(tMembers[j]) === -1) {
              memberDiff.added.push(tMembers[j]);
            }
          }

          if (!isEmptyDiff(memberDiff)) {
            diff.updated[tNames[i]] = memberDiff;
          }
        }
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

    function metaRulesChanged(source, target) {
      return CANON.stringify(_core.getOwnJsonMeta(source)) !== CANON.stringify(_core.getOwnJsonMeta(target));
    }

    function meta_diff(source, target) {
      if (CANON.stringify(_core.getOwnJsonMeta(source)) !== CANON.stringify(_core.getOwnJsonMeta(target))) {
        return _core.getOwnJsonMeta(target);
      }
      return {};
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
      if (isEmptyDiff(diff.children || {})) {
        if (isEmptyDiff(diff.attr || {})) {
          if (isEmptyDiff(diff.reg || {})) {
            if (isEmptyDiff(diff.pointer || {})) {
              if (isEmptyDiff(diff.set || {})) {
                return true;
              }
            }
          }
        }
      }
      return false;
    }

    function extendDiffWithOvr(diff, oDiff) {
      var patharray,
        i, j,
        keys = Object.keys(oDiff),
        names,
        alreadyChecked = false,
        tDiff;

      for (i = 0; i < keys.length; i++) {
        console.log('ED', keys[i]);
        tDiff = diff;
        alreadyChecked = false;
        names = Object.keys(oDiff[keys[i]]);
        patharray = keys[i].split('/');
        patharray.shift();
        if (patharray.length > 0) {
          for (j = 0; j < patharray.length; j++) {
            if (tDiff.removed === true) {
              alreadyChecked = true;
            }

            tDiff[patharray[j]] = tDiff[patharray[j]] || {};
            tDiff = tDiff[patharray[j]];
          }

          if (tDiff.removed === true) {
            alreadyChecked = true;
          }

          if (!alreadyChecked) {
            //now we should iterate through all pointers in the oDiff
            for (j = 0; j < names.length; j++) {
              console.log('ED__', names[j], oDiff[keys[i]][names[j]]);
              switch (oDiff[keys[i]][names[j]].type) {
                case "added":
                  if (!(tDiff.pointer && tDiff.pointer.added && tDiff.pointer.added[names[j]] !== undefined)) {
                    if (tDiff.pointer && tDiff.pointer.removed && tDiff.pointer.removed.indexOf(names[j]) !== -1) {
                      //the relation got updated but it switched level regarding the containment
                      tDiff.pointer.removed.splice(tDiff.pointer.removed.indexOf(names[j]), 1);
                      if (tDiff.pointer.removed.length === 0) {
                        delete tDiff.pointer.removed;
                      }
                      if (Object.keys(tDiff.pointer).length === 0) {
                        delete tDiff.pointer;
                      }
                      tDiff.pointer = tDiff.pointer || {};
                      tDiff.pointer.updated = tDiff.pointer.updated || {};
                      tDiff.pointer.updated[names[j]] = oDiff[keys[i]][names[j]].target;
                    } else {
                      //this is the first encounter of the pointer
                      tDiff.pointer = tDiff.pointer || {};
                      tDiff.pointer.added = tDiff.pointer.added || {};
                      tDiff.pointer.added[names[j]] = oDiff[keys[i]][names[j]].target;
                    }
                  }
                  break;
                case "updated":
                  //if it is an update in the ovr than it must be an update anywhere
                  if (!(tDiff.pointer && tDiff.pointer.updated && tDiff.pointer.updated[names[j]])) {
                    tDiff.pointer = tDiff.pointer || {};
                    tDiff.pointer.updated = tDiff.pointer.updated || {};
                    tDiff.pointer.updated[names[j]] = oDiff[keys[i]][names[j]].target;
                  }
                  break;
                case "removed":
                  if (!(tDiff.pointer && tDiff.pointer.removed && tDiff.pointer.removed.indexOf(names[j]) !== -1)) {
                    if (tDiff.pointer && tDiff.pointer.added && tDiff.pointer.added[names[j]] !== undefined) {
                      //the relation got updated but it switched level regarding the containment
                      tDiff.pointer = tDiff.pointer || {};
                      tDiff.pointer.updated = tDiff.pointer.updated || {};
                      tDiff.pointer.updated[names[j]] = tDiff.pointer.added[names[j]];
                      delete tDiff.pointer.added[names[j]];
                    } else {
                      //this is the first encounter of the pointer
                      tDiff.pointer = tDiff.pointer || {};
                      tDiff.pointer.removed = tDiff.pointer.removed || [];
                      tDiff.pointer.removed.push(names[j]);
                    }
                  }
                  break;
              }
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
            done = TASYNC.call(function (cDiff, relid) {
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

    function checkRound() {
      var guids = Object.keys(_yetToCompute),
        done, ytc,
        i;
      if (_needChecking !== true || guids.length < 1) {
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

    function createNewNodes(node, diff) {
      var relids = getDiffChildrenRelids(diff),
        i,
        done;

      for (i = 0; i < relids.length; i++) {
        if (diff[relids[i]].removed === false && !diff[relids[i]].movedFrom) {
          //we have to create the child with the exact hash and then recursively call the function for it
          //TODO this is a HACK
          console.log('node ' + _core.getPath(node) + '/' + relids[i] + ' is created');
          var newChild = _core.getChild(node, relids[i]);
          _core.setHashed(newChild, true);
          newChild.data = diff[relids[i]].hash;
        }

        done = TASYNC.call(function (a, b, c) {
          return createNewNodes(a, b);
        }, _core.loadChild(node, relids[i]), diff[relids[i]], done);

      }

      return TASYNC.call(function (d) {
        return null;
      }, done);
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
        for(i=0;i<relids.length;i++){
          done = applyNodeChange(root,path+'/'+relids[i],nodeDiff[relids[i]]);
        }
        TASYNC.call(function(d){
          return done;
        },done);
      }, node);
    }

    function applyAttributeChanges(node, attrDiff) {
      var i, keys;
      keys = Object.keys(attrDiff.added || {});
      for (i = 0; i < keys.length; i++) {
        _core.setAttribute(node, keys[i], attrDiff.added[keys[i]]);
      }

      keys = Object.keys(attrDiff.updated || {});
      for (i = 0; i < keys.length; i++) {
        _core.setAttribute(node, keys[i], attrDiff.updated[keys[i]]);
      }

      if (attrDiff.removed && attrDiff.removed.length > 0) {
        for (i = 0; i < attrDiff.removed.length; i++) {
          _core.delAttribute(node, attrDiff.removed[i]);
        }
      }
    }

    function applyRegistryChanges(node, regDiff) {
      var i, keys;
      keys = Object.keys(regDiff.added || {});
      for (i = 0; i < keys.length; i++) {
        _core.setRegistry(node, keys[i], regDiff.added[keys[i]]);
      }

      keys = Object.keys(regDiff.updated || {});
      for (i = 0; i < keys.length; i++) {
        _core.setRegistry(node, keys[i], regDiff.updated[keys[i]]);
      }

      if (regDiff.removed && regDiff.removed.length > 0) {
        for (i = 0; i < regDiff.removed.length; i++) {
          _core.delRegistry(node, regDiff.removed[i]);
        }
      }
    }

    function applyPointerChanges(node, pointerDiff) {

    }

    function applySetChanges(node, setDiff) {

    }

    function applyMetaChanges(node, metaDiff) {

    }

    _core.applyTreeDiff = function (root, diff) {
      var done;

      toFrom = {};
      fromTo = {};
      getMoveSources(diff, '', toFrom, fromTo);

      done = createNewNodes(root, diff);

      TASYNC.call(function (d) {
        return applyNodeChange(root,'',diff);
      }, done);


      return null;
    };

    return _core;
  }

  return diffCore;
});
