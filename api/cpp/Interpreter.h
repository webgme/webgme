#ifndef INTERPRETER_H__
#define INTERPRETER_H__

/**
 * @author: Addisu Z. Taddese
 * @date: 11/14/2013
 */

#include <node.h>
#include "ObjectMap.h"

using namespace v8;
using namespace webgme;

class Interpreter: public node::ObjectWrap {
  public:

    static void Init(Handle<Object> target);

  private:
    static Handle<Value> New(const Arguments& args);
    static Handle<Value> InvokeEx(const Arguments& args);
    //Interpreter(const FunctionMap& p, const FunctionMap& c);
    Interpreter(Handle<Value> p, Handle<Value> c);
    ~Interpreter(){};

    // Variables
    FunctionMap project_;
    FunctionMap core_;
};

#endif /* end of include guard: INTERPRETER_H__ */
