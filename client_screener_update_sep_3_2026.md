# Screener Update Report

Date: September 3, 2026

## Quick Summary

The screener was updated today based on the latest client testing feedback. The main focus was improving accuracy and making the channel results easier to verify against TradingView.

## What Was Fixed Today

### Channel Result Accuracy

The channel filters were reviewed and improved for the issues reported during testing.

The following areas were checked and corrected:

- Piercing From Below
- Reclaimed From Below
- Rejected From Above
- Rejected From Below
- Trend Channel line and zone behavior

Piercing From Below was adjusted so it is treated as its own condition. It is no longer treated the same as a bounce or a reclaim.

Reclaimed From Below was also reviewed for Trend Channel results, especially cases where the number of candles below the line was outside the selected range. The screener now validates the latest reclaim behavior more strictly against the configured candle limits.

### Client Pain Points Addressed

The client reported that some channel results looked incorrect or too similar across different conditions. These cases were reviewed and fixes were applied so each condition follows its own expected behavior.

The client also reported that some Trend Channel reclaim results were passing even when the stock stayed below the line longer than the selected maximum. This was reviewed and corrected so the candle count is respected more accurately.

### Frontend Verification Improvements

The result chart was improved for Trend Channel checks. Trend Channel matches can now show clearer chart evidence for the selected action.

This helps verify:

- Which candle triggered the condition
- Whether the event happened within the selected candle range
- Whether the selected channel action was applied correctly

### Payload Cleanup

The frontend request payload was cleaned up for channel actions.

Reclaim-only settings are now only sent when the selected action is Reclaimed From Below. Other actions such as Piercing From Below and Rejected From Above no longer include unrelated reclaim fields.

This makes testing cleaner and avoids confusion when reviewing the selected settings.

## Validation Completed

The frontend checks were run after the fixes.

Completed checks:

- Channel UI tests passed
- Indicator normalization tests passed
- Chart evidence tests passed
- Typecheck passed
- Lint passed with existing warnings only
- Production build passed

## Current Testing Status

The latest channel updates are ready for client re-testing.

Recommended items to re-check:

- LRC Piercing From Below
- LRC Rejected From Above
- Trend Channel Reclaimed From Below
- Trend Channel Rejected From Above
- Trend Channel Rejected From Below
- Trend Channel candle range limits

## Notes

Gap Exclusion remains on hold and was not included in today’s work.

Trendy ADX has already received accuracy improvements, but it should still be included in final client validation.

