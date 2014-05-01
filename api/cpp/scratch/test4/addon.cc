#include <node.h>
#include <map>
#include <string>
#include <iostream>

#define CERR std::cerr << __FILE__ << ":" << \
        std::dec << __LINE__ << ":" <<__FUNCTION__ << "(): "

using namespace v8;

std::ostream& operator <<(std::ostream& out, const Handle<Value>& v){
  out << *String::AsciiValue(v->ToString());
  return out;
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

  Handle<Value> CallTasyncMethod(Handle<Function> method, const unsigned int argc = 0, 
      Handle<Value> argv[] = NULL, Handle<Value> object = Null()){
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

  /*
   * Iterate through the list of an object's property names and print them out
   */
  void ListPropertyNames(Handle<Object> o){
    HandleScope scope;
    Local<Array> propNames = o->GetPropertyNames();
    std::cout << "Property length= " << propNames->Length() << std::endl;
    for(size_t i=0; i < propNames->Length(); i++){
      std::cout << "Property: " << propNames->Get(i) 
        << " Function: " << o->Get(propNames->Get(i))->IsFunction() << std::endl;
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

      /*
       * Reference for variable argument/template packs
       * http:pic.dhe.ibm.com/infocenter/lnxpcomp/v111v131/index.jsp?topic=%2Fcom.ibm.xlcpp111.linux.doc%2Flanguage_ref%2Fvariadic_templates.html
       * http://en.cppreference.com/w/cpp/language/parameter_pack
       */
      template<class...A>
      Handle<Value> CallVar(A...args){
        HandleScope scope;
        const int argc = sizeof...(args);
        Handle<Value> argv[argc] = {args...};
        return scope.Close(Api::CallTasyncMethod(func_, argc, argv, object_));
      }

      /**
       * Operator () override
       */
      template<class...A>
      Handle<Value> operator()(A...args){
        return CallVar(args...);
      }

    protected:
      Handle<Function> func_;
  };


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

using namespace Api;

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
    static Handle<Value> New(const Arguments& args) {
      HandleScope scope;

      Api::common = Persistent<Object>::New(args[0]->ToObject());
      Api::tasync = Persistent<Object>::New(args[1]->ToObject());

      FunctionMap project = FunctionMap(CallCommonMethod("getProject")->ToObject());
      FunctionMap core = FunctionMap(CallCommonMethod("getCore")->ToObject());

      Interpreter* intrp= new Interpreter(project,core);

      //Interpreter* intrp= new Interpreter();
      //intrp->project = new FunctionMap(CallCommonMethod("getProject")->ToObject());
      //intrp->core = new FunctionMap(CallCommonMethod("getCore")->ToObject());

      intrp->Wrap(args.This());

      return args.This();
    }


    static Handle<Value> InvokeEx(const Arguments& args){
      HandleScope scope;
      CERR << std::endl;
      // TODO: When project and core are member variables of the interpreter, they don't work properly
      //Interpreter* obj = ObjectWrap::Unwrap<Interpreter>(args.This());
      //FunctionMap& project = obj->project;
      //FunctionMap& core = obj->core;

      FunctionMap project = FunctionMap(CallCommonMethod("getProject")->ToObject());
      FunctionMap core = FunctionMap(CallCommonMethod("getCore")->ToObject());
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


    Interpreter(const FunctionMap& p, const FunctionMap& c):project(p),core(c){};
    //Interpreter(){};
    ~Interpreter(){};

    // Variables
    FunctionMap project;
    FunctionMap core;
};


void Init(Handle<Object> exports) {
  Interpreter::Init(exports);
}

NODE_MODULE(addon, Init)
