#ifndef WEBGME_H__
#define WEBGME_H__

#include <node.h>
#include <iostream>

using namespace v8;
/**
 * @author: Addisu Z. Taddese
 * @date: 11/14/2013
 */

namespace webgme {

  static Persistent <Object> common;
  static Persistent <Object> tasync;

  //WebGME(){}

  /**
   * Initialize the common and tasync objects if they are not empty
   */
  void Initialize(Handle<Value> com, Handle<Value> tas){
    if(common.IsEmpty()){
      common = Persistent<Object>::New(com->ToObject());
    }
    if(tasync.IsEmpty()){
      tasync = Persistent<Object>::New(tas->ToObject());
    }

  }
  inline Handle<Value> GetObjectAttr(Handle<Value> object, const char * attr){
    HandleScope scope;
    return scope.Close(object->ToObject()->Get(String::New(attr)));
  }

  inline Handle<Function> GetObjectMethod(Handle<Value> object, const char * attr){
    HandleScope scope;
    return scope.Close(Handle<Function>::Cast(object->ToObject()->Get(String::New(attr))));
  }

  Handle<Value> CallTasyncMethod(Handle<Function> method, const unsigned int argc = 0, 
      Handle<Value> argv[] = NULL, Handle<Value> object = Null()){
    HandleScope scope;
    //// create a new array of arguments, with the first argument as the function.
    const unsigned int new_argc = argc+2;
    //Handle<Value> new_argv[new_argc] ;
    Handle<Value>* new_argv = new Handle<Value>[new_argc];
    new_argv[0] = method;
    for(unsigned int i=0; i < argc; i++){
      new_argv[i+1] = argv[i];
    }
    new_argv[new_argc-1] = object;
    Handle<Value> rc = node::MakeCallback(tasync, "call_sync", new_argc, new_argv);
    delete[] new_argv;
    return scope.Close(rc);
  }

  Handle<Value> CallCommonMethod(const char * method, const unsigned int argc = 0, Handle<Value> argv[] = NULL){
    HandleScope scope;
    //CERR << "Calling: " << method << ", argc: " << argc << std::endl;
    Local<Function> func = Local<Function>::Cast(common->Get(String::New(method)));
    return scope.Close(CallTasyncMethod(func, argc, argv));
  }

  Handle<Value> CallObjectMethod(Handle<Value> object, const char * method, const unsigned int argc = 0, Handle<Value> argv[] = NULL){
    HandleScope scope;
    //CERR << "Calling: " << method << ", argc: " << argc << std::endl;
    Handle<Function> func = GetObjectMethod(object, method);
    return scope.Close(CallTasyncMethod(func, argc, argv, object));

  }
}
#endif /* end of include guard: WEBGME_H__ */
