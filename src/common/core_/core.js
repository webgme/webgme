/*globals define*/
/*jshint node: true, browser: true*/

/**
 * @author kecso / https://github.com/kecso
 */

define([
    'common/core_/corerel',
    'common/core_/setcore',
    'common/core_/guidcore',
    'common/core_/nullpointercore',
    'common/core_/coreunwrap',
    'common/core_/coretype',
    'common/core_/constraintcore',
    'common/core_/coretree',
    'common/core_/metacore',
    'common/core_/coretreeloader',
    'common/core_/corediff'
], function (CoreRel, Set, Guid, NullPtr, UnWrap, Type, Constraint, CoreTree, MetaCore, TreeLoader, CoreDiff) {
    'use strict';

    function Core(storage, options) {
        var core,
            coreLayers = [];
        coreLayers.push(CoreRel);
        coreLayers.push(NullPtr);
        coreLayers.push(Type);
        coreLayers.push(NullPtr);
        coreLayers.push(Set);
        coreLayers.push(Guid);
        coreLayers.push(Constraint);
        coreLayers.push(MetaCore);
        coreLayers.push(CoreDiff);
        coreLayers.push(TreeLoader);
        if (options.usertype !== 'tasync') {
            coreLayers.push(UnWrap);
        }

        core = coreLayers.reduce(function (inner, Class) {
            return new Class(inner, options);
        }, new CoreTree(storage, options));

        return core;
    }

    return Core;
});
