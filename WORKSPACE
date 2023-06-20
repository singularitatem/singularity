load("@bazel_tools//tools/build_defs/repo:git.bzl", "git_repository")

git_repository(
	name = "io_bazel_rules_go",
	remote = "https://github.com/bazelbuild/rules_go.git",
	tag = "0.16.0"
)


load("@io_bazel_rules_go//go:def.bzl", "go_rules_dependencies", "go_register_toolchains")

go_rules_dependencies()
go_register_toolchains()
