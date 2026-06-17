import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useToast } from '../context/ToastContext';

const API_BASE = 'https://sociout-backend.onrender.com/api';
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_YOUR_KEY_HERE');

function Advertise() {
  const [slots, setSlots] = useState({});
  const [myAds, setMyAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [selectedDuration, setSelectedDuration] = useState('');
  const [price, setPrice] = useState(0);
  const [title, setTitle] = useState('');
  const [targetUrl, setTargetUrl] = useState('');
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState('');
  const [clientSecret, setClientSecret] = useState(null);
  const [uploading, setUploading] = useState(false);
  const { addToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    fetchSlots();
    fetchMyAds();
  }, []);

  const fetchSlots = async () => {
    try {
      const res = await fetch(`${API_BASE}/ads/slots`);  // <-- FIXED: /slots not /available-slots
      const data = await res.json();
      setSlots(data);
    } catch (err) {
      addToast('Failed to load ad slots', 'error');
    }
  };

  const fetchMyAds = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/ads/my-ads`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setMyAds(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const uploadMedia = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE}/ads/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData
    });
    if (!res.ok) throw new Error('Upload failed');
    const data = await res.json();
    return data;
  };

  const handleCreateAd = async (e) => {
    e.preventDefault();
    if (!mediaFile) {
      addToast('Please upload an image or video', 'warning');
      return;
    }
    try {
      setUploading(true);
      const { url: media_url, media_type } = await uploadMedia(mediaFile);
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/ads/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title,
          media_url,
          media_type,
          target_url: targetUrl,
          slot: selectedSlot,
          duration_days: parseInt(selectedDuration)
        })
      });
      const data = await res.json();
      if (res.ok) {
        setClientSecret(data.client_secret);
        addToast('Ad created, proceed to payment', 'success');
      } else {
        addToast(data.detail || 'Failed to create ad', 'error');
      }
    } catch (err) {
      addToast('Error creating ad', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleSlotChange = (slot) => {
    setSelectedSlot(slot);
    setSelectedDuration('');
    setPrice(0);
  };

  const handleDurationChange = (duration, priceCents) => {
    setSelectedDuration(duration);
    setPrice(priceCents);
  };

  const handleMediaChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const type = file.type;
      if (type.startsWith('image/') || type.startsWith('video/')) {
        setMediaFile(file);
        setMediaPreview(URL.createObjectURL(file));
      } else {
        addToast('Please upload an image or video file', 'warning');
      }
    }
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Advertise on Sociout</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-8">Promote your product to our audience</p>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Left: Create ad form */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Create an Advertisement</h2>
          {!clientSecret ? (
            <form onSubmit={handleCreateAd}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Ad Title</label>
                <input
                  type="text"
                  className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Target URL</label>
                <input
                  type="url"
                  className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white"
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Ad Media (Image or Video)</label>
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleMediaChange}
                  required
                  className="w-full"
                />
                {mediaPreview && (
                  <div className="mt-2">
                    {mediaFile?.type.startsWith('video/') ? (
                      <video src={mediaPreview} className="h-32 rounded" controls muted />
                    ) : (
                      <img src={mediaPreview} alt="Preview" className="h-32 rounded object-cover" />
                    )}
                  </div>
                )}
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Ad Slot</label>
                <select
                  className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white"
                  value={selectedSlot}
                  onChange={(e) => handleSlotChange(e.target.value)}
                  required
                >
                  <option value="">Select slot</option>
                  {Object.keys(slots).map(slot => (
                    <option key={slot} value={slot}>{slot.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>
              {selectedSlot && slots[selectedSlot] && (
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1">Duration</label>
                  <select
                    className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white"
                    value={selectedDuration}
                    onChange={(e) => {
                      const duration = parseInt(e.target.value);
                      const priceItem = slots[selectedSlot].find(p => p.duration_days === duration);
                      handleDurationChange(duration, priceItem?.price_cents || 0);
                    }}
                    required
                  >
                    <option value="">Select duration</option>
                    {slots[selectedSlot].map(opt => (
                      <option key={opt.duration_days} value={opt.duration_days}>
                        {opt.duration_days} days – ${(opt.price_cents / 100).toFixed(2)}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {price > 0 && (
                <div className="mb-4 p-3 bg-gray-100 dark:bg-gray-700 rounded">
                  Total: <strong>${(price / 100).toFixed(2)}</strong>
                </div>
              )}
              <button
                type="submit"
                disabled={uploading}
                className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 disabled:opacity-50"
              >
                {uploading ? 'Creating...' : 'Proceed to Payment'}
              </button>
            </form>
          ) : (
            <PaymentForm clientSecret={clientSecret} onSuccess={() => { setClientSecret(null); fetchMyAds(); }} />
          )}
        </div>

        {/* Right: My Ads */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
          <h2 className="text-xl font-semibold mb-4">My Advertisements</h2>
          {myAds.length === 0 ? (
            <p className="text-gray-500">No ads yet.</p>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {myAds.map(ad => (
                <div key={ad.id} className="border rounded p-3 flex items-center gap-3">
                  {ad.media_type === 'video' ? (
                    <video src={ad.media_url} className="w-16 h-16 object-cover rounded" muted />
                  ) : (
                    <img src={ad.media_url} alt={ad.title} className="w-16 h-16 object-cover rounded" />
                  )}
                  <div className="flex-1">
                    <p className="font-semibold">{ad.title}</p>
                    <p className="text-sm text-gray-500">Slot: {ad.slot} | {ad.duration_days} days</p>
                    <p className="text-sm">Status: <span className={`font-medium ${ad.status === 'active' ? 'text-green-600' : 'text-yellow-600'}`}>{ad.status}</span></p>
                    <p className="text-xs text-gray-400">Impressions: {ad.impressions} | Clicks: {ad.clicks}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PaymentForm({ clientSecret, onSuccess }) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const { addToast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setProcessing(true);
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: window.location.href },
    });
    if (error) {
      addToast(error.message, 'error');
    } else {
      addToast('Payment successful! Ad will be activated soon.', 'success');
      onSuccess();
    }
    setProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement />
      <button
        type="submit"
        disabled={!stripe || processing}
        className="mt-4 w-full bg-green-500 text-white py-2 rounded hover:bg-green-600 disabled:opacity-50"
      >
        {processing ? 'Processing...' : 'Pay Now'}
      </button>
    </form>
  );
}

export default function AdvertiseWithStripe() {
  return (
    <Elements stripe={stripePromise}>
      <Advertise />
    </Elements>
  );
}