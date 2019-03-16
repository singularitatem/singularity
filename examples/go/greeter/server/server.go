package main

import (
    "flag"
	"log"
	"net"

	pb "examples/greeter"

	"golang.org/x/net/context"
	"google.golang.org/grpc"
)

var (
	port = flag.String("port", "50051", "server port number")
)

type Server struct{}

func (s *Server) SayHello(ctx context.Context, in *pb.HelloRequest) (*pb.HelloResponse, error) {
	return &pb.HelloResponse{Greeting: "Hello, nice to meet you, " + in.Name}, nil
}

func main() {
    flag.Parse()

	lis, err := net.Listen("tcp", ":" + *port)
	if err != nil {
		log.Fatalf("failed to listen: %v", err)
	}
	s := grpc.NewServer()
	pb.RegisterGreeterServer(s, &Server{})
	log.Printf("Starting new grpc server on port %s", *port)
	s.Serve(lis)
}
