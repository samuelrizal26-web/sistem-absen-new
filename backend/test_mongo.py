"""Test MongoDB connection"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import os

load_dotenv()

MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
print(f"Connecting to: {MONGO_URL}")

async def test_connection():
    try:
        client = AsyncIOMotorClient(MONGO_URL, serverSelectionTimeoutMS=10000)
        # Test connection
        await client.admin.command('ping')
        print("✅ MongoDB connection successful!")
        
        # List databases
        db_list = await client.list_database_names()
        print(f"Available databases: {db_list}")
        
        client.close()
        return True
    except Exception as e:
        print(f"❌ MongoDB connection failed: {e}")
        return False

if __name__ == "__main__":
    asyncio.run(test_connection())


