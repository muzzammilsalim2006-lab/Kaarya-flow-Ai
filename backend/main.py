from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict
import shutil
import os
import time

app = FastAPI(title="KaaryaFlow AI Backend", version="1.1.0")

# CORS middleware to allow requests from Next.js dashboard
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Stateful mapping of officer cooldowns (in minutes)
# We set Officer Shinde with 60 mins remaining to demonstrate active locks in the UI.
officer_cooldowns = {
    "Officer Patil": 0,
    "Officer Deshmukh": 0,
    "Officer Shinde": 60,  # 60 mins remaining on a previous shift lock
    "Officer Joshi": 0,
}

# Counter Database representation with extended CCTV and operational metrics
counters = [
    {
        "id": "counter-1",
        "name": "Counter 1",
        "service_name": "DL Renewal",
        "required_skill": "DL",
        "officer": "Officer Patil",
        "officer_skills": ["DL", "TAX"],
        "queue_length": 25,  # High Load 🔴
        "avg_processing_time_mins": 12,
        "dwell_time_mins": 27,
        "status": "critical",
        "pressure_score": 0,
    },
    {
        "id": "counter-2",
        "name": "Counter 2",
        "service_name": "Property Tax",
        "required_skill": "TAX",
        "officer": "Officer Deshmukh",
        "officer_skills": ["TAX"],
        "queue_length": 3,   # Low Load 🟢
        "avg_processing_time_mins": 5,
        "dwell_time_mins": 4,
        "status": "idle",
        "pressure_score": 0,
    },
    {
        "id": "counter-3",
        "name": "Counter 3",
        "service_name": "RC Transfer",
        "required_skill": "RC",
        "officer": "Officer Shinde",
        "officer_skills": ["RC", "TAX"],
        "queue_length": 14,  # Normal Load 🟠
        "avg_processing_time_mins": 8,
        "dwell_time_mins": 15,
        "status": "normal",
        "pressure_score": 0,
    },
    {
        "id": "counter-4",
        "name": "Counter 4",
        "service_name": "Birth Certificate",
        "required_skill": "DOC",
        "officer": "Officer Joshi",
        "officer_skills": ["DOC", "DL"],  # Certified in DL
        "queue_length": 2,   # Low Load 🟢
        "avg_processing_time_mins": 4,
        "dwell_time_mins": 3,
        "status": "idle",
        "pressure_score": 0,
    },
]

def recalculate_pressure_scores():
    for c in counters:
        # Pressure Score Formula = (Queue Length * Processing Time) + Dwell Time
        c["pressure_score"] = (c["queue_length"] * c["avg_processing_time_mins"]) + c["dwell_time_mins"]
        
        # Recalculate status thresholds
        if c["queue_length"] >= 20:
            c["status"] = "critical"
        elif c["queue_length"] <= 4:
            c["status"] = "idle"
        else:
            c["status"] = "normal"

# Initialize pressure scores
recalculate_pressure_scores()

class CounterResponse(BaseModel):
    id: str
    name: str
    service_name: str
    required_skill: str
    officer: str
    officer_skills: List[str]
    queue_length: int
    avg_processing_time_mins: int
    dwell_time_mins: int
    status: str
    pressure_score: int
    cooldown_remaining_mins: int

class OptimizationResult(BaseModel):
    source_counter_id: Optional[str] = None
    target_counter_id: Optional[str] = None
    officer_to_move: Optional[str] = None
    projected_wait_time_reduction_percent: int
    recommendation_text: str
    cooldown_enforced_mins: int
    skill_validated: bool

class ReallocationApproval(BaseModel):
    source_counter_id: str
    target_counter_id: str
    officer_to_move: str

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "KaaryaFlow AI Engine"}

@app.get("/api/v1/kaaryaflow/counter-metrics", response_model=List[CounterResponse])
def get_counter_metrics():
    # Return metrics along with current cooldown status from our state map
    response_data = []
    for c in counters:
        c_copy = c.copy()
        c_copy["cooldown_remaining_mins"] = officer_cooldowns.get(c["officer"].split(" + ")[0], 0)
        response_data.append(c_copy)
    return response_data

@app.post("/api/v1/kaaryaflow/optimize-staffing", response_model=OptimizationResult)
def optimize_staffing():
    recalculate_pressure_scores()
    
    # High pressure counters (>150 pressure score)
    high_pressure = [c for c in counters if c["pressure_score"] > 150]
    # Low pressure counters (<30 pressure score)
    low_pressure = [c for c in counters if c["pressure_score"] < 30]

    if not high_pressure:
        return OptimizationResult(
            projected_wait_time_reduction_percent=0,
            recommendation_text="All counters operating within safe pressure thresholds. No staffing reallocations recommended.",
            cooldown_enforced_mins=120,
            skill_validated=True
        )

    if not low_pressure:
        return OptimizationResult(
            projected_wait_time_reduction_percent=0,
            recommendation_text="Operational bottleneck detected, but no low-pressure counters are available for reallocation.",
            cooldown_enforced_mins=120,
            skill_validated=True
        )

    # Sort target counters by highest pressure score to prioritize biggest bottlenecks
    targets = sorted(high_pressure, key=lambda x: x["pressure_score"], reverse=True)

    for target in targets:
        required_skill = target["required_skill"]
        
        # Filter sources: must be low-pressure, and the officer must possess the required skill,
        # AND the officer must not be locked by cooldown policy (>0 cooldown remaining)
        valid_sources = []
        for source in low_pressure:
            officer_name = source["officer"].split(" + ")[0] # handle joint officers name
            cooldown = officer_cooldowns.get(officer_name, 0)
            
            # Check skill competency
            has_skill = required_skill in source["officer_skills"]
            
            # Verify cooldown status (threshold policy)
            has_no_cooldown = cooldown <= 0
            
            if has_skill and has_no_cooldown:
                valid_sources.append(source)

        if valid_sources:
            # Reallocate from the lowest pressure source counter
            source = min(valid_sources, key=lambda x: x["pressure_score"])
            officer_name = source["officer"].split(" + ")[0]
            reduction_percent = 38  # Projected reduction in average dwell time
            
            recommendation_text = (
                f"Reallocate {officer_name} from {source['service_name']} ({source['name']}) "
                f"to {target['service_name']} ({target['name']}) for 120 mins. "
                f"Projected wait reduction: {reduction_percent}%. (Skill matrix validated, cooldown verified)."
            )
            
            return OptimizationResult(
                source_counter_id=source["id"],
                target_counter_id=target["id"],
                officer_to_move=officer_name,
                projected_wait_time_reduction_percent=reduction_percent,
                recommendation_text=recommendation_text,
                cooldown_enforced_mins=120,
                skill_validated=True
            )

    # Fallback response if officers exist but are all blocked by active Cooldown Policy
    blocked_officers = []
    for source in low_pressure:
        officer_name = source["officer"].split(" + ")[0]
        if officer_cooldowns.get(officer_name, 0) > 0:
            blocked_officers.append(f"{officer_name} (Cooldown: {officer_cooldowns[officer_name]}m remaining)")

    blocker_msg = f"Reallocation blocked by Cooldown Policy. Blocked resources: {', '.join(blocked_officers)}." if blocked_officers else "No qualified officers are currently available."

    return OptimizationResult(
        projected_wait_time_reduction_percent=0,
        recommendation_text=f"Bottlenecks detected at {targets[0]['service_name']}, but reallocation is deferred. {blocker_msg}",
        cooldown_enforced_mins=120,
        skill_validated=True
    )

@app.post("/api/v1/kaaryaflow/approve-reallocation")
def approve_reallocation(approval: ReallocationApproval):
    global counters
    source_cid = approval.source_counter_id
    target_cid = approval.target_counter_id
    officer = approval.officer_to_move

    source_counter = next((c for c in counters if c["id"] == source_cid), None)
    target_counter = next((c for c in counters if c["id"] == target_cid), None)

    if not source_counter or not target_counter:
        return {"status": "error", "message": "Counters not found."}

    # Enforce Cooldown lock (120 minutes / 2 hours) on the reallocated officer
    officer_cooldowns[officer] = 120

    # 1. Update officers
    target_counter["officer"] = f"{target_counter['officer']} + {officer} (Assisting)"
    source_counter["officer"] = f"None ({officer} reallocated)"
    
    # 2. Update queue and dwell times in memory database
    target_counter["queue_length"] = max(2, target_counter["queue_length"] - 13)
    target_counter["dwell_time_mins"] = max(3, target_counter["dwell_time_mins"] - 14)
    
    source_counter["queue_length"] = min(30, source_counter["queue_length"] + 1)
    
    # 3. Recalculate operational pressure scores
    recalculate_pressure_scores()

    return {
        "status": "reallocation_approved",
        "officer": officer,
        "cooldown_locked_mins": 120,
        "counters": counters
    }

@app.post("/api/v1/kaaryaflow/cctv-analyze")
async def analyze_cctv(file: UploadFile = File(...)):
    # Simulates physical CCTV file uploads and zone parsing
    file_path = "videos/uploaded_video.mp4"
    os.makedirs("videos", exist_ok=True)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Analyze video using our queue detector (uses YOLO if available, fallback simulation if not)
    from queue_detector import analyze_video_feed
    average_counts = analyze_video_feed(file_path)

    # Sync these extracted queue lengths to our database counters
    global counters
    for c in counters:
        cid_num = int(c["id"].split("-")[1])
        if cid_num in average_counts:
            c["queue_length"] = average_counts[cid_num]
            
    recalculate_pressure_scores()

    return {
        "source": "CCTV Camera Stream",
        "extracted_zone_queues": average_counts,
        "status": "analysis_complete"
    }
