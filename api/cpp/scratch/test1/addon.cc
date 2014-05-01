#include <node.h>
#include <iostream>

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



Handle<Value> DatabaseOpened(const Arguments& args) {
  HandleScope scope;
  std::cout << "Database Opened " << args.Length() << std::endl;
  Local<Object> storage = Local<Object>::Cast(args.Data());
  ListPropertyNames(storage);
  return scope.Close(Undefined());
}

Handle<Value> OpenDatabase(Handle<Object> webgme) {
  HandleScope scope;
  const unsigned argc = 1;

  // get storage
  // storage.mongo
  Local<Function> mongo = Local<Function>::Cast(webgme->Get(String::New("storage")).As<Object>()->Get(String::New("mongo")));
  Local<Object> dbparams = Object::New();
  dbparams->Set(String::New("database"), String::New("multi"));
  Local<Value> argv[argc] = {dbparams};
  Local<Object> storage = mongo->NewInstance(argc, argv);

  ListPropertyNames(storage);

  // call openDatabase
  Local<Value> argv2[argc] = {FunctionTemplate::New(DatabaseOpened, storage)->GetFunction()};
  Local<Function> funcOpenDatabase = storage->Get(String::New("openDatabase")).As<Function>();
  funcOpenDatabase->Call(Context::GetCurrent()->Global(),argc,argv2);


  return scope.Close(Undefined());
}

Handle<Value> RunCallback(const Arguments& args) {
  HandleScope scope;

  Local<Object> obj = Local<Object>::Cast(args[0]);
  ListPropertyNames(obj);

  OpenDatabase(obj);

  return scope.Close(Undefined());
}

void Init(Handle<Object> exports, Handle<Object> module) {
  module->Set(String::NewSymbol("exports"),
      FunctionTemplate::New(RunCallback)->GetFunction());
}

NODE_MODULE(addon, Init)
