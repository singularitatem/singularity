package main

import (
	"log"
	"os"

	"golang.org/x/net/context"
	"google.golang.org/grpc"

	pb "examples/greeter"
)

const (
	address = "ec2-3-81-102-226.compute-1.amazonaws.com:50051"
)

func main() {
	conn, err := grpc.Dial(address, grpc.WithInsecure())
	if err != nil {
		log.Fatalf("did not connect: %v", err)
	}
	defer conn.Close()
	c := pb.NewGreeterClient(conn)

	name := "Yi Jin"
	if len(os.Args) > 1 {
		name = os.Args[1]
	}
	r, err := c.SayHello(context.Background(), &pb.HelloRequest{Name: name})
	if err != nil {
		log.Fatalf("could not greet: %v", err)
	}
	log.Printf("Received greeting: %s", r.Greeting)
}
