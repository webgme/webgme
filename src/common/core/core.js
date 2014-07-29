/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 *
 * Author: Tamas Kecskes
 */

define(["core/corerel",'core/setcore','core/guidcore','core/nullpointercore','core/coreunwrap', 'core/descriptorcore', 'core/coretype', 'core/constraintcore', 'core/coretree', 'core/metacore'],
			function (CoreRel, Set, Guid, NullPtr, UnWrap, Descriptor, Type, Constraint, CoreTree, MetaCore)
{
    "use strict";

    function core(storage,options){
        options = options || {};
        options.usetype = options.usertype || 'nodejs';

        var corecon = new Constraint(new MetaCore(new Descriptor(new Guid(new Set(new NullPtr(new Type(new NullPtr(new CoreRel(new CoreTree(storage, options))))))))));

        if(options.usertype === 'tasync'){
            return corecon;
        } else {
            return new UnWrap(corecon);
        }
    }

    return core;
});
