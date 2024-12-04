// // Gmail Thread Text Extraction Content Script
// console.log("Content script loaded successfully!2222");

// (function() {
//     function extractThreadText() {
//       console.log("Content script loaded successfully!6969696969");

//       try {
//         // Target Gmail's conversation view
//         const emailContainers = document.querySelectorAll('.a3s.aiL');
        
//         if (emailContainers.length === 0) {
//           return 'No email thread found';
//         }
  
//         const threadTexts = Array.from(emailContainers).map(container => {
//           // Extract text content, removing HTML
//           const text = container.innerText.trim();
          
//           // Optional: Limit text length to prevent overwhelming the AI
//           return text.length > 2000 ? text.substring(0, 2000) + '...' : text;
//         });
  
//         // Combine thread texts with some separation
//         const combinedText = threadTexts.join('\n\n--- Next Email in Thread ---\n\n');
        
//         // Additional checks to ensure meaningful content
//         return combinedText.length > 50 ? combinedText : 'Insufficient email content';
//       } catch (error) {
//         console.error('Thread text extraction error:', error);
//         return 'Error extracting thread text';
//       }
//     }
  
//     // Listen for messages from popup
//     chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
//       if (request.action === 'extractThreadText') {
//         const threadText = extractThreadText();
//         sendResponse({ threadText });
//         return true; // Indicates we wish to send a response asynchronously
//       }
//     });
  
//     // Optional: Log when script is injected
//     console.log('Gmail Thread Extractor Content Script Loaded');
//   })();


// Gmail Thread Text Extraction Content Script
// console.log("Content script loaded successfully!2222");

// (function() {
//     function extractThreadText() {
//       console.log("Content script loaded successfully!6969696969");

//       try {
//         // Target Gmail's conversation view (improved selector)
//         const emailContainers = document.querySelectorAll('.a3s .a3s, .a3s.aiL, .a3s');

//         if (emailContainers.length === 0) {
//           return 'No email thread found';
//         }

//         // Extract text content from each container and concatenate
//         const threadTexts = Array.from(emailContainers).map((container, index) => {
//           // Extract text content, cleaning up unnecessary whitespace
//           const text = container.innerText.trim();

//           // Optional: Limit text length to prevent overwhelming the AI
//           return text.length > 2000 ? text.substring(0, 2000) + '...' : text;
//         });

//         // Combine thread texts with some separation between emails
//         const combinedText = threadTexts.join('\n\n--- Next Email in Thread ---\n\n');

//         // Additional checks to ensure meaningful content
//         return combinedText.length > 50 ? combinedText : 'Insufficient email content';
//       } catch (error) {
//         console.error('Thread text extraction error:', error);
//         return 'Error extracting thread text';
//       }
//     }

//     // Listen for messages from popup
//     chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
//       if (request.action === 'extractThreadText') {
//         const threadText = extractThreadText();
//         sendResponse({ threadText });
//         return true; // Indicates we wish to send a response asynchronously
//       }
//     });

//     // Optional: Log when script is injected
//     console.log('Gmail Thread Extractor Content Script Loaded');



// })();






(function() {
  function extractThreadText() {
    console.log("Content script loaded successfully!6969696969");

    try {
      // Target Gmail's conversation view (improved selector)
      const emailContainers = document.querySelectorAll('.a3s .a3s, .a3s.aiL, .a3s');

      if (emailContainers.length === 0) {
        return 'No email thread found';
      }

      // Extract text content from each container and concatenate
      const threadTexts = Array.from(emailContainers).map((container, index) => {
        // Extract text content, cleaning up unnecessary whitespace
        const text = container.innerText.trim();

        // Optional: Limit text length to prevent overwhelming the AI
        return text.length > 2000 ? text.substring(0, 2000) + '...' : text;
      });

      // Combine thread texts with some separation between emails
      const combinedText = threadTexts.join('\n\n--- Next Email in Thread ---\n\n');

      // Additional checks to ensure meaningful content
      return combinedText.length > 50 ? combinedText : 'Insufficient email content';
    } catch (error) {
      console.error('Thread text extraction error:', error);
      return 'Error extracting thread text';
    }
  }

  function injectSummaryButton() {
    // Target the main email container
    const emailContainer = document.querySelector('.a3s.aiL');
    
    if (emailContainer && !document.getElementById('ai-summary-button')) {
        // Create summary button
        const summaryButton = document.createElement('button');
        summaryButton.id = 'ai-summary-button';
        summaryButton.textContent = 'Generate AI Summary ✨';
        summaryButton.style.cssText = `
            margin: 15px 0;
            padding: 10px 16px;
            background-color: #673AB7;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            width: 100%;
            font-weight: bold;
            display: block;
            font-size: 14px;
        `;

        // Create summary container
        const summaryContainer = document.createElement('div');
        summaryContainer.id = 'ai-summary-container';
        summaryContainer.style.cssText = `
            margin-top: 10px;
            padding: 10px;
            background-color: #F3E5F5;
            border-radius: 4px;
            display: none;
            font-size: 14px;
            line-height: 1.5;
        `;

        // Insert button and container after the email content
        emailContainer.parentNode.insertBefore(summaryButton, emailContainer.nextSibling);
        emailContainer.parentNode.insertBefore(summaryContainer, summaryButton.nextSibling);

        // Add click event listener
        summaryButton.addEventListener('click', () => {
            // Disable button and show loading state
            summaryButton.disabled = true;
            summaryButton.innerHTML = 'Generating Summary... ⏳';

            // Extract email text
            const emailText = emailContainer.innerText.trim();

            // Send message to background script to generate summary
            chrome.runtime.sendMessage(
                { 
                    action: 'generateEmailSummary', 
                    emailContent: emailText 
                }, 
                (response) => {
                    // Reset button
                    summaryButton.disabled = false;
                    summaryButton.innerHTML = 'Generate AI Summary ✨';

                    if (response.success) {
                        // Show summary in container
                        summaryContainer.textContent = response.summary;
                        summaryContainer.style.display = 'block';
                    } else {
                        // Show error
                        summaryContainer.textContent = 'Failed to generate summary: ' + response.error;
                        summaryContainer.style.display = 'block';
                        summaryContainer.style.backgroundColor = '#FFEBEE';
                    }
                }
            );
        });
    }
}

// Use MutationObserver to watch for email opens
const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
            injectSummaryButton();
        }
    });
});

// Start observing the Gmail interface
observer.observe(document.body, {
    childList: true,
    subtree: true
});

// Initial injection
injectSummaryButton();
  function injectAIReplyButton() {
    const observeComposeWindow = () => {
        // Target the Gmail compose/reply window
        const composeContainer = document.querySelector('.nH.bkL');
        if (composeContainer) {
            // Find the send button container
            const sendButtonContainer = composeContainer.querySelector('.T-I.T-I-atl');
            
            // Check if AI reply button doesn't already exist
            if (sendButtonContainer && !document.getElementById('ai-reply-button')) {
                // Add global styles for the loader
                const loaderStyle = document.createElement('style');
                loaderStyle.textContent = `
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                    #ai-reply-button .loader {
                        display: inline-block;
                        margin-left: 8px;
                        animation: spin 1s linear infinite;
                    }
                `;
                document.head.appendChild(loaderStyle);

                const aiReplyButton = document.createElement('button');
                aiReplyButton.textContent = 'Enhance AI Reply ✨';
                aiReplyButton.id = 'ai-reply-button';
                aiReplyButton.style.cssText = `
                    margin-left: 10px;
                    padding: 8px 16px;
                    background-color: #673AB7;
                    color: white;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    display: inline-flex;
                    align-items: center;
                    height: 36px;
                    font-weight: bold;
                `;
  
                aiReplyButton.addEventListener('click', () => {
                    // Disable button and show loading state
                    aiReplyButton.disabled = true;
                    aiReplyButton.innerHTML = 'Enhancing Reply <span class="loader">⌛</span>';
                    
                    // Extract original email thread
                    const originalThreadText = extractThreadText();
                    
                    // Find the current reply text in the compose window
                    const replyTextarea = document.querySelector('.Am.Al.editable');
                    const userDraftText = replyTextarea ? replyTextarea.innerText.trim() : '';
  
                    // Prepare context for AI
                    const aiContext = {
                        originalEmail: originalThreadText,
                        userDraft: userDraftText
                    };
                    
                    chrome.runtime.sendMessage(
                        { 
                            action: 'generateAIReply', 
                            emailContent: JSON.stringify(aiContext)
                        }, 
                        (response) => {
                            // Reset button to original state
                            aiReplyButton.disabled = false;
                            aiReplyButton.innerHTML = 'Enhance AI Reply ✨';

                            if (response.success) {
                                if (replyTextarea) {
                                    // If user has already typed something, append AI suggestion
                                    if (userDraftText) {
                                        replyTextarea.innerHTML = response.replyContent;
                                    } else {
                                        // If no draft, replace with AI reply
                                        replyTextarea.innerHTML = response.replyContent;
                                    }
                                }
                            } else {
                                alert('Failed to generate AI reply: ' + response.error);
                            }
                        }
                    );
                });
  
                // Insert the button next to the send button
                sendButtonContainer.parentNode.insertBefore(
                    aiReplyButton, 
                    sendButtonContainer.nextSibling.nextSibling
                );
            }
        }
    };
  
    // Use MutationObserver to watch for compose window changes
    const observer = new MutationObserver((mutations) => {
        observeComposeWindow();
    });
  
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
  
    // Initial check
    observeComposeWindow();
}
//   function injectAIReplyButton() {
//     const observeComposeWindow = () => {
//         // Target the Gmail compose/reply window
//         const composeContainer = document.querySelector('.nH.bkL');
//         if (composeContainer) {
//             // Find the send button container
//             const sendButtonContainer = composeContainer.querySelector('.T-I.T-I-atl');
            
//             // Check if AI reply button doesn't already exist
//             if (sendButtonContainer && !document.getElementById('ai-reply-button')) {
//                 const aiReplyButton = document.createElement('button');
//                 aiReplyButton.textContent = 'Enhance AI Reply ✨';
//                 aiReplyButton.id = 'ai-reply-button';
//                 aiReplyButton.style.cssText = `
//            margin-left: 10px;
//                     padding: 8px 16px;
//                     background-color: #673AB7;
//                     color: white;
//                     border: none;
//                     border-radius: 4px;
//                     cursor: pointer;
//                     display: inline-flex;
//                     align-items: center;
//                     height: 36px;
//                     font-weight: bold;
//                 `;
  
//                 aiReplyButton.addEventListener('click', () => {
//                     // Extract original email thread
//                     const originalThreadText = extractThreadText();
                    
//                     // Find the current reply text in the compose window
//                     const replyTextarea = document.querySelector('.Am.Al.editable');
//                     const userDraftText = replyTextarea ? replyTextarea.innerText.trim() : '';
  
//                     // Prepare context for AI
//                     const aiContext = {
//                         originalEmail: originalThreadText,
//                         userDraft: userDraftText
//                     };
                    
//                     chrome.runtime.sendMessage(
//                         { 
//                             action: 'generateAIReply', 
//                             emailContent: JSON.stringify(aiContext)
//                         }, 
//                         (response) => {
//                             if (response.success) {
//                                 if (replyTextarea) {
//                                     // If user has already typed something, append AI suggestion
//                                     if (userDraftText) {
//                                         replyTextarea.innerHTML = response.replyContent;
//                                     } else {
//                                         // If no draft, replace with AI reply
//                                         replyTextarea.innerHTML = response.replyContent;
//                                     }
//                                 }
//                             } else {
//                                 alert('Failed to generate AI reply: ' + response.error);
//                             }
//                         }
//                     );
//                 });
  
//                 // Insert the button next to the send button
//                 sendButtonContainer.parentNode.insertBefore(
//                     aiReplyButton, 
//                     sendButtonContainer.nextSibling.nextSibling
//                 );
//             }
//         }
//     };
  
//     // Use MutationObserver to watch for compose window changes
//     const observer = new MutationObserver((mutations) => {
//         observeComposeWindow();
//     });
  
//     observer.observe(document.body, {
//         childList: true,
//         subtree: true
//     });
  
//     // Initial check
//     observeComposeWindow();
// }
//   function injectAIReplyButton() {
//     const observeComposeWindow = () => {
//         // Target the Gmail compose/reply window
//         const composeContainer = document.querySelector('.nH.bkL');
//         if (composeContainer) {
//             // Find the send button container
//             const sendButtonContainer = composeContainer.querySelector('.T-I.T-I-atl');
            
//             // Check if AI reply button doesn't already exist
//             if (sendButtonContainer && !document.getElementById('ai-reply-button')) {
//                 const aiReplyButton = document.createElement('button');
//                 aiReplyButton.textContent = 'Enhance AI Reply';
//                 aiReplyButton.id = 'ai-reply-button';
//                 aiReplyButton.style.cssText = `
//                     margin-left: 10px;
//                     padding: 8px 16px;
//                     background-color: #673AB7;  /* Deep Purple */
//                     color: white;
//                     border: none;
//                     border-radius: 4px;
//                     cursor: pointer;
//                     display: inline-flex;
//                     align-items: center;
//                     height: 36px;
//                     font-weight: bold;
//                 `;
  
//                 aiReplyButton.addEventListener('click', () => {
//                     // Extract original email thread
//                     const originalThreadText = extractThreadText();
                    
//                     // Find the current reply text in the compose window
//                     const replyTextarea = document.querySelector('.Am.Al.editable');
//                     const userDraftText = replyTextarea ? replyTextarea.innerText.trim() : '';
  
//                     // Prepare context for AI
//                     const aiContext = {
//                         originalEmail: originalThreadText,
//                         userDraft: userDraftText
//                     };
                    
//                     chrome.runtime.sendMessage(
//                         { 
//                             action: 'generateAIReply', 
//                             emailContent: JSON.stringify(aiContext)
//                         }, 
//                         (response) => {
//                             if (response.success) {
//                                 if (replyTextarea) {
//                                     // If user has already typed something, append AI suggestion
//                                     if (userDraftText) {
//                                         replyTextarea.innerHTML = response.replyContent;
//                                     } else {
//                                         // If no draft, replace with AI reply
//                                         replyTextarea.innerHTML = response.replyContent;
//                                     }
//                                 }
//                             } else {
//                                 alert('Failed to generate AI reply: ' + response.error);
//                             }
//                         }
//                     );
//                 });
  
//                 // Insert the button next to the send button
//                 sendButtonContainer.parentNode.insertBefore(
//                     aiReplyButton, 
//                     sendButtonContainer.nextSibling
//                 );
//             }
//         }
//     };
  
//     // Use MutationObserver to watch for compose window changes
//     const observer = new MutationObserver((mutations) => {
//         observeComposeWindow();
//     });
  
//     observer.observe(document.body, {
//         childList: true,
//         subtree: true
//     });
  
//     // Initial check
//     observeComposeWindow();
// }
  // function injectAIReplyButton() {
  //   // Wait for Gmail UI to load
  //   const observeEmailView = () => {
  //     const emailContainer = document.querySelector('.a3s');
  //     if (emailContainer && !document.getElementById('ai-reply-button')) {
  //       const aiReplyButton = document.createElement('button');
  //       aiReplyButton.textContent = 'Generate AI Reply';
  //       aiReplyButton.id = 'ai-reply-button';
  //       aiReplyButton.style.cssText = `
  //         margin: 10px;
  //         padding: 8px 16px;
  //         background-color: #4285f4;
  //         color: white;
  //         border: none;
  //         border-radius: 4px;
  //         cursor: pointer;
  //       `;

  //       aiReplyButton.addEventListener('click', () => {
  //         const threadText = extractThreadText();
          
  //         chrome.runtime.sendMessage(
  //           { 
  //             action: 'generateAIReply', 
  //             emailContent: threadText 
  //           }, 
  //           (response) => {
  //             if (response.success) {
  //               // Open compose window with AI-generated reply
  //               const composeButton = document.querySelector('.T-I.T-I-atl');
  //               if (composeButton) {
  //                 composeButton.click();
                  
  //                 // Wait for compose window to open
  //                 setTimeout(() => {
  //                   const replyTextarea = document.querySelector('.Am.Al.editable');
  //                   if (replyTextarea) {
  //                     replyTextarea.innerHTML = response.replyContent;
  //                   }
  //                 }, 500);
  //               }
  //             } else {
  //               alert('Failed to generate AI reply: ' + response.error);
  //             }
  //           }
  //         );
  //       });

  //       // Insert the button near the email content
  //       emailContainer.parentNode.insertBefore(
  //         aiReplyButton, 
  //         emailContainer.nextSibling
  //       );
  //     }
  //   };

  //   // Use MutationObserver to watch for email view changes
  //   const observer = new MutationObserver((mutations) => {
  //     observeEmailView();
  //   });

  //   observer.observe(document.body, {
  //     childList: true,
  //     subtree: true
  //   });

  //   // Initial check
  //   observeEmailView();
  // }

  // Call the function to inject AI reply button
  injectAIReplyButton();

  // Listen for messages from popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'extractThreadText') {
      const threadText = extractThreadText();
      sendResponse({ threadText });
      return true;
    }
  });

  // Optional: Log when script is injected
  console.log('Gmail Thread Extractor Content Script Loaded');
})();