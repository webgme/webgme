Writing an Interpreter in C++
=============================

Requirements
------------

Writing a WebGME interpreter in C++ requires a good knowledge of node, V8, and JavaScript. At the very least, one has to
know about V8's memory management system in order to use JavaScript objects in C++ via Handles. The best reference is
the `v8 embedders guide`_. In addition, none of the JavaScript API for WebGME is documenter here. Since the C++ API
merely exposes the JavaScript interface in C++, using it without knowing the JavaScript API is impossible.

Development Setup
-----------------

Writing a WebGME interpreter in C++ currently involves installing necessary dependencies and modifying part of the
interpreter API The API files are part of the webgme installation and can be found in ``api/cpp`` directory. 

Dependencies required to build an interpreter are ``node``, ``npm``, ``node-gyp``, ``g++``, and ``make``. These tools need to be
installed on the system prior to building an interpreter. ``Node`` can be installed from a distro repository or from
source. The C++ interpreter API was tested against Node v0.10.0 so earlier versions are not recommended.

JavaScript module dependencies are listed in ``package.json`` and can be installed
using::

    $ npm install

Building the interpreter is accomplished by invoking ``node-gyp`` with a ``rebuild`` argument::
    
    $ node-gyp rebuild

There are two modes of development for C++ interpreters:

* **C++ interpreter inside webgme development tree**: This mode of development lends itself well for developing the C++
  interpreter while working on other parts of webgme code. This mode is more relevant to webgme developers who will have
  checked out webgme from the git repository. In this mode, development can be done in the ``api/cpp`` directory and
  changes to webgme will be immediately available to the C++ interpreter.

* **Standalone C++ interpreter**: In this mode, the C++ interpreter can be written anywhere as long as the necessary
  dependencies are met. The dependencies can be installed using ``npm`` and a corresponding ``package.json`` file
  listing all dependencies. This mode of development will be probably be the norm once the C++ API is integrated into
  the mainline webgme code. At this time, however, it requires too much manual labor.






Interpreter Essentials
----------------------

The entry point for user interpreters is ``Interpreter::InvokeEx``, which is found in ``Interpreter.cc``. The skeleton
for this function is the following:

.. code-block:: c++

    Handle<Value> Interpreter::InvokeEx(const Arguments& args){
      HandleScope scope;

      Interpreter* obj = ObjectWrap::Unwrap<Interpreter>(args.This());
      FunctionMap& project = obj->project_;
      FunctionMap& core = obj->core_;

      return scope.Close(Undefined());
    }

The line, ``HandleScope scope``, should always be present because it is what v8 uses for its garbage collection. Using
this object, v8 keeps track of all non-persistent Handles created in subsequent parts of the function and will be
garbage collect them when they go out of scope. The ``return`` statement at the end of the function can be used to
return values other than ``Undefined()``. At this time, this return value will not be used anywhere else in the system
so it is fine to just leave it as is. 

The remaining lines of the code, shown here again for clarity, are used to expose the JavaScript objects ``project`` and
``core``. These two objects are obtained from JavaScript automatically when the interpreter is initialized. In this
code, we are merely assigning references for ease of use. 

.. code-block:: c++

      Interpreter* obj = ObjectWrap::Unwrap<Interpreter>(args.This());
      FunctionMap& project = obj->project_;
      FunctionMap& core = obj->core_;

As explained in the :doc:`api`, FunctionMaps and ObjectMaps are used to call and access object methods and attributes
respectively. For example, the JavaScript object ``project`` has a method called ``getBranchHash``. This function can be
called from C++ (with appropriate arguments) as such:

.. code-block:: c++

      project["getBranchHash"](arg1,arg2);

.. note:: JavaScript method arguments have to properly converted into objects expected by the JavaScript method. That is, PODs
   such as ``int`` cannot be directly passed as arguments. Instead, they have to be converted into v8's representation
   of the POD. To pass an ``int``, a new object has to be created with ``Integer::New()``.

Alternatively, if the JavaScript method of interest is going to be used repeatedly, a reference to the function can be
assigned in the form of a ``TasyncCallable``:
.. code-block:: c++

      TasyncCallable getBranchHash = project["getBranchHash"];
      getBranchHash(arg1,arg2);

Example
--------------------

The following example recursively prints out the names of all objects in a given WebGME project.

.. code-block:: c++

    void PrintRecursive(const FunctionMap& core, Handle<Value> node, int indent){
  
      Handle<Array> children = Handle<Array>::Cast(core["loadChildren"](node));

      if(children->Length() > 0){
        for(int j=0; j < indent; j++) std::cout << "\t";
        std::cout << "Children length: " << children->Length() << std::endl;
      }

      for(unsigned int i=0; i < children->Length(); i++){
        Handle<Value> name = core["getAttribute"](children->Get(i), String::New("name"));
        for(int j=0; j < indent; j++) std::cout << "\t";
        std::cout << name << std::endl;
        PrintRecursive(core,children->Get(i), indent+1);
      }
    }

    Handle<Value> Interpreter::InvokeEx(const Arguments& args){
      HandleScope scope;
      CERR << std::endl;

      Interpreter* obj = ObjectWrap::Unwrap<Interpreter>(args.This());
      FunctionMap& project = obj->project_;
      FunctionMap& core = obj->core_;

      Handle<Value> hash = project["getBranchHash"](String::New("master"), Null());

      CERR << "Hash: " << hash << std::endl;

      ObjectMap commit(project["loadObject"](hash));
      Handle<Value> root = core["loadRoot"](commit["root"]);
      PrintRecursive(core, root,0);


      return scope.Close(Undefined());
    }

Since the interpreter uses the ``Common`` library, it inherits all the configuration and command line argument
capabilities of the library. Thus, arguments specifying database connection as well as project selection (--proj) can be passed
on the command line. The ``bin/config.js`` file can also be used to configure these settings.

To run the example using a direct mongodb connection::

    $ node-gyp rebuild
    $ node init.js

.. tip:: If the ``package.json`` file is setup to refer to ``init.js``, the last line of the code above can be ``$ node ./``

To run it with a socketio connection::

    $ node-gyp rebuild
    $ node init.js --socketio host port

Where the host and port arguments specify where the WebGME server is running.

Sample output::

    $ node ./
    Opening mongo database multi on 127.0.0.1:27017
    Opening project test
    ../Interpreter.cc:33:InvokeEx():
    ../Interpreter.cc:43:InvokeEx(): Hash: #eb6c4a9e2f6de71a20f7270a8cc3a050794fca8a
    Children length: 12
    Test
            Children length: 5
            MODEL_2
            MODEL_3
            MODEL_4
            MODEL_0
            MODEL_1
    MODEL_3->MODEL_5
    MODEL_1->MODEL_0
    MODEL_2
    MODEL_3
    MODEL_4
    MODEL_5
    MODEL_6
    MODEL_1
    MODEL_4->MODEL_5
    MODEL_3->MODEL_6
    MODEL_4->MODEL_2
    Closing project
    Closing database

.. _v8 embedders guide: https://developers.google.com/v8/embed

