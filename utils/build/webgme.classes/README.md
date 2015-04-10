# Building guidelines

## webgme.classes.build   

   * !!! webgme.classes.build.js is currently not generated automatically so please whenever you make update to the webgme project, recreate it !!!
   * The makefile to build webgme.classes.build.js is build\cbuild.js. To build you have to use the requirejs's optimizer with the cbuild.js make file.
```
    //example executing from build directory - works on 
    node ./node_modules/requirejs/bin/r.js -o ./utils/build/webgme.classes/cbuild.js
```
   * Please note that in some cases you may also update the cbuild.js (with the new paths for example).
   * To provide a new class through this module you have to update webgme.classes.js module

 