import { useState } from 'react';
import { Upload, X } from 'lucide-react';

const TimeInModal = ({ isOpen, onClose, onSubmit }) => {
  const [uploadedImage, setUploadedImage] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  if (!isOpen) return null;

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setUploadedImage(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => setUploadedImage(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = () => {
    if (uploadedImage) {
      onSubmit(uploadedImage);
      setUploadedImage(null);
    }
  };

  const handleClose = () => {
    setUploadedImage(null);
    onClose();
  };

  return (
    <div className="overlay">
      <div className="modal">
        <div className="modal-head">
          <h3>Time In</h3>
          <button className="x" onClick={handleClose} aria-label="Close"><X width={18} height={18} /></button>
        </div>
        <div className="modal-body">
          <p className="cell-sub" style={{ marginBottom: 14 }}>
            Please upload a clear image of your assigned vehicle showing the plate number.
          </p>
          {!uploadedImage ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              style={{
                border: `2px dashed ${isDragging ? 'var(--accent)' : 'var(--border)'}`,
                background: isDragging ? 'var(--amber-bg)' : '#fbfdff',
                borderRadius: 12, padding: 26, textAlign: 'center', transition: 'border .15s'
              }}
            >
              <input type="file" id="vehicle-image" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
              <label htmlFor="vehicle-image" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span
                  style={{
                    width: 58, height: 58, borderRadius: '50%', background: 'var(--amber-bg)',
                    display: 'grid', placeItems: 'center', color: 'var(--amber)', marginBottom: 12
                  }}
                >
                  <Upload width={26} height={26} />
                </span>
                <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>Drag and drop your vehicle image here</span>
                <span className="cell-sub" style={{ margin: '6px 0 12px' }}>or</span>
                <span className="btn btn-accent-solid">Browse Files</span>
              </label>
            </div>
          ) : (
            <div style={{ position: 'relative' }}>
              <img src={uploadedImage} alt="Vehicle Preview" style={{ width: '100%', height: 220, objectFit: 'cover', borderRadius: 12 }} />
              <button
                onClick={() => setUploadedImage(null)}
                className="btn btn-danger-ghost"
                style={{ position: 'absolute', top: 8, right: 8, borderRadius: '50%', width: 34, height: 34, padding: 0, justifyContent: 'center', background: '#fff' }}
                aria-label="Remove image"
              >
                <X width={16} height={16} />
              </button>
            </div>
          )}
        </div>
        <div className="modal-foot">
          <button className="btn" onClick={handleClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={!uploadedImage}>
            Submit
          </button>
        </div>
      </div>
    </div>
  );
};

export default TimeInModal;