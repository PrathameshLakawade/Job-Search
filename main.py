from fastapi import FastAPI, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from PyPDF2 import PdfReader
from elasticsearch import Elasticsearch
from pydantic import BaseModel
from typing import List, Optional
from dotenv import load_dotenv
import os, re

load_dotenv()

app = FastAPI()
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

es = Elasticsearch(
    os.getenv("ES_URI"),
    basic_auth=(os.getenv("ES_USERNAME"), os.getenv("ES_PASSWORD")),
    verify_certs=False
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class Job(BaseModel):
    title: str
    description: str
    location: str
    location_coords: Optional[dict]
    skills: List[str]
    posted_date: str

INDEX_NAME = os.getenv("ES_INDEX")


@app.get("/jobs/")
async def search_jobs(query: str):
    
    query_body = {
        "size": 1000,
        "query": {
            "multi_match": {
                "query": query,
                "fields": ["title", "description", "skills"]
            }
        }
    }
    response = es.search(index=INDEX_NAME, body=query_body)
    return {"jobs": [hit["_source"] for hit in response["hits"]["hits"]]}


@app.get("/filter/")
async def filter_by_time(query: str):
    query_body = {
        "size": 1000,
        "query": {
            "range": {
            "posted_date": {
                "gte": query,
                "lte": "now/d"
            }
            }
        }
    }
    response = es.search(index=INDEX_NAME, body=query_body)
    return {"jobs": [hit["_source"] for hit in response["hits"]["hits"]]}


@app.get("/all")
async def get_all_jobs():
    query_body = {
        "size": 1000,
        "query": {
            "match_all": {}
        }
    }
    response = es.search(index=INDEX_NAME, body=query_body)
    return {"jobs": [hit["_source"] for hit in response["hits"]["hits"]]}


@app.post("/skills")
async def extract_skills(resume: UploadFile):
    upload_dir = './resumes/'
    os.makedirs(upload_dir, exist_ok=True)
    file_path = os.path.join(upload_dir, resume.filename)

    # Save the uploaded file
    try:
        with open(file_path, "wb") as f:
            f.write(await resume.read())
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": f"Error saving file: {str(e)}"})

    # Extract text from the PDF
    try:
        reader = PdfReader(file_path)
        text = "".join(page.extract_text() for page in reader.pages)
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": f"Error reading PDF: {str(e)}"})

    # Extract skills
    skills_keywords = r'skills|technical skills|competencies'
    skills_section = re.search(rf"({skills_keywords}).*?(\n\n|\Z)", text, re.IGNORECASE | re.DOTALL)
    resume_skills = []
    if skills_section:
        skills_text = skills_section.group()
        skills = re.findall(r"\b[A-Za-z]+(?:\s+[A-Za-z]+)*\b", skills_text)
        resume_skills = list(set(skill for skill in skills if len(skill) > 2))

    # Query Elasticsearch for matching jobs
    try:
        query_body = {
            "size": 1000,
            "query": {
                "terms": {
                    "skills": resume_skills
                }
            }
        }
        response = es.search(index=INDEX_NAME, body=query_body)
        jobs = [hit["_source"] for hit in response["hits"]["hits"]]
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": f"Error querying Elasticsearch: {str(e)}"})
    return {"jobs": jobs}