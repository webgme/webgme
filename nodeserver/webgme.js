var httpserver = require('http').createServer(httpGet)
, io = require('socket.io').listen(httpserver)
, fs = require('fs')
, st = require('./storage.js')
, sh = require('./lib/sha1.js')


httpserver.listen(8081);
var storage = new st.Storage();
console.log("started");

function httpGet(req, res){
	console.log("httpGet - start - "+req.url);
	if(req.url==='/'){
		req.url = '/index.html';
	}
	fs.readFile(__dirname+req.url, function(err,data){
		if(err){
			res.writeHead(500);
			return res.end('Error loading ' + req.url);
		}
		if(req.url.indexOf('.js')>0){
			console.log("sending back js :"+req.url);
			res.writeHead(200, {
  				'Content-Length': data.length,
  				'Content-Type': 'application/x-javascript' });

		}
		else{
			res.writeHead(200);
		}
		res.end(data);
	});	
};

io.sockets.on('connection', function(socket){
	console.log("someone connected");
	socket.emit('connected', undefined);
	socket.on('msg', function(data){
		console.log("got request:"+data);
		var response = {}; response.sequence = 0; response.commits=[];
		var request = JSON.parse(data);
		var commits = request.commits;
		var balance = 0;
		var handled = 0;
		response.sequence = request.sequence;
		for(var i in commits){
			balance++;
			if(commits[i].object==undefined){
				/*read request*/
				storage.get(commits[i].hash, function(result){
					if(result!=undefined){
						/*if(commits[i].hash=="root"){
							storage.get(result, function(rootres){
								balance--;handled++;
								if(rootres!=undefined){
									var resobj = {}; resobj.hash = result; resobj.object = rootres;
									response.commits.push(resobj);
								}
								if(balance==0 && handled>=commits.length){
									socket.emit('msg', JSON.stringify(response));
								}											
							});
							var rootobj = {}; rootobj.hash = commits[i].hash; rootobj.object = result;
							response.commits.push(rootobj);
						}
						else*/{
							balance--;handled++;
							var resobj = {}; resobj.hash = commits[i].hash;resobj.object=result;
							response.commits.push(resobj);
						}
					}
					
					if(balance==0 && handled>=commits.length){
						console.log("kecso2 "+balance);
						socket.emit('msg', JSON.stringify(response));
					}
				});
			}
			else{
				/*write operation*/
				storage.put(commits[i].hash,commits[i].object,function(){
					balance--;handled++;
					if(balance==0 && handled>=commits.length){
						socket.emit('msg', JSON.stringify(response));
					}
				});					
			}
		}
		//console.log("sending response: "+ JSON.stringify(response));
		if(balance==0 && handled>=commits.length){
			socket.emit('msg', JSON.stringify(response));
		};
	});
	socket.on('close',function(){
		console.log("connection closed");
	});
});
