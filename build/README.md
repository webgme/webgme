
# Generated modules

## client.build.js

   * this module can be used as a single entry library which will define the 'WebGMEGlobal' global vairables. Then you can use classes from WebGMEGlobal.classes
   * class Client will create a webgme client object which then can be used as a connection towards the webgme server
   * class BlobClient create a blob client object which can be used to communicate with the blob server associated with the webgme server

# Building guidelines

## client.build.js   

   * !!! client.build.js is currently not generated automatically so please whenever you make update to the webgme project, recreate it !!!
   * The makefile to build client.build.js is build\clientbuilder.js. To build you have to use the requirejs's optimizer with the clientbuilder.js make file.
```
    //windows example executing from build directory
    C:...\build> node ..\node_modules\requirejs\bin\r.js -o clientbuilder.js
```
```    
    //linux example executing from build directory
    .../build> node ../node_modules/requirejs/requirejs.js -o clientbuilder.js
```    
   * Please note that in some cases you may also update the clientbuilder.js (with the new paths for example).
   * You should also add new modules into the makefile to propagate new classes

