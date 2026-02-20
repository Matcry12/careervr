from backend.main import (
    build_allowed_job_constraints,
    build_hard_scoped_fallback_response,
    derive_riasec_result_from_scores,
    detect_job_scope_violations,
    build_scoped_ai_query,
    normalize_scores_payload,
)


def test_build_allowed_job_constraints_extracts_entries():
    recommendations = {
        "priority": [{"title": "Software Engineer", "riasec_code": "IRC"}],
        "backup": [{"title": "Data Analyst", "riasec_code": "ICR"}],
        "top_4": [
            {"title": "Software Engineer", "riasec_code": "IRC"},
            {"title": "Data Analyst", "riasec_code": "ICR"},
        ],
    }
    jobs = [
        {"title": "Software Engineer"},
        {"title": "Data Analyst"},
        {"title": "Digital Marketing"},
    ]

    result = build_allowed_job_constraints(recommendations, jobs=jobs)

    assert result["allowed_titles"] == ["Software Engineer", "Data Analyst"]
    assert "Digital Marketing" in result["disallowed_titles"]
    assert "Software Engineer (IRC)" in result["allowed_jobs_text"]


def test_detect_job_scope_violations_flags_disallowed_titles():
    message = "Ban nen thu Digital Marketing trong giai doan nay."
    result = detect_job_scope_violations(
        ai_message=message,
        allowed_titles=["Software Engineer", "Data Analyst"],
        disallowed_titles=["Digital Marketing", "Content Writer"],
    )

    assert "Digital Marketing" in result["violations"]


def test_build_scoped_ai_query_includes_allowed_jobs_contract():
    query = build_scoped_ai_query("Tu van giup em", "Software Engineer (IRC)")
    assert "ALLOWED JOBS" in query
    assert "Software Engineer (IRC)" in query


def test_build_hard_scoped_fallback_response_only_lists_allowed_entries():
    text = build_hard_scoped_fallback_response([
        {"title": "Cong nghe giao duc", "riasec_code": "SIE"},
        {"title": "Dinh duong", "riasec_code": "SIC"},
        {"title": "Edtech", "riasec_code": "EIS"},
        {"title": "Su pham Toan", "riasec_code": "ISA"},
    ])
    assert "Cong nghe giao duc" in text
    assert "Dinh duong" in text
    assert "Edtech" in text
    assert "Su pham Toan" in text


def test_normalize_scores_payload_and_derive_riasec_result():
    scores = normalize_scores_payload({"R": "10", "I": 35, "A": 20, "S": 40, "E": 15, "C": 5})
    assert scores == {"R": 10, "I": 35, "A": 20, "S": 40, "E": 15, "C": 5}
    result = derive_riasec_result_from_scores(scores)
    assert result["top_3_list"] == ["S", "I", "A"]
