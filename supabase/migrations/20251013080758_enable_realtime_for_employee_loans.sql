/*
  # Enable realtime for employee_loans table
  
  ## Changes
    - Enable realtime replication for employee_loans table
    
  ## Reason
    - When an employee scans a QR code to receive a loan grant, the employer's view needs to update automatically
    - Realtime subscriptions allow the employer modal to refresh loan data immediately when a loan is created
*/

-- Enable realtime for employee_loans table
ALTER PUBLICATION supabase_realtime ADD TABLE employee_loans;