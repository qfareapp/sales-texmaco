import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import axios from 'axios';

const EnquiryUpdateForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pricePerWagon, setPricePerWagon] = useState('');
  const [projectId, setProjectId] = useState('');
  const [gstPercent, setGstPercent] = useState('');
  const [wagonOptions, setWagonOptions] = useState([]);

  useEffect(() => {
    api
      .get(`/enquiries/${id}`)
      .then((res) => {
        setFormData(res.data);
        setPricePerWagon(res.data.pricePerWagon || '');
        setProjectId(res.data.projectId || '');
        setGstPercent(res.data.gstPercent || '');
        setLoading(false);
      })
      .catch((err) => {
        console.error('❌ Failed to load enquiry:', err);
        alert('❌ Failed to load enquiry data.');
        setLoading(false);
      });
       // Fetch available wagon types for dropdown
    api
      .get('/wagons')
      .then((res) => {
        const types = res.data.map(w => w.wagonType);
        setWagonOptions(types);
      })
      .catch((err) => {
        console.error('❌ Failed to load wagon types:', err);
      });
  }, [id]);

  const handleChange = (field) => (e) => {
  const updated = { ...formData, [field]: e.target.value };
  setFormData(updated);
  if (field === 'stage') {
    console.log('🚦 Updated stage:', e.target.value); // debug log
  }
};

  const totalQuotedPrice =
    formData?.stage === 'Quoted' && pricePerWagon
      ? Number(pricePerWagon) *
        Number(formData.noOfRakes || 0) *
        Number(formData.wagonsPerRake || 0)
      : formData?.quotedPrice;

  const gstAmount =
    formData?.stage === 'Confirmed' && gstPercent
      ? ((totalQuotedPrice * Number(gstPercent)) / 100).toFixed(2)
      : 0;

  const handleSubmit = async () => {
    try {
      const updated = {
        ...formData,
        projectId,
        gstPercent: formData.stage === 'Confirmed' ? gstPercent : undefined,
        gstAmount: formData.stage === 'Confirmed' ? gstAmount : undefined,
      };

      if (formData.stage === 'Quoted' && pricePerWagon) {
        updated.pricePerWagon = pricePerWagon;
        updated.quotedPrice = totalQuotedPrice;
      }

      if (formData.stage === 'Confirmed') {
        if (!projectId.trim()) {
          alert('❌ Project ID is required when confirming an order.');
          return;
        }
        if (!gstPercent || isNaN(gstPercent)) {
          alert('❌ GST % is required when confirming an order.');
          return;
        }
      }

      await api.patch(`/enquiries/${id}`, updated);
      alert('✅ Enquiry updated successfully!');
      navigate('/');
    } catch (err) {
      console.error('❌ Failed to update:', err);
      alert('❌ Failed to update enquiry.');
    }
  };

  if (loading || !formData) return <div>Loading...</div>;

  const isStageEditableOnly = ['Confirmed', 'Cancelled', 'Lost'].includes(formData.stage);

  return (
  <div style={{ padding: '20px', maxWidth: '600px', margin: 'auto' }}>
    <h2>Update Enquiry: {formData.orderId}</h2>

    <label>Client Name:</label>
    <input
      type="text"
      value={formData.clientName || ''}
      onChange={handleChange('clientName')}
      disabled={isStageEditableOnly}
      style={{ width: '100%', marginBottom: '10px' }}
    />

    <label>Stage:</label>
    <select
      value={formData.stage || ''}
      onChange={handleChange('stage')}
      style={{ width: '100%', marginBottom: '10px' }}
    >
      <option value="Enquiry">Enquiry</option>
      <option value="Quoted">Quoted</option>
      <option value="Cancelled">Cancelled</option>
      <option value="Confirmed">Confirmed</option>
      <option value="Lost">Lost</option>
    </select>

    {/* ✅ Wagon Type (input or dropdown based on stage) */}
    <label>Wagon Type:</label>
    {formData.stage === 'Quoted' ? (
      <select
        value={formData.wagonType || ''}
        onChange={handleChange('wagonType')}
        disabled={isStageEditableOnly}
        style={{ width: '100%', marginBottom: '10px' }}
      >
        <option value="">Select Wagon Type</option>
        {wagonOptions.map((type, i) => (
          <option key={i} value={type}>{type}</option>
        ))}
      </select>
    ) : (
      <input
        type="text"
        value={formData.wagonType || ''}
        onChange={handleChange('wagonType')}
        disabled={isStageEditableOnly}
        style={{ width: '100%', marginBottom: '10px' }}
      />
    )}

    <label>No. of Rakes:</label>
    <input
      type="number"
      value={formData.noOfRakes || ''}
      disabled
      style={{ width: '100%', marginBottom: '10px' }}
    />

    <label>Wagons per Rake:</label>
    <input
      type="number"
      value={formData.wagonsPerRake || ''}
      disabled
      style={{ width: '100%', marginBottom: '10px' }}
    />

    <label>Price per Wagon:</label>
    <input
      type="number"
      value={pricePerWagon}
      onChange={(e) => setPricePerWagon(e.target.value)}
      disabled={formData.stage !== 'Quoted'}
      style={{ width: '100%', marginBottom: '10px' }}
    />

    <label>Total Quoted Price:</label>
    <input
      type="number"
      value={totalQuotedPrice || ''}
      disabled
      style={{
        width: '100%',
        marginBottom: '10px',
        fontWeight: 'bold',
        backgroundColor: '#f0f0f0',
      }}
    />

    {formData.stage === 'Confirmed' && (
      <>
        <label>Project ID <span style={{ color: 'red' }}>*</span>:</label>
        <input
          type="text"
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          required
          style={{ width: '100%', marginBottom: '10px' }}
        />

        <label>GST % <span style={{ color: 'red' }}>*</span>:</label>
        <input
          type="number"
          value={gstPercent}
          onChange={(e) => setGstPercent(e.target.value)}
          required
          style={{ width: '100%', marginBottom: '10px' }}
        />

        <label>GST Amount:</label>
        <input
          type="number"
          value={gstAmount}
          disabled
          style={{
            width: '100%',
            marginBottom: '10px',
            backgroundColor: '#f9f9f9',
            fontWeight: 'bold',
          }}
        />
      </>
    )}

    <label>Product:</label>
    <input
      type="text"
      value={formData.product || ''}
      onChange={handleChange('product')}
      disabled={isStageEditableOnly}
      style={{ width: '100%', marginBottom: '10px' }}
    />

    <label>Owner:</label>
    <input
      type="text"
      value={formData.owner || ''}
      onChange={handleChange('owner')}
      disabled={isStageEditableOnly}
      style={{ width: '100%', marginBottom: '20px' }}
    />

    <button
      onClick={handleSubmit}
      style={{
        padding: '10px 20px',
        backgroundColor: '#007bff',
        color: '#fff',
        border: 'none',
        cursor: 'pointer',
      }}
    >
      Save Changes
    </button>
  </div>
);
};

export default EnquiryUpdateForm;
