.. webgme node.js to C++ bridge documentation master file, created by
   sphinx-quickstart on Tue Dec 10 15:24:00 2013.
   You can adapt this file completely to your liking, but it should at least
   contain the root `toctree` directive.

WebGME node.js to C++ bridge: Documentation
===========================================

.. toctree::
   :maxdepth: 2

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
invokation.

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

.. cpp:function:: Handle<Function> GetObjectMethod(Handle<Value> object, const char * attr)

    Convenience function to return an object's attribute cast as a ``Function``. It is a JavaScript equivalent of:

    .. code-block:: javascript

            return object.attr;

    :param Handle<Value> object: Any JavaScript object
    :param const char* attr: A string representing the attribute name

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

.. cpp:function:: Handle<Value> CallCommonMethod(const char * method, const unsigned int argc = 0, Handle<Value> argv[] = NULL)

    Call a member method of the COMMON library.

    :param const char * method: Name of the method
    :param const unsigned int argc = 0: Number of arguments
    :param Handle<Value> argv[] = NULL: Array of arguments

.. cpp:function:: Handle<Value> CallObjectMethod(Handle<Value> object, const char * method, const unsigned int argc = 0, Handle<Value> argv[] = NULL)

    Call a member method of any JavaScript object.

    :param Handle<Value> object: Object that contains the method to be called
    :param const char * method: Name of the method
    :param const unsigned int argc = 0: Number of arguments
    :param Handle<Value> argv[] = NULL: Array of arguments

Indices and tables
==================

* :ref:`genindex`
* :ref:`modindex`
* :ref:`search`

