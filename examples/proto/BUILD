load("@io_bazel_rules_go//proto:def.bzl", "go_proto_library") 

package(default_visibility = ["//visibility:public"])

proto_library(
	name = "greeter_proto",
	srcs = ["greeter.proto"],
	deps = [
		"@com_google_protobuf//:any_proto",
	],
)

go_proto_library(
	name = "greeter_go_proto",
	compilers = ["@io_bazel_rules_go//proto:go_grpc"],
	importpath = "examples/greeter",
	proto = ":greeter_proto",
)
