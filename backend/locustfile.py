"""
Load test scenarios for the Singularity API.

Usage (requires a running backend):
  make load-test          # headless, 50 users, 30 seconds
  make load-test-ui       # open browser UI at http://localhost:8089

The backend must be running before starting the load test:
  make backend
"""
import random

from locust import HttpUser, between, task


_MESSAGES = [
    "What is the theory of relativity?",
    "Explain quantum entanglement simply.",
    "What is the speed of light?",
    "How does gravity work?",
    "What did you discover?",
    "Tell me about your greatest achievement.",
    "What inspires you?",
    "Describe your research process.",
]


class ChatUser(HttpUser):
    """Simulates a user sending chat messages and browsing characters."""

    wait_time = between(0.5, 2.0)

    def on_start(self):
        r = self.client.get("/api/v1/characters")
        if r.status_code == 200:
            self._characters = [c["id"] for c in r.json()]
        else:
            self._characters = ["einstein"]

    @task(8)
    def send_chat(self):
        character_id = random.choice(self._characters)
        self.client.post(
            "/api/v1/chat",
            json={
                "messages": [{"role": "user", "content": random.choice(_MESSAGES)}],
                "model": "default",
                "bot_name": character_id,
            },
            name="/api/v1/chat",
        )

    @task(2)
    def list_characters(self):
        self.client.get("/api/v1/characters")

    @task(1)
    def health_check(self):
        self.client.get("/health/live")


class BurstUser(HttpUser):
    """Sends rapid-fire requests to stress-test rate limiting and concurrency."""

    wait_time = between(0.1, 0.5)
    weight = 1  # fewer burst users than normal users

    @task
    def burst_chat(self):
        self.client.post(
            "/api/v1/chat",
            json={
                "messages": [{"role": "user", "content": "ping"}],
                "model": "default",
            },
            name="/api/v1/chat [burst]",
        )
