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
 * Create a hash/map of all available javascript methods of an object so that these methods can be called from C++
 * conveniently. The Call method of this class looks for a javascript method with a name 'method_name' in the underlying
 * map. If found, this javascript method will be called using a synchronous calling method utilizing Tasync. The
 * class overloads the () operator to provide the same functionality as the Call method.
 */
class FunctionMap
{
public:
  /**
   * Build map of all available javascript methods of the object
   */
  typedef std::map<std::string, Persistent<Function> > StringToFunctionMap;
  FunctionMap (Handle<Object> o){
    HandleScope scope;
    that = o;
    Local<Array> propNames = o->GetPropertyNames();
    for(size_t i=0; i < propNames->Length(); i++){
      Local<Value> name = propNames->Get(i);
      if(o->Get(name)->IsFunction()){
        // Have to convert to string so that char * is copied from the Handle. This wouldn't work if the char * is
        // passed to the map to build a char * -> Function map. Instead we now have a string -> Function map.
        std::string key = *String::AsciiValue(name);
        Handle<Function> func = Handle<Function>::Cast(o->Get(name));
        func->SetName(String::New(key.c_str()));
        //CERR << "Is method? " << *String::AsciiValue(func->GetName()) << std::endl;
        func_map_[key] = Persistent<Function>::New(func);
      }
    }

    CERR << "Mapped "<< func_map_.size() << " functions"<< std::endl;
    //for(StringToFunctionMap::iterator it=func_map_.begin(); it!= func_map_.end(); it++){
    //  //CERR << "Key: " << *String::AsciiValue(it->first) << std::endl;
    //  CERR << "Key: " << it->first << " Value: " <<*String::AsciiValue(it->second->GetName())  << std::endl;
    //}

  }
  virtual ~FunctionMap (){};

  /**
   * Search for javascript method method_name in func_map_ and call it
   */
  Handle<Value> Call(const char * method_name, 
                     const unsigned int argc = 0, 
                     Handle<Value> argv[] = NULL){

    HandleScope scope;
    //StringToFunctionMap::iterator it = func_map_.find(String::New(method_name));
    StringToFunctionMap::iterator it = func_map_.find(std::string(method_name));
    if(it == func_map_.end()){
      // TODO: Throw an exception
      CERR << "Method: " << method_name << " not found" << std::endl;
    } else {
      //CERR << "Calling Method: " << method_name << std::endl;
      return scope.Close(Api::CallTasyncMethod(it->second, argc, argv, that));
    }
    return scope.Close(Undefined());
  }

  /**
   * Operator () override
   */

  Handle<Value> operator()(const char * method_name, 
                     const unsigned int argc = 0, 
                     Handle<Value> argv[] = NULL){
    return Call(method_name, argc, argv);
  }

private:
  StringToFunctionMap func_map_;
  Handle<Object> that;
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
      FunctionMap projmap(proj->ToObject());

      const int argc = 2;

      Handle<Value> argv[argc] = {String::New("master"), Null()};
      Handle<Value> hash = projmap("getBranchHash", argc, argv);

      CERR << "Hash: " << *String::AsciiValue(hash->ToString()) << std::endl;
      argv[0] = hash;

      //Handle<Value> commit =Api::CallObjectMethod(proj, "loadObject", 1, argv); 
      Handle<Value> commit = projmap("loadObject", 1, argv); 

      //FunctionMap* coremap = new FunctionMap(core->ToObject());
      Handle<Value> core = Api::CallCommonMethod("getCore");
      FunctionMap coremap(core->ToObject());

      argv[0] = Api::GetObjectAttr(commit, "root");
      Handle<Value> root = coremap("loadRoot", 1, argv);
      argv[0] = root;
      Handle<Array> children = Handle<Array>::Cast(coremap("loadChildren", 1, argv));

      CERR << "Children length: " << children->Length() << std::endl;
      argv[1]=String::New("name");

      for(unsigned int i=0; i < children->Length(); i++){
        argv[0] = children->Get(i);
        Handle<Value> name = coremap("getAttribute", argc, argv);
        std::cout << *String::AsciiValue(name) << std::endl;
      }

      //delete coremap;
      return scope.Close(Undefined());
    }


    Interpreter(){};
    ~Interpreter(){};
};


void Init(Handle<Object> exports) {
  Interpreter::Init(exports);
}

NODE_MODULE(addon, Init)
