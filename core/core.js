/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 *
 * Author: Tamas Kecskes
 */

define([ "core/corerel",'core/setcore','core/rootcore','core/guidcore','core/nullpointercore','core/coreunwrap', 'core/descriptorcore', 'core/coretype', 'core/constraintcore'], function (Rel,Set,Root,Guid,NullPtr,UnWrap,Descriptor,Type,Constraint) {
    "use strict";

    function core(storage,options){
        options = options || {};
        options.usetype = options.usertype || 'nodejs';
        //TODO now it is just a hack
        //var core = new Root(new Guid(new Descriptor(new NullPtr(new Set(new Rel(storage,options))))));
        var core = new Root(new Constraint(new Descriptor(new Guid(new Set(new NullPtr(new Type(new NullPtr(new Rel(storage,options)))))))));
        if(options.usertype === 'tasync'){
            return core;
        } else {
            return new UnWrap(core);
        }
    }

    return core;
});
