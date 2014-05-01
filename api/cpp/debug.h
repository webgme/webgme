#ifndef DEBUG_H__
#define DEBUG_H__

/**
 * @author: Addisu Z. Taddese
 * @date: 11/14/2013
 */

#include <node.h>
#include <iostream>

#define CERR std::cerr << __FILE__ << ":" << \
        std::dec << __LINE__ << ":" <<__FUNCTION__ << "(): "

using namespace v8;

namespace webgme {
  std::ostream& operator <<(std::ostream& out, const v8::Handle<v8::Value>& v){
    out << *v8::String::AsciiValue(v->ToString());
    return out;
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
}
#endif /* end of include guard: DEBUG_H__ */
