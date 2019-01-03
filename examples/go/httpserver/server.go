package main

import (
	"base/app"
	"flag"
	"io/ioutil"
	"log"
	"net/http"
)

var (
	port = flag.String("port", "8080", "Http port number")
)

func homeHandler(w http.ResponseWriter, r *http.Request) {
	html, err := ioutil.ReadFile(app.DataDir() + "/examples/go/httpserver/res/index.html")
	if err != nil {
		log.Fatal("Error reading index.html: ", err)
	}
	w.Write(html)
}

func main() {
	app.Init()
	http.HandleFunc("/", homeHandler)
	log.Printf("Starting http://localhost:%s", *port)
	log.Fatal(http.ListenAndServe(":" + *port, nil))
}
