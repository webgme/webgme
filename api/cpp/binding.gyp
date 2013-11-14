{
  "variables": {
      "node_root_dir": "/home/addisu/code/node",
      "nodedir": "/home/addisu/code/node"
  },
  "targets": [
    {
      "target_name": "interpreter",
      "node_root_dir": "/home/addisu/code/node",
      "cflags": [ "-std=c++11"],
      "sources": [ "Interpreter.cc" ]
    }
  ]
}
