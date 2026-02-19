# CareerGo Style Token Map (STY-001)

Date: 2026-02-19
Source style reference: `docs/CareerGo_web_chart.HTML`
Applied in: `backend/static/style.css`

## Brand Tokens
- `--cg-primary-blue`: `#1371A8`
- `--cg-primary-orange`: `#E97423`
- `--cg-accent-blue`: `#1a3cff`
- `--cg-accent-blue-soft`: `#4d7cff`

## Text Tokens
- `--cg-text-main`: `#e2e8f0`
- `--cg-text-soft`: `#cfe0ff`
- `--cg-text-muted`: `#9fb7ff`

## Surface Tokens
- `--cg-bg-900`: `#0b1220`
- `--cg-bg-850`: `#0f1a33`
- `--cg-surface-700`: `rgba(15, 31, 58, 0.6)`
- `--cg-surface-750`: `rgba(15, 31, 58, 0.8)`
- `--cg-surface-800`: `rgba(8, 18, 37, 0.55)`

## Border/Depth/Motion
- `--cg-border-subtle`: `rgba(30, 42, 68, 0.5)`
- `--cg-shadow-lg`: `0 20px 60px rgba(0, 0, 0, 0.5)`
- `--cg-transition`: `all 0.3s ease-in-out`

## Radius Scale
- `--cg-radius-sm`: `8px`
- `--cg-radius-md`: `12px`
- `--cg-radius-lg`: `16px`

## STY-001 Coverage
Token remapping was applied to shared/core selectors:
- Header and nav links
- Loading modal and spinner
- Buttons (`.btn`, `.btn-primary`, `.btn-secondary`)
- Hero visual panel
- Feature cards
- Progress fill/text
- Test section and answer selected state
- Scale explanation/item blocks

## Notes
- This phase is token-first only; no behavior logic was modified.
- Full page harmonization is handled in `STY-002` onward.
