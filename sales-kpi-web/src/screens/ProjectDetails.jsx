import React, { useEffect, useState } from 'react';
import api from '../api';
import axios from 'axios';
import { useParams } from 'react-router-dom';

const ProjectDetails = () => {
  const { id } = useParams();
  const [enquiry, setEnquiry] = useState(null);
  const [newFiles, setNewFiles] = useState([]);
  const [newComment, setNewComment] = useState('');

  useEffect(() => {
    const fetchEnquiry = async () => {
      try {
        const res = await api.get(`/enquiries/${id}`);
        setEnquiry(res.data);
      } catch (err) {
        console.error('Error fetching enquiry:', err);
      }
    };
    fetchEnquiry();
  }, [id]);

  const handleFileChange = (e) => setNewFiles(Array.from(e.target.files));

  const handleUpload = async () => {
    if (!newFiles.length) return alert('Please select at least one file.');
    const formData = new FormData();
    newFiles.forEach(file => formData.append('files', file));

    try {
      const res = await api.post(`/enquiries/${id}/attachments`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setEnquiry(prev => ({
        ...prev,
        attachment: res.data.attachments,
      }));
      setNewFiles([]);
      alert('✅ File(s) uploaded successfully.');
    } catch (err) {
      console.error('Upload failed:', err);
      alert('❌ Upload failed.');
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return alert('Please enter a comment.');

    const updatedComments = [
      ...(enquiry.comments || []),
      { text: newComment, date: new Date().toISOString() }
    ];

    try {
      const res = await api.patch(`/enquiries/${id}`, {
  comments: updatedComments
});

      setEnquiry(prev => ({
        ...prev,
        comments: updatedComments,
      }));
      setNewComment('');
    } catch (err) {
      console.error('Comment update failed:', err);
      alert('❌ Failed to add comment.');
    }
  };

  if (!enquiry) return <div>Loading...</div>;

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: 'auto' }}>
      <h2>Project Details - {enquiry.orderId}</h2>
      <p><strong>Client Name:</strong> {enquiry.clientName}</p>
      <p><strong>Product:</strong> {enquiry.product}</p>
      <p><strong>Remark:</strong> {enquiry.remark || 'N/A'}</p>
      <hr />

      <h3>📎 Attachments</h3>
      {enquiry.attachment && enquiry.attachment.length > 0 ? (
        <ul>
          {enquiry.attachment.map((file, idx) => (
            <li key={idx}>
              <a href={file.url} target="_blank" rel="noopener noreferrer">
                {file.name}
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p>No attachments yet.</p>
      )}

      <div style={{ marginTop: '10px' }}>
        <input type="file" multiple onChange={handleFileChange} />
        <button onClick={handleUpload} style={{ marginLeft: '10px' }}>➕ Add Attachment</button>
      </div>

      <hr />
      <h3>💬 Comments</h3>
      {enquiry.comments && enquiry.comments.length > 0 ? (
        <ul>
          {enquiry.comments.map((comment, idx) => (
            <li key={idx}>
              <strong>{new Date(comment.date).toLocaleString()}:</strong> {comment.text}
            </li>
          ))}
        </ul>
      ) : (
        <p>No comments yet.</p>
      )}

      <div style={{ marginTop: '10px' }}>
        <textarea
          rows="3"
          style={{ width: '100%', padding: '8px' }}
          value={newComment}
          onChange={e => setNewComment(e.target.value)}
          placeholder="Add your comment..."
        />
        <button onClick={handleAddComment} style={{ marginTop: '8px' }}>📝 Add Comment</button>
      </div>
    </div>
  );
};

export default ProjectDetails;
