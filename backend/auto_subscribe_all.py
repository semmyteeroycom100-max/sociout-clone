#!/usr/bin/env python
"""
Auto Subscribe All Users - Complete Flow
Connects YouTube and runs subscribe campaigns for all users
"""

import requests
import time
import csv
import webbrowser
import os
from datetime import datetime

BASE_URL = "http://127.0.0.1:8000"
YOUR_CHANNEL_URL = "https://www.youtube.com/@EchoesofHistory-k2n"

def login_user(email, password):
    """Login and get token"""
    try:
        resp = requests.post(f"{BASE_URL}/api/auth/login", 
                            json={"email": email, "password": password}, timeout=30)
        if resp.status_code == 200:
            return True, resp.json().get("access_token")
        print(f"   Login failed: {resp.status_code}")
        return False, None
    except Exception as e:
        print(f"   Login error: {e}")
        return False, None

def check_youtube_connected(token):
    """Check if YouTube is connected"""
    try:
        resp = requests.get(f"{BASE_URL}/api/auth/youtube/status",
                           headers={"Authorization": f"Bearer {token}"}, timeout=30)
        if resp.status_code == 200:
            return resp.json().get("connected", False)
    except:
        pass
    return False

def create_subscribe_campaign(token, name, video_url):
    """Create a subscribe campaign"""
    data = {
        "name": name,
        "video_url": video_url,
        "action_type": "SUBSCRIBE",
        "target_count": 1
    }
    try:
        resp = requests.post(f"{BASE_URL}/api/campaigns/create",
                            json=data,
                            headers={"Authorization": f"Bearer {token}"}, timeout=30)
        if resp.status_code == 200:
            return True, resp.json().get("id")
        print(f"   Campaign creation failed: {resp.status_code}")
        return False, None
    except Exception as e:
        print(f"   Campaign error: {e}")
        return False, None

def start_campaign(token, campaign_id):
    """Start a campaign"""
    try:
        resp = requests.post(f"{BASE_URL}/api/campaigns/{campaign_id}/start",
                            headers={"Authorization": f"Bearer {token}"}, timeout=30)
        return resp.status_code == 200
    except:
        return False

def load_users():
    """Load users from CSV"""
    users = []
    csv_file = "users.csv"
    
    if not os.path.exists(csv_file):
        print(f"❌ {csv_file} not found!")
        return []
    
    with open(csv_file, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        next(reader)  # Skip header
        for row in reader:
            if row and len(row) >= 3 and row[0].strip():
                users.append((row[0].strip(), row[2].strip(), row[1].strip()))
    return users

def main():
    print("=" * 70)
    print("🎯 AUTO SUBSCRIBE - Complete Flow")
    print("=" * 70)
    
    # Check backend
    print("\n🔍 Checking backend...")
    try:
        resp = requests.get(f"{BASE_URL}/health", timeout=5)
        if resp.status_code == 200:
            print("✅ Backend is running")
        else:
            print("⚠️ Backend responded but may have issues")
    except:
        print("❌ Backend not running! Start it first:")
        print("   cd C:\\Users\\USER\\Desktop\\sociout_clone\\backend")
        print("   venv\\Scripts\\activate")
        print("   python run.py")
        return
    
    users = load_users()
    if not users:
        print("❌ No users found in users.csv")
        return
    
    print(f"\n📊 Loaded {len(users)} users")
    print(f"🎯 Target Channel: {YOUR_CHANNEL_URL}")
    
    results = {"subscribed": 0, "failed": 0, "needs_manual": []}
    
    for i, (email, password, username) in enumerate(users, 1):
        print(f"\n{'='*50}")
        print(f"[{i}/{len(users)}] Processing: {email}")
        print(f"{'='*50}")
        
        # Step 1: Login
        print("🔐 Logging in...")
        success, token = login_user(email, password)
        if not success:
            print(f"   ❌ Login failed for {email}")
            results["failed"] += 1
            continue
        print(f"   ✅ Logged in")
        
        # Step 2: Check YouTube connection
        print("🔗 Checking YouTube connection...")
        connected = check_youtube_connected(token)
        
        if not connected:
            print(f"   ⚠️ YouTube NOT connected")
            print(f"   🌐 Opening OAuth URL for {email}")
            oauth_url = f"{BASE_URL}/api/auth/google"
            print(f"   URL: {oauth_url}")
            print(f"   👉 Please complete OAuth in browser for {email}")
            webbrowser.open(oauth_url)
            input("   Press Enter after you've connected YouTube...")
            
            # Verify connection
            connected = check_youtube_connected(token)
            if not connected:
                print(f"   ❌ YouTube still not connected. Skipping...")
                results["needs_manual"].append(email)
                continue
            print(f"   ✅ YouTube connected!")
        
        # Step 3: Create subscribe campaign
        print("📝 Creating subscribe campaign...")
        campaign_name = f"Subscribe to EchoesOfHistory - {username}"
        success, campaign_id = create_subscribe_campaign(token, campaign_name, YOUR_CHANNEL_URL)
        
        if not success:
            print(f"   ❌ Failed to create campaign")
            results["failed"] += 1
            continue
        print(f"   ✅ Campaign created (ID: {campaign_id})")
        
        # Step 4: Start campaign
        print("🚀 Starting campaign...")
        success = start_campaign(token, campaign_id)
        
        if success:
            print(f"   ✅ Campaign started! {email} subscribed to your channel!")
            results["subscribed"] += 1
        else:
            print(f"   ❌ Failed to start campaign")
            results["failed"] += 1
        
        # Wait between users (avoid rate limits)
        if i < len(users):
            wait = 2
            print(f"⏳ Waiting {wait} seconds...")
            time.sleep(wait)
    
    # Final summary
    print("\n" + "=" * 70)
    print("📊 FINAL RESULTS")
    print("=" * 70)
    print(f"✅ Successfully Subscribed: {results['subscribed']}/{len(users)}")
    print(f"❌ Failed: {results['failed']}")
    print(f"⚠️ Needs Manual YouTube Connection: {len(results['needs_manual'])}")
    
    if results['needs_manual']:
        print("\n📝 Users needing manual YouTube connection:")
        for email in results['needs_manual'][:10]:  # Show first 10
            print(f"   - {email}")
        if len(results['needs_manual']) > 10:
            print(f"   ... and {len(results['needs_manual']) - 10} more")
    
    print("\n🎉 Process complete!")
    print(f"📈 Total subscribers gained: +{results['subscribed']}")

if __name__ == "__main__":
    input("\n⚠️ Make sure backend is running! Press Enter to continue...")
    main()
    input("\nPress Enter to exit...")