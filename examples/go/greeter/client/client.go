package main

import (
    "flag"
	"log"

	"golang.org/x/net/context"
	"google.golang.org/grpc"

	pb "examples/greeter"
)

var (
	address = flag.String("address", "localhost", "Greeter server dns address")
    port = flag.String("port", "50051", "Greeter server port number")
    name = flag.String("name", "Yi Jin", "Enter your name")
)

func main() {
    flag.Parse()

	conn, err := grpc.Dial(*address + ":" + *port, grpc.WithInsecure())
	if err != nil {
		log.Fatalf("did not connect: %v", err)
	}
	defer conn.Close()
	c := pb.NewGreeterClient(conn)

	r, err := c.SayHello(context.Background(), &pb.HelloRequest{Name: *name})
	if err != nil {
		log.Fatalf("could not greet: %v", err)
	}
	log.Printf("Received greeting: %s", r.Greeting)
}
