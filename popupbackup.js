document.addEventListener('DOMContentLoaded', () => {
    const startLabelingBtn = document.getElementById('startLabeling');
    const labelInstructions = document.getElementById('labelInstructions');
    const statusDiv = document.getElementById('status');
  
    // Enhanced error logging
    function logError(error) {
      console.error('Labeling error:', error);
      statusDiv.textContent = `Error: ${error.message || 'Unknown error'}`;
      
      // Optional: More detailed error display
      if (error.stack) {
        const errorDetails = document.createElement('pre');
        errorDetails.textContent = error.stack;
        statusDiv.appendChild(errorDetails);
      }
    }
  
    startLabelingBtn.addEventListener('click', async () => {
      // Reset status
      statusDiv.textContent = 'Starting labeling process...';
  
      try {
        // Request Gmail authentication with expanded options
        chrome.identity.getAuthToken({ 
          interactive: true,
          scopes: [
            'https://www.googleapis.com/auth/gmail.modify',
            'https://www.googleapis.com/auth/userinfo.email'
          ]
        }, (token) => {
          if (chrome.runtime.lastError) {
            throw new Error(chrome.runtime.lastError.message);
          }
  
          // Send message to background script
          chrome.runtime.sendMessage({
            action: 'startLabeling',
            instructions: labelInstructions.value
          }, (response) => {
            if (chrome.runtime.lastError) {
              logError(chrome.runtime.lastError);
              return;
            }
  
            if (response.error) {
              logError(response.error);
            } else {
              statusDiv.textContent = response.status;
              
              // Optionally, display more detailed results
              if (response.results) {
                const resultsList = document.createElement('ul');
                response.results.forEach(result => {
                  const li = document.createElement('li');
                  li.textContent = `Email ${result.emailId}: ${result.label || 'Error'}`;
                  resultsList.appendChild(li);
                });
                statusDiv.appendChild(resultsList);
              }
            }
          });
        });
      } catch (error) {
        logError(error);
      }
    });
  });
  
  // Logging for debugging
  console.log('Popup script loaded successfully');