/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 *
 * Author: Tamas Kecskes
 */

define([
        "core/corerel",
        'core/setcore',
        'core/guidcore',
        'core/nullpointercore',
        'core/coreunwrap',
        'core/coretype',
        'core/constraintcore',
        'core/coretree',
        'core/metacore',
        'core/coretreeloader',
        'core/corediff'],
    function (CoreRel, Set, Guid, NullPtr, UnWrap, Type, Constraint, CoreTree, MetaCore, TreeLoader, CoreDiff)
{
    "use strict";

    function core(storage,options){
        options = options || {};
        options.usertype = options.usertype || 'nodejs'; // FIXME: why this is nodejs???

        var coreCon = new TreeLoader(new CoreDiff(new MetaCore(new Constraint(new Guid(new Set(new NullPtr(new Type(new NullPtr(new CoreRel(new CoreTree(storage, options)))))))))));

        if(options.usertype === 'tasync'){
            return coreCon;
        } else {
            return new UnWrap(coreCon);
        }
    }

    return core;
});
