package neuron

import (
	pb "models/proto/neuron"
)

type Neuron interface {
	Id() uint64
	Type() pb.NeuronType
}

type noopNeuron struct {
	id uint64
}

func NewNeuron(id uint64) Neuron {
	return &noopNeuron{id: id}
}

func (n *noopNeuron) Id() uint64 {
	return n.id
}

func (n *noopNeuron) Type() pb.NeuronType {
	return pb.NeuronType_NO_OP
}
