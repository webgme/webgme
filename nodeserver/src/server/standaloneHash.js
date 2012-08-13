var FS = require('fs'),
    commonUtil = require('./../common/CommonUtil.js'),
    os = require('os'),
    child = require('child_process'),
    static = null,
    root = null,
    mongo = null;

console.log('[OS]:'+os.platform());
if(os.platform().indexOf('win') === -1 || os.platform() === 'darwin'){
    console.log("TODO");
}
else{
    /*webserver*/
    static = child.spawn('cmd');
    static.stdout.on('data',function(data){
        console.log("[STATIC WEBSERVER STDOUT] "+data);
    });
    static.stderr.on('data',function(data){
        console.log("[STATIC WEBSERVER STDERR] "+data);
    });
    static.stdin.write('node staticsrv.js \n');

    /*dataserver*/
    mongo = child.spawn('cmd');
    mongo.stdout.on('data',function(data){
        console.log("[DATASERVER STDOUT] "+data);
    });
    mongo.stderr.on('data',function(data){
        console.log("[DATASERVER STDERR] "+data);
    });
    mongo.stdin.write('node filedataserver.js '+commonUtil.hashbasedconfig.dataport+" "+commonUtil.hashbasedconfig.project+" "+commonUtil.hashbasedconfig.branch+"\n");

    /*rootserver*/
    root = child.spawn('cmd');
    root.stdout.on('data',function(data){
        console.log("[ROOTSERVER STDOUT] "+data);
    });
    root.stderr.on('data',function(data){
        console.log("[ROOTSERVER STDERR] "+data);
    });
    root.stdin.write('node rootsrv.js \n');

}
