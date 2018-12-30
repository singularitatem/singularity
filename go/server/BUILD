package(default_visibility = ["//visibility:public"])

load("@io_bazel_rules_go//go:def.bzl", "go_binary", "go_library", "go_test")
load("//go:rules.bzl", "GRPC_COMPILE_DEPS")

go_binary(
	name = "server",
	srcs = ["server.go"],
	deps = ["//proto:singularity_go_proto"] + GRPC_COMPILE_DEPS,
)

