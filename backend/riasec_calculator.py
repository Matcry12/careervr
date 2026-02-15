import json
from typing import Any, Dict, List, Optional

VALID_RIASEC = {"R", "I", "A", "S", "E", "C"}
DEFAULT_ORDER = ["R", "I", "A", "S", "E", "C"]

def calculate_riasec(answers_json):
    """
    Calculate RIASEC scores from 50 questions.
    
    Part 1: RIASEC Interests (Q1-24, 4 per category)
    - Q1-4: R (Realistic)
    - Q5-8: I (Investigative)
    - Q9-12: A (Artistic)
    - Q13-16: S (Social)
    - Q17-20: E (Enterprising)
    - Q21-24: C (Conventional)
    
    Part 2: Skills/Abilities (Q25-38, mixed RIASEC)
    Part 3: Values (Q39-46, mixed RIASEC)
    Part 4: Practical Conditions (Q47-50, mixed RIASEC)
    """
    
    # Parse input
    answers = json.loads(answers_json) if isinstance(answers_json, str) else answers_json
    
    if len(answers) != 50:
        raise ValueError("khong_du_50_cau")
    
    # =====================
    # PART 1: RIASEC BASE (1-24)
    # =====================
    R = sum(answers[0:4])      # Q1-4
    I = sum(answers[4:8])      # Q5-8
    A = sum(answers[8:12])     # Q9-12
    S = sum(answers[12:16])    # Q13-16
    E = sum(answers[16:20])    # Q17-20
    C = sum(answers[20:24])    # Q21-24
    
    # =====================
    # PART 2: SKILLS (Q25-38) - ADD TO BASE
    # =====================
    R += answers[24] + answers[28] + answers[29]  # Q25, Q29, Q30
    I += answers[25] + answers[30] + answers[31]  # Q26, Q31, Q32
    A += answers[32] + answers[33] + answers[41]  # Q33, Q34, Q42
    S += answers[27] + answers[34] + answers[35]  # Q28, Q35, Q36 (NOTE: Q28 is giao tiếp but mapped to S here)
    E += answers[26] + answers[36] + answers[37]  # Q27, Q37, Q38 (NOTE: Q27 is máy tính but mapped to E here)
    C += answers[38] + answers[39] + answers[44]  # Q39, Q40, Q45
    
    # =====================
    # TOTAL RIASEC SCORES
    # =====================
    riasec_scores = {
        "R": R,
        "I": I,
        "A": A,
        "S": S,
        "E": E,
        "C": C
    }
    
    # =====================
    # TOP 3
    # =====================
    top_3_riasec = sorted(
        riasec_scores,
        key=riasec_scores.get,
        reverse=True
    )[:3]
    
    # =====================
    # RETURN - MATCHES DIFY VARIABLES
    # =====================
    return {
        "full_scores": riasec_scores,
        "score_R": R,
        "score_I": I,
        "score_A": A,
        "score_S": S,
        "score_E": E,
        "score_C": C,
        "top_1_type": top_3_riasec[0],
        "top_3_list": top_3_riasec
    }


def _normalize_code(code: Any) -> str:
    if isinstance(code, list):
        code = "".join(str(c) for c in code)
    if code is None:
        return ""
    normalized = "".join(ch for ch in str(code).upper() if ch in VALID_RIASEC)
    return normalized[:3]


def _extract_job_code(job: Dict[str, Any]) -> str:
    return _normalize_code(job.get("riasec_code") or job.get("code"))


def _ordered_top_traits(scores: Dict[str, int]) -> List[str]:
    return sorted(DEFAULT_ORDER, key=lambda t: (-scores.get(t, 0), DEFAULT_ORDER.index(t)))


def calculate_relevance(student_code: Any, all_jobs: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Weighted matching between student RIASEC code and job RIASEC code.
    Rules:
    - +50 primary trait match (job first letter == student first letter)
    - +30 full code match
    - +10 per matching letter overlap
    """
    normalized_student = _normalize_code(student_code)
    if len(normalized_student) < 3:
        return []

    student_set = set(normalized_student)
    ranked: List[Dict[str, Any]] = []

    for index, job in enumerate(all_jobs):
        code = _extract_job_code(job)
        if len(code) < 3:
            continue

        overlap_count = sum(1 for letter in code if letter in student_set)
        primary_match = code[0] == normalized_student[0]
        full_match = code == normalized_student
        score = (50 if primary_match else 0) + (30 if full_match else 0) + (10 * overlap_count)

        ranked.append({
            **job,
            "riasec_code": code,
            "relevance_score": score,
            "overlap_count": overlap_count,
            "is_primary_match": primary_match,
            "is_full_match": full_match,
            "_original_index": index,
        })

    ranked.sort(
        key=lambda item: (
            -item["relevance_score"],
            -int(item["is_full_match"]),
            -int(item["is_primary_match"]),
            str(item.get("title", "")).lower(),
            str(item.get("id", item["_original_index"]))
        )
    )
    for item in ranked:
        item.pop("_original_index", None)
    return ranked


def get_recommendations_3_plus_1(
    scores: Dict[str, int],
    all_jobs: List[Dict[str, Any]],
    top_3: Optional[List[str]] = None
) -> Dict[str, Any]:
    ordered_traits = top_3[:] if top_3 else _ordered_top_traits(scores)[:3]
    ordered_traits = [_normalize_code(t)[:1] for t in ordered_traits if _normalize_code(t)]
    if len(ordered_traits) < 3:
        ordered_traits = _ordered_top_traits(scores)[:3]

    student_code = "".join(ordered_traits[:3])
    ranked = calculate_relevance(student_code, all_jobs)

    trait_1 = ordered_traits[0]
    trait_2 = ordered_traits[1] if len(ordered_traits) > 1 else ordered_traits[0]

    priority = [job for job in ranked if job["riasec_code"][0] == trait_1][:3]
    used_ids = {job.get("id") for job in priority}

    backup = []
    for job in ranked:
        if job.get("id") in used_ids:
            continue
        if job["riasec_code"][0] == trait_2:
            backup = [job]
            used_ids.add(job.get("id"))
            break

    if len(priority) < 3:
        for job in ranked:
            if job.get("id") in used_ids:
                continue
            priority.append(job)
            used_ids.add(job.get("id"))
            if len(priority) == 3:
                break

    if not backup:
        for job in ranked:
            if job.get("id") in used_ids:
                continue
            backup = [job]
            break

    # Defensive fallback in case ranking is empty (e.g., no valid codes)
    if not ranked and all_jobs:
        fallback_jobs = []
        for job in all_jobs:
            code = _extract_job_code(job)
            if len(code) < 3:
                continue
            fallback_jobs.append({**job, "riasec_code": code, "relevance_score": 0})
        ranked = fallback_jobs
        priority = ranked[:3]
        backup = ranked[3:4]

    return {
        "student_code": student_code,
        "primary_trait": trait_1,
        "secondary_trait": trait_2,
        "priority": priority,
        "backup": backup,
        "top_4": priority + backup,
        "all_sorted_jobs": ranked,
    }

def recommend_jobs(top_3_riasec):
    """
    Recommend jobs based on user's Top 3 RIASEC types.
    Logic:
    1. Filter jobs with >= 2 matching letters.
    2. Score: 10 pts per match. +20 if 3 matches. +5 if 1st letter matches.
    3. Return top 3 recommendations (names) joined by comma.
    """
    from job_data import MAJORS_DB # Import inside function to avoid circular dep if any
    
    user_codes = top_3_riasec # e.g. ["R", "I", "C"]
    
    recommendations = []
    
    for job in MAJORS_DB:
        job_codes = job["code"].split("-") # "R-I-C" -> ["R", "I", "C"]
        
        # Count matches
        intersection = [c for c in job_codes if c in user_codes]
        match_count = len(intersection)
        
        if match_count < 2:
            continue
            
        # Score
        score = match_count * 10
        if match_count == 3:
            score += 20
        if job_codes[0] == user_codes[0]:
            score += 5
            
        recommendations.append({
            "name": job["name"],
            "score": score
        })
        
    # Sort descending
    recommendations.sort(key=lambda x: x["score"], reverse=True)
    
    if not recommendations:
        return "Chưa xác định"
        
    # Return top 3 recommendations joined by comma
    top_recs = [rec["name"] for rec in recommendations[:3]]
    return ", ".join(top_recs)

# Example usage
if __name__ == "__main__":
    # Sample 50 answers (all 3s)
    sample_answers = [3] * 50
    result = calculate_riasec(json.dumps(sample_answers))
    print(json.dumps(result, indent=2))
    
    # Test recommendation
    rec = recommend_jobs(result["top_3_list"])
    print(f"Recommended: {rec}")
