self.addEventListener("push", (event) => {
  const payload = event.data ? event.data.json() : {};
  event.waitUntil(
    self.registration.showNotification(payload.title || "PriceSniff", {
      body: payload.body || "",
      icon: "/icon.png",
    })
  );
});
