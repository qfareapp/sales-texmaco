import React from 'react';
import Modal from 'react-modal';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

Modal.setAppElement('#root');

const UpdatePopup = ({ isOpen, onClose, onSubmit, project }) => {
  const [date, setDate] = React.useState(new Date());
  const [count, setCount] = React.useState('');

  const handleSubmit = () => {
    if (!count || count <= 0) return alert('Please enter valid count');
    onSubmit({
      projectId: project.projectId,
      wagonType: project.wagonType,
      date: date.toISOString().split('T')[0],
      wagonsSold: parseInt(count)
    });
    setCount('');
    setDate(new Date());
  };

  return (
    <Modal isOpen={isOpen} onRequestClose={onClose} contentLabel="Update Wagon Count">
      <h3>Update for Project: {project?.projectId}</h3>
      <label>Date:</label><br />
      <DatePicker selected={date} onChange={setDate} /><br /><br />

      <label>Wagons Sold:</label><br />
      <input type="number" value={count} onChange={(e) => setCount(e.target.value)} /><br /><br />

      <button onClick={handleSubmit}>Submit</button>
      <button onClick={onClose} style={{ marginLeft: 10 }}>Cancel</button>
    </Modal>
  );
};

export default UpdatePopup;
