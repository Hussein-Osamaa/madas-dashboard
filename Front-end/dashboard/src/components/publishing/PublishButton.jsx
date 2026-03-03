import React, { useState } from 'react';
import { publishSite } from '../../services/publishingService';
import { useAuth } from '../../contexts/AuthContext';

const PublishButton = ({ siteId, siteData, onPublishSuccess, onPublishError }) => {
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishStatus, setPublishStatus] = useState(null);
  const { currentUser } = useAuth();

  const handlePublish = async () => {
    if (!currentUser) {
      onPublishError('You must be logged in to publish a site');
      return;
    }

    setIsPublishing(true);
    setPublishStatus('Preparing to publish...');

    try {
      const result = await publishSite({
        siteId,
        siteData,
        userId: currentUser.uid,
        userName: currentUser.displayName || currentUser.email
      });

      setPublishStatus('Publishing successful!');
      onPublishSuccess(result);
      
      // Reset status after 3 seconds
      setTimeout(() => {
        setPublishStatus(null);
      }, 3000);
    } catch (error) {
      console.error('Publishing error:', error);
      setPublishStatus('Publishing failed');
      onPublishError(error.message);
      
      // Reset status after 5 seconds
      setTimeout(() => {
        setPublishStatus(null);
      }, 5000);
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="publish-button-container">
      <button
        onClick={handlePublish}
        disabled={isPublishing}
        className={`
          px-6 py-3 rounded-lg font-medium transition-all duration-200
          ${isPublishing 
            ? 'bg-gray-400 cursor-not-allowed' 
            : 'bg-green-600 hover:bg-green-700 active:bg-green-800'
          }
          text-white shadow-lg hover:shadow-xl
          flex items-center gap-2
        `}
      >
        {isPublishing ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            Publishing...
          </>
        ) : (
          <>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
            Publish Site
          </>
        )}
      </button>
      
      {publishStatus && (
        <div className={`
          mt-2 px-3 py-2 rounded-md text-sm font-medium
          ${publishStatus.includes('successful') 
            ? 'bg-green-100 text-green-800' 
            : publishStatus.includes('failed')
            ? 'bg-red-100 text-red-800'
            : 'bg-blue-100 text-blue-800'
          }
        `}>
          {publishStatus}
        </div>
      )}
    </div>
  );
};

export default PublishButton;
