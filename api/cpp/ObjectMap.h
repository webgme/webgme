#ifndef OBJECTMAP__H__
#define OBJECTMAP__H__

/**
 * @author: Addisu Z. Taddese
 * @date: 11/14/2013
 */

#include <node.h>
#include "debug.h"
#include "WebGME.h"

using namespace v8;

namespace WebGME = webgme;

namespace webgme {
  /**
   * Create a hash/map of all available javascript methods of an object so object_ these methods can be called from C++
   * conveniently. The Call method of this class looks for a javascript method with a name 'method_name' in the underlying
   * map. If found, this javascript method will be called using a synchronous calling method utilizing Tasync. The
   * class overloads the () operator to provide the same functionality as the Call method.
   */
  class ObjectMap {
    public:
      /**
       * Build map of all available javascript methods of the object
       */
      ObjectMap (Handle<Value> o){
        HandleScope scope;
        object_ = Persistent<Object>::New(o->ToObject());
        //CERR << "Created ObjectMap: " << object_->GetIdentityHash() << " Address: " << reinterpret_cast<void*>(*object_) << std::endl;
      }
      virtual ~ObjectMap (){
        //CERR << "Disposing ObjectMap: " << object_->GetIdentityHash()<< " Address: " << reinterpret_cast<void*>(*object_) << std::endl;
        object_.Dispose();
      };

      Handle<Value> operator[](const char* key){
        HandleScope scope;
        return scope.Close(object_->Get(String::New(key)));
      }

      Handle<Object> GetObject(){
        return object_;
      }

    protected:
      Persistent<Object> object_;
  };

  /**
   * TasyncCallable encapsulates javascript functions so that they can be called in a convenient manner
   */
  class TasyncCallable: public ObjectMap{
    public:

      TasyncCallable (Handle<Value> o, const char* key):ObjectMap(o){
        func_ = Persistent<Function>::New(Handle<Function>::Cast(o->ToObject()->Get(String::New(key))));
      }

      Handle<Value> Call(const unsigned int argc = 0,
          Handle<Value> argv[] = NULL){

        HandleScope scope;
        return scope.Close(WebGME::CallTasyncMethod(func_, argc, argv, object_));
      }

      /*
       * Reference for variable argument/template packs
       * http:pic.dhe.ibm.com/infocenter/lnxpcomp/v111v131/index.jsp?topic=%2Fcom.ibm.xlcpp111.linux.doc%2Flanguage_ref%2Fvariadic_templates.html
       * http://en.cppreference.com/w/cpp/language/parameter_pack
       */
      template<class...A>
      Handle<Value> CallVar(A...args){
        HandleScope scope;
        //CERR << "Calling func on: " << object_->GetIdentityHash() << std::endl;
        //CERR << "Calling func on: " << reinterpret_cast<void*>(*object_) << std::endl;
        const int argc = sizeof...(args);
        Handle<Value> argv[argc] = {args...};
        return scope.Close(WebGME::CallTasyncMethod(func_, argc, argv, object_));
      }

      /**
       * Operator () override
       */
      template<class...A>
      Handle<Value> operator()(A...args){
        return CallVar(args...);
      }

    protected:
      Persistent<Function> func_;
  };


  /**
   * Assumes that object properties accessed using the [] operator are functions and so it wraps them with
   * TasyncCallable and returns them
   */
  class FunctionMap: public ObjectMap
  {
    public:
      FunctionMap (Handle<Value> o):ObjectMap(o){
        //CERR << o->ToString() << " Hash: " << object_->GetIdentityHash() << std::endl;
      }
      TasyncCallable operator[](const char* key){
        //return TasyncCallable(object_->Get(String::New(key)));
        return TasyncCallable(object_, key);
      }
  };

}

#endif /* end of include guard: OBJECTMAP__H__ */
