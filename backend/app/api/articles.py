from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel

from app.database import get_db
from app.models.article import Article
from app.models.user import User
from app.core.auth import decode_access_token, get_current_user, require_admin

router = APIRouter(prefix="/api/articles", tags=["Articles"])
security = HTTPBearer()

# ===== SCHEMAS =====
class ArticleCreate(BaseModel):
    title: str
    slug: str
    content: str
    module: str
    order: int = 0
    status: str = "draft"

class ArticleUpdate(BaseModel):
    title: Optional[str] = None
    slug: Optional[str] = None
    content: Optional[str] = None
    module: Optional[str] = None
    order: Optional[int] = None
    status: Optional[str] = None

class ArticleResponse(BaseModel):
    id: int
    title: str
    slug: str
    content: str
    module: str
    order: int
    status: str
    created_by: Optional[int]
    updated_by: Optional[int]
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True

# ===== PUBLIC ENDPOINTS =====
@router.get("/public", response_model=List[ArticleResponse])
def list_published_articles(db: Session = Depends(get_db)):
    """Get all published articles, ordered by module and order."""
    articles = db.query(Article).filter(Article.status == "published").order_by(Article.module, Article.order).all()
    return articles

# ===== ADMIN ENDPOINTS =====
@router.get("/", response_model=List[ArticleResponse])
def list_all_articles(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Get all articles (including drafts) – admin only."""
    articles = db.query(Article).order_by(Article.module, Article.order).all()
    return articles

@router.post("/", response_model=ArticleResponse)
def create_article(
    article: ArticleCreate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Create a new article – admin only."""
    # Check if slug already exists
    existing = db.query(Article).filter(Article.slug == article.slug).first()
    if existing:
        raise HTTPException(status_code=400, detail="Slug already exists")
    
    new_article = Article(
        title=article.title,
        slug=article.slug,
        content=article.content,
        module=article.module,
        order=article.order,
        status=article.status,
        created_by=current_user.id,
        updated_by=current_user.id,
    )
    db.add(new_article)
    db.commit()
    db.refresh(new_article)
    return new_article

@router.put("/{article_id}", response_model=ArticleResponse)
def update_article(
    article_id: int,
    article: ArticleUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Update an existing article – admin only."""
    db_article = db.query(Article).filter(Article.id == article_id).first()
    if not db_article:
        raise HTTPException(status_code=404, detail="Article not found")
    
    # Update fields
    update_data = article.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_article, key, value)
    
    db_article.updated_by = current_user.id
    db_article.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(db_article)
    return db_article

@router.delete("/{article_id}")
def delete_article(
    article_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Delete an article – admin only."""
    db_article = db.query(Article).filter(Article.id == article_id).first()
    if not db_article:
        raise HTTPException(status_code=404, detail="Article not found")
    
    db.delete(db_article)
    db.commit()
    return {"message": "Article deleted successfully"}