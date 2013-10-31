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

  Handle<Value> CallTasyncMethod(Handle<Function> method, const unsigned int argc = 0, Handle<Value> argv[] = NULL){
    HandleScope scope;
    CERR << "Calling with Tasync: " << std::endl;
    // create a new array of arguments, with the first argument as the function.
    Handle<Value> new_argv[argc+1] ;
    new_argv[0] = method;
    for(unsigned int i=0; i < argc; i++){
      new_argv[i+1] = argv[i];
    }
    return scope.Close(node::MakeCallback(tasync, "debugcall", argc+1, new_argv));
  }

  Handle<Value> CallCommonMethod(const char * method, int argc = 0, Handle<Value> argv[] = NULL){
    HandleScope scope;
    CERR << "Calling: " << method << ", argc: " << argc << std::endl;
    Local<Function> func = Local<Function>::Cast(common->Get(String::New(method)));
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

      CERR << "THIS: " << args.This()->GetIdentityHash() << std::endl;
      intrp->Wrap(args.This());
      CERR << "THIS2: " << args.This()->GetIdentityHash() << std::endl;

      return args.This();
    }


    static Handle<Value> PrintChildrenImpl(const Arguments& args){
      HandleScope scope;
      CERR << args.Length() << std::endl;
      Local<Array> children =  Local<Array>::Cast(args[0]);
      CERR << "Array length: " << children->Length() << std::endl;
      Handle<Value> core = Api::CallCommonMethod("getCore");
      CERR << "Attributes" << std::endl;
      const unsigned argc = 2;
      Handle<Value> argv[argc]={children->Get(0),String::New("name")};
      for(unsigned int i=0; i < children->Length(); i++){
        argv[0] = children->Get(i);
        Handle<Value> name = node::MakeCallback(core->ToObject(), "getAttribute", argc, argv);
        std::cout << *String::AsciiValue(name) << std::endl;
      }
      return scope.Close(Undefined());
    }

    static Handle<Value> TraverseTree(const Arguments& args){
      HandleScope scope;
      CERR << args.Length() << std::endl;
      CERR << "THIS: " << args.This()->GetIdentityHash() << std::endl;
      //CERR << "Hash: " << *String::AsciiValue(args[0]->ToString()) << std::endl;
      Handle<Value> core = Api::CallCommonMethod("getCore");
      const int argc = 1;
      Handle<Value> argv[argc] = {Api::GetObjectAttr(args[0],"root")};
      Handle<Value> rootFuture = node::MakeCallback(core->ToObject(), "loadRoot", argc, argv);
      Handle<Function> loadChildren = Handle<Function>::Cast(Api::GetObjectAttr(core, "loadChildren"));
      argv[0] = rootFuture;
      Handle<Value> childrenFuture = Api::CallTasyncMethod(loadChildren, argc, argv);
      argv[0] = childrenFuture;
      return scope.Close(Api::CallTasyncMethod(FunctionTemplate::New(PrintChildrenImpl)->GetFunction(), argc, argv));
    }

    static Handle<Value> InvokeEx(const Arguments& args){
      HandleScope scope;
      //CERR << args.Length() << std::endl;
      //CERR << "THIS: " << args.This()->GetIdentityHash() << std::endl;
      //CERR << "Common: " << Api::common->GetIdentityHash() << std::endl;
      //CERR << "Tasync: " << Api::tasync->GetIdentityHash() << std::endl;
      return scope.Close(PrintChildren(args));
    }

    static Handle<Value> GetCommit(const Arguments& args){
      HandleScope scope;
      CERR << "THIS: " << args.This()->GetIdentityHash() << std::endl;
      Handle<Value> proj = Api::CallCommonMethod("getProject");
      ListPropertyNames(proj->ToObject());
      const int argc = 2;
      Handle<Value> argv[argc] = {String::New("master"), Null()};
      Handle<Value> hashFuture = node::MakeCallback(proj->ToObject(), "getBranchHash", argc, argv);
      const int argc_2 = 1;
      Handle<Value> argv_2[argc_2] = {hashFuture};
      Handle<Function> loadObject = Handle<Function>::Cast(Api::GetObjectAttr(proj, "loadObject"));
      Handle<Value> newObject = Api::CallTasyncMethod(loadObject, argc_2, argv_2);
      argv_2[0] = newObject;
      // TASYNC.call(traversetree, newObject)
      return scope.Close(Api::CallTasyncMethod(FunctionTemplate::New(TraverseTree)->GetFunction(), argc_2, argv_2));
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
