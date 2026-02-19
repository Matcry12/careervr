# Community UI Visual Sign-Off Steps (2026-02-19)

Purpose: Final manual browser validation after COM-UI-311..315 static/code checks.

## 1) Setup
1. Start backend:
```bash
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```
2. Open `http://localhost:8000/community`
3. Hard refresh (`Ctrl+Shift+R`)
4. Open DevTools:
- Disable cache
- Keep Console tab visible for JS errors

## 2) Desktop Checks (1366px, 1024px)
1. General layout
- [ ] Center feed is visually dominant
- [ ] Side widgets are secondary (not louder than feed)
- [ ] No horizontal scroll

2. Composer
- [ ] Single quick action button appears (`Tạo bài viết mới`)
- [ ] Clicking composer shell or button opens modal
- [ ] Composer status messages stay inside box

3. Feed and cards
- [ ] Long title does not overflow card boundaries
- [ ] Long author name + badge does not break layout
- [ ] Action buttons wrap cleanly without clipping
- [ ] Comment text wraps correctly

4. Right column
- [ ] Order is: Related -> Admin (if admin) -> Next step
- [ ] Cards have softer visual weight than center content

## 3) Mobile/Small Checks (768px, 430px, 390px, 360px)
1. Layout and spacing
- [ ] No horizontal scroll at each width
- [ ] Filter controls stack/read comfortably
- [ ] Buttons remain tappable and not clipped

2. Overflow stress
- [ ] Very long post title wraps correctly
- [ ] Long mixed-language words do not escape panel
- [ ] Status/error/warning text stays within status blocks

3. Interaction
- [ ] Discover/RAG switch works
- [ ] Pagination buttons remain visible and usable
- [ ] Open/close composer modal works via button and ESC

## 4) Role Checks
1. Non-admin account
- [ ] Admin reports panel hidden
- [ ] Normal user feed actions work

2. Admin account
- [ ] Admin reports panel visible
- [ ] Panel content not overflowing

## 5) Sign-Off Matrix
| Area | Result (Pass/Fail) | Notes |
|---|---|---|
| Desktop 1366 |  |  |
| Desktop 1024 |  |  |
| Tablet 768 |  |  |
| Mobile 430 |  |  |
| Mobile 390 |  |  |
| Mobile 360 |  |  |
| Non-admin mode |  |  |
| Admin mode |  |  |

## 6) If Fail Found
Record each issue with:
- Viewport size
- Account role
- Repro steps
- Expected vs actual
- Screenshot filename

Then append findings into:
- `docs/reports/COMMUNITY_UI_UX_RELAX_QA_2026-02-19.md`
