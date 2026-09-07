# Client Progress Update

**Date:** September 07, 2026  
**Subject:** Frontend QA Fixes and Phase 2 Channel Result Verification

## Overview

Today’s work focused on frontend QA fixes for scanner inputs, ADR filter support, completed-candle chart display, and clearer Phase 2 Channel result explanations.

The updates improve usability during filter setup and make scan results easier to verify against chart behavior, especially for Channel Phase 2 reclaim and piercing cases.

## Completed Today

- Fixed clearable number input behavior so users can delete, edit, and temporarily leave values empty without fields snapping back to `0`.
- Applied the clearable input fix to EMA, Channel, and Trendy ADX candle range fields.
- Added clearer EMA period match mode helper text.
- Added the standalone ADR $ scanner filter on the frontend.
- Added ADR request normalization and frontend validation.
- Ensured ADR is not added to the indicators array.
- Kept ADR separate from indicator filters.
- Updated chart display to show completed candles only.
- Added a visible chart badge: `Completed candles only`.
- Completed Phase 2 Channel UI controls for LRC, Regression Channel, and Trend Channel area rules.
- Added missing min/max fields for reclaimed channel behavior.
- Added `middle_zone` as a Trend Channel area option.
- Updated Phase 2 Channel result-detail display for backend-provided evidence.
- Added friendly failure messaging for `below_candles_out_of_range`.
- Added distinct helper text for `piercing_from_below` so it is not confused with reclaim or bounce.

## Phase 2 Channel Improvements

The frontend now exposes the required Phase 2 controls for channel actions.

For Phase 2 actions, users can configure:

- Candles Since Min
- Candles Since Max

For `reclaimed_from_below_bullish`, users can also configure:

- Candles Since Reclaim Min
- Candles Since Reclaim Max
- Below Candles Min
- Below Candles Max
- Minimum Consecutive Below
- Require Still Above Now

The same behavior is available for Trend Channel area rules, including:

- bottom_line
- top_line
- middle_line
- bottom_zone
- top_zone
- middle_zone

## Result Detail Improvements

The result detail panel now shows clearer Phase 2 Channel evidence returned by the backend.

Displayed evidence can include:

- failure_reason
- below_candles
- candles_since
- configured Below Candles Min
- configured Below Candles Max

If the backend returns `failure_reason: "below_candles_out_of_range"`, the frontend now shows:

`Rejected because the latest reclaim was below the line for more candles than allowed.`

For `piercing_from_below`, the frontend explains:

`Piercing From Below requires the candle to open below the line, trade through the line, and close above it.`

## Completed-Candle Chart Update

The chart now aligns with completed-candle scanner behavior.

The frontend:

- Uses backend `is_closed: false` when available.
- Infers incomplete latest candles from candle timestamp and selected timeframe when needed.
- Filters incomplete candles out of the chart display.
- Keeps existing matched candle highlighting working.

## Validation Completed

The following checks were run successfully:

- `npm run typecheck`
- `npm run test`
- `npm run lint`
- `npm run build`

Latest full test run:

- 15 test files passed
- 102 tests passed

Lint completed with existing warnings only.

## Not Included

The following items were intentionally not changed:

- Backend API shape
- Channel Confluence logic
- Gap Exclusion
- Backend ADR logic
- Existing EMA period chips
- Existing EMA custom period input
- Existing EMA `selection_mode` payload
- Existing Channel Phase 2 request payload fields

## Current Status

The frontend updates are ready for client review. The scanner UI now supports the requested clearable inputs, ADR filter setup, completed-candle chart verification, and clearer Phase 2 Channel evidence display without changing backend request payloads.

## Client Review Focus

Recommended review items:

- Confirm EMA, Channel, and Trendy ADX number fields can be cleared and edited normally.
- Confirm ADR $ appears as a standalone scanner filter.
- Confirm ADR validation works for greater than, less than, and between conditions.
- Confirm charts show completed candles only.
- Confirm Trend Channel reclaimed area rules show all required min/max fields.
- Confirm Phase 2 Channel result details show below-candle evidence when backend returns it.
- Confirm `piercing_from_below` is explained as piercing, not reclaim or bounce.
