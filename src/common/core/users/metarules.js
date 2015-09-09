/*globals define*/

/**
 * @author kecso / https://github.com/kecso
 * @author pmeijer / https://github.com/pmeijer
 */

define(['q'], function (Q) {
    'use strict';

    /**
     *
     * @param core
     * @param node
     * @param [callback]
     * @returns {*}
     */
    function checkMetaRules(core, node, callback) {
        var error = null,
            deferred = Q.defer(),
            returnValue = {hasViolation: false, message: ''},
            i,
            neededChecks = 4,
            meta = core.getJsonMeta(node),
            typeIndexOfChild = function (typePathsArray, childNode) {
                var index = -1;

                while (childNode && index === -1) {
                    index = typePathsArray.indexOf(core.getPath(childNode));
                    childNode = core.getBase(childNode);
                }

                return index;
            },
            checkChildrenRules = function () {
                var childCount = [],
                    index;
                core.loadChildren(node, function (err, children) {
                    if (err) {
                        returnValue.message += 'error during loading of node\'s children\n';
                        error = error || err;
                        return checkingDone();
                    }

                    //global count check
                    //min
                    if (meta.children.min && meta.children.min !== -1) {
                        if (children.length < meta.children.min) {
                            returnValue.hasViolation = true;
                            returnValue.message += 'node has fewer nodes than needed\n';
                        }
                    }
                    //max
                    if (meta.children.max && meta.children.max !== -1) {
                        if (children.length > meta.children.max) {
                            returnValue.hasViolation = true;
                            returnValue.message += 'node has more nodes than allowed\n';
                        }
                    }

                    //typedCounts
                    for (i = 0; i < meta.children.items.length; i++) {
                        childCount.push(0);
                    }
                    for (i = 0; i < children.length; i++) {
                        index = typeIndexOfChild(meta.children.items, children[i]);
                        if (index === -1) {
                            returnValue.hasViolation = true;
                            returnValue.message += 'child ' + core.getGuid(children[i]) + ' is from prohibited type\n';
                        } else {
                            childCount[index]++;
                        }
                    }
                    for (i = 0; i < meta.children.items.length; i++) {
                        //min
                        if (meta.children.minItems[i] !== -1) {
                            if (meta.children.minItems[i] > childCount[i]) {
                                returnValue.hasViolation = true;
                                returnValue.message += 'too few type ' + meta.children.items[i] + ' children\n';
                            }
                        }
                        //max
                        if (meta.children.maxItems[i] !== -1) {
                            if (meta.children.maxItems[i] < childCount[i]) {
                                returnValue.hasViolation = true;
                                returnValue.message += 'too many type ' + meta.children.items[i] + ' children\n';
                            }
                        }
                    }
                    return checkingDone();
                });
            },
            checkPointerRules = function () {
                //TODO currently there is no quantity check
                var validNames = core.getValidPointerNames(node),
                    names = core.getPointerNames(node),
                    checkPointer = function (name) {
                        core.loadPointer(node, name, function (err, target) {
                            if (err || !target) {
                                error = error || err;
                                returnValue.message += 'error during pointer ' + name + ' load\n';
                                return checkDone();
                            }

                            if (!core.isValidTargetOf(target, node, name)) {
                                returnValue.hasViolation = true;
                                returnValue.message += 'target of pointer ' + name + ' is invalid\n';
                            }
                            return checkDone();
                        });
                    },
                    checkDone = function () {
                        if (--needs === 0) {
                            checkingDone();
                        }
                    },
                    needs, i;

                needs = names.length;
                if (needs > 0) {
                    for (i = 0; i < names.length; i++) {
                        if (validNames.indexOf(names[i]) === -1) {
                            returnValue.hasViolation = true;
                            returnValue.message += ' invalid pointer ' + names[i] + ' has been found\n';
                            checkDone();
                        } else {
                            checkPointer(names[i]);
                        }

                    }
                } else {
                    checkDone();
                }

            },
            checkSetRules = function () {
                //TODO this part is missing yet
                checkingDone();
            },
            checkAttributeRules = function () {
                var names = core.getAttributeNames(node),
                    validNames = core.getValidAttributeNames(node);
                for (i = 0; i < names.length; i++) {
                    if (validNames.indexOf(names[i]) !== -1) {
                        if (!core.isValidAttributeValueOf(node, names[i], core.getAttribute(node, names[i]))) {
                            returnValue.hasViolation = true;
                            returnValue.message += 'attribute ' + names[i] + ' has invalid value\n';
                        }
                    } else {
                        returnValue.hasViolation = true;
                        returnValue.message += 'node has an undefined attribute: ' + names[i];
                    }
                }
                checkingDone();
            },
            checkingDone = function () {
                if (--neededChecks === 0) {
                    if (error) {
                        deferred.reject(error instanceof Error ? error : new Error(error));
                    } else {
                        deferred.resolve(returnValue);
                    }
                }
            };

        checkChildrenRules();
        checkPointerRules();
        checkSetRules();
        checkAttributeRules();
        return deferred.promise.nodeify(callback);
    }

    return checkMetaRules;
});