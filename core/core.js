/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 *
 * Author: Tamas Kecskes
 */

define(["core/corerel",'core/setcore','core/rootcore','core/guidcore','core/nullpointercore','core/coreunwrap', 'core/descriptorcore', 'core/coretype', 'core/constraintcore', 'core/coretree', 'core/corerel2'], 
			function (CoreRel, Set, Root, Guid, NullPtr, UnWrap, Descriptor, Type, Constraint, CoreTree, CoreRel2)
{
    "use strict";

    function core(storage,options){
        options = options || {};
        options.usetype = options.usertype || 'nodejs';
        options.corerel = options.corerel || 1;
        
        var corerel = options.corerel === 2 ? new CoreRel2(new CoreTree(storage, options)) : new CoreRel(storage, options);
        var corecon = new Constraint(new Descriptor(new Guid(new Set(new Root(new NullPtr(new Type(new NullPtr(corerel))))))));

        if(options.usertype === 'tasync'){
            return corecon;
        } else {
            return new UnWrap(corecon);
        }
    }

    return core;
});
