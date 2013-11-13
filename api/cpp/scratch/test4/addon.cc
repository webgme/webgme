#include <node.h>
#include <map>
#include <string>
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
      std::cout << "Property: " << *String::AsciiValue(propNames->Get(i)) << " Function: " << o->Get(propNames->Get(i))->IsFunction() << std::endl;
  }
}
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

  //Handle<Value> CallTasyncMethod(Handle<Function> method, const unsigned int argc = 0, Handle<Value> argv[] = NULL){
    //HandleScope scope;
    //// create a new array of arguments, with the first argument as the function.
    //Handle<Value> new_argv[argc+1] ;
    //new_argv[0] = method;
    //for(unsigned int i=0; i < argc; i++){
      //new_argv[i+1] = argv[i];
    //}
    //return scope.Close(node::MakeCallback(tasync, "call_sync", argc+1, new_argv));
  //}
  Handle<Value> CallTasyncMethod(Handle<Function> method, const unsigned int argc = 0, Handle<Value> argv[] = NULL, Handle<Value> object = Null()){
    HandleScope scope;
    //// create a new array of arguments, with the first argument as the function.
    const unsigned int new_argc = argc+2;
    Handle<Value> new_argv[new_argc] ;
    new_argv[0] = method;
    for(unsigned int i=0; i < argc; i++){
      new_argv[i+1] = argv[i];
    }
    new_argv[new_argc-1] = object;
    //return scope.Close(node::MakeCallback(tasync, "call_sync", new_argc, new_argv));
    Handle<Value> rc = node::MakeCallback(tasync, "call_sync", new_argc, new_argv);
    //if(rc->IsObject())
    //  ListPropertyNames(rc->ToObject());
    return scope.Close(rc);
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
    object_ = o->ToObject();
  }
  virtual ~ObjectMap (){};

  Handle<Value> operator[](const char* key){
    HandleScope scope;
    return scope.Close(object_->Get(String::New(key)));
  }

  Handle<Value> GetObject(){
    return object_;
  }

protected:
  Handle<Object> object_;
};

class TasyncCallable: public ObjectMap{
public:

  TasyncCallable (Handle<Value> o, const char* key):ObjectMap(o){
    func_ = Handle<Function>::Cast(o->ToObject()->Get(String::New(key)));
  }

  Handle<Value> Call(const unsigned int argc = 0, 
                     Handle<Value> argv[] = NULL){

    HandleScope scope;

    return scope.Close(Api::CallTasyncMethod(func_, argc, argv, object_));
  }

  template<class...A> Handle<Value> CallVar(A...args){
    HandleScope scope;
    const int argc = sizeof...(args);
    Handle<Value> argv[argc] = {args...};
    return scope.Close(Api::CallTasyncMethod(func_, argc, argv, object_));
  }

  /**
   * Operator () override
   */

  template<class...A> Handle<Value> operator()(A...args){
    HandleScope scope;
    const int argc = sizeof...(args);
    Handle<Value> argv[argc] = {args...};
    return scope.Close(Api::CallTasyncMethod(func_, argc, argv, object_));
  }

protected:
  Handle<Function> func_;
};

class FunctionMap: public ObjectMap
{
public:
  FunctionMap (Handle<Value> o):ObjectMap(o){}
  TasyncCallable operator[](const char* key){
    //return TasyncCallable(object_->Get(String::New(key)));
    return TasyncCallable(object_, key);
  }
};

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
      Handle<Value> core = Api::CallCommonMethod("getCore");
      FunctionMap projmap(proj->ToObject());
      FunctionMap coremap(core->ToObject());

      Handle<Value> hash = projmap["getBranchHash"](String::New("master"), Null());

      CERR << "Hash: " << *String::AsciiValue(hash->ToString()) << std::endl;

      ObjectMap commit(projmap["loadObject"](hash));
      Handle<Value> root = coremap["loadRoot"](commit["root"]);

      Handle<Array> children = Handle<Array>::Cast(coremap["loadChildren"](root));

      CERR << "Children length: " << children->Length() << std::endl;

      for(unsigned int i=0; i < children->Length(); i++){
        Handle<Value> name = coremap["getAttribute"](children->Get(i), String::New("name"));
        std::cout << *String::AsciiValue(name) << std::endl;
      }

      return scope.Close(Undefined());
    }


    Interpreter(){};
    ~Interpreter(){};
};


void Init(Handle<Object> exports) {
  Interpreter::Init(exports);
}

NODE_MODULE(addon, Init)
