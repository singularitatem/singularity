PB_COMPILE_DEPS = [
    "@com_github_golang_protobuf//proto:go_default_library",
]

GRPC_COMPILE_DEPS = PB_COMPILE_DEPS + [
    "@com_github_golang_glog//:go_default_library",
    "@org_golang_google_grpc//:go_default_library",
    "@org_golang_x_net//context:go_default_library",
]

