#ifndef INTERPRETER_H__
#define INTERPRETER_H__

/**
 * @author: Addisu Z. Taddese
 * @date: 11/14/2013
 */

#include <node.h>
#include "ObjectMap.h"

using namespace v8;
using namespace webgme;

class Interpreter: public node::ObjectWrap {
  public:

    static void Init(Handle<Object> target) {
      // Prepare constructor template
      //CERR << std::endl;
      Local<FunctionTemplate> tpl = FunctionTemplate::New(New);
      tpl->SetClassName(String::NewSymbol("Interpreter"));
      tpl->InstanceTemplate()->SetInternalFieldCount(1);
      // Prototype
      NODE_SET_PROTOTYPE_METHOD(tpl, "invokeEx", InvokeEx);

      Persistent<Function> constructor = Persistent<Function>::New(tpl->GetFunction());
      target->Set(String::NewSymbol("Interpreter"), constructor);
    }



  private:
    static Handle<Value> New(const Arguments& args){
      HandleScope scope;

      WebGME::Initialize(args[0], args[1]);

      Handle<Value> p = WebGME::CallCommonMethod("getProject");
      Handle<Value> c = WebGME::CallCommonMethod("getCore");

      Interpreter* intrp= new Interpreter(p,c);
      intrp->Wrap(args.This());

      return args.This();
    }

    static Handle<Value> InvokeEx(const Arguments& args);
    //Interpreter(const FunctionMap& p, const FunctionMap& c);
    Interpreter(Handle<Value> p, Handle<Value> c):project_(p),core_(c){
    }
    ~Interpreter(){};

    // Variables
    FunctionMap project_;
    FunctionMap core_;
};

#endif /* end of include guard: INTERPRETER_H__ */
