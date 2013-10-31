#include <node.h>
#include <iostream>

#define CERR std::cerr << __FILE__ << ":" << \
        std::dec << __LINE__ << ":" <<__FUNCTION__ << "(): "

using namespace v8;


namespace Api {

  static Persistent <Object> common;
  static Persistent <Object> tasync;

  inline Handle<Value> GetObjectAttr(Handle<Value> object, const char * attr){
    HandleScope scope;
    return scope.Close(object->ToObject()->Get(String::New(attr)));
  }
  inline Handle<Function> GetObjectMethod(Handle<Value> object, const char * attr){
    HandleScope scope;
    return scope.Close(Handle<Function>::Cast(object->ToObject()->Get(String::New(attr))));
  }

  Handle<Value> CallTasyncMethod(Handle<Function> method, const unsigned int argc = 0, Handle<Value> argv[] = NULL){
    HandleScope scope;
    // create a new array of arguments, with the first argument as the function.
    Handle<Value> new_argv[argc+1] ;
    new_argv[0] = method;
    for(unsigned int i=0; i < argc; i++){
      new_argv[i+1] = argv[i];
    }
    return scope.Close(node::MakeCallback(tasync, "call_sync", argc+1, new_argv));
  }

  Handle<Value> CallCommonMethod(const char * method, int argc = 0, Handle<Value> argv[] = NULL){
    HandleScope scope;
    //CERR << "Calling: " << method << ", argc: " << argc << std::endl;
    Local<Function> func = Local<Function>::Cast(common->Get(String::New(method)));
    return scope.Close(CallTasyncMethod(func, argc, argv));
  }
  Handle<Value> CallObjectMethod(Handle<Value> object, const char * method, int argc = 0, Handle<Value> argv[] = NULL){
    HandleScope scope;
    //CERR << "Calling: " << method << ", argc: " << argc << std::endl;
    Handle<Function> func = GetObjectMethod(object, method);
    return scope.Close(CallTasyncMethod(func, argc, argv));
    
  }
}

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

class Interpreter: public node::ObjectWrap {
  public:

    static void Init(Handle<Object> target) {
      // Prepare constructor template
      CERR << std::endl;
      Local<FunctionTemplate> tpl = FunctionTemplate::New(New);
      tpl->SetClassName(String::NewSymbol("Interpreter"));
      tpl->InstanceTemplate()->SetInternalFieldCount(1);
      // Prototype
      NODE_SET_PROTOTYPE_METHOD(tpl, "invokeEx", InvokeEx);

      Persistent<Function> constructor = Persistent<Function>::New(tpl->GetFunction());
      target->Set(String::NewSymbol("Interpreter"), constructor);
    }

  private:
    static Handle<Value> New(const Arguments& args) {
      HandleScope scope;

      Interpreter* intrp= new Interpreter();

      Api::common = Persistent<Object>::New(args[0]->ToObject());
      Api::tasync= Persistent<Object>::New(args[1]->ToObject());

      intrp->Wrap(args.This());

      return args.This();
    }


    static Handle<Value> InvokeEx(const Arguments& args){
      HandleScope scope;
      Handle<Value> proj = Api::CallCommonMethod("getProject");

      const int argc = 2;

      Handle<Value> argv[argc] = {String::New("master"), Null()};
      Handle<Value> hash = Api::CallObjectMethod(proj, "getBranchHash", argc, argv);

      CERR << "Hash: " << *String::AsciiValue(hash->ToString()) << std::endl;
      argv[0] = hash;

      Handle<Value> commit =Api::CallObjectMethod(proj, "loadObject", 1, argv); 
      Handle<Value> core = Api::CallCommonMethod("getCore");

      argv[0] = Api::GetObjectAttr(commit, "root");
      Handle<Value> root = Api::CallObjectMethod(core, "loadRoot", 1, argv);
      argv[0] = root;
      Handle<Array> children = Handle<Array>::Cast(Api::CallObjectMethod(core, "loadChildren", 1, argv));

      CERR << "Children length: " << children->Length() << std::endl;
      argv[1]=String::New("name");

      for(unsigned int i=0; i < children->Length(); i++){
        argv[0] = children->Get(i);
        Handle<Value> name = Api::CallObjectMethod(core, "getAttribute", argc, argv);
        std::cout << *String::AsciiValue(name) << std::endl;
      }

      return scope.Close(Undefined());
    }


    static Handle<Value> PrintChildren(const Arguments& args){
      HandleScope scope;
      return scope.Close(GetCommit(args));
    }


    Interpreter(){};
    ~Interpreter(){};
};


void Init(Handle<Object> exports) {
  Interpreter::Init(exports);
}

NODE_MODULE(addon, Init)
