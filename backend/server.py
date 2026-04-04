import os
import json
import uuid
import base64
import hmac
import hashlib
import traceback
import asyncio
from datetime import datetime, timedelta
from io import BytesIO
from typing import Optional

import jwt
import httpx
from fastapi import FastAPI, HTTPException, Depends, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field, EmailStr
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from passlib.context import CryptContext

load_dotenv()

# ─── APP INIT ───
app = FastAPI(title="MindLeaf API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── CONFIG ───
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "mindleaf")
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY")
JWT_SECRET = os.environ.get("JWT_SECRET", "mindleaf-secret-key-change-in-production-2024")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE = 60  # minutes
REFRESH_TOKEN_EXPIRE = 30  # days
PAYSTACK_SECRET_KEY = os.environ.get("PAYSTACK_SECRET_KEY", "sk_test_xxx")
PAYSTACK_PUBLIC_KEY = os.environ.get("PAYSTACK_PUBLIC_KEY", "pk_test_xxx")

# ─── DATABASE ───
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]
stories_collection = db["stories"]
users_collection = db["users"]
payments_collection = db["payments"]
jobs_collection = db["generation_jobs"]

# ─── AUTH ───
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer(auto_error=False)

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def create_token(data: dict, expires_delta: timedelta) -> str:
    payload = data.copy()
    payload["exp"] = datetime.utcnow() + expires_delta
    payload["iat"] = datetime.utcnow()
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = decode_token(credentials.credentials)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")
    try:
        user = await users_collection.find_one({"_id": ObjectId(user_id)})
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid user")
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

async def get_current_user_optional(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Returns user if authenticated, None otherwise"""
    if not credentials:
        return None
    try:
        payload = decode_token(credentials.credentials)
        user_id = payload.get("sub")
        if user_id:
            user = await users_collection.find_one({"_id": ObjectId(user_id)})
            return user
    except Exception:
        pass
    return None

async def require_admin(user=Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

# ─── HELPERS ───
def serialize_doc(doc):
    if doc is None:
        return None
    result = {}
    for key, value in doc.items():
        if key == "password_hash":
            continue  # Never expose password
        if isinstance(value, ObjectId):
            result[key] = str(value)
        elif isinstance(value, datetime):
            result[key] = value.isoformat()
        elif isinstance(value, list):
            result[key] = [
                serialize_doc(v) if isinstance(v, dict)
                else str(v) if isinstance(v, ObjectId)
                else v.isoformat() if isinstance(v, datetime)
                else v
                for v in value
            ]
        elif isinstance(value, dict):
            result[key] = serialize_doc(value)
        else:
            result[key] = value
    return result


# ─── PYDANTIC MODELS ───
class RegisterRequest(BaseModel):
    display_name: str = Field(..., min_length=2, max_length=100)
    email: str = Field(..., min_length=5)
    password: str = Field(..., min_length=6)

class LoginRequest(BaseModel):
    email: str
    password: str

class StoryRequest(BaseModel):
    topic: str = Field(..., min_length=1, max_length=200)
    age_range: str = Field(..., pattern=r"^(5-7|7-10|10-12)$")
    subject: str = Field(...)
    length: str = Field(..., pattern=r"^(short|medium|long|extended)$")
    art_style: str = Field(default="default")
    character_traits: Optional[str] = None
    setting_details: Optional[str] = None

class PaymentInitRequest(BaseModel):
    package_id: str
    callback_url: str

class GrantCreditsRequest(BaseModel):
    credits: int = Field(..., ge=1)

class ChangeRoleRequest(BaseModel):
    role: str = Field(..., pattern=r"^(user|admin)$")


# ─── CREDIT COSTS ───
CREDIT_COSTS = {"short": 1, "medium": 2, "long": 3, "extended": 5}
PAGE_COUNTS = {"short": 3, "medium": 5, "long": 8, "extended": 12}

CREDIT_PACKAGES = [
    {"id": "starter", "name": "Starter Pack", "credits": 10, "price_ngn": 2500, "popular": False},
    {"id": "value", "name": "Value Pack", "credits": 25, "price_ngn": 5000, "popular": True},
    {"id": "premium", "name": "Premium Pack", "credits": 60, "price_ngn": 10000, "popular": False},
    {"id": "mega", "name": "Mega Pack", "credits": 150, "price_ngn": 20000, "popular": False},
]


# ─── AI STORY GENERATION (Improved with cover + character consistency) ───

def compress_image_base64(b64_data, max_size=(800, 600), quality=70, thumb=False):
    """Compress a base64 image to reduce size. Returns compressed base64 string."""
    try:
        from PIL import Image
        img_bytes = base64.b64decode(b64_data)
        img = Image.open(BytesIO(img_bytes))
        if img.mode == 'RGBA':
            img = img.convert('RGB')
        
        target_size = (200, 150) if thumb else max_size
        img.thumbnail(target_size, Image.Resampling.LANCZOS)
        
        buffer = BytesIO()
        img.save(buffer, format='JPEG', quality=quality if not thumb else 50, optimize=True)
        buffer.seek(0)
        return base64.b64encode(buffer.read()).decode('utf-8')
    except Exception as e:
        print(f"Image compression failed: {e}")
        return b64_data  # Return original if compression fails


async def generate_story_text(topic, age_range, subject, length, character_traits=None, setting_details=None):
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    
    page_count = PAGE_COUNTS.get(length, 3)
    
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"story-{uuid.uuid4().hex[:8]}",
        system_message="""You are an expert children's story writer and illustrator director. 
You create engaging, age-appropriate stories with vivid, consistent characters.
Always respond with ONLY valid JSON, no markdown formatting, no code blocks."""
    )
    chat.with_model("gemini", "gemini-2.5-flash")
    
    traits_text = f"\nCharacter traits: {character_traits}" if character_traits else ""
    setting_text = f"\nSetting details: {setting_details}" if setting_details else ""
    
    prompt = f"""Create a children's story with these specifications:
- Topic: {topic}
- Age Range: {age_range} years old  
- Subject/Genre: {subject}
- Number of story pages: {page_count}{traits_text}{setting_text}

IMPORTANT: You must create a CHARACTER BIBLE first to ensure visual consistency across all illustrations.

Return ONLY a valid JSON object (no markdown, no code blocks) with this EXACT structure:
{{
  "title": "Story Title",
  "character_bible": {{
    "main_character": {{
      "name": "Character name",
      "appearance": "DETAILED physical description: exact hair color and style, eye color, skin tone, height/build, any unique features",
      "outfit": "DETAILED clothing: exact colors, patterns, accessories",
      "distinguishing_features": "unique items or features that make them recognizable (e.g., a red scarf, star-shaped badge, round glasses)"
    }},
    "supporting_characters": [
      {{
        "name": "Name",
        "appearance": "Detailed description",
        "outfit": "Clothing details"
      }}
    ],
    "environment_style": "Overall visual style of the world (colors, mood, recurring elements)"
  }},
  "cover": {{
    "cover_illustration_prompt": "A beautiful children's book cover illustration showing [main character with EXACT appearance from bible] in [key scene]. Include the feeling of adventure/wonder. Style: children's book cover art."
  }},
  "pages": [
    {{
      "page_number": 1, 
      "text": "2-4 engaging sentences for this page", 
      "illustration_prompt": "MUST include: [main character name] - [paste exact appearance, outfit, and distinguishing features from character bible]. Scene: [what's happening on this page]. Environment: [specific setting details]. Style: [art style]. Mood: [emotional tone]."
    }}
  ]
}}

CRITICAL RULES FOR ILLUSTRATION PROMPTS:
1. EVERY illustration prompt MUST repeat the character's full appearance description from the character bible
2. Use the EXACT same descriptive words each time (same hair, outfit, features)
3. The cover should be a dramatic, eye-catching scene with the main character prominently featured
4. Generate exactly {page_count} story pages (plus the cover)
5. Make the story engaging, educational, and fun for {age_range} year olds"""

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
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    
    style_prompts = {
        "default": "children's book illustration style, colorful, warm, friendly, high quality",
        "pixar": "Pixar-style 3D animation, vibrant colors, expressive characters, cinematic lighting",
        "ghibli": "Studio Ghibli style, watercolor, gentle, dreamy atmosphere, hand-painted feel",
        "sketch": "hand-drawn sketch style, pencil and watercolor, storybook feel, charming"
    }
    style = style_prompts.get(art_style, style_prompts["default"])
    
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"img-{uuid.uuid4().hex[:8]}",
        system_message="You are a children's book illustrator. Generate beautiful, age-appropriate, consistent illustrations."
    )
    chat.with_model("gemini", "gemini-3.1-flash-image-preview").with_params(modalities=["image", "text"])
    
    msg = UserMessage(
        text=f"Generate a high-quality children's book illustration. {prompt}. Art style: {style}. Make it colorful, friendly, and safe for children. Ensure character details match exactly as described."
    )
    
    text, images = await chat.send_message_multimodal_response(msg)
    
    if images and len(images) > 0:
        raw_b64 = images[0]['data']
        # Compress the image to reduce storage/bandwidth
        compressed = compress_image_base64(raw_b64, max_size=(800, 600), quality=75)
        return compressed
    return None


# ─── ROUTES: Health ───
@app.on_event("startup")
async def seed_admin():
    """Seed a default admin user if none exists"""
    # Remove old demo user without password
    await users_collection.delete_many({"email": "demo@mindleaf.com"})
    
    existing = await users_collection.find_one({"email": "admin@mindleaf.com"})
    if not existing:
        await users_collection.insert_one({
            "display_name": "Admin",
            "email": "admin@mindleaf.com",
            "password_hash": hash_password("admin123"),
            "role": "admin",
            "credits": 100,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        })
        print("Admin user seeded: admin@mindleaf.com / admin123")
    elif existing.get("role") != "admin":
        await users_collection.update_one(
            {"email": "admin@mindleaf.com"},
            {"$set": {"role": "admin", "password_hash": hash_password("admin123"), "credits": 100}}
        )


@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "service": "MindLeaf API", "version": "2.0.0"}


# ═══════════════════════════════════════
# AUTH ROUTES
# ═══════════════════════════════════════

@app.post("/api/auth/register")
async def register(req: RegisterRequest, response: Response):
    existing = await users_collection.find_one({"email": req.email.lower().strip()})
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")
    
    user_doc = {
        "display_name": req.display_name.strip(),
        "email": req.email.lower().strip(),
        "password_hash": hash_password(req.password),
        "role": "user",
        "credits": 5,  # Free starter credits
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    result = await users_collection.insert_one(user_doc)
    user_doc["_id"] = result.inserted_id
    
    # Create tokens
    access_token = create_token({"sub": str(user_doc["_id"])}, timedelta(minutes=ACCESS_TOKEN_EXPIRE))
    refresh_token = create_token({"sub": str(user_doc["_id"]), "type": "refresh"}, timedelta(days=REFRESH_TOKEN_EXPIRE))
    
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=False,  # Set True in production with HTTPS
        samesite="lax",
        max_age=REFRESH_TOKEN_EXPIRE * 24 * 3600,
        path="/"
    )
    
    return {
        "access_token": access_token,
        "user": serialize_doc(user_doc)
    }


@app.post("/api/auth/login")
async def login(req: LoginRequest, response: Response):
    user = await users_collection.find_one({"email": req.email.lower().strip()})
    if not user or not verify_password(req.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    access_token = create_token({"sub": str(user["_id"])}, timedelta(minutes=ACCESS_TOKEN_EXPIRE))
    refresh_token = create_token({"sub": str(user["_id"]), "type": "refresh"}, timedelta(days=REFRESH_TOKEN_EXPIRE))
    
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=REFRESH_TOKEN_EXPIRE * 24 * 3600,
        path="/"
    )
    
    return {
        "access_token": access_token,
        "user": serialize_doc(user)
    }


@app.post("/api/auth/refresh")
async def refresh_token(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="No refresh token")
    
    try:
        payload = decode_token(token)
    except HTTPException:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    try:
        user = await users_collection.find_one({"_id": ObjectId(user_id)})
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid user")
    
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    new_access = create_token({"sub": str(user["_id"])}, timedelta(minutes=ACCESS_TOKEN_EXPIRE))
    new_refresh = create_token({"sub": str(user["_id"]), "type": "refresh"}, timedelta(days=REFRESH_TOKEN_EXPIRE))
    
    response.set_cookie(
        key="refresh_token",
        value=new_refresh,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=REFRESH_TOKEN_EXPIRE * 24 * 3600,
        path="/"
    )
    
    return {
        "access_token": new_access,
        "user": serialize_doc(user)
    }


@app.post("/api/auth/logout")
async def logout(response: Response):
    response.delete_cookie("refresh_token", path="/")
    return {"message": "Logged out"}


# ═══════════════════════════════════════
# USER ROUTES
# ═══════════════════════════════════════

@app.get("/api/user/me")
async def get_current_user_info(user=Depends(get_current_user)):
    return serialize_doc(user)


# ═══════════════════════════════════════
# STORY ROUTES (Async background generation)
# ═══════════════════════════════════════

async def _run_story_generation(job_id: str, user_id: str, request_data: dict):
    """Background task: generates story text + images, updates job status in DB"""
    try:
        # Update status: writing story
        await jobs_collection.update_one(
            {"_id": ObjectId(job_id)},
            {"$set": {"status": "generating_text", "step": "Writing your story...", "progress": 10}}
        )
        
        story_data = await generate_story_text(
            topic=request_data["topic"],
            age_range=request_data["age_range"],
            subject=request_data["subject"],
            length=request_data["length"],
            character_traits=request_data.get("character_traits"),
            setting_details=request_data.get("setting_details")
        )
        
        character_bible = story_data.get("character_bible", {})
        total_images = len(story_data.get("pages", [])) + 1  # pages + cover
        
        # Update status: painting cover
        await jobs_collection.update_one(
            {"_id": ObjectId(job_id)},
            {"$set": {"status": "generating_cover", "step": "Painting the cover page...", "progress": 25}}
        )
        
        cover_prompt = story_data.get("cover", {}).get("cover_illustration_prompt", "")
        if not cover_prompt:
            main_char = character_bible.get("main_character", {})
            cover_prompt = f"A beautiful children's book cover featuring {main_char.get('name', 'the main character')} - {main_char.get('appearance', '')} wearing {main_char.get('outfit', '')}. Title: {story_data.get('title', '')}. Dramatic, eye-catching."
        
        try:
            cover_image = await generate_illustration(cover_prompt, request_data.get("art_style", "default"))
        except Exception as e:
            print(f"Cover image generation failed: {e}")
            cover_image = None
        
        # Generate page illustrations
        pages_with_images = []
        for idx, page in enumerate(story_data.get("pages", [])):
            progress = 30 + int((idx / max(total_images, 1)) * 60)
            await jobs_collection.update_one(
                {"_id": ObjectId(job_id)},
                {"$set": {
                    "status": "generating_illustrations",
                    "step": f"Creating illustration {idx + 1} of {len(story_data.get('pages', []))}...",
                    "progress": min(progress, 90)
                }}
            )
            
            try:
                image_base64 = await generate_illustration(
                    page.get("illustration_prompt", page.get("text", "")),
                    request_data.get("art_style", "default")
                )
            except Exception as img_err:
                print(f"Image generation failed for page {page.get('page_number')}: {img_err}")
                image_base64 = None
            
            pages_with_images.append({
                "page_number": page.get("page_number", idx + 1),
                "text": page.get("text", ""),
                "illustration_prompt": page.get("illustration_prompt", ""),
                "image_base64": image_base64
            })
        
        # Save story
        await jobs_collection.update_one(
            {"_id": ObjectId(job_id)},
            {"$set": {"status": "saving", "step": "Saving your story...", "progress": 95}}
        )
        
        credits_needed = CREDIT_COSTS.get(request_data["length"], 1)
        
        # Create thumbnail for library view
        cover_thumbnail = compress_image_base64(cover_image, thumb=True) if cover_image else None
        
        story_doc = {
            "title": story_data.get("title", f"Story about {request_data['topic']}"),
            "user_id": user_id,
            "topic": request_data["topic"],
            "age_range": request_data["age_range"],
            "subject": request_data["subject"],
            "length": request_data["length"],
            "art_style": request_data.get("art_style", "default"),
            "character_traits": request_data.get("character_traits"),
            "setting_details": request_data.get("setting_details"),
            "credits_used": credits_needed,
            "character_bible": character_bible,
            "cover_image": cover_image,
            "cover_thumbnail": cover_thumbnail,
            "pages": pages_with_images,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        result = await stories_collection.insert_one(story_doc)
        story_id = str(result.inserted_id)
        
        # Deduct credits
        await users_collection.update_one(
            {"_id": ObjectId(user_id)},
            {"$inc": {"credits": -credits_needed}, "$set": {"updated_at": datetime.utcnow()}}
        )
        
        # Mark job complete
        await jobs_collection.update_one(
            {"_id": ObjectId(job_id)},
            {"$set": {"status": "completed", "step": "Story ready!", "progress": 100, "story_id": story_id, "completed_at": datetime.utcnow()}}
        )
        
    except Exception as e:
        print(f"Story generation error: {traceback.format_exc()}")
        await jobs_collection.update_one(
            {"_id": ObjectId(job_id)},
            {"$set": {"status": "failed", "step": f"Generation failed: {str(e)}", "progress": 0, "error": str(e), "completed_at": datetime.utcnow()}}
        )


@app.post("/api/stories/generate")
async def start_story_generation(request: StoryRequest, user=Depends(get_current_user)):
    """Start async story generation - returns job_id for polling"""
    credits_needed = CREDIT_COSTS.get(request.length, 1)
    
    if user.get("credits", 0) < credits_needed:
        raise HTTPException(
            status_code=402,
            detail=f"Not enough credits. Need {credits_needed}, have {user.get('credits', 0)}"
        )
    
    # Create job record
    job_doc = {
        "user_id": str(user["_id"]),
        "status": "queued",
        "step": "Starting...",
        "progress": 0,
        "story_id": None,
        "error": None,
        "request_data": request.dict(),
        "created_at": datetime.utcnow()
    }
    result = await jobs_collection.insert_one(job_doc)
    job_id = str(result.inserted_id)
    
    # Launch background task
    asyncio.create_task(_run_story_generation(job_id, str(user["_id"]), request.dict()))
    
    return {"job_id": job_id, "status": "queued"}


@app.get("/api/stories/generate/status/{job_id}")
async def get_generation_status(job_id: str, user=Depends(get_current_user)):
    """Poll this endpoint to check story generation progress"""
    try:
        job = await jobs_collection.find_one({"_id": ObjectId(job_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid job ID")
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.get("user_id") != str(user["_id"]):
        raise HTTPException(status_code=403, detail="Not your job")
    
    return {
        "job_id": job_id,
        "status": job.get("status", "unknown"),
        "step": job.get("step", ""),
        "progress": job.get("progress", 0),
        "story_id": job.get("story_id"),
        "error": job.get("error")
    }


@app.get("/api/stories")
async def list_stories(user=Depends(get_current_user)):
    cursor = stories_collection.find({"user_id": str(user["_id"])}).sort("created_at", -1)
    
    stories = []
    async for story in cursor:
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
            "cover_thumbnail": story.get("cover_thumbnail") or story.get("cover_image"),
            "created_at": story.get("created_at"),
        }
        stories.append(serialize_doc(story_summary))
    
    return {"stories": stories}


@app.get("/api/stories/{story_id}")
async def get_story(story_id: str, user=Depends(get_current_user)):
    """Get story metadata + text (without page images for fast loading)"""
    try:
        story = await stories_collection.find_one({"_id": ObjectId(story_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid story ID")
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    if story.get("user_id") != str(user["_id"]):
        raise HTTPException(status_code=403, detail="Not your story")
    
    # Return story with page text but strip heavy image data
    # Images will be fetched per-page via the lazy endpoint
    result = serialize_doc(story)
    if result.get("pages"):
        for page in result["pages"]:
            page["has_image"] = bool(page.get("image_base64"))
            # Keep image data for now but frontend will use lazy loading
    return result


@app.get("/api/stories/{story_id}/page/{page_num}/image")
async def get_page_image(story_id: str, page_num: int, user=Depends(get_current_user)):
    """Lazy load a single page image"""
    try:
        story = await stories_collection.find_one(
            {"_id": ObjectId(story_id)},
            {"pages": 1, "user_id": 1, "cover_image": 1}
        )
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid story ID")
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    if story.get("user_id") != str(user["_id"]):
        raise HTTPException(status_code=403, detail="Not your story")
    
    # page_num 0 = cover
    if page_num == 0:
        return {"image_base64": story.get("cover_image")}
    
    pages = story.get("pages", [])
    idx = page_num - 1
    if idx < 0 or idx >= len(pages):
        raise HTTPException(status_code=404, detail="Page not found")
    
    return {"image_base64": pages[idx].get("image_base64")}


@app.delete("/api/stories/{story_id}")
async def delete_story(story_id: str, user=Depends(get_current_user)):
    try:
        story = await stories_collection.find_one({"_id": ObjectId(story_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid story ID")
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    if story.get("user_id") != str(user["_id"]):
        raise HTTPException(status_code=403, detail="Not your story")
    await stories_collection.delete_one({"_id": ObjectId(story_id)})
    return {"message": "Story deleted successfully"}


@app.get("/api/stories/{story_id}/pdf")
async def export_story_pdf(story_id: str, user=Depends(get_current_user)):
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
        
        # Cover page
        pdf.add_page()
        if story.get("cover_image"):
            try:
                img_bytes = base64.b64decode(story["cover_image"])
                with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp:
                    tmp.write(img_bytes)
                    tmp_path = tmp.name
                pdf.image(tmp_path, x=10, y=10, w=190)
                os.unlink(tmp_path)
            except Exception:
                pass
        pdf.ln(200)
        pdf.set_font("Helvetica", "B", 28)
        pdf.cell(0, 20, story.get("title", "My Story"), ln=True, align="C")
        pdf.set_font("Helvetica", "", 14)
        pdf.cell(0, 10, f"A {story.get('subject', '')} story for ages {story.get('age_range', '')}", ln=True, align="C")
        pdf.cell(0, 10, "Created with MindLeaf", ln=True, align="C")
        
        # Story pages
        for page in story.get("pages", []):
            pdf.add_page()
            if page.get("image_base64"):
                try:
                    img_bytes = base64.b64decode(page["image_base64"])
                    with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp:
                        tmp.write(img_bytes)
                        tmp_path = tmp.name
                    pdf.image(tmp_path, x=20, y=20, w=170)
                    os.unlink(tmp_path)
                    pdf.ln(120)
                except Exception:
                    pdf.ln(10)
            pdf.set_font("Helvetica", "", 13)
            pdf.multi_cell(0, 8, page.get("text", ""))
            pdf.ln(5)
            pdf.set_font("Helvetica", "I", 9)
            pdf.cell(0, 6, f"Page {page.get('page_number', '')}", ln=True, align="C")
        
        pdf_bytes = pdf.output()
        buffer = BytesIO(pdf_bytes)
        buffer.seek(0)
        filename = story.get("title", "story").replace(" ", "_") + ".pdf"
        return StreamingResponse(buffer, media_type="application/pdf", headers={"Content-Disposition": f'attachment; filename="{filename}"'})
        
    except Exception as e:
        print(f"PDF export error: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"PDF export failed: {str(e)}")


# ═══════════════════════════════════════
# CREDITS & PAYMENTS ROUTES
# ═══════════════════════════════════════

@app.get("/api/credits")
async def get_credits(user=Depends(get_current_user)):
    return {"credits": user.get("credits", 0)}

@app.get("/api/credit-costs")
async def get_credit_costs():
    return {"costs": CREDIT_COSTS, "page_counts": PAGE_COUNTS}

@app.get("/api/credit-packages")
async def get_credit_packages():
    return {"packages": CREDIT_PACKAGES, "paystack_public_key": PAYSTACK_PUBLIC_KEY}


@app.post("/api/payments/paystack/init")
async def init_paystack_payment(req: PaymentInitRequest, user=Depends(get_current_user)):
    package = next((p for p in CREDIT_PACKAGES if p["id"] == req.package_id), None)
    if not package:
        raise HTTPException(status_code=400, detail="Invalid package")
    
    if PAYSTACK_SECRET_KEY.startswith("sk_test_xxx"):
        raise HTTPException(status_code=503, detail="Payment not configured. Please add your Paystack keys.")
    
    reference = f"ml_{uuid.uuid4().hex[:16]}"
    amount_kobo = package["price_ngn"] * 100
    
    async with httpx.AsyncClient() as client_http:
        resp = await client_http.post(
            "https://api.paystack.co/transaction/initialize",
            headers={
                "Authorization": f"Bearer {PAYSTACK_SECRET_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "email": user.get("email", ""),
                "amount": amount_kobo,
                "reference": reference,
                "callback_url": req.callback_url,
                "metadata": {
                    "user_id": str(user["_id"]),
                    "package_id": package["id"],
                    "credits": package["credits"]
                }
            }
        )
        result = resp.json()
    
    if result.get("status"):
        # Save payment record
        await payments_collection.insert_one({
            "reference": reference,
            "user_id": str(user["_id"]),
            "package_id": package["id"],
            "credits": package["credits"],
            "amount_ngn": package["price_ngn"],
            "status": "pending",
            "created_at": datetime.utcnow()
        })
        return {
            "authorization_url": result["data"]["authorization_url"],
            "reference": result["data"]["reference"]
        }
    
    raise HTTPException(status_code=400, detail=result.get("message", "Payment initialization failed"))


@app.get("/api/payments/paystack/verify/{reference}")
async def verify_paystack_payment(reference: str, user=Depends(get_current_user)):
    payment = await payments_collection.find_one({"reference": reference, "user_id": str(user["_id"])})
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    if payment.get("status") == "success":
        return {"status": "success", "message": "Already credited", "credits": payment.get("credits", 0)}
    
    if PAYSTACK_SECRET_KEY.startswith("sk_test_xxx"):
        raise HTTPException(status_code=503, detail="Payment not configured")
    
    async with httpx.AsyncClient() as client_http:
        resp = await client_http.get(
            f"https://api.paystack.co/transaction/verify/{reference}",
            headers={"Authorization": f"Bearer {PAYSTACK_SECRET_KEY}"}
        )
        result = resp.json()
    
    if result.get("status") and result["data"]["status"] == "success":
        await payments_collection.update_one(
            {"reference": reference},
            {"$set": {"status": "success", "verified_at": datetime.utcnow()}}
        )
        await users_collection.update_one(
            {"_id": user["_id"]},
            {"$inc": {"credits": payment.get("credits", 0)}, "$set": {"updated_at": datetime.utcnow()}}
        )
        return {"status": "success", "credits": payment.get("credits", 0)}
    
    return {"status": "failed", "message": "Payment verification failed"}


@app.post("/api/payments/paystack/webhook")
async def paystack_webhook(request: Request):
    signature = request.headers.get("x-paystack-signature", "")
    body = await request.body()
    
    if PAYSTACK_SECRET_KEY and not PAYSTACK_SECRET_KEY.startswith("sk_test_xxx"):
        computed = hmac.new(PAYSTACK_SECRET_KEY.encode(), body, hashlib.sha512).hexdigest()
        if not hmac.compare_digest(computed, signature):
            raise HTTPException(status_code=401, detail="Invalid signature")
    
    event = json.loads(body)
    
    if event.get("event") == "charge.success":
        reference = event["data"]["reference"]
        payment = await payments_collection.find_one({"reference": reference})
        
        if payment and payment.get("status") != "success":
            await payments_collection.update_one(
                {"reference": reference},
                {"$set": {"status": "success", "verified_at": datetime.utcnow(), "webhook_data": event["data"]}}
            )
            try:
                await users_collection.update_one(
                    {"_id": ObjectId(payment["user_id"])},
                    {"$inc": {"credits": payment.get("credits", 0)}, "$set": {"updated_at": datetime.utcnow()}}
                )
            except Exception as e:
                print(f"Webhook credit error: {e}")
    
    return {"status": "ok"}


# ═══════════════════════════════════════
# ADMIN ROUTES
# ═══════════════════════════════════════

@app.get("/api/admin/users")
async def admin_list_users(admin=Depends(require_admin)):
    cursor = users_collection.find({}).sort("created_at", -1)
    users = []
    async for u in cursor:
        user_data = serialize_doc(u)
        # Count stories
        story_count = await stories_collection.count_documents({"user_id": str(u["_id"])})
        user_data["story_count"] = story_count
        users.append(user_data)
    return {"users": users}


@app.post("/api/admin/users/{user_id}/credits")
async def admin_grant_credits(user_id: str, req: GrantCreditsRequest, admin=Depends(require_admin)):
    try:
        result = await users_collection.update_one(
            {"_id": ObjectId(user_id)},
            {"$inc": {"credits": req.credits}, "$set": {"updated_at": datetime.utcnow()}}
        )
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user ID")
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    user = await users_collection.find_one({"_id": ObjectId(user_id)})
    return {"message": f"Granted {req.credits} credits", "new_balance": user.get("credits", 0)}


@app.post("/api/admin/users/{user_id}/role")
async def admin_change_role(user_id: str, req: ChangeRoleRequest, admin=Depends(require_admin)):
    try:
        result = await users_collection.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"role": req.role, "updated_at": datetime.utcnow()}}
        )
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user ID")
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": f"Role changed to {req.role}"}
