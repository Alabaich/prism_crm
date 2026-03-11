import requests
import random
import time

BASE_URL = "http://localhost:8000/bookings/"

print("="*60)
print("🕵️  PRISM CRM: COMPREHENSIVE BOOKING API TEST SUITE")
print("="*60)

# Generate unique identifiers so we don't trip over old test data
run_id = random.randint(10000, 99999)
shared_email = f"shared.email.{run_id}@example.com"
shared_phone = f"555-000-{random.randint(1000,9999)}"
shared_lead_id = None # We will store the ID here to verify merging works

tests_passed = 0
tests_failed = 0

def log_step(step, description):
    print(f"\n[Test {step}] {description}")

def assert_api(condition, success_msg, fail_msg):
    global tests_passed, tests_failed
    if condition:
        print(f"  ✅ PASS: {success_msg}")
        tests_passed += 1
    else:
        print(f"  ❌ FAIL: {fail_msg}")
        tests_failed += 1

# =====================================================================
# TEST 1: THE GHOST BUG (Empty Phone Number)
# =====================================================================
log_step(1, "Testing 'Ghost Bug' - Blank phone number")
payload_1 = {
    "building": "80 Bond St E",
    "date": "2026-05-01",
    "time": "10:00",
    "name": "Ghost Buster",
    "email": f"ghost.{run_id}@example.com",
    "phone": ""  # <-- The critical piece
}
print(f"  -> Sending Payload: Email='{payload_1['email']}', Phone='[EMPTY]'")

try:
    res = requests.post(BASE_URL, json=payload_1)
    data = res.json()
    print(f"  <- Server Response: {res.status_code} | {data}")
    
    assert_api(res.status_code == 200, "Server returned 200 OK", f"Server returned {res.status_code}")
    assert_api(data.get("lead_id") != 1, 
               f"Created unique Lead ID {data.get('lead_id')}", 
               "Bug still exists! Reverted to Lead ID 1 (Maxim).")
except Exception as e:
    print(f"  ❌ ERROR: {e}")

# =====================================================================
# TEST 2: STANDARD NEW LEAD (With Phone)
# =====================================================================
log_step(2, "Testing Standard New Booking")
payload_2 = {
    "building": "80 Bond St E",
    "date": "2026-05-02",
    "time": "11:00",
    "name": "Standard Tester",
    "email": shared_email,
    "phone": shared_phone
}
print(f"  -> Sending Payload: Email='{shared_email}', Phone='{shared_phone}'")

try:
    res = requests.post(BASE_URL, json=payload_2)
    data = res.json()
    shared_lead_id = data.get("lead_id")
    print(f"  <- Server Response: {res.status_code} | {data}")
    
    assert_api(res.status_code == 200, "Server returned 200 OK", "Failed to create standard booking")
    assert_api(shared_lead_id is not None, f"Captured valid Lead ID: {shared_lead_id}", "No Lead ID returned")
except Exception as e:
    print(f"  ❌ ERROR: {e}")

# =====================================================================
# TEST 3: DUPLICATE BOOKING PREVENTION (Button Mash)
# =====================================================================
log_step(3, "Testing Duplicate Booking Prevention (Button Mash)")
print(f"  -> Sending EXACT same payload as Test 2...")

try:
    res = requests.post(BASE_URL, json=payload_2)
    data = res.json()
    print(f"  <- Server Response: {res.status_code} | {data}")
    
    assert_api(data.get("message") == "Booking already exists", 
               "Successfully blocked duplicate booking!", 
               "Failed to block duplicate booking. It created a new one.")
except Exception as e:
    print(f"  ❌ ERROR: {e}")

# =====================================================================
# TEST 4: LEAD MERGING (Match by Email, Different Phone)
# =====================================================================
log_step(4, "Testing Lead Merging (Existing Email, Blank/New Phone)")
payload_4 = {
    "building": "100 Bond St E",
    "date": "2026-05-03",
    "time": "14:00",
    "name": "Standard Tester",
    "email": shared_email, # Same email as Test 2
    "phone": "555-999-9999" # Different phone
}
print(f"  -> Sending Payload: Email='{shared_email}' (MATCH), Phone='555-999-9999' (NEW)")

try:
    res = requests.post(BASE_URL, json=payload_4)
    data = res.json()
    print(f"  <- Server Response: {res.status_code} | {data}")
    
    assert_api(data.get("lead_id") == shared_lead_id, 
               f"Successfully merged! Reused Lead ID {shared_lead_id}", 
               f"Failed to merge. Created new Lead ID {data.get('lead_id')} instead of {shared_lead_id}")
except Exception as e:
    print(f"  ❌ ERROR: {e}")

# =====================================================================
# TEST 5: LEAD MERGING (Match by Phone, Different Email)
# =====================================================================
log_step(5, "Testing Lead Merging (New Email, Existing Phone)")
payload_5 = {
    "building": "100 Bond St E",
    "date": "2026-05-04",
    "time": "15:00",
    "name": "Standard Tester",
    "email": f"different.email.{run_id}@example.com", # Different email
    "phone": shared_phone # Same phone as Test 2
}
print(f"  -> Sending Payload: Email='different.email@...' (NEW), Phone='{shared_phone}' (MATCH)")

try:
    res = requests.post(BASE_URL, json=payload_5)
    data = res.json()
    print(f"  <- Server Response: {res.status_code} | {data}")
    
    assert_api(data.get("lead_id") == shared_lead_id, 
               f"Successfully merged! Reused Lead ID {shared_lead_id}", 
               f"Failed to merge. Created new Lead ID {data.get('lead_id')} instead of {shared_lead_id}")
except Exception as e:
    print(f"  ❌ ERROR: {e}")

# =====================================================================
# SUMMARY
# =====================================================================
print("\n" + "="*60)
print(f"🏁 TEST RUN COMPLETE")
print(f"   Passed: {tests_passed}/10 assertions")
if tests_failed == 0:
    print("   Status: 🟢 ALL TESTS PASSED! Your API is rock solid.")
else:
    print(f"   Status: 🔴 FAILED ({tests_failed} assertions failed). Check logs above.")
print("="*60)