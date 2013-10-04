/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 *
 * Author: Tamas Kecskes
 */

define([ "core/newcorerel",'core/newcorewrap','core/newsetcore','core/newrootcore','core/guidcore','core/nullpointercore','core/coreunwrap'], function (Rel,Wrap,Set,Root,Guid,NullPtr,UnWrap) {
    "use strict";
    function syncCore(storage,options){
        var core = new Root(new Guid(new NullPtr(new Set( new Wrap(new Rel(storage,options))))));
        return core;
    }

    function asyncCore(storage,options){
        var core = new UnWrap(new Root(new Guid(new NullPtr(new Set( new Wrap(new Rel(storage,options)))))));
        return core;
    }

    return {
        syncCore : syncCore,
        asyncCore : asyncCore
    }
});
