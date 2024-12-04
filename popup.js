// document.addEventListener('DOMContentLoaded', () => {
//     const startLabelingBtn = document.getElementById('startLabeling');
//     const labelInstructions = document.getElementById('labelInstructions');
//     const statusDiv = document.getElementById('status');
  
//     function logError(error) {
//       console.error('Labeling error:', error);
      
//       // Detailed error logging
//       const errorMessage = error instanceof Error 
//         ? error.message 
//         : (typeof error === 'object' 
//             ? JSON.stringify(error) 
//             : String(error));
      
//       statusDiv.textContent = `Error: ${errorMessage}`;
      
//       // Optional: Stack trace for Error objects
//       if (error instanceof Error && error.stack) {
//         const stackTrace = document.createElement('pre');
//         stackTrace.textContent = error.stack;
//         statusDiv.appendChild(stackTrace);
//       }
//     }
  
//     startLabelingBtn.addEventListener('click', async () => {
//       // Reset status
//       statusDiv.textContent = 'Starting labeling process...';
  
//       try {
//         // Request Gmail authentication
//         chrome.identity.getAuthToken({ 
//           interactive: true,
//           scopes: [
//             'https://www.googleapis.com/auth/gmail.modify',
//             'https://www.googleapis.com/auth/userinfo.email'
//           ]
//         }, (token) => {
//           // Check for authentication errors
//           if (chrome.runtime.lastError) {
//             throw new Error(chrome.runtime.lastError.message);
//           }
  
//           // Send labeling request to background script
//           chrome.runtime.sendMessage({
//             action: 'startLabeling',
//             instructions: labelInstructions.value
//           }, (response) => {
//             // Check for message sending errors
//             if (chrome.runtime.lastError) {
//               logError(chrome.runtime.lastError);
//               return;
//             }
  
//             // Handle response
//             if (response.error) {
//               logError(response.error);
//             } else {
//               statusDiv.textContent = response.status;
              
//               // Display detailed results
//               if (response.results) {
//                 const resultsList = document.createElement('ul');
//                 response.results.forEach(result => {
//                   const li = document.createElement('li');
//                   li.textContent = `Email ${result.emailId}: ${result.label || 'Error'}`;
//                   resultsList.appendChild(li);
//                 });
//                 statusDiv.appendChild(resultsList);
//               }
//             }
//           });
//         });
//       } catch (error) {
//         logError(error);
//       }
//     });
  
//     console.log('Popup script loaded successfully');
//   });


//------------------------------
// document.addEventListener('DOMContentLoaded', () => {
//   const startLabelingBtn = document.getElementById('startLabeling');
//   const generateThreadBtn = document.getElementById('generateThreadSummary');
//   const labelInstructions = document.getElementById('labelInstructions');
//   const statusDiv = document.getElementById('status');
//   const closeBtn = document.getElementById('closeExtension');

//   // Prevent popup from closing when clicking outside
//   window.addEventListener('blur', function(e) { 
//     // Refocus the window to keep popup open
//     window.focus();
//   });
//   async function generateThreadSummary() {
//     try {
//       // Send message to content script to extract thread text
      
//       chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
//         if (!tabs[0]) {
//           throw new Error('No active tab found');
//         }
//         console.log("before sendmessage",tabs[0].id)

//         chrome.tabs.sendMessage(tabs[0].id, { action: 'extractThreadText' }, async (response) => {
//           console.log(response)
//           if (chrome.runtime.lastError) {
//             logError(chrome.runtime.lastError);
//             return;
//           }

//           if (!response || !response.threadText) {
//             logError(new Error('No thread text extracted'));
//             return;
//           }

//           // Determine summary length from slider

//           try {
//             // Use on-device AI to generate summary
//             const ai = window.ai;
//             const llmModel = 
//               await (ai.languageModel?.create?.() || 
//                      ai.createLanguageModel?.() || 
//                      ai.models?.languageModel?.create?.());

//             if (!llmModel) {
//               throw new Error('Could not create language model');
//             }

//             // Prompt for summary generation
//             const summaryPrompt = `
//             Generate a concise summary of the following email thread. 
          
            
//             Thread Content:
//             ${response.threadText}
            
            
            
//             IMPORTANT:
//             - Capture key points and main ideas
//             - Adjust detail level based on length scale
//             - Maintain clarity and coherence
//             `;

//             const summary = await llmModel.prompt(summaryPrompt);

//             // Display summary in status div
//             statusDiv.innerHTML = ''; // Clear previous content
//             const summaryEl = document.createElement('div');
//             summaryEl.classList.add('success');
//             summaryEl.innerHTML = `
//               <h3>Thread Summary</h3>
//               <p>${summary}</p>
//             `;
//             statusDiv.appendChild(summaryEl);

//           } catch (aiError) {
//             logError(aiError);
//           }
//         });
//       });
//     } catch (error) {
//       logError(error);
//     }
//   }
 

//   function logError(error) {
//     console.error('Labeling error:', error);
    
//     // Detailed error logging
//     const errorMessage = error instanceof Error 
//       ? error.message 
//       : (typeof error === 'object' 
//           ? JSON.stringify(error) 
//           : String(error));
    
//     statusDiv.innerHTML = ''; // Clear previous content
//     const errorEl = document.createElement('div');
//     errorEl.classList.add('error');
//     errorEl.textContent = `Error: ${errorMessage}`;
//     statusDiv.appendChild(errorEl);
    
//     // Optional: Stack trace for Error objects
//     if (error instanceof Error && error.stack) {
//       const stackTrace = document.createElement('pre');
//       stackTrace.classList.add('error-stack');
//       stackTrace.textContent = error.stack;
//       statusDiv.appendChild(stackTrace);
//     }
//   }

//   // Close extension button functionality
//   closeBtn.addEventListener('click', function() {
//     window.close();
//   });
//   generateThreadBtn.addEventListener('click', generateThreadSummary);
//   startLabelingBtn.addEventListener('click', async () => {
//     // Validate instructions
//     const instructions = labelInstructions.value.trim();
//     if (!instructions) {
//       logError(new Error('Please enter labeling instructions'));
//       return;
//     }

//     // Reset status
//     statusDiv.innerHTML = '<div class="success">Starting labeling process...</div>';

//     try {
//       // Request Gmail authentication
//       chrome.identity.getAuthToken({ 
//         interactive: true,
//         scopes: [
//           'https://www.googleapis.com/auth/gmail.modify',
//           'https://www.googleapis.com/auth/userinfo.email'
//         ]
//       }, (token) => {
//         // Check for authentication errors
//         if (chrome.runtime.lastError) {
//           throw new Error(chrome.runtime.lastError.message);
//         }

//         // Validate token
//         if (!token) {
//           throw new Error('Authentication failed: No token received');
//         }

//         // Send labeling request to background script
//         chrome.runtime.sendMessage({
//           action: 'startLabeling',
//           instructions: instructions
//         }, (response) => {
//           // Check for message sending errors
//           if (chrome.runtime.lastError) {
//             logError(chrome.runtime.lastError);
//             return;
//           }

//           // Handle response
//           if (response.error) {
//             logError(response.error);
//           } else {
//             // Create detailed results display
//             const resultsContainer = document.createElement('div');
//             resultsContainer.classList.add('results');

//             // Status message
//             const statusMessage = document.createElement('div');
//             statusMessage.classList.add('success');
//             statusMessage.textContent = response.status;
//             resultsContainer.appendChild(statusMessage);

//             // Detailed results
//             if (response.results && response.results.length > 0) {
//               const resultsList = document.createElement('ul');
//               response.results.forEach(result => {
//                 const li = document.createElement('li');
                
//                 // Create a detailed result item
//                 const resultDetails = [];
//                 if (result.emailId) resultDetails.push(`Email ID: ${result.emailId}`);
//                 if (result.label) resultDetails.push(`Label: ${result.label}`);
//                 if (result.labelApplied !== undefined) {
//                   resultDetails.push(`Label Applied: ${result.labelApplied ? 'Yes' : 'No'}`);
//                 }
//                 if (result.replyGenerated) {
//                   resultDetails.push('Reply Generated: Yes');
//                 }
//                 if (result.draftCreated) {
//                   resultDetails.push(`Draft Created: Yes (ID: ${result.draftId})`);
//                 }
//                 if (result.error) {
//                   resultDetails.push(`Error: ${result.error}`);
//                   li.classList.add('error-item');
//                 }

//                 li.textContent = resultDetails.join(' | ');
//                 resultsList.appendChild(li);
//               });
//               resultsContainer.appendChild(resultsList);
//             }

//             // Clear previous status and append new results
//             statusDiv.innerHTML = '';
//             statusDiv.appendChild(resultsContainer);
//           }
//         });
//       });
//     } catch (error) {
//       logError(error);
//     }
//   });

//   console.log('Popup script loaded successfully');
// });

//-----------------------

document.addEventListener('DOMContentLoaded', () => {
  const startLabelingBtn = document.getElementById('startLabeling');
  const generateThreadBtn = document.getElementById('generateThreadSummary');
  const labelInstructions = document.getElementById('labelInstructions');
  const statusDiv = document.getElementById('status');
  const closeBtn = document.getElementById('closeExtension');

  // Loader creation function
  function createLoader() {
    const loader = document.createElement('div');
    loader.classList.add('loader');
    loader.innerHTML = `
      <style>
        .loader {
          border: 4px solid #f3f3f3;
          border-top: 4px solid #7E57C2;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          animation: spin 1s linear infinite;
          margin: 10px auto;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
    `;
    return loader;
  }

  // Enhanced button styling
  function enhanceButtonStyles() {
    const buttons = [startLabelingBtn,];
    buttons.forEach(btn => {
      btn.style.backgroundColor = '#7E57C2';  // Purple background
      btn.style.color = 'white';  // White text
      btn.style.border = 'none';
      btn.style.padding = '10px 15px';
      btn.style.borderRadius = '5px';
      btn.style.cursor = 'pointer';
      btn.style.transition = 'background-color 0.3s ease';
      
      // Add hover effect
      btn.addEventListener('mouseover', () => {
        btn.style.backgroundColor = '#5E35B1';  // Darker purple on hover
      });
      btn.addEventListener('mouseout', () => {
        btn.style.backgroundColor = '#7E57C2';
      });
    });

    // Add emojis to buttons
    startLabelingBtn.innerHTML = 'Start Labeling';
    // generateThreadBtn.innerHTML = 'Generate Summary';
    // closeBtn.innerHTML = ' Close';
  }

  // Prevent popup from closing when clicking outside
  window.addEventListener('blur', function(e) { 
    // Refocus the window to keep popup open
    window.focus();
  });

  async function generateThreadSummary() {
    // Disable button and show loader
    generateThreadBtn.disabled = true;
    statusDiv.innerHTML = '';
    statusDiv.appendChild(createLoader());

    try {
      chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
        if (!tabs[0]) {
          throw new Error('No active tab found');
        }

        chrome.tabs.sendMessage(tabs[0].id, { action: 'extractThreadText' }, async (response) => {
          // Remove loader
          statusDiv.innerHTML = '';
          generateThreadBtn.disabled = false;

          if (chrome.runtime.lastError) {
            logError(chrome.runtime.lastError);
            return;
          }

          if (!response || !response.threadText) {
            logError(new Error('No thread text extracted'));
            return;
          }

          try {
            const ai = window.ai;
            const llmModel = 
              await (ai.languageModel?.create?.() || 
                     ai.createLanguageModel?.() || 
                     ai.models?.languageModel?.create?.());

            if (!llmModel) {
              throw new Error('Could not create language model');
            }

            const summaryPrompt = `
            Generate a concise summary of the following email thread. 
          
            Thread Content:
            ${response.threadText}
            
            IMPORTANT:
            - Capture key points and main ideas
            - Adjust detail level based on length scale
            - Maintain clarity and coherence
            `;

            const summary = await llmModel.prompt(summaryPrompt);

            const summaryEl = document.createElement('div');
            summaryEl.classList.add('success');
            summaryEl.innerHTML = `
              <h3>Thread Summary</h3>
              <p>${summary}</p>
            `;
            statusDiv.appendChild(summaryEl);

          } catch (aiError) {
            logError(aiError);
          }
        });
      });
    } catch (error) {
      // Remove loader and re-enable button
      statusDiv.innerHTML = '';
      generateThreadBtn.disabled = false;
      logError(error);
    }
  }

  function logError(error) {
    console.error('Labeling error:', error);
    
    const errorMessage = error instanceof Error 
      ? error.message 
      : (typeof error === 'object' 
          ? JSON.stringify(error) 
          : String(error));
    
    statusDiv.innerHTML = ''; // Clear previous content
    const errorEl = document.createElement('div');
    errorEl.classList.add('error');
    errorEl.textContent = `Error: ${errorMessage}`;
    statusDiv.appendChild(errorEl);
    
    if (error instanceof Error && error.stack) {
      const stackTrace = document.createElement('pre');
      stackTrace.classList.add('error-stack');
      stackTrace.textContent = error.stack;
      statusDiv.appendChild(stackTrace);
    }
  }

  // Close extension button functionality
  closeBtn.addEventListener('click', function() {
    window.close();
  });

  // generateThreadBtn.addEventListener('click', generateThreadSummary);
  
  startLabelingBtn.addEventListener('click', async () => {
    // Disable button and show loader
    startLabelingBtn.disabled = true;
    statusDiv.innerHTML = '';
    statusDiv.appendChild(createLoader());

    // Validate instructions
    const instructions = labelInstructions.value.trim();
    if (!instructions) {
      logError(new Error('Please enter labeling instructions'));
      startLabelingBtn.disabled = false;
      return;
    }

    try {
      chrome.identity.getAuthToken({ 
        interactive: true,
        scopes: [
          'https://www.googleapis.com/auth/gmail.modify',
          'https://www.googleapis.com/auth/userinfo.email'
        ]
      }, (token) => {
        // Remove loader
        statusDiv.innerHTML = '';
        startLabelingBtn.disabled = false;

        // Check for authentication errors
        if (chrome.runtime.lastError) {
          throw new Error(chrome.runtime.lastError.message);
        }

        // Validate token
        if (!token) {
          throw new Error('Authentication failed: No token received');
        }

        // Send labeling request to background script
        chrome.runtime.sendMessage({
          action: 'startLabeling',
          instructions: instructions
        }, (response) => {
          // Check for message sending errors
          if (chrome.runtime.lastError) {
            logError(chrome.runtime.lastError);
            return;
          }

          // Handle response
          if (response.error) {
            logError(response.error);
          } else {
            // Create detailed results display
            const resultsContainer = document.createElement('div');
            resultsContainer.classList.add('results');

            // Status message
            const statusMessage = document.createElement('div');
            statusMessage.classList.add('success');
            statusMessage.textContent = response.status;
            resultsContainer.appendChild(statusMessage);

            // Detailed results
            if (response.results && response.results.length > 0) {
              const resultsList = document.createElement('ul');
              response.results.forEach(result => {
                const li = document.createElement('li');
                
                // Create a detailed result item
                const resultDetails = [];
                if (result.emailId) resultDetails.push(`Email ID: ${result.emailId}`);
                if (result.label) resultDetails.push(`Label: ${result.label}`);
                if (result.labelApplied !== undefined) {
                  resultDetails.push(`Label Applied: ${result.labelApplied ? 'Yes' : 'No'}`);
                }
                if (result.replyGenerated) {
                  resultDetails.push('Reply Generated: Yes');
                }
                if (result.draftCreated) {
                  resultDetails.push(`Draft Created: Yes (ID: ${result.draftId})`);
                }
                if (result.error) {
                  resultDetails.push(`Error: ${result.error}`);
                  li.classList.add('error-item');
                }

                li.textContent = resultDetails.join(' | ');
                resultsList.appendChild(li);
              });
              resultsContainer.appendChild(resultsList);
            }

            // Clear previous status and append new results
            statusDiv.innerHTML = '';
            statusDiv.appendChild(resultsContainer);
          }
        });
      });
    } catch (error) {
      // Remove loader and re-enable button
      statusDiv.innerHTML = '';
      startLabelingBtn.disabled = false;
      logError(error);
    }
  });

  // Enhance button styles and add emojis on load
  enhanceButtonStyles();

  console.log('Popup script loaded successfully');
});