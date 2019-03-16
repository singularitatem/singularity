package(default_visibility = ["//visibility:public"])

load("@io_bazel_rules_go//go:def.bzl", "go_library", "go_test")
load("//go:rules.bzl", "PB_COMPILE_DEPS")

go_library(
	name = "neuron_lib",
	importpath = "models/unit/neuron",
	srcs = ["neuron.go"],
	deps = ["//models/proto:neuron_go_proto"] + PB_COMPILE_DEPS,
)

go_test(
	name = "neuron_lib_test",
	srcs = ["neuron_test.go"],
	deps = [":neuron_lib"],
)
