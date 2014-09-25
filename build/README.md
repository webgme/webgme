
# Generated modules

## webgme.classes.build

This module offers our main classes to build a specialized web-site.

   * Client: this is the class which is able to communicate with the webGME server to handle the following operations:
      * project manipulations (create/delete/list/open projects)
      * branch manipulations (create/delete/list/open branches)
      * model manipulations (create/move/delete/modify/check nodes of projects)
      * eventing (for project/branch updates)
   * BlobClient: this class offers connection to the webgme server's blob storage and can handle blob operations
   
# Building guidelines

## webgme.classes.build   

   * !!! webgme.classes.build.js is currently not generated automatically so please whenever you make update to the webgme project, recreate it !!!
   * The makefile to build webgme.classes.build.js is build\cbuild.js. To build you have to use the requirejs's optimizer with the cbuild.js make file.
```
    //windows example executing from build directory
    C:...\build> node ..\node_modules\requirejs\bin\r.js -o cbuild.js
```
```    
    //linux example executing from build directory
    .../build> node ../node_modules/requirejs/requirejs.js -o cbuild.js
```    
   * Please note that in some cases you may also update the cbuild.js (with the new paths for example).
   * To provide a new class through this module you have to update webgme.classes.js module

