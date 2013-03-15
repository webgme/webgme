/*
 * Copyright (C) 2012-2013 Vanderbilt University, All rights reserved.
 *
 * Author: Tamas Kecskes
 */
var requirejs = require("requirejs");

requirejs.config({
    nodeRequire: require,
    baseUrl: "../../../../../..",
    paths: {
    	storage : 'nodeserver/src/storage',
    	util : 'nodeserver/src/util',
    	common : 'nodeserver/src/common',
    	client : 'nodeserver/src/client/js/NewClient',
    	core : 'corejs/core'
    }
});

requirejs([
    "storage/socketioserver",
    "storage/local",
    "storage/failsafe",
    "storage/socketioclient",
    "storage/cache",
    "storage/log",
    "client/commit"],
    function(
        SERVER,
        LOCAL,
        FS,
        CLIENT,
        CACHE,
        LOG,
        COMMIT){

    	var testport = 6666;
    	var server = new SERVER(
                    new CACHE(
                        new LOG(
                            new LOCAL({
                                        database: "smoketest",
                                        timeout: 10000,
                                        local: "memory"
                                        }),
                            {}),
                        {}),
                    {
                        port:testport
                    });

        server.open();

        var baseClient = new CLIENT({
                                        host: 'http://localhost',
                                        port: testport,
                                        timeout: 60000,
                                        type: 'node'
                                        });
        var cache = new CACHE(baseClient,{});
        var client = new FS(cache,{});
        var projectOne = null;
        var projectTwo = null;
        var commitOne =  null;
        var commitTwo = null;
        
        var commitOneUpdated = function(newhash,callback){
        	console.log('na ez mar dofi');
        }
        client.openDatabase(function(err){
        	if(err){
        		throw err;
        	} else {
        		client.openProject('smoketest',function(err,p){
        			if(err){
        				throw err;
        			} else {
        				projectOne = p;
        				commitOne = new COMMIT(projectOne);
        				commitTwo = new COMMIT(projectOne);
        				commitOne.newBranch('smoke','#1',commitOneUpdated);
        				commitOne.updateBranch('#2',function(err){
        					console.log('ez meg igazan dofi');
        				});
        			}
        		})
        	}
        });


    });