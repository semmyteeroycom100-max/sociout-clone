"""
One-time OAuth connector - Run this FIRST for all users
"""

import requests
import webbrowser
import csv
import time

BASE_URL = "http://127.0.0.1:8000"

def login_user(email, password):
    resp = requests.post(f"{BASE_URL}/api/auth/login", 
                        json={"email": email, "password": password})
    if resp.status_code == 200:
        return resp.json().get("access_token")
    return None

def load_users():
    users = []
    with open('users.csv', 'r') as f:
        reader = csv.reader(f)
        next(reader)
        for row in reader:
            if row:
                users.append((row[0], row[2]))
    return users

def main():
    users = load_users()
    print(f"🔗 Connecting {len(users)} users to YouTube...")
    
    for i, (email, password) in enumerate(users, 1):
        print(f"\n[{i}/{len(users)}] {email}")
        token = login_user(email, password)
        
        if token:
            print(f"   ✅ Logged in. Opening OAuth URL...")
            webbrowser.open(f"{BASE_URL}/api/auth/google")
            input(f"   👉 Complete OAuth for {email} then press Enter...")
        else:
            print(f"   ❌ Login failed")
        
        time.sleep(1)

if __name__ == "__main__":
    main()