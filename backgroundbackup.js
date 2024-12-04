// Utility functions for email processing
const EmailUtils = {
    async fetchEmails(token, maxResults = 10) {
      try {
        const response = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}`, 
          {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        );
        return await response.json();
      } catch (error) {
        console.error('Failed to fetch emails:', error);
        return { messages: [] };
      }
    },
  
    async getEmailContent(token, messageId) {
      try {
        const response = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}`, 
          {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        );
        const messageData = await response.json();
        
        // Robust content extraction
        const extractContent = (payload) => {
          if (!payload) return 'No content';
  
          const decodeBase64URL = (encodedData) => {
            if (!encodedData) return '';
            try {
              return decodeURIComponent(
                atob(encodedData.replace(/-/g, '+').replace(/_/g, '/'))
                  .split('')
                  .map(c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
                  .join('')
              );
            } catch (error) {
              console.error('Decoding error:', error);
              return '';
            }
          };
  
          // Prefer plain text, skip HTML
          const extractionMethods = [
            () => {
              const textPart = payload.parts?.find(part => 
                part.mimeType === 'text/plain'
              );
              return textPart ? decodeBase64URL(textPart.body.data) : null;
            },
            () => payload.body?.data ? 
              decodeBase64URL(payload.body.data) : 
              null
          ];
  
          for (const method of extractionMethods) {
            const content = method();
            if (content && !content.trim().startsWith('<')) return content;
          }
  
          return 'Unable to extract email content';
        };
  
        return extractContent(messageData.payload);
      } catch (error) {
        console.error('Failed to get email content:', error);
        return 'Error retrieving email content';
      }
    },
    async applyLabel(token, messageId, labelName) {
        try {
          // First, fetch user's existing labels
          const labelsResponse = await fetch(
            'https://gmail.googleapis.com/gmail/v1/users/me/labels', 
            {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            }
          );
          const labelsData = await labelsResponse.json();
      
          // Find or create label
          let labelId = labelsData.labels?.find(
            label => label.name.toLowerCase() === labelName.toLowerCase()
          )?.id;
      
          // If label doesn't exist, create it
          if (!labelId) {
            const createLabelResponse = await fetch(
              'https://gmail.googleapis.com/gmail/v1/users/me/labels', 
              {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  name: labelName,
                  labelListVisibility: 'labelShow',
                  messageListVisibility: 'show'
                })
              }
            );
            const newLabelData = await createLabelResponse.json();
            labelId = newLabelData.id;
          }
      
          // Apply label to message
          const modifyResponse = await fetch(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/modify`, 
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                addLabelIds: [labelId]
              })
            }
          );
      
          // Check if modification was successful
          if (!modifyResponse.ok) {
            const errorText = await modifyResponse.text();
            console.error('Label modification failed:', errorText);
            return false;
          }
      
          return true;
        } catch (error) {
          console.error('Comprehensive label application error:', error);
          return false;
        }
      }
    // async applyLabel(token, messageId, labelName) {
    //   try {

        
    //     // First, try to fetch existing labels to check if label exists
    //     const existingLabelsResponse = await fetch(
    //       'https://gmail.googleapis.com/gmail/v1/users/me/labels', 
    //       {
    //         headers: {
    //           'Authorization': `Bearer ${token}`
    //         }
    //       }
    //     );
    //     const existingLabels = await existingLabelsResponse.json();
        
    //     // Check if label already exists
    //     const labelExists = existingLabels.labels?.some(
    //       label => label.name === labelName
    //     );
        
    //     // Create label if it doesn't exist
    //     if (!labelExists) {
    //       await fetch(
    //         'https://gmail.googleapis.com/gmail/v1/users/me/labels', 
    //         {
    //           method: 'POST',
    //           headers: {
    //             'Authorization': `Bearer ${token}`,
    //             'Content-Type': 'application/json'
    //           },
    //           body: JSON.stringify({
    //             name: labelName,
    //             labelListVisibility: 'labelShow',
    //             messageListVisibility: 'show'
    //           })
    //         }
    //       );
    //     }
  
    //     // Apply label to message
    //     await fetch(
    //       `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/modify`, 
    //       {
    //         method: 'POST',
    //         headers: {
    //           'Authorization': `Bearer ${token}`,
    //           'Content-Type': 'application/json'
    //         },
    //         body: JSON.stringify({
    //           addLabelIds: [labelName]
    //         })
    //       }
    //     );
  
    //     return true;
    //   } catch (error) {
    //     console.error('Label application error:', error);
    //     return false;
    //   }
    // }
  };
  
  // AI Label Generation Handler
  class OnDeviceAIHandler {
    static FALLBACK_LABELS = [
      'Work', 'Personal', 'Finance', 
      'Promotions', 'Social', 'Updates', 
      'Urgent', 'Important', 'Low Priority'
    ];
  
    static async initializeAI() {
      const aiSources = [
        () => typeof window !== 'undefined' && window.ai,
        () => typeof self !== 'undefined' && self.ai,
        () => chrome && chrome.ai
      ];
  
      for (const getAI of aiSources) {
        const ai = getAI();
        if (ai) return ai;
      }
  
      throw new Error('On-device AI is not available');
    }
  
    static async generateLabel(emailContent, userInstructions) {
      // Validate email content
      if (!emailContent || 
          (typeof emailContent === 'string' && 
           (emailContent.trim().startsWith('<') || 
            emailContent.trim() === '' || 
            emailContent.length < 10))) {
        return this.getRandomFallbackLabel();
      }
  
      try {
        console.log("email=",emailContent.substring(0, 500))
        const ai = await this.initializeAI();
        
        const llmModel = 
          await (ai.languageModel?.create?.() || 
                 ai.createLanguageModel?.() || 
                 ai.models?.languageModel?.create?.());
  
        if (!llmModel) {
          throw new Error('Could not create language model');
        }
  
        const labelPrompt = `Categorize this email briefly. 
  Respond with ONE word label (max 15 chars).
  
  Email Snippet:
  ${emailContent.substring(0, 500)}
  
  Context:
  ${userInstructions}
  
  IMPORTANT: 
  - Single word ONLY
  - Use clear, broad category
  - If unsure, use general label`;
  
        const labelGenerationStrategies = [
          async () => {
            const response = await llmModel.prompt(labelPrompt);
            console.log("labell=",response)
            return this.sanitizeLabel(response);
          },
          () => {
            const lowercaseContent = emailContent.toLowerCase();
            if (lowercaseContent.includes('invoice') || lowercaseContent.includes('bill')) 
              return 'Finance';
            if (lowercaseContent.includes('meeting') || lowercaseContent.includes('schedule')) 
              return 'Work';
            if (lowercaseContent.includes('receipt') || lowercaseContent.includes('order')) 
              return 'Shopping';
            if (lowercaseContent.includes('invitation') || lowercaseContent.includes('event')) 
              return 'Social';
            return this.getRandomFallbackLabel();
          },
          () => this.getRandomFallbackLabel()
        ];
  
        for (const strategy of labelGenerationStrategies) {
          try {
            const label = await strategy();
            if (label) return label;
          } catch (strategyError) {
            console.warn('Label generation strategy failed:', strategyError);
          }
        }
  
        return this.getRandomFallbackLabel();
      } catch (error) {
        console.error('Comprehensive label generation error:', error);
        return this.getRandomFallbackLabel();
      }
    }
  
    static sanitizeLabel(label) {
      if (!label) return this.getRandomFallbackLabel();
  
      const cleanedLabel = label
        .replace(/[^a-zA-Z ]/g, '')
        .trim()
        .split(' ')[0]
        .substring(0, 15)
        .replace(/^./, c => c.toUpperCase());
  
      return cleanedLabel || this.getRandomFallbackLabel();
    }
  
    static getRandomFallbackLabel() {
      return this.FALLBACK_LABELS[
        Math.floor(Math.random() * this.FALLBACK_LABELS.length)
      ];
    }
  }
  
  // Main message listener
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'startLabeling') {
      chrome.identity.getAuthToken({ interactive: false }, async (token) => {
        try {
          // Use the utility method from EmailUtils
          const emails = await EmailUtils.fetchEmails(token);
          const labelResults = [];
          
          for (const email of emails.messages || []) {
            try {
              // Use utility methods
              const emailContent = await EmailUtils.getEmailContent(token, email.id);
              
              // Generate label using AI
              const labelName = await OnDeviceAIHandler.generateLabel(
                emailContent, 
                request.instructions || 'Automatically categorize email'
              );
              console.log("after labelname")
              if (labelName) {
                // Apply label using utility method
                console.log("before label applied")
                const labelApplied = await EmailUtils.applyLabel(token, email.id, labelName);
                labelResults.push({
                  emailId: email.id,
                  label: labelName,
                  success: labelApplied
                });
                console.log("after label applied")
              }
            } catch (emailError) {
              console.error('Error processing email:', emailError);
              labelResults.push({
                emailId: email.id,
                error: emailError.message
              });
            }
          }
          
          sendResponse({ 
            status: `Processed ${emails.messages?.length || 0} emails`,
            results: labelResults
          });
        } catch (error) {
          console.error('Labeling process error:', error);
          sendResponse({ 
            status: `Error: ${error.message}`,
            error: error
          });
        }
      });
      
      return true;
    }
  });
  
  // Logging for debugging
  console.log('Background script loaded successfully');