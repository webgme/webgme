/*globals*/
var TESTCASE;
var TESTCONFIG;
var COMMANDARGS;
var IO = require('socket.io-client');
var GUID = require('./../common/CommonUtil.js').guid;
var FS = require('fs');
var PROJECTFILE = "";

var print = function(text){
    console.log("[TESTER] "+text);
};
var copyFile = function(source,destination){
    var file = FS.readFileSync(source,"utf8");
    FS.writeFileSync(destination,file,"utf8");
};
var fileExists = function(filename){
    var files = FS.readdirSync("./");
    if(files.indexOf(filename) === -1){
        return false;
    }
    return true;
};
var setupCase = function(){
    print("setting up testcase");
    TESTCASE = require('./'+COMMANDARGS[3]);
    TESTCONFIG = require('./'+COMMANDARGS[2]);

    /*setup project file*/
    PROJECTFILE = TESTCASE.projectName+"_"+TESTCASE.branchName+".tpf";
    if(!fileExists(PROJECTFILE)){
        FS.writeFileSync(PROJECTFILE,"{}","utf8");
    }
    else{
        copyFile(PROJECTFILE,"saved_"+PROJECTFILE);
    }

    if(TESTCASE.startStorage){
        copyFile(TESTCASE.startStorage,PROJECTFILE);
    }

    var project = require('child_process').spawn('cmd');
    project.stdout.on('data', function (data) {
        console.log('[P-stdout] ' + data);
    });
    project.stderr.on('data', function (data) {
        console.log('[P-stderr] ' + data);
    });
    project.on('exit',function(err){
        console.log("[P-exit] "+err);
    });

    project.stdin.write('node ./../server/GmeProject.js '+TESTCONFIG.server.port+" "+TESTCASE.projectName+" "+TESTCASE.branchName+'\n');
};
var finalizeCase = function(){
    print("finalizing testcase");
    copyFile(PROJECTFILE,"end_"+PROJECTFILE);
    if(!TESTCASE.keepChanges){
        if(fileExists("saved_"+PROJECTFILE)){
            copyFile("saved_"+PROJECTFILE,PROJECTFILE);
        }
    }

    if(TESTCASE.referenceFile){
        var result = FS.readFileSync("end_"+PROJECTFILE,"utf8");
        var reference = FS.readFileSync(TESTCASE.referenceFile,"utf8");

        if(result === reference){
            print("result identical to reference - PASSED");
        }
        else{
            print("difference between result and reference - FAIL");
        }
    }
    print("exiting");
    process.exit(0);
};
var Client = function(id){
    var options = {
        transports: ['websocket'],
        'force new connection': true
    },
        socket = {},
        listeners = [],
        state = "init";

    this.addListener = function(listener){
        listeners.push(listener);
    };
    this.sendMessage = function(msg){
        if(state === "connected"){
            socket.emit('clientMessage',msg);
        }
    };
    this.connect = function(){
        socket = IO.connect("http://localhost:"+TESTCONFIG.server.port,options);

        socket.on('connect',function(msg){
            state = "connected";
            shootEvent('connected');
        });
        socket.on('clientMessageAck',function(msg){
            shootEvent('msgAck');
        });
        socket.on('serverMessage',function(msg){
            socket.emit('serverMessageAck');
            var i;
            for(i=0;i<msg.length;i++){
                if(msg[i].type === 'command'){
                    shootEvent('trResp',msg[i].transactionId);
                }
            }
        });

    };

    var shootEvent = function(ename, eparams){
        for(i=0;i<listeners.length;i++){
            listeners[i].clientEvent(id,ename,eparams);
        }
    };

};
var runCase = function(){
    var i,
        clients = {},
        self = this,
        waitedTransaction = null,
        waitingClientId = null,
        currentStep = 0,
        connecting = [];



    this.clientEvent = function(clientId,eventName,eventParams){

        switch(eventName){
            case "connected":
                connecting.splice(connecting.indexOf(clientId),1);
                if(connecting.length === 0){
                    executeStep(0);
                }
                break;
            case "trResp":
                if(waitedTransaction !== null){
                    if(clientId === waitingClientId && eventParams === waitedTransaction){
                        executeStep(currentStep);
                    }
                }
                break;
        }
    };

    for(i=0;i<TESTCASE.clients.length;i++){
        connecting.push(TESTCASE.clients[i]);
        clients[TESTCASE.clients[i]] = new Client(TESTCASE.clients[i]);
        clients[TESTCASE.clients[i]].addListener(self);
    }
    for(i=0;i<TESTCASE.clients.length;i++){
        clients[TESTCASE.clients[i]].connect();
    }

    var timerExpired = function(){
        executeStep(currentStep);
    };
    var executeStep = function(stepIndex){
        var i,
            cangoon = true;
        currentStep=stepIndex+1;
        if(stepIndex>=TESTCASE.steps.length){
            /*we are done*/
            finalizeCase();
        }
        var step = TESTCASE.steps[stepIndex];
        if(step.toServer){
            if(step.waitForResponse){
                waitingClientId = step.client;
                waitedTransaction = GUID();
                clients[step.client].sendMessage({transactionId:waitedTransaction,commands:step.toServer});
                cangoon = false;
            }
            else{
                clients[step.client].sendMessage({transactionId:"not used",commands:step.toServer});
            }
        }

        if(step.toTester){
            for(i=0;i<step.toTester.length;i++){
                switch(step.toTester[i].type){
                    case "wait":
                        cangoon = false;
                        setTimeout(timerExpired,step.toTester[i].time);
                        break;
                }
            }
        }

        if(cangoon){
            executeStep(currentStep);
        }
    };
};






/*main*/
COMMANDARGS = process.argv.splice(" ");

if(COMMANDARGS.length !== 4){
    console.log("usage: node testExecution.js testConfigObjectFile testObjectFile");
    process.exit(0);
}
else{
    console.log(COMMANDARGS);
    setupCase();
    runCase();
}
