"""
SAFE MODE: Empty release collections only. No schema/index change.
Run manually for internal release (clean data): python empty_collections_safe.py
Uses backend .env (MONGO_URL, DB_NAME). Does NOT create any data.
"""
import os
import asyncio
from pathlib import Path
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

ROOT = Path(__file__).parent
load_dotenv(ROOT / ".env")

# Collections to empty (documents deleted; collection/index unchanged)
COLLECTIONS = [
    "print_jobs",
    "cashflow",
    "advances",
    "attendance",
    "employees",
    "stock",
]


async def main():
    mongo_url = os.environ.get("MONGO_URL")
    db_name = os.environ.get("DB_NAME")
    if not mongo_url or not db_name:
        print("MONGO_URL and DB_NAME must be set in .env")
        return
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    for name in COLLECTIONS:
        col = db[name]
        r = await col.delete_many({})
        print(f"  {name}: deleted {r.deleted_count} document(s)")
    print("Done. Schema unchanged.")


if __name__ == "__main__":
    asyncio.run(main())
