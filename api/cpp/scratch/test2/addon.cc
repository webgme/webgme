#include <node.h>
#include <iostream>

using namespace v8;


Handle<Value> Hello(const Arguments& args) {
  HandleScope scope;
  std::cout << "Called to C++. Args length " << args.Length() << std::endl;
  return scope.Close(Undefined());
}
Handle<Value> TestCallback(const Arguments& args) {
  HandleScope scope;

  Local<Function> f = Local<Function>::Cast(args[0]);

  const unsigned argc=2;
  Local<Value> argv[argc] = {FunctionTemplate::New(Hello)->GetFunction(), Integer::New(2000)};

  f->Call(Context::GetCurrent()->Global(),argc,argv);
  return scope.Close(Undefined());
}

void Init(Handle<Object> exports, Handle<Object> module) {
  module->Set(String::NewSymbol("exports"),
      FunctionTemplate::New(TestCallback)->GetFunction());
}

NODE_MODULE(addon, Init)
