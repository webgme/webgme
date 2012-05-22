var BackEndProject = function(runner,project,branch,port){
    var forever = require('forever'),
        child;
    
    this.getInfo = function(){
    	return {project:project,branch:branch,port:port};
    };
    /*main*/
    child = new (forever.Monitor) (require('path').join(__dirname,'proj3ct.js'),{'max':1,'options':[port,project,branch]});
    child.start();
    child.on('exit',function(){
        console.log("ehune");
        runner.closeProject(project,branch);
    })
};
var ProjectRunner = function(hostname,port){
    var net = require('net'),
        socket = new net.Socket(),
        projects = {},
        self = this;
        projectport = port+1;

    socket.on('data',function(data){
        var msg = JSON.parse(data);
        if(msg.type === "createProject"){
            self.createProject(msg.project,msg.branch);
        }
    });
    this.getAvailableProjects = function(){
        var i,
            msg;
        msg = {type:"getProjectListAck",projects:[]};
        for(i in projects){
            msg.projects.push(projects[i].getInfo());
        }
        socket.write(JSON.stringify(msg));
    };
    this.createProject = function(project,branch){
        var msg,
            id;

        msg={type:"createProjectAck",success:true};
        id=project+"_"+branch;
        if(projects[id]){
            msg.success = false;
            socket.write(JSON.stringify(msg));
        }
        else{
            projects[id] = new BackEndProject(self,project,branch,projectport);
            msg.port = projectport++;
            socket.write(JSON.stringify(msg));
        }
    };
    this.closeProject = function(project,branch){
        var msg,
            id;
        id=project+"_"+branch;
        if(projects[id]){
            delete projects[id];
            msg = {type:"projectClosed",project:project,branch:branch};
            socket.write(JSON.stringify(msg));
        }
    };

    /*main*/
    socket.setEncoding('utf8');
    socket.connect(port,hostname,function(){
        console.log("connected");
        socket.write('hello\n');
    });
};

var client = new ProjectRunner("localhost",8122);
