define([
    'plugin/PluginBase',
    'plugin/PluginConfig',
    'plugin/PluginResult'
],function(
    PluginBase,
    PluginConfig,
    PluginResult){

    var Pegasus = function(){};
    Pegasus.prototype = Object.create(PluginBase.prototype);

    //locally defined functions only callable from inside the main function so the instances of Pegasus-plugin will be not able to overwrite it
    Pegasus.prototype._loadObjectsAndMeta = function(nextFunction,stopFunction){
        var self = this;
        this.dx = 140;
        this.dy = 0;
        this.original2copy = {}; //Mapping original node ids to copy
        this.boxes2process = [];
        this.params = [{ 'parentId': this.core.getPath(this.activeNode) }];
        this.extraCopying = [];
        self.core.loadChildren(this.activeNode,function(err,children){
            if(!err){
                //saving the children
                self._nodes = {};
                for(var i=0;i<children.length;i++){
                    self._nodes[core.getPath(children[i])] = children[i];
                }

                //saving the meta objects and creating the name hash also
                self._metaHash = {};
                self._metaNodes = {};
                var metaNodes = this.META;
                for(i=0;i<metaNodes.length;i++){
                    self._metaNodes[core.getPath(metaNodes[i])] = metaNodes[i];
                    self._metaHash[core.getAttribute(metaNodes[i],'name')] = core.getPath(metaNodes[i]);
                }

                 nextFunction();

            } else {
                stopFunction(err);
            }
        });
    };
    //synchronous helper functions
    Pegasus.prototype._isType = function(metaBaseName,node){
        var metaNode = this._metaHash[metaBaseName] || null;
        if(typeof metaNode === 'string'){
            metaNode = this._metaNodes[metaNode];
            return this.core.isTypeOf(node,metaNode);
        } else {
            return false;
        }
    };
    Pegasus.prototype._isInPreviewAspect = function(node){
        if( this._isType('Preview_File',node) || this._isType('Preview_Job',node) ||
            this._isType('Preview_Conn',node) ){
            return true;
        }
        return false;
    };
    Pegasus.prototype._deleteNode = function(node){
        var path = this.core.getPath(node);
        this.core.deleteNode(node);
        delete this._nodes[path];
    };
    Pegasus.prototype._deleteNodeByPath = function(path){
        if(this._nodes[path]){
            this.core.deleteNode(this._nodes[path]);
            delete this._nodes[path];
        }
    };
    Pegasus.prototype._addChildren = function(typeName){
        //we assumes that the parent of all creating children will be the active node
        //we return the path of the new object and store it into our cache as well
        var metaNodePath = this._metaHash[metaBaseName] || null,
            parameters = {},
            child = null,
            childPath = null;
        if(typeof metaNodePath === 'string'){
            parameters.base = this._metaNodes[metaNodePath];
            parameters.parent = this.activeNode();
            child = this.core.createNode(parameters);
            childPath = this.core.getPath(child);
            this._nodes[childPath] = child;
        }

        return childPath;
    };
    Pegasus.prototype._clearPreview = function(){
        var keys = Object.keys(this._nodes);
        var childrenPaths = [];
        for(var i=0;i<keys.length;i++){
            if(this._isInPreviewAspect(this._nodes[keys[i]])){
                this._deleteNodeByPath(keys[i]);
            } else {
                childrenPaths.push(keys[i]);
            }
        }
        return childrenPaths;
    };
    Pegasus.prototype._createCopyLists = function(nIds, dstId){
        var paths = this._createPaths(nIds),//Create lists out of lists
            i = paths.length;

        //Next, for each path, I will resolve the dot operators then the filesets
        while(i--){
            this._copyPath(paths[i], dstId);
        }
    };
    Pegasus.prototype._createPaths = function(nIds){
        //Find start node
        var nodeIds = [],
            i,
            boundary = {},
            paths = [[]],
            p_i = 0,
            next = [];

        //Order the nodes by the following rule:
        //If it is linked to the last node, add it
        //O.W. get the highest node
        while(nIds.length){
            if(paths[p_i].length){
                //Get next point
                //Get the connected nodes
                var index = paths.length-1,
                    lastId = paths[index][paths[index].length-1],
                    lastNode = this._nodes[lastId],
                    added = false;

                i = -1;
                while(++i < nIds.length){
                    var nodeId = nIds[i],
                        node = this._nodes[nodeId],
                        searchId = null,
                        connNode = null;//search node

                    if(this._isType('Connection',node)){
                        connNode = node;
                        searchId = lastId;
                    }else if(this._isType('Connection',lastNode)){ //Assuming not both connections
                        connNode = lastNode;
                        searchId = nodeId;
                    }

                    if(connNode){//one is a connection
                        var src = this.core.getPointerPath(connNode,'src'),
                            dst = this.core.getPointerPath(connNode,'src');

                        if(src === searchId || dst === searchId
                            || src.indexOf(searchId+'/') !== -1 || dst.indexOf(searchId+'/') !== -1){//Then they are connected (to obj or children)
                            //add the nodeId to the nodeIds list
                            next[0] = nodeId;
                            added = true;
                            break;
                        }
                    }
                }
                if(!added)//End of the given path
                    p_i++;

            }else{
                //Get start point
                //Get the top most node
                //NOTE: For now I will only support straight paths FIXME
                i = nIds.length;
                var minY = null,
                    topNode = null;
                while(i--){
                    if(this._isType('Connection',this._nodes[nIds[i]]))//We will skip connections as start things
                        continue;

                    var nodeId = nIds[i],
                        node = this._nodes[nodeId],
                        y = (this.core.getRegistry(node,"position")).y;

                    if(minY > y || minY === null){//Compare y positions
                        topNode = nodeId;
                        minY = y;
                    }
                }

                next[0] = topNode;
            }

            //If there is a node in nodeIds, check to see
            //if it is connected to the current

            //Add to paths
            if(paths[p_i] === undefined){ //Start a new path
                paths.push([]);
            }else{
                paths[p_i].push(next[0]);
                nIds.splice(nIds.indexOf(next[0]),1);
            }

        }
        return paths;
    };
    Pegasus.prototype._copyPath = function(path, dst, dis){
        var i = -1;
        while(++i < path.length){
            if(this.pegasusTypeCheck.isConnection(path[i]) && !this.pegasusTypeCheck.isFileSet(path[i+1])){
                path[i+1] = this._createPreviewNode(dst, path[i+1]);
                this._createConnection(dst, path[i-1], path[i+1]);
                //this._addToParams(path[i], dst);
                i++;

            }else if(this.pegasusTypeCheck.isFileSet(path[i])){
                if(this.pegasusTypeCheck.isFork(path[i+2])){//Next is a Fork/Dot operator!
                    i = this._processForkOperation(dst, path, i);
                }else{//All created files will share prev/next things in the list!
                    if(i < path.length -2)
                        path[i+2] = this._createPreviewNode(dst, path[i+2]);

                    this._processFileSet(path[i], dst, i > 1 ? path[i-2] : null, i < path.length - 2 ? path[i+2] : null);
                    i+=2;//Skip the next connection and job
                }

            }else if(!this.pegasusTypeCheck.isConnection(path[i])){
                //this._addToParams(path[i], dst);
                path[i] = this._createPreviewNode(dst, path[i]);
            }
        }
    };
    Pegasus.prototype._processForkOperation = function(dst, path, index){
        //Get the next process
        var prev = index >= 1 ? index - 2 : -1,
            fsId = index,
            next,
            job,
            jobConn,
            next,
            nextItem,
            conns = [],
            count = this._getFileNames(path[index]).length,
            fileObject = this.pegasusTypeCheck.isFileSet(path[fsId]) ? this._createFileFromFileSet(path[fsId], dst) :
            { 'id': path[fsId], 'name': this._client.getNode(path[fsId]).getAttribute(nodePropertyNames.Attributes.name),
                'position': this._client.getNode(path[fsId]).getRegistry('position') },
            file = fileObject.id,
            dx = this.dx,
            dy = this.dy,
            i = -1,//total files and jobs to create in parallel
            names = fileObject.names,
            shift = {'x': dx * (count-2)/2, 'y': dy * (count-2)/2 },
            pos = [ { 'x': fileObject.position.x, 'y': fileObject.position.y }]; //input

        //Need to handle the filesets, connection to prev on the first run only.

        //prev to first created file
        if(prev !== -1)
            conns.push(this._createConnection(dst, path[prev], file));

        //Copy the initial fileset
        i = 0;
        while(++i < count){
            var attr = {},
                position = { 'x': pos[0].x+(i)*dx, 'y': pos[0].y+(i)*dy };

            attr[nodePropertyNames.Attributes.name] = names[i];
            this.extraCopying.push({ 'num': 1, 'id': file, 'dstId': dst, 'attr': { 'attributes': attr, 'registry': {'position': position} }});
        }

        do {
            /* * * * * * * * Find the next important values    * * * * * * * */
            prev = index >= 1 ? index - 2 : -1;
            fsId = index;
            index += 4;
            job = index;
            while(!this.pegasusTypeCheck.isJob(path[job]) && job < path.length - 2){
                job += 2;
            }

            jobConn = job + 1;
            next = jobConn < path.length - 1 ? jobConn + 1 : -1;
            nextItem = next < path.length - 2 ? next + 2 : -1;

            if(!fileObject){//This will happen all but first iteration
                fileObject = { 'id': path[fsId], 'name': this._client.getNode(path[fsId]).getAttribute(nodePropertyNames.Attributes.name),
                    'position': this._client.getNode(path[fsId]).getRegistry('position') };
                names = outputNames;
            }
            file = fileObject.id;
            i = -1;//total files and jobs to create in parallel
            pos = [{ 'x': this._client.getNode(path[job]).getRegistry('position').x,
                'y': this._client.getNode(path[job]).getRegistry('position').y }];//input, job, output

            /* * * * * * * * Now process things    * * * * * * * */
            var ofile,
                outputNames = this.pegasusTypeCheck.isFileSet(path[next]) ? this._getFileNames(path[next]) : [],
                nextJob;
            //TODO if path[next] is not a fileset, create one and insert it into the path array

            //Create output names
            if(outputNames.length < count){
                outputNames = names.slice(0);
                while(++i < outputNames.length){
                    var j;
                    if((j = outputNames[i].lastIndexOf(".out")) !== -1){
                        var base = outputNames[i].substr(0, j + 4),
                            c = parseInt(outputNames[i].substr(j + 4)) || 1;

                        outputNames[i] = base + (c + 1);
                    }else{
                        outputNames[i] += '.out';
                    }
                }
            }

            //Create output file
            shift = { 'x': this.dx * (outputNames.length-2)/2, 'y': this.dy * (outputNames.length-2)/2 };

            if(path[next] === undefined)//Make sure we have an output file!
                throw "Operation needs an output file!";

            pos.push({ 'x': this._client.getNode(path[next]).getRegistry('position').x,//FIXME shouldn't be hardcoded
                'y': this._client.getNode(path[next]).getRegistry('position').y });

            pos[1].x = Math.max(0, pos[1].x - shift.x);
            pos[1].y = Math.max(0, pos[1].y - shift.y);

            ofile = this._createFile(dst, outputNames[0], pos[1]);

            //In case we are doing another iteration...
            path[next] = ofile;

            /* * * * * * Job * * * * * */
            //Shift the pos values to roughly center the boxes
            pos[0].x = Math.max(0, pos[0].x - shift.x);
            pos[0].y = Math.max(0, pos[0].y - shift.y);


            //Copy the first job
            var job_node = this._client.getNode(path[job]);

            path[job] = this._createJob(dst, job_node.getAttribute(nodePropertyNames.Attributes.name), job_node.getAttribute('cmd'), pos[0]);


            /* * * * Connections * * * * */
            //file to job
            conns.push(this._createConnection(dst, file, path[job]));

            if(path[nextItem] && !this.pegasusTypeCheck.isFork(path[nextItem])){
                path[nextItem] = this._createPreviewNode(dst, path[nextItem]);
                conns.push(this._createConnection(dst, ofile, path[nextItem]));
            }

            //file to job
            if(jobConn !== -1){
                //Fix JobConn to point to the correct output file
                path[jobConn] = this._createConnection(dst, path[job], ofile);
                conns.push(path[jobConn]);
            }

            //Now I have created the structure to copy; just need to copy it
            // (with extraCopying)

            i = 0;
            while(++i < count){
                var attr = {},
                    position = [ { 'x': pos[0] .x+(i)*dx, 'y': pos[0].y+(i)*dy }, { 'x': pos[1] .x+(i)*dx, 'y': pos[1].y+(i)*dy }],
                    j = conns.length;

                attr[nodePropertyNames.Attributes.name] = outputNames[i];

                this.extraCopying.push({ 'num': 1, 'id': path[job], 'dstId': dst, 'attr': { 'registry': {'position': position[0]} }});
                this.extraCopying.push({ 'num': 1, 'id': ofile, 'dstId': dst, 'attr': { 'attributes': attr, 'registry': {'position': position[1]} }});

                while(j--){
                    //TODO Remove the 'num' attribute - deprecated
                    //Copy the conn(s) for each file copied
                    this.extraCopying.push({ 'num': 1, 'id': conns[j], 'dstId': dst, 'attr': { 'registry': {'position': position[1]} }});
                }
            }

            index = next;
            conns = [];//Clear conns for next run
            fileObject = null;
        } while(nextItem !== -1 && this.pegasusTypeCheck.isFork(path[nextItem]));

        return index+2;
    };

    Pegasus.prototype._processFileSet = function(fsId, dst, prev, next){
        var fileObject = this._createFileFromFileSet(fsId, dst),
            file = fileObject.id,
            names = fileObject.names,
            pos = { 'x': fileObject.position.x, 'y': fileObject.position.y },
            dx = this.dx,//TODO figure out an intelligent way to set these!
            dy = this.dy,
            i = 0,
            conns = [];
        //shift = { 'x': dx * (names.length + 1)/2, 'y': dy * (names.length+1)/2 };

        //Create the first connection (which we will copy)
        if(prev)
            conns.push(this._createConnection(dst, prev, file));

        if(next)
            conns.push(this._createConnection(dst, file, next));

        //Next, we will add these files to be copied
        while(++i < names.length){//FIXME add formatting to make it look nice
            var attr = {},
                position = { 'x': pos.x+(i+1)*dx, 'y': pos.y+(i+1)*dy },
                j = conns.length;

            attr[nodePropertyNames.Attributes.name] = names[i];
            this._addToParams(file, dst, { 'attributes': attr, 'registry': {'position': position} }); //FIXME shouldn't be hardcoded!

            while(j--){
                //Copy the conn(s) for each file copied
                this._addToParams(conns[j], dst);
            }
        }
    };

    Pegasus.prototype._createFileFromFileSet = function(fsId, dst){
        var pos = { 'x': this._client.getNode(fsId).getRegistry('position').x,//FIXME shouldn't be hardcoded
                'y': this._client.getNode(fsId).getRegistry('position').y },
            names = this._getFileNames(fsId),
            name = names[0],
            fileId,
            shift = { 'x': this.dx * (names.length-1)/2, 'y': this.dy * (names.length-1)/2 };//adjust pos by names and dx/dy

        pos.x = Math.max(0, pos.x - shift.x);
        pos.y = Math.max(0, pos.y - shift.y);

        fileId = this._createFile(dst, name, pos);

        return { 'id': fileId, 'name': name, 'names': names, 'position': pos };
    };

    Pegasus.prototype._createConnection = function(dstId, src, dst){
        var baseId = this.pegasusTypes.Preview_Conn,
            connId;

        connId = this._client.createChild({ 'parentId': dstId, 'baseId': baseId });
        this._client.makePointer(connId, CONSTANTS.POINTER_SOURCE, src);
        this._client.makePointer(connId, CONSTANTS.POINTER_TARGET, dst);
        return connId;
    };

    Pegasus.prototype._createPreviewNode = function(dst, id){
        //Creates the Preview_File/Job
        var node = this._client.getNode(id),
            name = node.getAttribute(nodePropertyNames.Attributes.name),
            pos = node.getRegistry('position');

        if(this.pegasusTypeCheck.isFile(id)){

            id = this._createFile(dst, name, pos);

        }else {//if(this.pegasusTypeCheck.isJob(id)){

            var cmd = node.getAttribute('cmd') || "MACRO";
            id = this._createJob(dst, name, cmd, pos);

        }

        return id;
    };

    Pegasus.prototype._createFile = function(dstId, name, pos){
        //Create a file type only viewable in the "Preview" aspect: Preview_File
        var baseId = this._metaHash['Preview_Job'],
            fileId;

        fileId = this._client.createChild({ 'parentId': dstId, 'baseId': baseId });

        this._client.setAttributes(fileId, nodePropertyNames.Attributes.name, name || "File_1");//Set name
        this._client.setRegistry(fileId, 'position', pos);//Set position

        return fileId;
    };

    Pegasus.prototype._createJob = function(dstId, name, cmd, pos){
        //Create a file type only viewable in the "Preview" aspect: Preview_File
        var baseId = this._metaHash['Preview_Job'],
            jobId;

        jobId = this._client.createChild({ 'parentId': dstId, 'baseId': baseId });

        this._client.setAttributes(jobId, nodePropertyNames.Attributes.name, name);//Set name
        this._client.setAttributes(jobId, 'cmd', cmd);//Set name
        this._client.setRegistry(jobId, 'position', pos);//Set position

        return jobId;
    };

    Pegasus.prototype._getFileNames = function(fsId){//FileSet node
        var fs = this._nodes[fsId],
            filenames = this.core.getAttribute(fs,'filenames'),
            names = [],
            k = filenames.indexOf('['),
            basename = filenames.slice(0,k) + "%COUNT" + filenames.slice(filenames.lastIndexOf(']')+1),
            i = filenames.slice(k+1),
            j;//Only supports one set of numbered input for now

        j = parseInt(i.slice(i.indexOf('-')+1, i.indexOf(']')));
        i = parseInt(i.slice(0,i.indexOf('-')));

        k = Math.max(i,j);
        i = Math.min(i,j)-1;

        while(i++ < j){
            names.push(basename.replace("%COUNT", i));
        }

        return names;
    };

    Pegasus.prototype._addToParams = function(nodeId, dstId, attr){
        var k = -1;

        while(++k < this.params.length && (this.params[k].parentId !== dstId || this.params[k][nodeId]));

        if(k === this.params.length || this.params[k][nodeId]){
            this.params.push({ 'parentId': dstId });
            k = this.params.length - 1;
        }

        this.params[k][nodeId] = attr || {};
        return true;
    };

    Pegasus.prototype._correctConnections = function(parentId){
        var nodeIds = this._client.getNode(parentId).getChildrenIds();

        while(nodeIds.length){
            var nodeId = nodeIds.splice(0, 1)[0],
                node = this._client.getNode(nodeId);

            if(node.getPointerNames().indexOf(CONSTANTS.POINTER_SOURCE) === -1)//Is it a type of connection?
                continue;

            var src = node.getPointer(CONSTANTS.POINTER_SOURCE).to,
                dst = node.getPointer(CONSTANTS.POINTER_TARGET).to;

            if(!this._isContainedBy(src, parentId))//Then points to something in another project
                this._client.makePointer(nodeId, CONSTANTS.POINTER_SOURCE, this.original2copy[parentId][src]);

            if(!this._isContainedBy(dst, parentId))//Then points to something in another project
                this._client.makePointer(nodeId, CONSTANTS.POINTER_TARGET, this.original2copy[parentId][dst]);
        }
    };

    Pegasus.prototype._isContainedBy = function(id, parentId){
        return id.indexOf(parentId) === 0;
    };

    Pegasus.prototype.stop = function(error){
        //TODO setting a proper result object
        this._originalCallback(error,this.result);
    };
    Pegasus.prototype.main = function(callback){
        this._originalCallback = callback; //save for the stop function
        var self = this,
            dstId = this.core.getPAth(this.activeNode);
        self._loadObjectsAndMeta(function(){
            var childrenPaths = self._clearPreview();
            //we could save here, but noooo we do not really want to

        },self.stop);
    };
    return Pegasus;
});