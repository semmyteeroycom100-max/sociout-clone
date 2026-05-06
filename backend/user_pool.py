#!/usr/bin/env python
"""
User Pool Manager - Sociout Clone
Manages a pool of YouTube-connected users and executes random campaigns
"""

import requests
import csv
import random
import json
import os
from datetime import datetime

BASE_URL = "http://127.0.0.1:8000"


class SubscriptionTracker:
    def __init__(self, filename="subscriptions.json"):
        self.filename = filename
        self.subscribed_users = self.load()
    
    def load(self):
        """Load previously subscribed users"""
        try:
            with open(self.filename, 'r') as f:
                data = json.load(f)
                return set(data.get("subscribed_emails", []))
        except FileNotFoundError:
            return set()
    
    def save(self):
        """Save subscribed users to file"""
        with open(self.filename, 'w') as f:
            json.dump({"subscribed_emails": list(self.subscribed_users)}, f, indent=2)
    
    def is_subscribed(self, email):
        """Check if user already subscribed"""
        return email in self.subscribed_users
    
    def mark_subscribed(self, email):
        """Mark user as subscribed"""
        self.subscribed_users.add(email)
        self.save()
    
    def get_eligible_users(self, users, count):
        """Get random users who haven't subscribed yet"""
        eligible = [u for u in users if not self.is_subscribed(u["email"])]
        
        if len(eligible) < count:
            print(f"⚠️ Only {len(eligible)} eligible users remaining (already have {len(self.subscribed_users)} subscribers)")
            return eligible
        
        return random.sample(eligible, count)

class UserPool:
    def __init__(self, csv_file="users.csv"):
        self.users = []
        self.load_users_from_csv(csv_file)
    
    def load_users_from_csv(self, csv_file):
        """Load users from CSV file"""
        if not os.path.exists(csv_file):
            print(f"❌ {csv_file} not found!")
            return
        
        with open(csv_file, 'r', encoding='utf-8') as f:
            reader = csv.reader(f)
            next(reader)  # Skip header
            for row in reader:
                if row and len(row) >= 3:
                    self.users.append({
                        "email": row[0].strip(),
                        "username": row[1].strip(),
                        "password": row[2].strip(),
                        "connected": False,
                        "token": None
                    })
        print(f"✅ Loaded {len(self.users)} users into pool")
    
    def login_user(self, email, password):
        """Login and get token for a user"""
        try:
            resp = requests.post(f"{BASE_URL}/api/auth/login", 
                                json={"email": email, "password": password}, 
                                timeout=30)
            if resp.status_code == 200:
                return resp.json().get("access_token")
            return None
        except:
            return None
    
    def check_youtube_connected(self, token):
        """Check if YouTube is connected"""
        try:
            resp = requests.get(f"{BASE_URL}/api/auth/youtube/status",
                               headers={"Authorization": f"Bearer {token}"}, 
                               timeout=30)
            if resp.status_code == 200:
                return resp.json().get("connected", False)
        except:
            pass
        return False
    
    def verify_and_load_tokens(self):
        """Login all users and verify YouTube connection"""
        print("\n🔐 Verifying users and loading tokens...")
        connected_count = 0
        
        for user in self.users:
            token = self.login_user(user["email"], user["password"])
            if token:
                user["token"] = token
                user["connected"] = self.check_youtube_connected(token)
                if user["connected"]:
                    connected_count += 1
                    print(f"   ✅ {user['email']} - Connected")
                else:
                    print(f"   ⚠️ {user['email']} - Not connected to YouTube")
            else:
                print(f"   ❌ {user['email']} - Login failed")
        
        print(f"\n📊 Pool status: {connected_count}/{len(self.users)} YouTube-connected")
        return connected_count
    
    def get_random_users(self, count):
        """Get random users from pool"""
        connected_users = [u for u in self.users if u["connected"] and u["token"]]
        
        if len(connected_users) < count:
            print(f"⚠️ Only {len(connected_users)} connected users available. Using all.")
            return connected_users
        
        return random.sample(connected_users, count)
    
    def subscribe_to_channel(self, user, channel_url):
        """Make a single user subscribe to a channel"""
        campaign_name = f"Subscribe - {channel_url.split('/')[-1]}"
        
        # Create campaign
        data = {
            "name": campaign_name,
            "video_url": channel_url,
            "action_type": "SUBSCRIBE",
            "target_count": 1
        }
        
        try:
            # Create campaign
            resp = requests.post(f"{BASE_URL}/api/campaigns/create",
                                json=data,
                                headers={"Authorization": f"Bearer {user['token']}"},
                                timeout=30)
            
            if resp.status_code != 200:
                return False, f"Campaign creation failed: {resp.status_code}"
            
            campaign_id = resp.json().get("id")
            
            # Start campaign
            resp = requests.post(f"{BASE_URL}/api/campaigns/{campaign_id}/start",
                                headers={"Authorization": f"Bearer {user['token']}"},
                                timeout=30)
            
            if resp.status_code == 200:
                return True, campaign_id
            else:
                return False, f"Start failed: {resp.status_code}"
                
        except Exception as e:
            return False, str(e)
    

def bulk_subscribe(self, count, channel_url):
    """Bulk subscribe random users who haven't subscribed before"""
    tracker = SubscriptionTracker()
    
    print(f"\n{'='*60}")
    print(f"🎯 BULK SUBSCRIBE: {count} NEW users")
    print(f"📺 Target channel: {channel_url}")
    print(f"📊 Already subscribed: {len(tracker.subscribed_users)} users")
    print(f"{'='*60}")
    
    # Get eligible users (who haven't subscribed before)
    eligible_users = [u for u in self.users if u["connected"] and u["token"]]
    eligible_users = [u for u in eligible_users if not tracker.is_subscribed(u["email"])]
    
    if len(eligible_users) == 0:
        print("❌ No eligible users left! Everyone has already subscribed.")
        return []
    
    selected_count = min(count, len(eligible_users))
    selected = random.sample(eligible_users, selected_count)
    
    print(f"\n📋 Selected {selected_count} NEW users:")
    for user in selected:
        print(f"   - {user['email']}")
    
    print(f"\n🚀 Starting subscriptions...")
    results = []
    
    for i, user in enumerate(selected, 1):
        print(f"\n[{i}/{selected_count}] {user['email']}")
        success, result = self.subscribe_to_channel(user, channel_url)
        
        if success:
            print(f"   ✅ Subscribed! Campaign ID: {result}")
            tracker.mark_subscribed(user["email"])
            results.append({"email": user["email"], "status": "success"})
        else:
            print(f"   ❌ Failed: {result}")
            results.append({"email": user["email"], "status": "failed", "error": result})
    
    # Summary
    success_count = sum(1 for r in results if r["status"] == "success")
    print(f"\n{'='*60}")
    print(f"📊 BULK SUBSCRIBE COMPLETE")
    print(f"{'='*60}")
    print(f"✅ New subscribers: {success_count}")
    print(f"📊 Total subscribers to date: {len(tracker.subscribed_users)}")
    print(f"⚠️ Remaining eligible users: {len(eligible_users) - success_count}")
    
    return results
   

def main():
    print("=" * 60)
    print("👥 SOCIOUT USER POOL MANAGER")
    print("=" * 60)
    
    # Initialize pool
    pool = UserPool("users.csv")
    
    # Verify all users
    connected = pool.verify_and_load_tokens()
    
    if connected == 0:
        print("\n❌ No YouTube-connected users found!")
        print("Run oauth_connect_all.py first to connect users.")
        return
    
    # Interactive menu
    while True:
        print(f"\n{'='*50}")
        print(f"👥 Pool: {connected}/{len(pool.users)} users connected")
        print(f"{'='*50}")
        print("1. Subscribe random users to a channel")
        print("2. Check pool status")
        print("3. Refresh user tokens")
        print("4. Exit")
        
        choice = input("\nSelect option: ").strip()
        
        if choice == "1":
            count = int(input("How many random users? (max 100): "))
            count = min(count, connected)
            channel = input("YouTube channel URL: ").strip()
            pool.bulk_subscribe(count, channel)
        
        elif choice == "2":
            pool.verify_and_load_tokens()
        
        elif choice == "3":
            pool.verify_and_load_tokens()
        
        elif choice == "4":
            print("Goodbye!")
            break
        
        input("\nPress Enter to continue...")

if __name__ == "__main__":
    main()