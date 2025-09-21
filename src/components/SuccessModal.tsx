import React from 'react';

interface SuccessModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onClose: () => void;
}

const SuccessModal: React.FC<SuccessModalProps> = ({
  isOpen,
  title,
  message,
  onClose
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-md z-50">
      <div className="bg-background-light rounded-lg p-md max-w-xs w-full text-center">
        <div className="w-12 h-12 bg-success-bg rounded-full flex items-center justify-center mx-auto mb-sm">
          <span className="material-symbols-outlined text-success-text text-xl">check_circle</span>
        </div>
        <h3 className="text-base font-semibold mb-sm">{title}</h3>
        <p className="text-secondary-text mb-md text-sm">{message}</p>
        <button 
          onClick={onClose}
          className="btn-primary"
        >
          Continue
        </button>
      </div>
    </div>
  );
};

export default SuccessModal;