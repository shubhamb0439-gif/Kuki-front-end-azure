/*
  # Add Currency Support

  1. Changes
    - Add `currency` column to `employee_wages` table (default: 'USD')
    - Add `currency` column to `employee_loans` table
    - Add `currency` column to `employee_bonuses` table
    - Ensure currency is consistent across all financial records for an employee

  2. Notes
    - Currency defaults to USD for existing records
    - When setting wages, currency is selected and applied to all financial operations
    - Supported currencies: USD, EUR, GBP, INR, JPY, CNY, AUD, CAD, etc.
*/

-- Add currency column to employee_wages
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'employee_wages' AND column_name = 'currency'
  ) THEN
    ALTER TABLE employee_wages ADD COLUMN currency text DEFAULT 'USD' NOT NULL;
  END IF;
END $$;

-- Add currency column to employee_loans
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'employee_loans' AND column_name = 'currency'
  ) THEN
    ALTER TABLE employee_loans ADD COLUMN currency text DEFAULT 'USD' NOT NULL;
  END IF;
END $$;

-- Add currency column to employee_bonuses
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'employee_bonuses' AND column_name = 'currency'
  ) THEN
    ALTER TABLE employee_bonuses ADD COLUMN currency text DEFAULT 'USD' NOT NULL;
  END IF;
END $$;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_employee_wages_currency ON employee_wages(currency);
CREATE INDEX IF NOT EXISTS idx_employee_loans_currency ON employee_loans(currency);
CREATE INDEX IF NOT EXISTS idx_employee_bonuses_currency ON employee_bonuses(currency);