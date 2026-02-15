
import os
from convex import ConvexClient
from dotenv import load_dotenv

# Load environment variables
# Load environment variables
# Load .env.local first (if exists) to override .env defaults (which usually has VITE_CONVEX_URL=http://localhost...)
load_dotenv(".env.local")
load_dotenv()

class ConvexConnection:
    _instance = None
    _client = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(ConvexConnection, cls).__new__(cls)
            cls._instance._initialize()
        return cls._instance

    def _initialize(self):
        convex_url = os.getenv("VITE_CONVEX_URL")
        if not convex_url:
            # Fallback for local development if not set
            convex_url = "http://127.0.0.1:3210"
        
        self._client = ConvexClient(convex_url)
        print(f"Connected to Convex at {convex_url}")

    @property
    def client(self):
        return self._client

# Global instance
convex_connection = ConvexConnection()
client = convex_connection.client
