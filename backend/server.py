import os
import json
import uuid
import base64
import traceback
from datetime import datetime, timedelta
from io import BytesIO
from typing import Optional, List

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId

load_dotenv()

# ─── APP INIT ───
app = FastAPI(title="MindLeaf API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── DATABASE ───
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "mindleaf")
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY")

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]
stories_collection = db["stories"]
users_collection = db["users"]

# ─── HELPERS ───
def serialize_doc(doc):
    if doc is None:
        return None
    result = {}
    for key, value in doc.items():
        if isinstance(value, ObjectId):
            result[key] = str(value)
        elif isinstance(value, datetime):
            result[key] = value.isoformat()
        elif isinstance(value, list):
            result[key] = [serialize_doc(v) if isinstance(v, dict) else str(v) if isinstance(v, ObjectId) else v.isoformat() if isinstance(v, datetime) else v for v in value]
        elif isinstance(value, dict):
            result[key] = serialize_doc(value)
        else:
            result[key] = value
    return result


async def get_or_create_demo_user():
    """Get or create a demo user for Phase 2 (no auth)"""
    user = await users_collection.find_one({"email": "demo@mindleaf.com"})
    if not user:
        user = {
            "_id": ObjectId(),
            "display_name": "Demo User",
            "email": "demo@mindleaf.com",
            "role": "admin",
            "credits": 50,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        await users_collection.insert_one(user)
    return user


# ─── PYDANTIC MODELS ───
class StoryRequest(BaseModel):
    topic: str = Field(..., min_length=1, max_length=200)
    age_range: str = Field(..., pattern=r"^(5-7|7-10|10-12)$")
    subject: str = Field(...)
    length: str = Field(..., pattern=r"^(short|medium|long|extended)$")
    art_style: str = Field(default="default")
    character_traits: Optional[str] = None
    setting_details: Optional[str] = None

class StoryResponse(BaseModel):
    id: str
    title: str
    topic: str
    age_range: str
    subject: str
    length: str
    art_style: str
    credits_used: int
    pages: list
    created_at: str


# ─── CREDIT COSTS ───
CREDIT_COSTS = {
    "short": 1,
    "medium": 2,
    "long": 3,
    "extended": 5,
}

PAGE_COUNTS = {
    "short": 3,
    "medium": 5,
    "long": 8,
    "extended": 12,
}


# ─── AI STORY GENERATION ───
async def generate_story_text(topic, age_range, subject, length, character_traits=None, setting_details=None):
    """Generate story text using Gemini 2.5 Flash"""
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    
    page_count = PAGE_COUNTS.get(length, 3)
    
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"story-{uuid.uuid4().hex[:8]}",
        system_message="""You are an expert children's story writer. You write engaging, age-appropriate, 
educational stories that children love. Always respond with ONLY valid JSON, no markdown formatting, no code blocks."""
    )
    chat.with_model("gemini", "gemini-2.5-flash")
    
    traits_text = f"\nCharacter traits: {character_traits}" if character_traits else ""
    setting_text = f"\nSetting details: {setting_details}" if setting_details else ""
    
    prompt = f"""Create a children's story with these specifications:
- Topic: {topic}
- Age Range: {age_range} years old
- Subject/Genre: {subject}
- Number of pages: {page_count}{traits_text}{setting_text}

Return ONLY a valid JSON object (no markdown, no code blocks) with this exact structure:
{{
  "title": "Story Title",
  "pages": [
    {{"page_number": 1, "text": "2-4 engaging sentences for this page", "illustration_prompt": "Detailed description for AI image: describe the scene, characters, colors, mood. Style: children's book illustration, colorful, friendly."}},
    ... (exactly {page_count} pages)
  ]
}}

Make the story engaging, educational, and fun. Each page should advance the plot.
Illustration prompts should be vivid and detailed for generating beautiful children's book art."""

    msg = UserMessage(text=prompt)
    response = await chat.send_message(msg)
    
    # Clean response
    cleaned = response.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.split("\n", 1)[1] if "\n" in cleaned else cleaned[3:]
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]
    cleaned = cleaned.strip()
    
    return json.loads(cleaned)


async def generate_illustration(prompt, art_style="default"):
    """Generate an illustration using Nano Banana"""
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    
    style_prompts = {
        "default": "children's book illustration style, colorful, warm, friendly",
        "pixar": "Pixar-style 3D animation, vibrant colors, expressive characters",
        "ghibli": "Studio Ghibli style, watercolor, gentle, dreamy atmosphere",
        "sketch": "hand-drawn sketch style, pencil and watercolor, storybook feel"
    }
    style = style_prompts.get(art_style, style_prompts["default"])
    
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"img-{uuid.uuid4().hex[:8]}",
        system_message="You are a children's book illustrator. Generate beautiful, age-appropriate illustrations."
    )
    chat.with_model("gemini", "gemini-3.1-flash-image-preview").with_params(modalities=["image", "text"])
    
    msg = UserMessage(
        text=f"Generate a children's book illustration: {prompt}. Art style: {style}. Make it colorful, friendly, and safe for children."
    )
    
    text, images = await chat.send_message_multimodal_response(msg)
    
    if images and len(images) > 0:
        return images[0]['data']  # base64 string
    return None


# ─── ROUTES: Health ───
@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "service": "MindLeaf API", "version": "1.0.0"}


# ─── ROUTES: User ───
@app.get("/api/user/me")
async def get_current_user():
    """Get current user (demo user for Phase 2)"""
    user = await get_or_create_demo_user()
    return serialize_doc(user)


# ─── ROUTES: Stories ───
@app.post("/api/stories/generate")
async def generate_story(request: StoryRequest):
    """Generate a new AI story with illustrations"""
    try:
        # Get user and check credits
        user = await get_or_create_demo_user()
        credits_needed = CREDIT_COSTS.get(request.length, 1)
        
        if user.get("credits", 0) < credits_needed:
            raise HTTPException(
                status_code=402, 
                detail=f"Not enough credits. Need {credits_needed}, have {user.get('credits', 0)}"
            )
        
        # Step 1: Generate story text
        story_data = await generate_story_text(
            topic=request.topic,
            age_range=request.age_range,
            subject=request.subject,
            length=request.length,
            character_traits=request.character_traits,
            setting_details=request.setting_details
        )
        
        # Step 2: Generate illustrations for each page
        pages_with_images = []
        for page in story_data.get("pages", []):
            try:
                image_base64 = await generate_illustration(
                    page.get("illustration_prompt", page.get("text", "")),
                    request.art_style
                )
            except Exception as img_err:
                print(f"Image generation failed for page {page.get('page_number')}: {img_err}")
                image_base64 = None
            
            pages_with_images.append({
                "page_number": page.get("page_number", len(pages_with_images) + 1),
                "text": page.get("text", ""),
                "illustration_prompt": page.get("illustration_prompt", ""),
                "image_base64": image_base64
            })
        
        # Step 3: Save to MongoDB
        story_doc = {
            "title": story_data.get("title", f"Story about {request.topic}"),
            "user_id": str(user["_id"]),
            "topic": request.topic,
            "age_range": request.age_range,
            "subject": request.subject,
            "length": request.length,
            "art_style": request.art_style,
            "character_traits": request.character_traits,
            "setting_details": request.setting_details,
            "credits_used": credits_needed,
            "pages": pages_with_images,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        result = await stories_collection.insert_one(story_doc)
        story_doc["_id"] = result.inserted_id
        
        # Step 4: Deduct credits
        await users_collection.update_one(
            {"_id": user["_id"]},
            {
                "$inc": {"credits": -credits_needed},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )
        
        return serialize_doc(story_doc)
        
    except HTTPException:
        raise
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse story from AI: {str(e)}")
    except Exception as e:
        print(f"Story generation error: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Story generation failed: {str(e)}")


@app.get("/api/stories")
async def list_stories():
    """List all stories for the current user"""
    user = await get_or_create_demo_user()
    cursor = stories_collection.find(
        {"user_id": str(user["_id"])}
    ).sort("created_at", -1)
    
    stories = []
    async for story in cursor:
        # Return story without full page image data for performance
        story_summary = {
            "_id": story["_id"],
            "title": story.get("title", "Untitled"),
            "topic": story.get("topic", ""),
            "age_range": story.get("age_range", ""),
            "subject": story.get("subject", ""),
            "length": story.get("length", ""),
            "art_style": story.get("art_style", ""),
            "credits_used": story.get("credits_used", 0),
            "page_count": len(story.get("pages", [])),
            "cover_image": story.get("pages", [{}])[0].get("image_base64") if story.get("pages") else None,
            "created_at": story.get("created_at"),
        }
        stories.append(serialize_doc(story_summary))
    
    return {"stories": stories}


@app.get("/api/stories/{story_id}")
async def get_story(story_id: str):
    """Get a single story with all pages"""
    try:
        story = await stories_collection.find_one({"_id": ObjectId(story_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid story ID")
    
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    
    return serialize_doc(story)


@app.delete("/api/stories/{story_id}")
async def delete_story(story_id: str):
    """Delete a story"""
    try:
        result = await stories_collection.delete_one({"_id": ObjectId(story_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid story ID")
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Story not found")
    
    return {"message": "Story deleted successfully"}


@app.get("/api/stories/{story_id}/pdf")
async def export_story_pdf(story_id: str):
    """Export a story as PDF"""
    try:
        story = await stories_collection.find_one({"_id": ObjectId(story_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid story ID")
    
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    
    try:
        from fpdf import FPDF
        import tempfile
        
        pdf = FPDF()
        pdf.set_auto_page_break(auto=True, margin=15)
        
        # Title page
        pdf.add_page()
        pdf.set_font("Helvetica", "B", 28)
        pdf.ln(60)
        pdf.cell(0, 20, story.get("title", "My Story"), ln=True, align="C")
        pdf.set_font("Helvetica", "", 14)
        pdf.ln(10)
        pdf.cell(0, 10, f"A {story.get('subject', '')} story for ages {story.get('age_range', '')}", ln=True, align="C")
        pdf.cell(0, 10, f"Created with MindLeaf", ln=True, align="C")
        
        # Story pages
        for page in story.get("pages", []):
            pdf.add_page()
            
            # Try to add image
            if page.get("image_base64"):
                try:
                    img_bytes = base64.b64decode(page["image_base64"])
                    with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp:
                        tmp.write(img_bytes)
                        tmp_path = tmp.name
                    pdf.image(tmp_path, x=20, y=20, w=170)
                    os.unlink(tmp_path)
                    pdf.ln(120)
                except Exception as img_err:
                    print(f"PDF image error: {img_err}")
                    pdf.ln(10)
            
            # Page text
            pdf.set_font("Helvetica", "", 13)
            pdf.multi_cell(0, 8, page.get("text", ""))
            pdf.ln(5)
            pdf.set_font("Helvetica", "I", 9)
            pdf.cell(0, 6, f"Page {page.get('page_number', '')}", ln=True, align="C")
        
        # Output
        pdf_bytes = pdf.output()
        buffer = BytesIO(pdf_bytes)
        buffer.seek(0)
        
        filename = story.get("title", "story").replace(" ", "_") + ".pdf"
        return StreamingResponse(
            buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'}
        )
        
    except Exception as e:
        print(f"PDF export error: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"PDF export failed: {str(e)}")


# ─── ROUTES: Credits ───
@app.get("/api/credits")
async def get_credits():
    """Get current credit balance"""
    user = await get_or_create_demo_user()
    return {"credits": user.get("credits", 0)}


@app.get("/api/credit-costs")
async def get_credit_costs():
    """Get credit costs for each story length"""
    return {
        "costs": CREDIT_COSTS,
        "page_counts": PAGE_COUNTS
    }
