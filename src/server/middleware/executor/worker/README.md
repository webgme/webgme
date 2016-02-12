Executing Simulation Jobs on the WebGME Server - Executor Setup

While the ability provided by WebGME to edit and easily share models is extremely useful in collaborative design, another crucial part of the design process is evaluating alternative designs, sometimes using simulations.

WebGME supports "remote" execution of simulation "jobs" through the use of a Node-Webkit application.

The executor_worker application runs jobs posted to `src/middleware/executor`. For example, some WebGME plugins create jobs. An executor_worker runs jobs by downloading a blob from the WebGME server, then running a command, then uploading some or all of the produced files to the blob store.

We can set up the "executor_worker" using node-webkit, and configure it to monitor our WebGME server's URL for jobs. The executor_worker may run on a different machine than the WebGME server, but in this example they run on the same machine.

When a job is created on the server, the executor will download the job, run it, and then upload any results to the WebGME server. Here is how to set up the executor:

On Windows
==========
1) Download node-webkit (http://dl.nwjs.io/v0.9.2/node-webkit-v0.9.2-win-ia32.zip) and unzip the package in "C:\Users\Public\Documents\META Documents\WebGME\src\middleware\executor\worker"

3) Edit "config_example.json" to point to the WebGME URL (e.g, http://localhost:8855/) and save it as "config.json"

4) Run `npm_install.cmd`

5) With the WebGME server running, double-click on `nw.exe`.

On Mac OSX
==========
1) Checkout this repository and navigate to this folder.

2) Visit http://nwjs.io/ download node webkit and give permission to the nwjs to execute

3) Edit "config_example.json" to point to the WebGME URL (e.g, http://localhost:8855/) and save it as "config.json"

4) `npm install`

5) '~/Downloads/nwjs-v0.12.3-osx-x64/nwjs.app/Contents/MacOS/nwjs .`
