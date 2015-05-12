/*globals console,Worker,define*/
/*
 * @author brollb / https://github/brollb
 */

define(['module'], function (module){
    'use strict';
    
    var worker = null;
    var getWorker = function() {
        if (!worker) {
            var currentDir = module.id.split('/'),
                workerFile;

            currentDir.pop();
            currentDir = currentDir.join('/');
            workerFile = currentDir+'/AutoRouter.Worker.js';

            console.log('creating worker with', workerFile);
            worker = new Worker(workerFile);
        }

        return worker;
    };
    return getWorker;
});
