/*globals define*/
/*jshint node: true, browser: true*/

/**
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 *
 * Author: Tamas Kecskes
 */

define([
        'common/core/corerel',
        'common/core/setcore',
        'common/core/guidcore',
        'common/core/nullpointercore',
        'common/core/coreunwrap',
        'common/core/coretype',
        'common/core/constraintcore',
        'common/core/coretree',
        'common/core/metacore',
        'common/core/coretreeloader',
        'common/core/corediff'],
    function (CoreRel, Set, Guid, NullPtr, UnWrap, Type, Constraint, CoreTree, MetaCore, TreeLoader, CoreDiff) {
    'use strict';

    function core(storage, options) {
        options.usertype = options.usertype || 'nodejs'; // FIXME: why this is nodejs???
        // = new TreeLoader(new CoreDiff(new MetaCore(new Constraint(new Guid(new Set(new NullPtr(new Type(new NullPtr(new CoreRel(new CoreTree(storage, options)))))))))));
        var coreCon,
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

        coreCon = coreLayers.reduce(function (inner, Class) {
            return new Class(inner, options);
        }, new CoreTree(storage, options));

        if (options.usertype === 'tasync') {
            return coreCon;
        } else {
            return new UnWrap(coreCon, options);
        }
    }

    return core;
});
