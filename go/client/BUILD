package(default_visibility = ["//visibility:public"])

load("@io_bazel_rules_go//go:def.bzl", "go_binary")
load("//go:rules.bzl", "GRPC_COMPILE_DEPS")

go_binary(
	name = "client",
	srcs = ["client.go"],
	deps = ["//proto:singularity_go_proto"] + GRPC_COMPILE_DEPS,
)
