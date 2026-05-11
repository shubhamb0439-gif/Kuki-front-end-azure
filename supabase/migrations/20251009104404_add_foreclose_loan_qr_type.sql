/*
  # Add Foreclose Loan to QR Transaction Types
  
  1. Changes
    - Update qr_transactions table transaction_type constraint
    - Add 'foreclose_loan' as a valid transaction type
    - This allows QR codes for loan foreclosure
  
  2. Security
    - Maintains all existing RLS policies
    - No changes to access control
*/

-- Drop existing constraint
ALTER TABLE qr_transactions DROP CONSTRAINT IF EXISTS qr_transactions_transaction_type_check;

-- Add new constraint with foreclose_loan included
ALTER TABLE qr_transactions ADD CONSTRAINT qr_transactions_transaction_type_check 
  CHECK (transaction_type IN ('pay_wages', 'settle_loan', 'mark_attendance', 'foreclose_loan'));