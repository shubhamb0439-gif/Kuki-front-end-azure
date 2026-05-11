/*
  # Enable Realtime for QR Transactions

  1. Changes
    - Enable realtime replication for qr_transactions table
    - This allows employers to receive real-time updates when employees scan QR codes

  2. Purpose
    - Enables auto-closing of QR code modal when transaction is completed
    - Provides instant feedback to employers
*/

-- Enable realtime for qr_transactions table
ALTER PUBLICATION supabase_realtime ADD TABLE qr_transactions;
