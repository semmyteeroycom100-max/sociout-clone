#!/usr/bin/env python
"""
Auto YouTube Connector for Sociout
Connects YouTube accounts for existing users
"""

import requests
import time
import random
import json
from datetime import datetime

BASE_URL = "http://127.0.0.1:8000"

def login_user(email, password):
    """Login user and get token"""
    try:
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": email, "password": password},
            timeout=30
        )
        
        if response.status_code == 200:
            token = response.json().get("access_token")
            return True, token
        else:
            return False, None
    except Exception as e:
        print(f"   Login error: {e}")
        return False, None

def check_youtube_status(token):
    """Check if YouTube is already connected"""
    try:
        response = requests.get(
            f"{BASE_URL}/api/auth/youtube/status",
            headers={"Authorization": f"Bearer {token}"},
            timeout=30
        )
        
        if response.status_code == 200:
            return response.json().get("connected", False)
    except:
        pass
    return False

def get_youtube_oauth_url(token):
    """Get YouTube OAuth URL"""
    return f"{BASE_URL}/api/auth/google"

def process_user(email, password, username):
    """Process single user - login and check YouTube status"""
    print(f"\n📧 Processing: {email}")
    
    # Login
    success, token = login_user(email, password)
    if not success:
        print(f"   ❌ Login failed for {email}")
        return False
    
    print(f"   ✅ Logged in successfully")
    
    # Check YouTube status
    connected = check_youtube_status(token)
    if connected:
        print(f"   ✅ YouTube already connected")
        return True
    else:
        print(f"   ⚠️ YouTube NOT connected yet")
        print(f"   🔗 OAuth URL: {BASE_URL}/api/auth/google")
        print(f"   👉 Please open this URL in browser while logged into {email}")
        return False

def load_users_from_csv(csv_file):
    """Load users from CSV file"""
    import csv
    users = []
    try:
        with open(csv_file, 'r', encoding='utf-8') as file:
            reader = csv.reader(file)
            next(reader)
            for row in reader:
                if len(row) >= 3 and row[0].strip():
                    users.append((row[0].strip(), row[2].strip(), row[1].strip()))
        return users
    except FileNotFoundError:
        print(f"❌ CSV file {csv_file} not found!")
        return []

def main():
    print("=" * 60)
    print("🔗 Auto YouTube Connector - Batch 1")
    print("=" * 60)
    
    # Load users
    users = load_users_from_csv("users.csv")
    
    if not users:
        print("No users found. Run batch_create_users.py first.")
        return
    
    print(f"\n📊 Found {len(users)} users")
    
    results = {"connected": 0, "not_connected": 0}
    
    for i, (email, password, username) in enumerate(users[:50], 1):
        print(f"\n[{i}/50]")
        success = process_user(email, password, username)
        
        if success:
            results["connected"] += 1
        else:
            results["not_connected"] += 1
        
        # Delay between users
        delay = random.uniform(1, 3)
        time.sleep(delay)
    
    print("\n" + "=" * 60)
    print("📊 SUMMARY")
    print("=" * 60)
    print(f"✅ YouTube Connected: {results['connected']}")
    print(f"⚠️ Not Connected: {results['not_connected']}")
    print("=" * 60)
    
    if results['not_connected'] > 0:
        print("\n⚠️ To connect remaining accounts:")
        print("1. Open Chrome Incognito for each user")
        print("2. Go to http://localhost:5173")
        print("3. Login with the user's credentials")
        print("4. Click 'Connect YouTube' button")

if __name__ == "__main__":
    main()