import React from 'react';

const ValidationMessages: React.FC<{ success: string; error: string }> = ({ success, error }) => {
    return (
        <>
            {success && <span className="validation-success">{success}</span>}
            {error && <span className="validation-error">{error}</span>}
        </>
    );
};

ValidationMessages.displayName = 'ValidationMessages';
export default ValidationMessages;
