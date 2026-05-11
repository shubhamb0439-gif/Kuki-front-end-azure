import { useState } from 'react';
import { sendSMS, formatPhoneNumber } from '../../lib/twilioHelper';

export default function SMSExample() {
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleSendSMS = async () => {
    if (!phone || !message) {
      setStatus({ type: 'error', message: 'Please enter phone number and message' });
      return;
    }

    setLoading(true);
    setStatus(null);

    const formattedPhone = formatPhoneNumber(phone);
    const result = await sendSMS(formattedPhone, message);

    if (result.success) {
      setStatus({ type: 'success', message: 'SMS sent successfully!' });
      setPhone('');
      setMessage('');
    } else {
      setStatus({ type: 'error', message: result.error || 'Failed to send SMS' });
    }

    setLoading(false);
  };

  return (
    <div className="p-4 max-w-md mx-auto">
      <h2 className="text-xl font-bold mb-4">Send SMS</h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Phone Number</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+1234567890"
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Message</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Enter your message..."
            rows={4}
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>

        <button
          onClick={handleSendSMS}
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Sending...' : 'Send SMS'}
        </button>

        {status && (
          <div
            className={`p-3 rounded-lg ${
              status.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}
          >
            {status.message}
          </div>
        )}
      </div>
    </div>
  );
}
