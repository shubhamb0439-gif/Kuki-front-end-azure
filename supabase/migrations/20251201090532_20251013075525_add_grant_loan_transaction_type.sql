/*
  # Add grant_loan transaction type
  
  ## Changes
    - Add 'grant_loan' to the qr_transactions transaction_type check constraint
    
  ## Reason
    - When granting loans, employers now generate QR codes for employees to scan
    - This ensures the employee confirms receipt of the loan
    - The 'grant_loan' transaction type needs to be allowed in the qr_transactions table
*/

-- Drop the existing constraint
ALTER TABLE qr_transactions DROP CONSTRAINT IF EXISTS qr_transactions_transaction_type_check;

-- Add the new constraint with grant_loan included
ALTER TABLE qr_transactions ADD CONSTRAINT qr_transactions_transaction_type_check 
CHECK (transaction_type = ANY (ARRAY['pay_wages'::text, 'settle_loan'::text, 'mark_attendance'::text, 'foreclose_loan'::text, 'grant_loan'::text]));