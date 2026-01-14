"""Test create print job"""
import requests
import json

url = "http://localhost:8001/api/print-jobs"
data = {
    "material": "vinyl",
    "quantity": 1,
    "price": 20000,
    "date": "2025-11-29",
    "customer_name": "Test Customer",
    "notes": "Test job"
}

try:
    response = requests.post(url, json=data)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
    if response.status_code == 200:
        print("✅ Print job created successfully!")
    else:
        print(f"❌ Error: {response.status_code}")
except Exception as e:
    print(f"❌ Request failed: {e}")


