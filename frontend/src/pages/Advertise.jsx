import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { loadStripe } from '@stripe/stripe-js';

const API_BASE = 'https://sociout-backend.onrender.com/api';

// Replace with your Stripe publishable key (test mode)
const stripePromise = loadStripe(import.meta.env.pk_test_51TgIzYAucQ5h6phfEpSyKpAsXufAxBYO0R2JY0C4sPIRZPAIcG3THpWGG2A5EmyzE2rxQVyMbmvTZL2fsyF1lCOZ00GXhqRDOw);

function Advertise() {
  const [slots, setSlots] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [selectedDuration, setSelectedDuration] = useState('');
  const [title, setTitle] = useState('');
  const [targetUrl, setTargetUrl] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [uploading, setUploading] = useState(false);
  const [price, setPrice] = useState(null);
  const { addToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchAvailableSlots();
  }, []);

  const fetchAvailableSlots = async () => {
    try {
      const res = await fetch(`${API_BASE}/ads/available-slots`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      setSlots(data);
    } catch (err) {
      addToast('Failed to load ad slots', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    } else {
      addToast('Please select an image file', 'warning');
    }
  };

  const uploadImage = async () => {
    const formData = new FormData();
    formData.append('file', imageFile);
    const res = await fetch(`${API_BASE}/upload/ad-image`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      body: formData
    });
    if (!res.ok) throw new Error('Upload failed');
    const data = await res.json();
    return data.url;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSlot || !selectedDuration || !title || !targetUrl || !imageFile) {
      addToast('Please fill all fields', 'warning');
      return;
    }
    setUploading(true);
    try {
      // 1. Upload image
      const imageUrl = await uploadImage();
      // 2. Create ad (gets PaymentIntent client secret)
      const res = await fetch(`${API_BASE}/ads/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          title,
          image_url: imageUrl,
          target_url: targetUrl,
          slot: selectedSlot,
          duration_days: parseInt(selectedDuration)
        })
      });
      const data = await res.json();
      if (data.client_secret) {
        // 3. Confirm payment with Stripe
        const stripe = await stripePromise;
        const { error } = await stripe.confirmPayment({
          clientSecret: data.client_secret,
          confirmParams: {
            return_url: `${window.location.origin}/advertise?success=true`
          }
        });
        if (error) {
          addToast(`Payment failed: ${error.message}`, 'error');
        }
      } else {
        addToast('Failed to create ad', 'error');
      }
    } catch (err) {
      addToast('Error creating ad', 'error');
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <div className="p-8">Loading ad slots...</div>;

  const slotOptions = slots ? Object.keys(slots) : [];
  const durations = selectedSlot && slots[selectedSlot] ? slots[selectedSlot] : [];

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Create an Advertisement</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block font-medium mb-1">Title</label>
          <input type="text" className="w-full border rounded p-2" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>
        <div>
          <label className="block font-medium mb-1">Target URL</label>
          <input type="url" className="w-full border rounded p-2" value={targetUrl} onChange={(e) => setTargetUrl(e.target.value)} required />
        </div>
        <div>
          <label className="block font-medium mb-1">Ad Slot</label>
          <select className="w-full border rounded p-2" value={selectedSlot} onChange={(e) => { setSelectedSlot(e.target.value); setSelectedDuration(''); }} required>
            <option value="">Select slot</option>
            {slotOptions.map(slot => <option key={slot} value={slot}>{slot.replace('_', ' ').toUpperCase()}</option>)}
          </select>
        </div>
        {selectedSlot && (
          <div>
            <label className="block font-medium mb-1">Duration</label>
            <select className="w-full border rounded p-2" value={selectedDuration} onChange={(e) => {
              setSelectedDuration(e.target.value);
              const priceItem = durations.find(d => d.duration_days === parseInt(e.target.value));
              setPrice(priceItem ? priceItem.price_dollars : null);
            }} required>
              <option value="">Select duration</option>
              {durations.map(d => <option key={d.duration_days} value={d.duration_days}>{d.duration_days} days – ${d.price_dollars}</option>)}
            </select>
          </div>
        )}
        <div>
          <label className="block font-medium mb-1">Ad Image</label>
          <input type="file" accept="image/*" onChange={handleImageChange} required />
          {imagePreview && <img src={imagePreview} alt="Preview" className="mt-2 h-32 object-contain" />}
        </div>
        {price && <div className="text-lg font-bold">Total: ${price}</div>}
        <button type="submit" disabled={uploading} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50">
          {uploading ? 'Processing...' : 'Pay and Create Ad'}
        </button>
      </form>
    </div>
  );
}

export default Advertise;