# singularity
This project is using [bazel](https://bazel.build)

## examples folder
This is an experiment folder containing small program using different techniques. 

* Start a gRPC server

```bazel run //examples/go/greeter/server -- -port=8080```

* Start a gRPC client talking to the server

```bazel run //examples/go/greeter/client -- -address=localhost -port=8080 -name=<your name>```


