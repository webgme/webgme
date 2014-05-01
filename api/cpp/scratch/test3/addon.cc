#include <node.h>
#include <iostream>
#include <unistd.h>

#define CERR std::cerr << __FILE__ << ":" << \
        std::dec << __LINE__ << ":" <<__FUNCTION__ << "(): "

using namespace v8;

/*
 * Iterate through the list of an object's property names and print them out
 */
void ListPropertyNames(Handle<Object> o){
  HandleScope scope;
  Local<Array> propNames = o->GetPropertyNames();
  std::cout << "Property length= " << propNames->Length() << std::endl;
  for(size_t i=0; i < propNames->Length(); i++){
      std::cout << "Property: " << *String::AsciiValue(propNames->Get(i)) << std::endl;
  }

}
Handle<Value> HashCB(const Arguments& args){
  HandleScope scope;
  CERR << args.Length() << std::endl;
  CERR << "Hash: " << *String::AsciiValue(args[0]->ToString()) << std::endl;
  return scope.Close(Undefined());
}

Handle<Value> DatabaseOpened(const Arguments& args) {
  HandleScope scope;
  std::cout << "Database Opened " << args.Length() << std::endl;
  Local<Object> storage = Local<Object>::Cast(args.Data());
  ListPropertyNames(storage);
  return scope.Close(Undefined());
}


Handle<Value> CallMethod(Handle<Object> object, const char * method, int argc = 0, Handle<Value> argv[] = NULL){
  HandleScope scope;
  CERR << "Calling: " << method << std::endl;
  Local<Function> func = Local<Function>::Cast(object->Get(String::New(method)));
  return scope.Close(func->Call(Context::GetCurrent()->Global(), argc, argv));
}


Handle<Value> GetCommit(Handle<Object> common, Handle<Object> tasync){
  HandleScope scope;
  Handle<Value> proj = CallMethod(common, "getProject");
  ListPropertyNames(proj->ToObject());
  const int argc = 2;
  Handle<Value> argv[argc] = {String::New("master"), Null()};
  Handle<Value> hashFuture = CallMethod(proj->ToObject(), "getBranchHash", argc, argv);
  const int argc_2 = 2;
  Handle<Value> argv_2[argc_2] = {FunctionTemplate::New(HashCB)->GetFunction(), hashFuture->ToObject()};
  return CallMethod(tasync, "debugcall", argc_2, argv_2);
}


Handle<Value> RunCallback(const Arguments& args) {
  HandleScope scope;

  CERR << "Addon " << args.Length() << std::endl;
  Local<Object> common = Local<Object>::Cast(args[0]);
  Local<Object> tasync = Local<Object>::Cast(args[1]);
  ListPropertyNames(common);

  return scope.Close(GetCommit(common, tasync));
}

void Init(Handle<Object> exports, Handle<Object> module) {
  module->Set(String::NewSymbol("exports"),
      FunctionTemplate::New(RunCallback)->GetFunction());
}

NODE_MODULE(addon, Init)
