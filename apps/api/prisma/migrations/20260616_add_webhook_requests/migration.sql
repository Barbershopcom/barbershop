-- Tabela para deduplicação de webhooks
CREATE TABLE IF NOT EXISTS webhook_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_type TEXT NOT NULL,
  request_id TEXT NOT NULL,
  processed_at TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  UNIQUE(webhook_type, request_id)
);

CREATE INDEX webhook_requests_webhook_type_idx ON webhook_requests(webhook_type);
CREATE INDEX webhook_requests_processed_at_idx ON webhook_requests(processed_at);
