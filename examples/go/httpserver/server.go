package main

import (
	"base/app"
	"io/ioutil"
	"log"
	"net/http"
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
	log.Fatal(http.ListenAndServe(":8080", nil))
}
