/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 *
 * Author: Tamas Kecskes
 */

define([ "core/corerel",'core/setcore','core/rootcore','core/guidcore','core/nullpointercore','core/coreunwrap', 'core/descriptorcore'], function (Rel,Set,Root,Guid,NullPtr,UnWrap,Descriptor) {
    "use strict";

    function core(storage,options){
        options = options || {};
        options.usetype = options.usertype || 'nodejs';
        var core = new Root(new Guid(new Descriptor(new NullPtr(new Set(new Rel(storage,options))))));
        if(options.usertype === 'tasync'){
            return core;
        } else {
            return new UnWrap(core);
        }
    }

    return core;
});
