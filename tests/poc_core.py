"""
MindLeaf Core POC - Tests end-to-end story generation pipeline:
1. Gemini 2.5 Flash text generation (story in structured format)
2. Nano Banana image generation (illustration per page)
3. MongoDB storage & retrieval
"""
import asyncio
import os
import json
import base64
import uuid
import traceback
from datetime import datetime
from dotenv import load_dotenv

load_dotenv("/app/backend/.env")

from emergentintegrations.llm.chat import LlmChat, UserMessage
from motor.motor_asyncio import AsyncIOMotorClient

# ─── CONFIG ───
API_KEY = os.getenv("EMERGENT_LLM_KEY")
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = "mindleaf_poc"

print(f"API Key present: {bool(API_KEY)}")
print(f"API Key prefix: {API_KEY[:15]}..." if API_KEY else "NO KEY")
print(f"Mongo URL: {MONGO_URL}")

# ─── TEST 1: Gemini Text Generation ───
async def test_gemini_text():
    """Generate a multi-page children's story using Gemini 2.5 Flash"""
    print("\n" + "="*60)
    print("TEST 1: Gemini 2.5 Flash - Story Text Generation")
    print("="*60)
    
    try:
        chat = LlmChat(
            api_key=API_KEY,
            session_id=f"poc-text-{uuid.uuid4().hex[:8]}",
            system_message="""You are a children's story writer. You MUST respond with ONLY valid JSON, no markdown, no code blocks. 
Generate engaging, age-appropriate stories for children."""
        )
        chat.with_model("gemini", "gemini-2.5-flash")
        
        prompt = """Create a short children's story about a "Space Adventure" for ages 7-10.

Return ONLY a valid JSON object (no markdown formatting, no code blocks) with this exact structure:
{
  "title": "Story Title",
  "pages": [
    {"page_number": 1, "text": "Page 1 story text (2-3 sentences)", "illustration_prompt": "Description for AI image generation"},
    {"page_number": 2, "text": "Page 2 story text (2-3 sentences)", "illustration_prompt": "Description for AI image generation"},
    {"page_number": 3, "text": "Page 3 story text (2-3 sentences)", "illustration_prompt": "Description for AI image generation"}
  ]
}

Generate exactly 3 pages. Keep text simple and engaging for children."""

        msg = UserMessage(text=prompt)
        response = await chat.send_message(msg)
        
        print(f"Raw response length: {len(response)}")
        print(f"Response preview: {response[:200]}...")
        
        # Clean response - remove markdown code blocks if present
        cleaned = response.strip()
        if cleaned.startswith("```"):
            # Remove first line (```json or ```)
            cleaned = cleaned.split("\n", 1)[1] if "\n" in cleaned else cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        cleaned = cleaned.strip()
        
        # Parse JSON
        story_data = json.loads(cleaned)
        
        assert "title" in story_data, "Missing 'title' in response"
        assert "pages" in story_data, "Missing 'pages' in response"
        assert len(story_data["pages"]) >= 3, f"Expected 3+ pages, got {len(story_data['pages'])}"
        
        for page in story_data["pages"]:
            assert "text" in page, f"Page missing 'text'"
            assert "illustration_prompt" in page, f"Page missing 'illustration_prompt'"
        
        print(f"\n✅ SUCCESS: Generated story '{story_data['title']}' with {len(story_data['pages'])} pages")
        for p in story_data["pages"]:
            print(f"  Page {p.get('page_number', '?')}: {p['text'][:80]}...")
        
        return story_data
        
    except Exception as e:
        print(f"\n❌ FAILED: {e}")
        traceback.print_exc()
        return None


# ─── TEST 2: Nano Banana Image Generation ───
async def test_nano_banana_image(illustration_prompt: str = None):
    """Generate a children's book illustration using Nano Banana"""
    print("\n" + "="*60)
    print("TEST 2: Nano Banana - Image Generation")
    print("="*60)
    
    if not illustration_prompt:
        illustration_prompt = "A cheerful young astronaut floating in colorful outer space with friendly alien creatures, children's book illustration style, bright colors, whimsical"
    
    try:
        chat = LlmChat(
            api_key=API_KEY,
            session_id=f"poc-img-{uuid.uuid4().hex[:8]}",
            system_message="You are an illustrator for children's books. Generate colorful, kid-friendly illustrations."
        )
        chat.with_model("gemini", "gemini-3.1-flash-image-preview").with_params(modalities=["image", "text"])
        
        msg = UserMessage(
            text=f"Generate a children's book illustration: {illustration_prompt}. Style: colorful, friendly, suitable for kids ages 7-10."
        )
        
        text, images = await chat.send_message_multimodal_response(msg)
        
        print(f"Text response: {text[:100] if text else 'None'}...")
        print(f"Number of images generated: {len(images) if images else 0}")
        
        if images and len(images) > 0:
            img_data = images[0]
            print(f"Image mime type: {img_data.get('mime_type', 'unknown')}")
            print(f"Image data length: {len(img_data.get('data', ''))}")
            
            # Verify base64 decodes properly
            img_bytes = base64.b64decode(img_data['data'])
            print(f"Decoded image size: {len(img_bytes)} bytes")
            
            # Save test image
            with open("/app/tests/poc_test_image.png", "wb") as f:
                f.write(img_bytes)
            print(f"Saved test image to /app/tests/poc_test_image.png")
            
            print(f"\n✅ SUCCESS: Generated illustration ({len(img_bytes)} bytes)")
            return img_data['data']  # Return base64 string
        else:
            print(f"\n❌ FAILED: No images returned")
            return None
            
    except Exception as e:
        print(f"\n❌ FAILED: {e}")
        traceback.print_exc()
        return None


# ─── TEST 3: MongoDB Storage ───
async def test_mongodb_storage(story_data: dict = None, image_base64: str = None):
    """Store and retrieve a story from MongoDB"""
    print("\n" + "="*60)
    print("TEST 3: MongoDB - Story Storage & Retrieval")
    print("="*60)
    
    try:
        client = AsyncIOMotorClient(MONGO_URL)
        db = client[DB_NAME]
        stories_collection = db["stories"]
        
        # Create test story document
        if not story_data:
            story_data = {
                "title": "Test Story",
                "pages": [
                    {"page_number": 1, "text": "Test page 1", "illustration_prompt": "test prompt"}
                ]
            }
        
        story_doc = {
            "title": story_data["title"],
            "user_id": "poc_test_user",
            "topic": "Space Adventure",
            "age_range": "7-10",
            "subject": "Adventure",
            "length": "short",
            "art_style": "default",
            "credits_used": 1,
            "pages": [],
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        # Add pages with image data (truncated for test)
        for page in story_data["pages"]:
            page_doc = {
                "page_number": page.get("page_number", 1),
                "text": page["text"],
                "illustration_prompt": page.get("illustration_prompt", ""),
                "image_base64": image_base64[:100] + "..." if image_base64 else None  # Truncated for POC
            }
            story_doc["pages"].append(page_doc)
        
        # Insert
        result = await stories_collection.insert_one(story_doc)
        story_id = result.inserted_id
        print(f"Inserted story with ID: {story_id}")
        
        # Retrieve
        loaded = await stories_collection.find_one({"_id": story_id})
        assert loaded is not None, "Failed to retrieve story"
        assert loaded["title"] == story_data["title"], "Title mismatch"
        assert len(loaded["pages"]) == len(story_data["pages"]), "Page count mismatch"
        
        print(f"Retrieved story: '{loaded['title']}' with {len(loaded['pages'])} pages")
        
        # List stories for user
        cursor = stories_collection.find({"user_id": "poc_test_user"})
        user_stories = await cursor.to_list(length=100)
        print(f"Found {len(user_stories)} stories for test user")
        
        # Delete test data
        await stories_collection.delete_one({"_id": story_id})
        print(f"Cleaned up test story")
        
        # Close
        client.close()
        
        print(f"\n✅ SUCCESS: MongoDB CRUD operations working")
        return True
        
    except Exception as e:
        print(f"\n❌ FAILED: {e}")
        traceback.print_exc()
        return False


# ─── MAIN: Run All Tests ───
async def main():
    print("🍃 MindLeaf Core POC - Starting All Tests")
    print("=" * 60)
    
    results = {}
    
    # Test 1: Gemini Text
    story_data = await test_gemini_text()
    results["gemini_text"] = story_data is not None
    
    # Test 2: Nano Banana Image
    illustration_prompt = None
    if story_data and story_data.get("pages"):
        illustration_prompt = story_data["pages"][0].get("illustration_prompt")
    image_base64 = await test_nano_banana_image(illustration_prompt)
    results["nano_banana_image"] = image_base64 is not None
    
    # Test 3: MongoDB Storage
    mongo_ok = await test_mongodb_storage(story_data, image_base64)
    results["mongodb_storage"] = mongo_ok
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 POC RESULTS SUMMARY")
    print("=" * 60)
    for test_name, passed in results.items():
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"  {status}: {test_name}")
    
    all_passed = all(results.values())
    print(f"\n{'🎉 ALL TESTS PASSED!' if all_passed else '⚠️ SOME TESTS FAILED'}")
    return all_passed


if __name__ == "__main__":
    success = asyncio.run(main())
    exit(0 if success else 1)
