package app

import (
	"log"
	"os"
	"path/filepath"
)

var (
	workingDir string
	dataDir    string
)

func Init() {
	dir, err := filepath.Abs(filepath.Dir(os.Args[0]))
	if err != nil {
		log.Fatal("App failed initializing: ", err)
	}
	workingDir = dir
	dataDir = filepath.Join(os.Args[0]+".runfiles", "__main__")
}

func WorkingDir() string {
	return workingDir
}

func DataDir() string {
	return dataDir
}
