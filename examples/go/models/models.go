package main

import (
	"fmt"
	"models/unit/neuron"
)

func main() {
	n := neuron.NewNeuron(1234)
	fmt.Println(n.Id())
	fmt.Println(n.Type())
}
