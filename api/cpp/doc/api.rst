API Reference
=============

The ``webgme`` Namespace
------------------------

The ``webgme`` namespace contains internal utility functions that are used to access object attributes and call JavaScript
functions. All function calls are made via the TASYNC library using the call_sync method. This method is implemented
using **node-fibers** and gives us the ability to "block" on function calls without blocking the entire V8 thread. The
utility functions available in this namespace are not to be used directly; rather, higher level abstractions have been
created that ease the invocation of JavaScript methods and access of object attributes. The namespace contains two
global variables, common and tasync. These variables are initialized once at the beginning of the interpreter
invocation.

.. cpp:namespace:: webgme

.. cpp:member:: static Persistent <Object> common

    A presistent object that is assigned to the JavaScript library COMMON. The COMMON library is used to make database
    and project related calls. Apart from being a convenience, the library also wraps its calls with TASYNC.wrap so that
    calls return a future instead of expecting a callback function. This mechanism is important in our implementation of
    synchronous calls because all calls are expected to return real or future values and not have callbacks.

.. cpp:member:: static Persistent <Object> tasync

    A presistent object that is assigned to the JavaScript library TASYNC. This library is used to make all function
    calls into JavaScript and is the building block of the synchronous call mechanism.

.. cpp:function:: void webgme::Initialize(Handle<Value> com, Handle<Value> tas)

    Initialize the Initialize global variables common and tasync if they haven't already been initialized.

    :param Handle<Value> com: COMMON object
    :param Handle<Value> tas: TASYNC object
    
.. cpp:function:: Handle<Value> webgme::GetObjectAttr(Handle<Value> object, const char * attr)

    Convenience function to return an object's attribute. It is an JavaScript equivalent of:

    .. code-block:: javascript

            return object.attr;
 
    :param Handle<Value> object: Any JavaScript object (i.e. it can't be a JavaScript primitive like int)
    :param const char* attr: A string representing the attribute name
    :returns: The object attribute

.. cpp:function:: Handle<Function> GetObjectMethod(Handle<Value> object, const char * attr)

    Convenience function to return an object's attribute cast as a ``Function``. It is a JavaScript equivalent of:

    .. code-block:: javascript

            return object.attr;

    :param Handle<Value> object: Any JavaScript object
    :param const char* attr: A string representing the attribute name
    :returns: The JavaScript function object

.. cpp:function:: Handle<Value> webgme::CallTasyncMethod(Handle<Function> method, const unsigned int argc = 0, Handle<Value> argv[] = NULL, Handle<Value> object = Null())

    Uses the global TASYNC object to make calls into JavaScript. The ``method`` argument must be a JavaScript callable.
    This is a JavaScript equivalent of:

    .. code-block:: javascript

            return TASYNC.call_sync(method, arg0, arg1, arg2,...,argn, object);

    This is the most important function in this namespace as it establishes a common calling mechanism for all calls
    into JavaScript while at the same time providing the synchronous call mechanism we desire. Since it calls a function
    which then calls another function, the implementation of this function entails creating a new array and populating
    the arguments in the proper order. Namely, the first argument of the new array is the ``method``. This is followed
    by the arguments for the ``method``. Finally, the ``object`` is included in case the ``method`` needs to be bound
    this ``object``.

    :param Handle<Value> method: The method to be called using TASYNC
    :param const unsigned int argc = 0: Number of arguments
    :param Handle<Value> argv[] = NULL: Array of arguments
    :param Handle<Value> object = Null(): Object to which method is bound
    :returns: return value of the JavaScript function call

.. cpp:function:: Handle<Value> CallCommonMethod(const char * method, const unsigned int argc = 0, Handle<Value> argv[] = NULL)

    Call a member method of the COMMON library.

    :param const char * method: Name of the method
    :param const unsigned int argc = 0: Number of arguments
    :param Handle<Value> argv[] = NULL: Array of arguments
    :returns: return value of the JavaScript function call

.. cpp:function:: Handle<Value> CallObjectMethod(Handle<Value> object, const char * method, const unsigned int argc = 0, Handle<Value> argv[] = NULL)

    Call a member method of any JavaScript object.

    :param Handle<Value> object: Object that contains the method to be called
    :param const char * method: Name of the method
    :param const unsigned int argc = 0: Number of arguments
    :param Handle<Value> argv[] = NULL: Array of arguments
    :returns: return value of the JavaScript function call

ObjectMap and FunctonMap
------------------------

.. cpp:class:: webgme::ObjectMap

   The ``ObjectMap`` class emulates a hash/map of all available JavaScript attributes of an object so these attributes
   can be accessed from C++ conveniently. It is meant to simplify the convoluted way of accessing a member variable in
   V8. A code comparison is presented for motivation:

   The normal V8 way:

   .. code-block:: c++

        Handle<Value> object = arg; // Assume object is passed in as an argument
        Handle<String> key1 = String::New("foo");
        object->ToObject()->Get(key);
        Handle<String> key2 = String::New("baz");
        object->ToObject()->Get(key);


   Using ObjectMap:

   .. code-block:: c++

        ObjectMap object(arg); // Assume object is passed in as an argument
        object["foo"];
        object["baz"];

.. cpp:member:: Persistent<Object> ObjectMap::object_

    Member variable to hold the object that contains methods of interest. This object is assigned when the constructor
    of this class is called.

.. cpp:function:: Handle<Value> webgme::ObjectMap::operator[](const char* key) const

    Overrides the ``[]`` operator so that object attributes can be accessed conveniently. 

    :param const char* key: The member attribute identifier
    :returns: The object attribute

.. cpp:class:: webgme::TasyncCallable

    A wrapper for JavaScript functions that serves to make function calls more natural to C++ users. The utility of this
    wrapper is demonstrated with an example in which a JavaScript function with two arguments is called via TASYNC from C++.

    The normal V8 way:

    .. code-block:: c++

        Handle<Object> node = arg; // Assume the object arg is passed in as an argument
        Handle<Function> foo = Handle<Function>::Cast(node->Get(String::New("foo")));
        const unsigned int argc=2;
        Handle<Value> argv[argc] = {String::New("bar"), String::New("buz")};
        WebGME::CallTasyncMethod(foo, argc, argv, node);

     Using TasyncCallable wrapper:

    .. code-block:: c++

        TasyncCallable foo(arg,"foo"); // Assume the object arg is passed in as an argument
        foo(String::New("bar"), String::New("buz"));

.. cpp:function:: webgme::TasyncCallable::TasyncCallable (Handle<Value> o, const char* key)

    Constructor that creates a function object using the passed in object ``o`` and the member function identifier ``key``

    :param Handle<Value> o: The object that contains the member function of interest
    :param const char* key: The member function identifier

.. cpp:member:: Persistent<Function> func_

    Persistent function object to hold the function object identified by the object ``o`` and identifier ``key``. 

.. cpp:function:: Handle<Value> webgme::TasyncCallable::Call(const unsigned int argc = 0,Handle<Value> argv[] = NULL)

    Method that makes the JavaScript call using TASYNC and the given arguments. The signature of this function follows
    the conventional way of calling JavaScript functions in V8 where an array of arguments and the length of the array
    as passed as arguments to ``Call``.

    :param const unsigned int argc = 0: Number of arguments
    :param Handle<Value> argv[] = NULL: Array of arguments
    :returns: return value of the JavaScript function call

.. cpp:function:: Handle<Value> webgme::TasyncCallable::CallVar(...)

.. cpp:function:: Handle<Value> webgme::TasyncCallable::operator()(...)

    Method that makes the JavaScript call using TASYNC and the given arguments. The signature of this function follows
    the natural way of calling functions in C++. It takes a variable number of arguments and creates the necessary
    argument arrays for subsequent calls to TASYNC. 

    .. note:: The function uses variadic templates, a feature of C++0x or later.  If the available compiler does not support variadic templates, the regular ``Call`` method can be used instead.

    :param A...args: Arguments of possibly different types
    :returns: return value of the JavaScript function call


.. cpp:class webgme::FunctionMap

    This is a small subclass of ``ObjectMap`` that assumes that all attributes accessed using the ``[]`` operator are
    methods. Thus, the ``[]`` operator returns them as ``TasyncCallables``. This leads to method access and calls that
    look like the following:

   .. code-block:: c++

        FunctionMap fmap(arg); // Assume object is passed in as an argument
        fmap["foo"](String::New("bar"), String::New("buz"));

.. cpp:function:: Handle<Value> webgme::FunctionMap::operator[](const char* key) const

    Same as the ``[]`` operator in ObjectMap but the returns value is wrapped with TasyncCallable

    :param const char* key: The member function identifier
    :returns: The member function object wrapped in a TasyncCallable
