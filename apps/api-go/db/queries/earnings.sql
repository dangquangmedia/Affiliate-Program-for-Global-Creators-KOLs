-- name: ListEarningsForDashboard :many
SELECT
  e.*,
  c.title AS campaign_title
FROM earning e
JOIN participation p ON p.id = e.participation_id
JOIN campaign c ON c.id = p.campaign_id
WHERE e.profile_id = $1 AND e.country_id = $2
ORDER BY e.created_at DESC, e.id DESC;

-- Ledger rows created in one PostgreSQL transaction share CURRENT_TIMESTAMP. The type rank keeps
-- accrual before tax for a deterministic running balance, then falls back to UUID for total order.
-- name: ListLedgerEntriesForProfile :many
SELECT *
FROM ledger_entry
WHERE profile_id = $1 AND country_id = $2
ORDER BY
  created_at ASC,
  CASE entry_type
    WHEN 'EARNING_ACCRUE' THEN 10
    WHEN 'TAX' THEN 20
    WHEN 'PAYOUT_RESERVE' THEN 30
    WHEN 'PAYOUT_PAID' THEN 40
    WHEN 'PAYOUT_RELEASE' THEN 50
    WHEN 'REVERSAL' THEN 60
  END ASC,
  id ASC;
