package(default_visibility = ["//visibility:public"])

load("@io_bazel_rules_go//go:def.bzl", "go_binary")

go_binary(
	name = "models",
	srcs = ["models.go"],
	deps = [
		"//models/unit:neuron_lib",
	],
)