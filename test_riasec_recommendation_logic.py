from backend.riasec_calculator import calculate_relevance, get_recommendations_3_plus_1


def test_calculate_relevance_prioritizes_exact_and_primary():
    jobs = [
        {"id": "1", "title": "Exact", "riasec_code": "RIE"},
        {"id": "2", "title": "PrimaryOnly", "riasec_code": "RAC"},
        {"id": "3", "title": "Partial", "riasec_code": "AIR"},
    ]

    ranked = calculate_relevance("RIE", jobs)
    assert ranked[0]["id"] == "1"
    assert ranked[0]["relevance_score"] > ranked[1]["relevance_score"]


def test_get_recommendations_3_plus_1_structure():
    jobs = [
        {"id": "a", "title": "R1", "riasec_code": "RIC", "videoId": "v1"},
        {"id": "b", "title": "R2", "riasec_code": "RIE", "videoId": "v2"},
        {"id": "c", "title": "R3", "riasec_code": "RAI", "videoId": "v3"},
        {"id": "d", "title": "I1", "riasec_code": "IRC", "videoId": "v4"},
    ]
    scores = {"R": 30, "I": 20, "A": 10, "S": 5, "E": 4, "C": 3}

    result = get_recommendations_3_plus_1(scores, jobs)
    assert len(result["priority"]) == 3
    assert len(result["backup"]) == 1
    assert result["priority"][0]["riasec_code"].startswith("R")
    assert result["backup"][0]["riasec_code"].startswith("I")


def test_get_recommendations_handles_sparse_data():
    jobs = [
        {"id": "a", "title": "Job A", "riasec_code": "ASE", "videoId": "v1"},
        {"id": "b", "title": "Job B", "riasec_code": "CSE", "videoId": "v2"},
    ]
    scores = {"R": 50, "I": 40, "A": 1, "S": 1, "E": 1, "C": 1}

    result = get_recommendations_3_plus_1(scores, jobs)
    assert result["priority"]
    assert "all_sorted_jobs" in result
