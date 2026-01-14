"""Test MongoDB connection directly"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import os

load_dotenv()

MONGO_URL = os.getenv("MONGO_URL")
DB_NAME = os.getenv("DB_NAME", "sistem-absen")

print(f"Connecting to: {MONGO_URL}")
print(f"Database: {DB_NAME}")

async def test():
    try:
        client = AsyncIOMotorClient(MONGO_URL, serverSelectionTimeoutMS=10000)
        # Test ping
        result = await client.admin.command('ping')
        print(f"✅ Ping successful: {result}")
        
        # Test database access
        db = client[DB_NAME]
        collections = await db.list_collection_names()
        print(f"✅ Database accessible. Collections: {collections}")
        
        # Test insert
        test_collection = db.test_connection
        result = await test_collection.insert_one({"test": "connection", "timestamp": "2025-11-29"})
        print(f"✅ Insert test successful: {result.inserted_id}")
        
        # Cleanup
        await test_collection.delete_one({"_id": result.inserted_id})
        print("✅ Cleanup successful")
        
        client.close()
        return True
    except Exception as e:
        print(f"❌ Error: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    asyncio.run(test())


