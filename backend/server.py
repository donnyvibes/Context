from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
import httpx
import uuid
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="ContextOS API", version="1.0.0")

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB connection
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017/contextos")
client = AsyncIOMotorClient(MONGO_URL)
db = client.contextos

# Collections
users_collection = db.users
prompts_collection = db.prompts
categories_collection = db.categories
sessions_collection = db.sessions

# Pydantic Models
class User(BaseModel):
    id: str
    email: str
    name: str
    picture: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class SessionData(BaseModel):
    user_id: str
    session_token: str
    expires_at: datetime

class Prompt(BaseModel):
    id: Optional[str] = None
    title: str
    content: str
    category: str
    variables: List[str] = []
    user_id: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class PromptCreate(BaseModel):
    title: str
    content: str
    category: str

class PromptUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    category: Optional[str] = None

class Category(BaseModel):
    id: str
    name: str
    description: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

# Categories
DEFAULT_CATEGORIES = [
    {"id": "content-creation", "name": "Content Creation", "description": "Social media, copywriting"},
    {"id": "development", "name": "Development", "description": "Code prompts, technical"},
    {"id": "business", "name": "Business", "description": "Emails, proposals, analysis"},
    {"id": "general", "name": "General", "description": "Catch-all for misc prompts"}
]

# Helper Functions
def extract_variables(content: str) -> List[str]:
    """Extract {{variable}} placeholders from prompt content"""
    import re
    pattern = r'\{\{(\w+)\}\}'
    return list(set(re.findall(pattern, content)))

async def get_current_user(x_session_id: Optional[str] = Header(None)):
    """Dependency to get current authenticated user"""
    if not x_session_id:
        raise HTTPException(status_code=401, detail="Session ID required")
    
    session = await sessions_collection.find_one({"session_token": x_session_id})
    if not session or datetime.utcnow() > session["expires_at"]:
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    
    user = await users_collection.find_one({"id": session["user_id"]})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    return user

# Initialize default categories
@app.on_event("startup")
async def startup_event():
    for category in DEFAULT_CATEGORIES:
        existing = await categories_collection.find_one({"id": category["id"]})
        if not existing:
            await categories_collection.insert_one(category)

# Authentication Routes
@app.post("/api/auth/session")
async def create_session(x_session_id: str = Header(...)):
    """Authenticate user with Emergent auth service"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": x_session_id}
            )
        
        if response.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid session")
        
        auth_data = response.json()
        
        # Check if user exists
        existing_user = await users_collection.find_one({"email": auth_data["email"]})
        
        if not existing_user:
            # Create new user
            user_data = {
                "id": auth_data["id"],
                "email": auth_data["email"],
                "name": auth_data["name"],
                "picture": auth_data["picture"],
                "created_at": datetime.utcnow()
            }
            await users_collection.insert_one(user_data)
        
        # Create session
        session_data = {
            "user_id": auth_data["id"],
            "session_token": auth_data["session_token"],
            "expires_at": datetime.utcnow() + timedelta(days=7)
        }
        await sessions_collection.insert_one(session_data)
        
        return {"session_token": auth_data["session_token"], "user": auth_data}
        
    except httpx.RequestError:
        raise HTTPException(status_code=500, detail="Authentication service unavailable")

@app.get("/api/auth/profile")
async def get_profile(current_user: dict = Depends(get_current_user)):
    """Get current user profile"""
    return current_user

# Category Routes
@app.get("/api/categories", response_model=List[Category])
async def get_categories(current_user: dict = Depends(get_current_user)):
    """Get all categories"""
    categories = await categories_collection.find().to_list(100)
    return categories

# Prompt Routes
@app.post("/api/prompts", response_model=Prompt)
async def create_prompt(prompt: PromptCreate, current_user: dict = Depends(get_current_user)):
    """Create a new prompt"""
    variables = extract_variables(prompt.content)
    
    prompt_data = {
        "id": str(uuid.uuid4()),
        "title": prompt.title,
        "content": prompt.content,
        "category": prompt.category,
        "variables": variables,
        "user_id": current_user["id"],
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    await prompts_collection.insert_one(prompt_data)
    return prompt_data

@app.get("/api/prompts", response_model=List[Prompt])
async def get_prompts(
    category: Optional[str] = None,
    search: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get user's prompts with optional filtering"""
    query = {"user_id": current_user["id"]}
    
    if category:
        query["category"] = category
    
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"content": {"$regex": search, "$options": "i"}}
        ]
    
    prompts = await prompts_collection.find(query).sort("updated_at", -1).to_list(100)
    return prompts

@app.get("/api/prompts/{prompt_id}", response_model=Prompt)
async def get_prompt(prompt_id: str, current_user: dict = Depends(get_current_user)):
    """Get a specific prompt"""
    prompt = await prompts_collection.find_one({"id": prompt_id, "user_id": current_user["id"]})
    if not prompt:
        raise HTTPException(status_code=404, detail="Prompt not found")
    return prompt

@app.put("/api/prompts/{prompt_id}", response_model=Prompt)
async def update_prompt(
    prompt_id: str, 
    prompt_update: PromptUpdate, 
    current_user: dict = Depends(get_current_user)
):
    """Update a prompt"""
    existing_prompt = await prompts_collection.find_one({"id": prompt_id, "user_id": current_user["id"]})
    if not existing_prompt:
        raise HTTPException(status_code=404, detail="Prompt not found")
    
    update_data = {"updated_at": datetime.utcnow()}
    
    if prompt_update.title is not None:
        update_data["title"] = prompt_update.title
    if prompt_update.content is not None:
        update_data["content"] = prompt_update.content
        update_data["variables"] = extract_variables(prompt_update.content)
    if prompt_update.category is not None:
        update_data["category"] = prompt_update.category
    
    await prompts_collection.update_one(
        {"id": prompt_id, "user_id": current_user["id"]},
        {"$set": update_data}
    )
    
    updated_prompt = await prompts_collection.find_one({"id": prompt_id, "user_id": current_user["id"]})
    return updated_prompt

@app.delete("/api/prompts/{prompt_id}")
async def delete_prompt(prompt_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a prompt"""
    result = await prompts_collection.delete_one({"id": prompt_id, "user_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Prompt not found")
    return {"message": "Prompt deleted successfully"}

# Template Routes
@app.post("/api/prompts/{prompt_id}/generate")
async def generate_from_template(
    prompt_id: str,
    variables: Dict[str, str],
    current_user: dict = Depends(get_current_user)
):
    """Generate text from prompt template with variables"""
    prompt = await prompts_collection.find_one({"id": prompt_id, "user_id": current_user["id"]})
    if not prompt:
        raise HTTPException(status_code=404, detail="Prompt not found")
    
    content = prompt["content"]
    
    # Replace variables
    for var_name, var_value in variables.items():
        content = content.replace(f"{{{{{var_name}}}}}", var_value)
    
    return {"generated_content": content, "variables_used": variables}

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "timestamp": datetime.utcnow()}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)