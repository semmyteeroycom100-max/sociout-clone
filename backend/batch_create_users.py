#!/usr/bin/env python
"""
Batch User Creator for Sociout Platform
Creates users in batches via API
"""

import requests
import time
import random
import csv
import json
from datetime import datetime

# Configuration
BASE_URL = "http://127.0.0.1:8000"

def create_user_via_api(email, username, password):
    """Create user using API endpoint"""
    try:
        response = requests.post(
            f"{BASE_URL}/api/auth/register",
            json={
                "email": email,
                "username": username,
                "password": password
            },
            timeout=30
        )
        
        if response.status_code == 200:
            print(f"✅ Created: {email}")
            return True, response.json()
        else:
            error = response.json() if response.text else {"detail": "Unknown error"}
            print(f"❌ Failed: {email} - {error}")
            return False, error
    except requests.exceptions.ConnectionError:
        print(f"❌ Connection Error: {email} - Backend not running?")
        return False, {"error": "Connection refused"}
    except Exception as e:
        print(f"❌ Error: {email} - {e}")
        return False, {"error": str(e)}

def load_users_from_csv(csv_file):
    """Load users from CSV file"""
    users = []
    try:
        with open(csv_file, 'r', encoding='utf-8') as file:
            reader = csv.reader(file)
            next(reader)  # Skip header
            for row in reader:
                if len(row) >= 3 and row[0].strip():
                    users.append((row[0].strip(), row[1].strip(), row[2].strip()))
        print(f"✅ Loaded {len(users)} users from {csv_file}")
        return users
    except FileNotFoundError:
        print(f"❌ CSV file {csv_file} not found!")
        return []

def create_users_batch(users, delay_between=2):
    """Create multiple users with delay between each"""
    results = {"success": 0, "failed": 0, "users": []}
    
    for i, (email, username, password) in enumerate(users, 1):
        print(f"\n[{i}/{len(users)}] Processing: {email}")
        
        success, response = create_user_via_api(email, username, password)
        
        results["users"].append({
            "email": email,
            "username": username,
            "success": success,
            "response": str(response)[:200]
        })
        
        if success:
            results["success"] += 1
        else:
            results["failed"] += 1
        
        # Random delay between users
        delay = delay_between + random.uniform(0, 2)
        print(f"   Waiting {delay:.1f} seconds...")
        time.sleep(delay)
    
    return results

def save_results(results, filename="batch_results.json"):
    """Save results to JSON file"""
    with open(filename, 'w') as f:
        json.dump(results, f, indent=2, default=str)
    print(f"\n📁 Results saved to {filename}")

def print_summary(results):
    """Print summary of results"""
    print("\n" + "=" * 60)
    print("📊 BATCH RESULTS")
    print("=" * 60)
    print(f"✅ Success: {results['success']}")
    print(f"❌ Failed: {results['failed']}")
    print(f"📊 Total: {results['success'] + results['failed']}")
    
    if results['failed'] > 0:
        print("\n❌ Failed accounts:")
        for user in results['users']:
            if not user['success']:
                print(f"   - {user['email']}")
    
    print("=" * 60)

def main():
    print("=" * 60)
    print("🚀 Sociout Batch User Creator")
    print("=" * 60)
    
    # First, check if backend is running
    print("\n🔍 Checking backend connection...")
    try:
        health = requests.get(f"{BASE_URL}/health", timeout=5)
        if health.status_code == 200:
            print("✅ Backend is running!")
        else:
            print("⚠️ Backend responded but with unexpected status")
    except:
        print("❌ Cannot connect to backend!")
        print("\nPlease start your backend first:")
        print("  cd C:\\Users\\USER\\Desktop\\sociout_clone\\backend")
        print("  venv\\Scripts\\activate")
        print("  python run.py")
        return
    
    # Load users from CSV
    users = load_users_from_csv("users.csv")
    
    if not users:
        print("\n❌ No users found. Please create users.csv file first.")
        print("\n📝 Example users.csv format:")
        print("email,username,password")
        print("john.doe@gmail.com,johndoe,Pass123!")
        return
    
    print(f"\n📊 Found {len(users)} users in CSV")
    print(f"🔧 Mode: API")
    
    print("\nStarting in 3 seconds... (Press Ctrl+C to cancel)")
    time.sleep(3)
    
    start_time = datetime.now()
    results = create_users_batch(users, delay_between=2)
    end_time = datetime.now()
    
    results["timestamp"] = start_time.isoformat()
    results["duration_seconds"] = (end_time - start_time).seconds
    
    print_summary(results)
    save_results(results)
    
    print(f"\n⏱️  Time taken: {results['duration_seconds']} seconds")
    print("\n✅ Batch Complete!")
    
    if results['success'] > 0:
        print(f"\n🎉 Successfully created {results['success']} users!")

if __name__ == "__main__":
    main()