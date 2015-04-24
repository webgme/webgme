/*globals define*/
/*jshint node: true, browser: true*/

/**
 * @author kecso / https://github.com/kecso
 *
 * example constraint structure for the outside world:
 * {
 *  script:string,
 *  priority:integer,
 *  name:string,
 *  message:string
 * }
 * provided API:
 * getConstraint(node,name) -> constraintObj
 * setConstraint(node,constraintObj)
 * getConstraintNames(node)
 * delConstraint(node,name)
 */

define(['common/util/assert'], function (ASSERT) {
    'use strict';
    var CONSTRAINTS_RELID = '_constraints';
    var C_DEF_PRIORITY = 1;

    function constraintCore(_innerCore, options) {
        ASSERT(typeof options === 'object');
        ASSERT(typeof options.globConf === 'object');
        ASSERT(typeof options.logger !== 'undefined');
        var _core = {},
            logger = options.logger.fork('constraintcore');
        for (var i in _innerCore) {
            _core[i] = _innerCore[i];
        }
        logger.debug('initialized');
        var createNewConstraintRelId = function (constraintsNode) {
            var max = Math.pow(2, 31);
            var existingRelIds = _innerCore.getChildrenRelids(constraintsNode);
            var relId;
            do {
                relId = Math.floor(Math.random() * max);
            } while (existingRelIds.indexOf(relId) !== -1);
            return '' + relId;
        };

        var getConstraintRelId = function (constraintsNode, name) {
            var relIds = _innerCore.getChildrenRelids(constraintsNode);
            var relId;
            for (var i = 0; i < relIds.length; i++) {
                if (name === _innerCore.getAttribute(_innerCore.getChild(constraintsNode, relIds[i]), 'name')) {
                    relId = relIds[i];
                    break;
                }
            }
            return relId;
        };
        var getRegConstName = function (name) {
            return '_ch#_' + name;
        };

        _core.getConstraint = function (node, name) {
            ASSERT(_innerCore.isValidNode(node));
            var constraintsNode = _innerCore.getChild(node, CONSTRAINTS_RELID);
            var constRelId = getConstraintRelId(constraintsNode, name);
            if (constRelId) {
                var constraintNode = _innerCore.getChild(constraintsNode, constRelId);
                return {
                    script: _innerCore.getAttribute(constraintNode, 'script'),
                    priority: _innerCore.getAttribute(constraintNode, 'priority'),
                    info: _innerCore.getAttribute(constraintNode, 'info')
                };
            } else {
                return null;
            }
        };

        _core.setConstraint = function (node, name, constraintObj) {
            ASSERT(_innerCore.isValidNode(node));
            ASSERT(typeof constraintObj === 'object' && typeof name === 'string');
            var constraintsNode = _innerCore.getChild(node, CONSTRAINTS_RELID);
            var constRelId = getConstraintRelId(constraintsNode, name);
            if (!constRelId) {
                //we should create a new one
                constRelId = createNewConstraintRelId(constraintsNode);
            }

            var constraintNode = _innerCore.getChild(constraintsNode, constRelId);
            constraintObj.priority = constraintObj.priority || C_DEF_PRIORITY;
            constraintObj.script = constraintObj.script || 'console.log("empty constraint");';
            constraintObj.info = constraintObj.info || '';
            _innerCore.setAttribute(constraintNode, 'name', name);
            _innerCore.setAttribute(constraintNode, 'script', constraintObj.script);
            _innerCore.setAttribute(constraintNode, 'priority', constraintObj.priority);
            _innerCore.setAttribute(constraintNode, 'info', constraintObj.info);
            _innerCore.setRegistry(node, getRegConstName(name),
                (_innerCore.getRegistry(node, getRegConstName(name)) || 0) + 1);
        };

        _core.delConstraint = function (node, name) {
            ASSERT(_innerCore.isValidNode(node));
            var constraintsNode = _innerCore.getChild(node, CONSTRAINTS_RELID);
            var constRelId = getConstraintRelId(constraintsNode, name);
            if (constRelId) {
                var constraintNode = _innerCore.getChild(constraintsNode, constRelId);
                _innerCore.deleteNode(constraintNode, true);
            }
            _innerCore.delRegistry(node, getRegConstName(name));
        };

        _core.getConstraintNames = function (node) {
            ASSERT(_innerCore.isValidNode(node));
            var constraintsNode = _innerCore.getChild(node, CONSTRAINTS_RELID);
            var relIds = _innerCore.getChildrenRelids(constraintsNode);
            var names = [];
            for (var i = 0; i < relIds.length; i++) {
                names.push(_innerCore.getAttribute(_innerCore.getChild(constraintsNode, relIds[i]), 'name'));
            }
            return names;
        };

        //TODO this means we always have to have this layer above type/inheritance layer
        _core.getOwnConstraintNames = function (node) {
            ASSERT(_innerCore.isValidNode(node));
            var names = _core.getConstraintNames(node),
                base = _core.getBase(node),
                baseNames = [],
                i, index;

            if (base) {
                baseNames = _core.getConstraintNames(base);
            }

            for (i = 0; i < baseNames.length; i++) {
                index = names.indexOf(baseNames[i]);
                if (index !== -1) {
                    names.splice(index, 1);
                }
            }

            return names;
        };

        return _core;
    }

    return constraintCore;
});
