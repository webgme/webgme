/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 *
 * Author: Tamas Kecskes
 */

define([ "core/corerel",'core/corewrap','core/setcore','core/rootcore','core/guidcore','core/nullpointercore','core/coreunwrap', 'core/descriptorcore'], function (Rel,Wrap,Set,Root,Guid,NullPtr,UnWrap,Descriptor) {
    "use strict";
    function syncCore(storage,options){
        var core = new Root(new Guid(new Descriptor(new NullPtr(new Set( new Wrap(new Rel(storage,options)))))));
        return core;
    }

    function asyncCore(storage,options){
        var core = new UnWrap(new Root(new Guid(new Descriptor(new NullPtr(new Set( new Wrap(new Rel(storage,options))))))));
        return core;
    }

    return {
        syncCore : syncCore,
        asyncCore : asyncCore
    }
});
