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


void Init(Handle<Object> exports) {
  Interpreter::Init(exports);
}

NODE_MODULE(interpreter, Init)
