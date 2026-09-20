import { useState, useEffect } from 'react';
import { Upload, X, Loader2, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import Tesseract from 'tesseract.js';

const TimeInModal = ({ isOpen, onClose, onSubmit, assignedPlateNumber, submissionError }) => {
  const [uploadedImage, setUploadedImage] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [detectedPlate, setDetectedPlate] = useState('');
  const [verificationStatus, setVerificationStatus] = useState(null); // 'success', 'failed', null
  const [error, setError] = useState('');

  // Update error when submissionError prop changes
  useEffect(() => {
    if (submissionError) {
      setError(submissionError);
      // Reset upload state to allow retry
      setUploadedImage(null);
      setDetectedPlate('');
      setVerificationStatus(null);
    } else {
      setError('');
    }
  }, [submissionError]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setUploadedImage(null);
      setDetectedPlate('');
      setVerificationStatus(null);
      setError('');
    }
  }, [isOpen]);

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
      processImage(file);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      processImage(file);
    }
  };

  const processImage = async (file) => {
    setError('');
    setVerificationStatus(null);
    setDetectedPlate('');
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      const imageData = e.target.result;
      setUploadedImage(imageData);
      setIsProcessing(true);

      try {
        // Perform OCR using Tesseract.js
        const result = await Tesseract.recognize(
          imageData,
          'eng',
          {
            logger: (m) => {
              // Optional: log progress
              if (m.status === 'recognizing text') {
                // Can show progress if needed
              }
            }
          }
        );

        const extractedText = result.data.text;
        
        // Extract potential plate numbers (alphanumeric sequences)
        const platePattern = /[A-Z]{2,3}?\s?[A-Z0-9]{3,8}/gi;
        const matches = extractedText.match(platePattern);
        
        let detectedPlateNumber = '';
        if (matches && matches.length > 0) {
          // Take the longest match which is likely the plate number
          detectedPlateNumber = matches.reduce((a, b) => a.length > b.length ? a : b);
          detectedPlateNumber = detectedPlateNumber.replace(/\s/g, '').toUpperCase();
        }

        setDetectedPlate(detectedPlateNumber);
        setIsProcessing(false);

        // Verify against assigned plate number
        if (detectedPlateNumber && assignedPlateNumber) {
          const normalizedDetected = detectedPlateNumber.replace(/[^A-Z0-9]/g, '');
          const normalizedAssigned = assignedPlateNumber.replace(/[^A-Z0-9]/g, '');
          
          if (normalizedDetected === normalizedAssigned) {
            setVerificationStatus('success');
          } else {
            setVerificationStatus('failed');
            setError(`Plate number mismatch. Detected: ${detectedPlateNumber}, Assigned: ${assignedPlateNumber}`);
          }
        } else {
          setVerificationStatus('failed');
          setError(detectedPlateNumber ? 'Could not verify plate number' : 'No plate number detected in image. Please upload a clearer image showing the vehicle plate number.');
        }

      } catch (err) {
        console.error('OCR Error:', err);
        setIsProcessing(false);
        setVerificationStatus('failed');
        setError('Failed to process image. Please try again with a clearer image.');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRetry = () => {
    setUploadedImage(null);
    setDetectedPlate('');
    setVerificationStatus(null);
    setError('');
  };

  const handleSubmit = () => {
    if (uploadedImage && verificationStatus === 'success') {
      // Only allow submission when verification succeeded
      setError(''); // Clear any previous errors
      onSubmit(uploadedImage, detectedPlate);
    } else if (uploadedImage && verificationStatus === 'failed') {
      // Don't allow submission if verification failed
      setError('Cannot submit with failed verification. Please upload a clearer image showing the correct vehicle plate number.');
    } else if (!uploadedImage) {
      setError('Please upload an image first.');
    } else {
      setError('Please wait for verification to complete.');
    }
  };

  const handleClose = () => {
    // Reset all internal state before closing
    setUploadedImage(null);
    setDetectedPlate('');
    setVerificationStatus(null);
    setError('');
    // Call parent close function
    onClose();
  };

  return (
    <div className="overlay">
      <div className="modal">
        <div className="modal-head">
          <h3>Time In - Vehicle Verification</h3>
          <button className="x" onClick={handleClose} aria-label="Close"><X width={18} height={18} /></button>
        </div>
        <div className="modal-body">
          <p className="cell-sub" style={{ marginBottom: 14 }}>
            Please upload a clear image of your assigned vehicle showing the plate number.
            <br />
            <strong>Assigned Plate: {assignedPlateNumber || 'Not assigned'}</strong>
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
            <div>
              <div style={{ position: 'relative', marginBottom: 16 }}>
                <img src={uploadedImage} alt="Vehicle Preview" style={{ width: '100%', height: 220, objectFit: 'cover', borderRadius: 12 }} />
                {isProcessing && (
                  <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.5)', display: 'grid', placeItems: 'center',
                    borderRadius: 12
                  }}>
                    <div style={{ textAlign: 'center', color: '#fff' }}>
                      <Loader2 width={32} height={32} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 8px' }} />
                      <span style={{ fontSize: 14 }}>Processing image...</span>
                    </div>
                  </div>
                )}
                {!isProcessing && (
                  <button
                    onClick={handleRetry}
                    className="btn btn-danger-ghost"
                    style={{ position: 'absolute', top: 8, right: 8, borderRadius: '50%', width: 34, height: 34, padding: 0, justifyContent: 'center', background: '#fff' }}
                    aria-label="Remove image"
                  >
                    <RefreshCw width={16} height={16} />
                  </button>
                )}
              </div>

              {!isProcessing && (
                <div style={{ background: '#f8fafc', borderRadius: 8, padding: 12, marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span className="cell-sub">Detected Plate Number:</span>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>{detectedPlate || 'Not detected'}</span>
                  </div>
                  
                  {verificationStatus === 'success' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#16a34a' }}>
                      <CheckCircle width={16} height={16} />
                      <span style={{ fontWeight: 600, fontSize: 13 }}>Verification Successful</span>
                    </div>
                  )}
                  
                  {verificationStatus === 'failed' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#dc2626' }}>
                      <XCircle width={16} height={16} />
                      <span style={{ fontWeight: 600, fontSize: 13 }}>Verification Failed</span>
                    </div>
                  )}
                </div>
              )}

              {error && (
                <div className="error-msg" style={{ marginBottom: 12 }}>
                  {error}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="modal-foot">
          <button className="btn" onClick={handleClose}>Cancel</button>
          <button 
            className="btn btn-primary" 
            onClick={handleSubmit} 
            disabled={!uploadedImage || isProcessing || verificationStatus !== 'success'}
          >
            {isProcessing ? 'Processing...' : 'Submit Time In'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TimeInModal;