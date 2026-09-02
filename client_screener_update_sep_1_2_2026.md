# Screener Update Report

**Dates Covered:** September 1, 2026 and September 2, 2026

## Quick Summary

The screener has been updated based on the latest client testing feedback. The main focus was improving Channel filter completeness, correcting misleading or false matched results, making chart verification clearer, and ensuring the client can test results against completed candles only.

## Client Pain Points Addressed

The client reported that some results were showing as matched even when the chart appeared to show the opposite behavior. Several examples were reviewed, especially around Linear Regression Channel results where a candle wick crossed the selected line but the result was still appearing as a match.

This was reviewed and corrected so the screener now handles these cases more strictly and consistently:

- If `Stay Below` is selected, the full latest completed candle must remain below the selected line.
- If the wick crosses above the selected line, the result should fail.
- False matched results caused by stale scan/detail behavior or incomplete candle comparison were reviewed and guarded with additional validation.
- Extra checks were added so these issues are easier to catch before client testing.

The client also reported missing Channel inputs, especially for reclaimed conditions. The missing controls have now been added.

## Work Completed on September 1, 2026

Channel filter behavior was reviewed and improved for the Phase 2 Channel conditions.

Completed updates:

- Verified Phase 2 backend support for Linear Regression Channel, Regression Channel, and Trend Channel.
- Confirmed support for:
  - Piercing From Below
  - Reclaimed From Below
  - Rejected From Above
  - Rejected From Below
- Improved Reclaimed From Below validation so it checks the prior below condition before accepting a reclaim.
- Confirmed old Channel actions continue to work with the existing `window` behavior.
- Confirmed Gap Exclusion remains on hold and was not included in this work.
- Confirmed Channel Confluence was not changed.

## Work Completed on September 2, 2026

Several client-facing Channel and chart verification issues were fixed.

Completed updates:

- Added the missing `middle_zone` option to Trend Channel.
- Added all missing Reclaimed From Below controls:
  - Candles Since Reclaim Min
  - Candles Since Reclaim Max
  - Below Candles Min
  - Below Candles Max
  - Minimum Consecutive Below
  - Require Still Above Now
- Updated Linear Regression Channel and Regression Channel labels to better match the client wording.
- Added coverage for all Trend Channel areas:
  - Bottom Line
  - Top Line
  - Middle Line
  - Bottom Zone
  - Top Zone
  - Middle Zone
- Updated chart behavior so verification is based on completed candles only.
- Added a visible `Completed candles only` badge in the chart header.
- Improved handling when candle completion status is not directly provided by the backend.
- Added validation for cases where `Stay Below` should fail if the latest candle wick crosses above the selected line.

## Result Verification Improvements

The chart now gives clearer confirmation when checking results against TradingView:

- Completed candles only are displayed and used for verification.
- Incomplete latest candles are excluded when the backend marks them as incomplete.
- If completion status is missing, the chart can infer whether the latest candle is still forming based on the selected timeframe.
- The chart header now clearly shows when completed candles only are being used.

This helps avoid confusion where TradingView may show a live forming candle but the screener is evaluating only completed candles.

## Testing and Validation

Validation was added and updated for the latest fixes.

Confirmed checks:

- Channel UI controls are present for all required reclaimed settings.
- Trend Channel supports all expected line and zone options.
- Linear Regression Channel and Regression Channel labels now match the intended client wording.
- Completed candle handling is covered in chart data tests.
- Backend validation confirms `Stay Below` fails when the latest candle wick crosses above the selected line.
- Existing Channel behavior remains stable after the fixes.

## Current Status

The screener is ready for another client testing pass.

Recommended client testing focus:

- Linear Regression Channel `Stay Below`
- Linear Regression Channel `Reclaimed From Below`
- Regression Channel line and zone checks
- Trend Channel `middle_zone`
- Completed candles only comparison against TradingView

## Notes

Gap Exclusion remains on hold and should not be tested in this round.

Watchlist persistence is still a separate known item related to deployment storage and should be finalized after the main screener development is complete.
