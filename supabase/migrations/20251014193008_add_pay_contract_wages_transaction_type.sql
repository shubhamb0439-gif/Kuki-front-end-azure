/*
  # Add pay_contract_wages Transaction Type
  
  1. Changes
    - Add 'pay_contract_wages' to the qr_transactions transaction_type check constraint
    
  2. Purpose
    - Contract employees receive one-time payments via QR codes
    - This transaction type allows employers to generate payment QR codes for contract workers
    - Separate from regular monthly wages (pay_wages) for full-time/part-time employees
*/

-- Drop the existing constraint
ALTER TABLE qr_transactions DROP CONSTRAINT IF EXISTS qr_transactions_transaction_type_check;

-- Add the new constraint with pay_contract_wages included
ALTER TABLE qr_transactions ADD CONSTRAINT qr_transactions_transaction_type_check 
CHECK (transaction_type = ANY (ARRAY[
  'pay_wages'::text, 
  'settle_loan'::text, 
  'mark_attendance'::text, 
  'foreclose_loan'::text, 
  'grant_loan'::text,
  'pay_contract_wages'::text
]));