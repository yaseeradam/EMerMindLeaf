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

    def run_test(self, name, method, endpoint, expected_status, data=None, timeout=30):
        """Run a single API test"""
        url = f"{self.base_url}{endpoint}"
        headers = {'Content-Type': 'application/json'}

        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
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
        """Test health check endpoint"""
        return self.run_test("Health Check", "GET", "/api/health", 200)

    def test_user_endpoint(self):
        """Test user endpoint"""
        return self.run_test("Get Demo User", "GET", "/api/user/me", 200)

    def test_credits_endpoint(self):
        """Test credits endpoint"""
        return self.run_test("Get Credits", "GET", "/api/credits", 200)

    def test_credit_costs_endpoint(self):
        """Test credit costs endpoint"""
        return self.run_test("Get Credit Costs", "GET", "/api/credit-costs", 200)

    def test_stories_list_empty(self):
        """Test stories list (should be empty initially)"""
        return self.run_test("List Stories (Empty)", "GET", "/api/stories", 200)

    def test_story_generation(self):
        """Test story generation with real AI APIs"""
        print(f"\n🚀 Testing Story Generation (this will take 1-2 minutes)...")
        
        story_data = {
            "topic": "The Brave Lion",
            "age_range": "7-10", 
            "subject": "Adventure",
            "length": "short",
            "art_style": "default"
        }
        
        # Use 180 second timeout for AI generation
        return self.run_test("Generate Story", "POST", "/api/stories/generate", 200, story_data, timeout=180)

    def test_stories_list_with_data(self):
        """Test stories list after generation"""
        return self.run_test("List Stories (With Data)", "GET", "/api/stories", 200)

    def test_get_story_by_id(self, story_id):
        """Test getting a specific story"""
        return self.run_test("Get Story by ID", "GET", f"/api/stories/{story_id}", 200)

    def test_export_story_pdf(self, story_id):
        """Test PDF export"""
        print(f"\n📄 Testing PDF Export...")
        url = f"{self.base_url}/api/stories/{story_id}/pdf"
        
        try:
            response = requests.get(url, timeout=30)
            success = response.status_code == 200 and response.headers.get('content-type') == 'application/pdf'
            
            if success:
                self.log_test("Export Story PDF", True, f"PDF size: {len(response.content)} bytes")
                return True, response.content
            else:
                self.log_test("Export Story PDF", False, f"Status: {response.status_code}, Content-Type: {response.headers.get('content-type')}")
                return False, None
                
        except Exception as e:
            self.log_test("Export Story PDF", False, f"Error: {str(e)}")
            return False, None

    def test_delete_story(self, story_id):
        """Test story deletion"""
        return self.run_test("Delete Story", "DELETE", f"/api/stories/{story_id}", 200)

    def test_invalid_story_id(self):
        """Test invalid story ID handling"""
        return self.run_test("Invalid Story ID", "GET", "/api/stories/invalid_id", 400)

    def run_all_tests(self):
        """Run all backend tests"""
        print("=" * 60)
        print("🧪 MINDLEAF BACKEND API TESTING")
        print("=" * 60)
        
        # Basic API tests
        self.test_health_endpoint()
        self.test_user_endpoint()
        self.test_credits_endpoint()
        self.test_credit_costs_endpoint()
        self.test_stories_list_empty()
        
        # Story generation test (takes time)
        success, story_data = self.test_story_generation()
        story_id = None
        
        if success and story_data and '_id' in story_data:
            story_id = story_data['_id']
            print(f"✨ Generated story ID: {story_id}")
            
            # Test story retrieval
            self.test_stories_list_with_data()
            self.test_get_story_by_id(story_id)
            self.test_export_story_pdf(story_id)
            
            # Test deletion
            self.test_delete_story(story_id)
        else:
            print("⚠️  Story generation failed, skipping dependent tests")
        
        # Error handling tests
        self.test_invalid_story_id()
        
        # Print summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        print(f"Tests run: {self.tests_run}")
        print(f"Tests passed: {self.tests_passed}")
        print(f"Tests failed: {self.tests_run - self.tests_passed}")
        print(f"Success rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
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