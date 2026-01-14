"""Test insert print job directly"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import os
from datetime import datetime
import uuid

load_dotenv()

MONGO_URL = os.getenv("MONGO_URL")
DB_NAME = os.getenv("DB_NAME", "sistem-absen")

async def test_insert():
    try:
        client = AsyncIOMotorClient(MONGO_URL, serverSelectionTimeoutMS=10000)
        db = client[DB_NAME]
        
        # Test ping
        await client.admin.command('ping')
        print("✅ Ping successful")
        
        # Test insert print job
        record = {
            "id": str(uuid.uuid4()),
            "material": "vinyl",
            "quantity": 1,
            "price": 20000,
            "total": 20000,
            "customer_name": "Test",
            "notes": "Test job",
            "date": datetime.now().strftime("%Y-%m-%d"),
            "created_at": datetime.utcnow().isoformat()
        }
        
        result = await db.print_jobs.insert_one(record)
        print(f"✅ Insert successful: {result.inserted_id}")
        
        # Verify
        found = await db.print_jobs.find_one({"id": record["id"]})
        if found:
            print(f"✅ Verification successful: Found job with id {record['id']}")
        else:
            print("❌ Verification failed: Job not found")
        
        client.close()
        return True
    except Exception as e:
        print(f"❌ Error: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    asyncio.run(test_insert())


