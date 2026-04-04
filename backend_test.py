#!/usr/bin/env python3
"""
MindLeaf Backend API Testing
Tests all backend endpoints for the AI storytelling app
"""

import requests
import sys
import json
import time
from datetime import datetime

class MindLeafAPITester:
    def __init__(self, base_url="https://tale-studio-10.preview.emergentagent.com"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        self.access_token = None
        self.admin_token = None
        self.test_user_id = None
        self.admin_user_id = None

    def log_test(self, name, success, details="", response_data=None):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED: {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details,
            "response_data": response_data
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, timeout=30, use_auth=False, use_admin_auth=False):
        """Run a single API test"""
        url = f"{self.base_url}{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        # Add auth header if needed
        if use_auth and self.access_token:
            headers['Authorization'] = f'Bearer {self.access_token}'
        elif use_admin_auth and self.admin_token:
            headers['Authorization'] = f'Bearer {self.admin_token}'

        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        if use_auth or use_admin_auth:
            print(f"   Auth: {'Admin' if use_admin_auth else 'User'}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=timeout)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=timeout)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=timeout)

            success = response.status_code == expected_status
            response_data = None
            
            try:
                response_data = response.json()
            except:
                response_data = response.text

            if success:
                self.log_test(name, True, f"Status: {response.status_code}", response_data)
                return True, response_data
            else:
                self.log_test(name, False, f"Expected {expected_status}, got {response.status_code}. Response: {response_data}")
                return False, response_data

        except requests.exceptions.Timeout:
            self.log_test(name, False, f"Request timed out after {timeout} seconds")
            return False, {}
        except Exception as e:
            self.log_test(name, False, f"Error: {str(e)}")
            return False, {}

    def test_health_endpoint(self):
        """Test 1: GET /api/health returns healthy"""
        return self.run_test("Health Check", "GET", "/api/health", 200)

    def test_register_new_user(self):
        """Test 2: POST /api/auth/register creates new user with 5 credits"""
        timestamp = int(time.time())
        register_data = {
            "display_name": f"Test User {timestamp}",
            "email": f"testuser{timestamp}@mindleaf.com",
            "password": "test123456"
        }
        
        success, response_data = self.run_test("Register New User", "POST", "/api/auth/register", 200, register_data)
        
        if success and response_data:
            # Check if user has 5 credits and access token
            user_data = response_data.get('user', {})
            if user_data.get('credits') == 5 and 'access_token' in response_data:
                self.access_token = response_data['access_token']
                self.test_user_id = user_data.get('_id')
                print(f"   ✅ User created with 5 credits and access token")
                return True, response_data
            else:
                self.log_test("Register New User - Credits Check", False, f"Expected 5 credits, got {user_data.get('credits')}")
                return False, response_data
        
        return success, response_data

    def test_login_correct_credentials(self):
        """Test 3: POST /api/auth/login with correct credentials returns access token"""
        login_data = {
            "email": "test@mindleaf.com",
            "password": "test123"
        }
        
        success, response_data = self.run_test("Login Correct Credentials", "POST", "/api/auth/login", 200, login_data)
        
        if success and response_data and 'access_token' in response_data:
            self.access_token = response_data['access_token']
            user_data = response_data.get('user', {})
            self.test_user_id = user_data.get('_id')
            print(f"   ✅ Login successful with access token")
            return True, response_data
        
        return success, response_data

    def test_login_wrong_credentials(self):
        """Test 4: POST /api/auth/login with wrong credentials returns 401"""
        login_data = {
            "email": "test@mindleaf.com",
            "password": "wrongpassword"
        }
        
        return self.run_test("Login Wrong Credentials", "POST", "/api/auth/login", 401, login_data)

    def test_get_user_me_with_token(self):
        """Test 5: GET /api/user/me with valid token returns user info (no password_hash exposed)"""
        success, response_data = self.run_test("Get User Me (With Token)", "GET", "/api/user/me", 200, use_auth=True)
        
        if success and response_data:
            # Check that password_hash is not exposed
            if 'password_hash' in response_data:
                self.log_test("Get User Me - Password Hash Check", False, "password_hash should not be exposed")
                return False, response_data
            else:
                print(f"   ✅ User info returned without password_hash")
                return True, response_data
        
        return success, response_data

    def test_get_user_me_without_token(self):
        """Test 6: GET /api/user/me without token returns 401"""
        return self.run_test("Get User Me (Without Token)", "GET", "/api/user/me", 401)

    def test_story_generation_with_auth(self):
        """Test 14: POST /api/stories/generate with auth creates story with cover_image and character_bible"""
        print(f"\n🚀 Testing Story Generation with Auth (this will take up to 3 minutes)...")
        
        story_data = {
            "topic": "The Brave Lion",
            "age_range": "7-10", 
            "subject": "Adventure",
            "length": "short",
            "art_style": "default"
        }
        
        success, response_data = self.run_test("Generate Story (With Auth)", "POST", "/api/stories/generate", 200, story_data, timeout=180, use_auth=True)
        
        if success and response_data:
            # Check for cover_image and character_bible
            has_cover = 'cover_image' in response_data
            has_character_bible = 'character_bible' in response_data
            
            if has_cover and has_character_bible:
                print(f"   ✅ Story generated with cover_image and character_bible")
                return True, response_data
            else:
                self.log_test("Story Generation - Content Check", False, f"Missing cover_image: {not has_cover}, Missing character_bible: {not has_character_bible}")
                return success, response_data
        
        return success, response_data

    def test_stories_list_with_auth(self):
        """Test 15: GET /api/stories returns story list with cover_image"""
        success, response_data = self.run_test("List Stories (With Auth)", "GET", "/api/stories", 200, use_auth=True)
        
        if success and response_data:
            stories = response_data.get('stories', [])
            if stories and len(stories) > 0:
                # Check if stories have cover_image
                first_story = stories[0]
                if 'cover_image' in first_story:
                    print(f"   ✅ Stories list includes cover_image")
                    return True, response_data
                else:
                    self.log_test("Stories List - Cover Image Check", False, "Stories should include cover_image")
            else:
                print(f"   ⚠️  No stories found in list")
        
        return success, response_data

    def test_get_story_by_id_with_auth(self, story_id):
        """Test 16: GET /api/stories/{id} returns full story with cover, pages, character_bible"""
        success, response_data = self.run_test("Get Story by ID (With Auth)", "GET", f"/api/stories/{story_id}", 200, use_auth=True)
        
        if success and response_data:
            # Check for required fields
            has_cover = 'cover_image' in response_data
            has_pages = 'pages' in response_data and len(response_data.get('pages', [])) > 0
            has_character_bible = 'character_bible' in response_data
            
            if has_cover and has_pages and has_character_bible:
                print(f"   ✅ Full story returned with cover, pages, and character_bible")
                return True, response_data
            else:
                missing = []
                if not has_cover: missing.append("cover_image")
                if not has_pages: missing.append("pages")
                if not has_character_bible: missing.append("character_bible")
                self.log_test("Get Story by ID - Content Check", False, f"Missing: {', '.join(missing)}")
        
        return success, response_data

    def test_credit_packages_endpoint(self):
        """Test 18: GET /api/credit-packages returns packages with paystack public key"""
        success, response_data = self.run_test("Get Credit Packages", "GET", "/api/credit-packages", 200)
        
        if success and response_data:
            # Check for packages and paystack_public_key
            has_packages = 'packages' in response_data and len(response_data.get('packages', [])) > 0
            has_paystack_key = 'paystack_public_key' in response_data
            
            if has_packages and has_paystack_key:
                print(f"   ✅ Credit packages returned with paystack public key")
                return True, response_data
            else:
                missing = []
                if not has_packages: missing.append("packages")
                if not has_paystack_key: missing.append("paystack_public_key")
                self.log_test("Credit Packages - Content Check", False, f"Missing: {', '.join(missing)}")
        
        return success, response_data

    def test_paystack_init_payment(self):
        """Test Paystack payment init (expected to return 503 with placeholder keys)"""
        payment_data = {
            "package_id": "starter",
            "callback_url": "https://example.com/callback"
        }
        
        # This should return 503 because placeholder keys are used
        return self.run_test("Paystack Init Payment (Placeholder Keys)", "POST", "/api/payments/paystack/init", 503, payment_data, use_auth=True)

    def create_admin_user(self):
        """Create and promote a user to admin for admin testing"""
        timestamp = int(time.time())
        admin_register_data = {
            "display_name": f"Admin User {timestamp}",
            "email": f"admin{timestamp}@mindleaf.com",
            "password": "admin123456"
        }
        
        # Register admin user
        success, response_data = self.run_test("Register Admin User", "POST", "/api/auth/register", 200, admin_register_data)
        
        if success and response_data:
            self.admin_token = response_data['access_token']
            admin_user_data = response_data.get('user', {})
            self.admin_user_id = admin_user_data.get('_id')
            
            # Promote to admin using direct API call (this requires existing admin or direct DB access)
            # For testing purposes, we'll try to promote via API
            promote_data = {"role": "admin"}
            promote_success, _ = self.run_test("Promote User to Admin", "POST", f"/api/admin/users/{self.admin_user_id}/role", 200, promote_data, use_auth=True)
            
            if not promote_success:
                print(f"   ⚠️  Could not promote user to admin via API. Admin tests will be skipped.")
                self.admin_token = None
                self.admin_user_id = None
                return False
            
            return True
        
        return False

    def test_admin_endpoints(self):
        """Test 19: Backend admin endpoints work when admin auth used"""
        if not self.admin_token:
            print(f"   ⚠️  No admin token available. Skipping admin tests.")
            return False, {}
        
        # Test admin list users
        success1, response_data1 = self.run_test("Admin List Users", "GET", "/api/admin/users", 200, use_admin_auth=True)
        
        # Test admin grant credits
        if self.test_user_id:
            grant_data = {"credits": 10}
            success2, response_data2 = self.run_test("Admin Grant Credits", "POST", f"/api/admin/users/{self.test_user_id}/credits", 200, grant_data, use_admin_auth=True)
        else:
            success2 = False
            response_data2 = {}
        
        return success1 and success2, {"list_users": response_data1, "grant_credits": response_data2}

    def run_all_tests(self):
        """Run all backend tests according to review request"""
        print("=" * 60)
        print("🧪 MINDLEAF BACKEND API TESTING")
        print("=" * 60)
        
        # Test 1: Health check
        self.test_health_endpoint()
        
        # Test 2: Register new user with 5 credits
        self.test_register_new_user()
        
        # Test 3: Login with correct credentials
        self.test_login_correct_credentials()
        
        # Test 4: Login with wrong credentials
        self.test_login_wrong_credentials()
        
        # Test 5: Get user info with valid token (no password_hash)
        self.test_get_user_me_with_token()
        
        # Test 6: Get user info without token
        self.test_get_user_me_without_token()
        
        # Test 14: Story generation with auth (180s timeout)
        story_success, story_data = self.test_story_generation_with_auth()
        story_id = None
        
        if story_success and story_data and '_id' in story_data:
            story_id = story_data['_id']
            print(f"✨ Generated story ID: {story_id}")
            
            # Test 15: List stories with cover_image
            self.test_stories_list_with_auth()
            
            # Test 16: Get story by ID with full content
            self.test_get_story_by_id_with_auth(story_id)
        else:
            print("⚠️  Story generation failed, skipping dependent tests")
        
        # Test 18: Credit packages with paystack public key
        self.test_credit_packages_endpoint()
        
        # Test Paystack payment init (expected 503)
        self.test_paystack_init_payment()
        
        # Test 19: Admin endpoints (try to create admin user first)
        print(f"\n👑 Attempting to create admin user for admin testing...")
        admin_created = self.create_admin_user()
        if admin_created:
            self.test_admin_endpoints()
        else:
            print(f"   ⚠️  Could not create admin user. Admin tests skipped.")
        
        # Print summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        print(f"Tests run: {self.tests_run}")
        print(f"Tests passed: {self.tests_passed}")
        print(f"Tests failed: {self.tests_run - self.tests_passed}")
        print(f"Success rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        # Print failed tests
        failed_tests = [test for test in self.test_results if not test['success']]
        if failed_tests:
            print(f"\n❌ FAILED TESTS:")
            for test in failed_tests:
                print(f"   - {test['test']}: {test['details']}")
        
        if self.tests_passed == self.tests_run:
            print("🎉 ALL TESTS PASSED!")
            return 0
        else:
            print("❌ SOME TESTS FAILED")
            return 1

def main():
    tester = MindLeafAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())