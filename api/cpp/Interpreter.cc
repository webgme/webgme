#include <node.h>
#include <map>
#include <string>
#include <iostream>
#include "Interpreter.h"
#include "ObjectMap.h"
#include "WebGME.h"
#include "debug.h"

using namespace v8;
using namespace webgme;
namespace WebGME = webgme;


//Interpreter::Interpreter(const FunctionMap& p, const FunctionMap& c):project_(p),core_(c){
Interpreter::Interpreter(Handle<Value> p, Handle<Value> c):project_(p),core_(c){

}

void Interpreter::Init(Handle<Object> target) {
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

Handle<Value> Interpreter::New(const Arguments& args) {
  HandleScope scope;

  WebGME::Initialize(args[0], args[1]);

  Handle<Value> p = WebGME::CallCommonMethod("getProject");
  Handle<Value> c = WebGME::CallCommonMethod("getCore");

  Interpreter* intrp= new Interpreter(p,c);
  intrp->Wrap(args.This());

  return args.This();
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

  Handle<Array> children = Handle<Array>::Cast(core["loadChildren"](root));

  CERR << "Children length: " << children->Length() << std::endl;

  for(unsigned int i=0; i < children->Length(); i++){
    Handle<Value> name = core["getAttribute"](children->Get(i), String::New("name"));
    std::cout << name << std::endl;
  }

  return scope.Close(Undefined());
}


void Init(Handle<Object> exports) {
  Interpreter::Init(exports);
}

NODE_MODULE(interpreter, Init)
