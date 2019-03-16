load("@io_bazel_rules_go//proto:def.bzl", "go_proto_library") 

package(default_visibility = ["//visibility:public"])

proto_library(
	name = "neuron_proto",
	srcs = ["neuron.proto"],
	deps = [
		"@com_google_protobuf//:any_proto",
	],
)

go_proto_library(
	name = "neuron_go_proto",
	importpath = "models/proto/neuron",
	proto = ":neuron_proto",
)
