import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# We grab the database credentials from the docker-compose environment variables.
# Note: SQLAlchemy needs the 'postgresql+psycopg2' prefix to know which driver to use.
DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "postgresql+psycopg2://admin:rootpassword@db:5432/prism_crm"
)

# The engine is the actual connection pool to Postgres
engine = create_engine(DATABASE_URL)

# Each request will get its own temporary session to talk to the database
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# All our models will inherit from this Base class
Base = declarative_base()

# A helper function we will use later in our API endpoints to get a database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()