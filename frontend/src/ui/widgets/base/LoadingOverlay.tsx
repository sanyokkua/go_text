import React from 'react';
import LoadingSpinner from './LoadingSpinner';

type LoadingOverlayProps = { isLoading: boolean };

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ isLoading }) => {
    if (!isLoading) return null;

    return (
        <div className="loading-overlay">
            <LoadingSpinner />
        </div>
    );
};

export default LoadingOverlay;
