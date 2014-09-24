# Generate built release here
client.build.js:
   * this module can be used as a single entry library which will define the 'WebGMEGlobal' global vairables. Then you can use classes from WebGMEGlobal.classes
   * class Client will create a webgme client object which then can be used as a connection towards the webgme server
   * class BlobClient create a blob client object which can be used to communicate with the blob server associated with the webgme server
   
   !!! client.build.js is currently not generated automatically so please whenever you make update to the webgme project, recreate it !!!
building client.build.js:
here is a script called clientbuilder.js in the build folder. To build you have to use the requirejs's optimizer with the clientbuilder.js make file. an example is "node pathToRequirejs\r.js -o clientbuilder.js". Please noe that in some cases you may also update the clientbuilder.js (with the new paths...).

