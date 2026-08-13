import { LogOut } from 'lucide-react';

const TimeOutModal = ({ isOpen, onClose, onConfirm }) => {
  if (!isOpen) return null;

  return (
    <div className="overlay">
      <div className="modal" style={{ maxWidth: 480 }}>
        <div className="modal-head">
          <h3>Time Out</h3>
        </div>
        <div className="modal-body" style={{ textAlign: 'center', paddingTop: 26 }}>
          <span
            style={{
              width: 72, height: 72, borderRadius: '50%', background: 'var(--amber-bg)',
              display: 'grid', placeItems: 'center', color: 'var(--amber)', margin: '0 auto 14px'
            }}
          >
            <LogOut width={32} height={32} />
          </span>
          <div style={{ fontWeight: 700, fontSize: 16 }}>Are you sure you want to time out?</div>
          <p className="cell-sub" style={{ marginTop: 4 }}>This action will end your current shift.</p>
        </div>
        <div className="modal-foot">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-accent-solid" onClick={onConfirm}>Time Out</button>
        </div>
      </div>
    </div>
  );
};

export default TimeOutModal;