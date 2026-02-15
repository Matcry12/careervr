# Implementation Plan - Recommendation System & VR Upgrade (v4)

Status: Proposed (not implemented yet)  
Owner: Product + Backend + Frontend  
Target system: `careervr` monolith (`FastAPI + Jinja + Vanilla JS`)

## 1. Executive Summary
This plan upgrades recommendation quality and user experience by introducing:
- `3+1` recommendation output (3 priority + 1 backup).
- Backend-owned ranking (single source of truth) using fuzzy weighted scoring.
- AI guardrails to constrain Dify responses to valid in-database jobs.
- Results-to-VR interaction (click recommendation -> open video modal).
- Teacher operations tooling (Excel template + bulk import + validation).

## 2. Goals and Success Criteria
### Product Goals
1. Improve recommendation precision and consistency across Results, VR, and Chatbot.
2. Reduce AI hallucinations (recommendations for jobs without available videos).
3. Enable non-technical teachers to manage VR jobs in bulk.

### Measurable Success Criteria
1. `100%` of recommendation displays come from backend-ranked data (no frontend re-ranking).
2. `0` AI recommendations outside allowed top-4 list in validation tests.
3. Excel import rejects invalid files with explicit 4xx errors (no 500 crashes).
4. From Results page, clicking any recommended job opens playable modal in <= 1 interaction.

## 3. Scope
### In Scope
- Recommendation algorithm and API contract changes.
- VR job model extension with required `riasec_code`.
- Dify prompt guardrails based on computed top jobs.
- Excel template download + import endpoint.
- Frontend updates in Results + VR pages.
- Automated tests for algorithm/API/UI interaction.

### Out of Scope
- Replacing Dify provider.
- Redesigning whole UI theme.
- Multi-language i18n overhaul.
- Full database migration framework (lightweight runtime migration only).

## 4. Current-State Gaps
1. Recommendation logic is duplicated between backend and frontend.
2. VR jobs currently do not enforce a structured `riasec_code`.
3. Chatbot prompt is not strictly bounded to available jobs.
4. Teacher bulk import workflow does not exist.
5. Results page recommendations are not directly connected to VR modal playback.

## 5. Target Architecture
### Design Principles
1. Backend computes and ranks once; frontend only renders.
2. All user-facing recommendation channels use the same ranked payload.
3. Validation at API boundaries (schema + semantic checks).
4. Backward compatibility where possible during rollout.

### Data Flow
1. User submits answers.
2. Backend computes RIASEC scores and top trait order.
3. Backend ranks VR jobs with weighted fuzzy algorithm.
4. Backend returns:
   - `priority` (3 jobs)
   - `backup` (1 job)
   - `all_sorted_jobs` (full ranked list)
5. Frontend renders exactly this payload.
6. Chatbot receives top-4 list in prompt and must recommend only from that list.

## 6. Algorithm Specification
### 6.1 Inputs
- Student code (ordered 3-letter string, e.g. `RIE`) derived from RIASEC scores.
- Job records each containing `riasec_code` (3 letters, e.g. `RAC`).

### 6.2 Weighted Scoring Rules
For each job:
1. Primary trait match (`job[0] == student[0]`): `+50`
2. Full code exact match (`job == student`): `+30`
3. Partial overlap: `+10` for each shared letter
4. No overlap: `+0`

Sort by `score DESC`, then deterministic tie-breakers:
1. Exact match first
2. Primary trait match first
3. Alphabetical by title (stable output)

### 6.3 3+1 Selection
1. `trait_1` = highest score trait.
2. `trait_2` = second highest score trait.
3. `priority`: top 3 jobs where `job.riasec_code[0] == trait_1`.
4. `backup`: top 1 job where `job.riasec_code[0] == trait_2`.
5. If insufficient jobs:
   - Fill remaining slots from global ranked list (excluding duplicates).
6. If all scores are zero:
   - Fallback to jobs with primary trait = `trait_1`; if none, return first N stable jobs.

## 7. API Contract Changes
## 7.1 VR Job Model
File: `backend/main.py` (Pydantic model), persistence payload

Add required field:
- `riasec_code: str` (uppercase 3-letter code from `[R,I,A,S,E,C]`)

Validation:
- Must match regex `^[RIASEC]{3}$`
- Stored uppercase

### 7.2 Recommendation Response Schema
Used by `run-riasec` and conversation bootstrap response:

```json
{
  "riasec_scores": {"R": 0, "I": 0, "A": 0, "S": 0, "E": 0, "C": 0},
  "top_3_types": ["R", "I", "E"],
  "recommendations": {
    "priority": [ { "id": "...", "title": "...", "riasec_code": "..." } ],
    "backup":   [ { "id": "...", "title": "...", "riasec_code": "..." } ],
    "all_sorted_jobs": [ { "id": "...", "title": "...", "riasec_code": "...", "score": 90 } ]
  }
}
```

### 7.3 New Endpoints
1. `GET /api/vr-jobs/template`
- Returns downloadable `.xlsx` template with columns:
  - `Job Title`, `Video URL`, `Description`, `RIASEC_Code`, `Icon_URL`

2. `POST /api/vr-jobs/import`
- Accepts multipart Excel file.
- Validates required columns and non-empty `RIASEC_Code`.
- Normalizes codes to uppercase.
- Returns structured import report (`created`, `updated`, `skipped`, `errors[]`).

## 8. AI Guardrails (Dify)
File: `backend/main.py` (`start_conversation`, `chat` prep)

Inject structured constraints in prompt context:
1. Include top-4 allowed jobs (IDs + titles).
2. Explicit instruction: recommend only from allowed list.
3. If user asks outside list, AI should explain limitation and map to nearest allowed option.

Minimum expected guardrail text:
- "Only recommend jobs from this allowed list."
- "Do not invent job titles."

## 9. Frontend Changes
### 9.1 `backend/static/script.js`
1. `showResults(...)`
- Render separate sections:
  - Priority (3 cards, high emphasis)
  - Backup (1 card, secondary emphasis)
- Click opens modal with selected job video/details.

2. `renderVRJobs(...)`
- Use backend `all_sorted_jobs` when available.
- Do not apply client-side sorting.
- Top 4 cards show "Highly Recommended" badge.

3. Add `openJobModal(job)` abstraction
- Reuse existing `openVideoModal(videoId, title)` with enriched details.

4. Add `handleImport()`
- Upload template-filled Excel.
- Show import summary and validation errors in UI.

### 9.2 Templates
1. `backend/templates/vr.html`
- Add:
  - "Download Template" button
  - "Upload Excel" control
  - Teacher tooltip:
    - "Use 3-letter RIASEC code (e.g., RIA). First letter should be primary trait."

2. `backend/templates/results.html`
- Ensure modal container exists or shared modal partial is included.
- Recommendation items must be clickable.

## 10. Data Migration and Backward Compatibility
1. Existing jobs without `riasec_code`:
- Runtime fallback:
  - infer from mapping if available; otherwise mark invalid and exclude from ranked results.
2. Temporary compatibility window:
- Accept old job payloads but warn in logs.
3. After rollout:
- Enforce strict `riasec_code` requirement for create/update/import.

## 11. Implementation Phases
### Phase 1 - Backend Core
1. Add model validation for `riasec_code`.
2. Implement `calculate_relevance(...)` in `backend/riasec_calculator.py`.
3. Implement `get_recommendations_3_plus_1(...)`.
4. Expose recommendations in API responses.

Exit criteria:
- Unit tests pass for scoring, sorting, fallback, and 3+1 behavior.

### Phase 2 - AI Guardrails
1. Integrate ranked top-4 into Dify payload.
2. Add response validation checks in tests.

Exit criteria:
- Hallucination test passes against controlled prompts.

### Phase 3 - Frontend Integration
1. Update Results and VR rendering to backend payload.
2. Add cross-tab modal interaction.

Exit criteria:
- Results click opens modal correctly.
- Visual priority sections render consistently.

### Phase 4 - Teacher Tools
1. Add template endpoint + import endpoint.
2. Add VR admin import UI and error display.

Exit criteria:
- Valid file imports succeed.
- Invalid files return clear, non-500 errors.

### Phase 5 - Hardening
1. End-to-end regression tests.
2. Basic monitoring logs for import/recommendation pipeline.
3. Documentation updates (`README.md`, API examples).

## 12. Verification Plan
### Automated Tests
1. Unit:
- Weighted scoring correctness
- Tie-break determinism
- 3+1 selector with sparse data
- `riasec_code` validation

2. Integration:
- `POST /run-riasec` returns structured recommendations
- `POST /start-conversation` includes allowed list context
- `POST /api/vr-jobs/import` success + validation failures

3. UI/E2E (manual or scripted):
- Results page recommendation click -> video modal opens
- VR page top 4 ordering follows backend ranking
- Import UX shows report and errors

### Critical Test Cases
1. Zero-match fallback:
- Input impossible/rare code.
- Expect non-empty fallback recommendations.

2. AI hallucination:
- Ask broad question in chatbot.
- Expect recommended jobs only from allowed top-4 list.

3. Excel validation:
- Missing `RIASEC_Code` column or empty values.
- Expect `400` with explicit message.

4. Cross-tab interaction:
- Click recommendation on Results.
- Expect immediate modal playback without navigating to VR tab.

## 13. Risks and Mitigations
1. Risk: Inconsistent legacy data quality.
- Mitigation: strict validation + import report + compatibility fallback.

2. Risk: AI still occasionally escapes constraints.
- Mitigation: stronger prompt guardrails + post-response validator (optional hardening).

3. Risk: Frontend drift from API contract.
- Mitigation: typed response schema docs + integration tests.

4. Risk: Performance on large job lists.
- Mitigation: O(n) scoring; cache ranked results per request.

## 14. Definition of Done
1. All new endpoints implemented and documented.
2. Recommendation pipeline fully backend-driven.
3. Results, VR, and Chatbot consume same ranked source.
4. Excel import/template available from VR admin UI.
5. Test suite updated; critical paths passing.
6. No high-severity regressions in auth, submissions, community, or dashboard.

## 15. Files to Modify (Planned)
1. `requirements.txt` (`pandas`, `openpyxl`)
2. `backend/riasec_calculator.py`
3. `backend/main.py`
4. `backend/database.py` (if needed for migration/validation support)
5. `backend/static/script.js`
6. `backend/templates/vr.html`
7. `backend/templates/results.html`
8. Tests:
   - `test_backend_full.py`
   - `test_backend_features.py`
   - add focused unit tests for scoring/import logic

