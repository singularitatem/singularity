# Singularity
<p align="left">
    <a href="https://github.com/singularitatem/singularity/blob/master/LICENSE">
        <img alt="GitHub" src="https://img.shields.io/github/license/singularitatem/singularity.svg?color=blue">
    </a>
</p>

Singularity is designed to be a simple chat bot application.
This project is designed to experiment various state-of-the-art NLP models, with a full stack of serving layer deployed in aws.


This project is using [bazel](https://bazel.build)


### greeter

* Start a gRPC server

`bazel run //examples/go/greeter/server -- -port=8080`

* Start a gRPC client talking to the server

`bazel run //examples/go/greeter/client -- -address=localhost -port=8080 -name=<your name>`

### httpserver

* Start a http server

`bazel run //examples/go/httpserver -- -port=8080`

