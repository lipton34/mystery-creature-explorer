if (new URLSearchParams(window.location.search).get("view") === "first-person") {
  void import("./first-person");
} else {
  void import("./main");
}

export {};
