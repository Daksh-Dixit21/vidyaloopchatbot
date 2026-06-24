"""
Database Configuration Module.
This module sets up the SQLAlchemy engine and session factory for our SQLite database.
We use SQLAlchemy as an ORM (Object Relational Mapper) to easily map Python classes to database tables.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# The SQLite database file will be created in the root directory.
SQLALCHEMY_DATABASE_URL = "sqlite:///./vidyaloop.db"

# Create the SQLAlchemy engine. 
# check_same_thread=False is needed for SQLite to allow multiple threads (like FastAPI routes) to share the same connection.
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)

# Create a SessionLocal class. Each instance of this class will be an actual database session.
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for our database models. All models will inherit from this Base.
Base = declarative_base()

def init_db():
    """
    Initializes the database by creating all tables defined in models that inherit from `Base`.
    This should be called when the application starts up.
    """
    Base.metadata.create_all(bind=engine)

