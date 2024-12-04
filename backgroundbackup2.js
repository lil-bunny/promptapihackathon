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
  
        const extractContent = (payload) => {
          if (!payload) return 'No content';
  
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
  
    async generateEmailReply(emailContent, userContext = {}) {
      try {
        const ai = await OnDeviceAIHandler.initializeAI();
        
        const llmModel = 
          await (ai.languageModel?.create?.() || 
                 ai.createLanguageModel?.() || 
                 ai.models?.languageModel?.create?.());
  
        if (!llmModel) {
          throw new Error('Could not create language model');
        }
  
        const replyPrompt = `Generate a professional email reply based on the following email content:
  
  Context:
  - Sender's Email Content: ${emailContent.substring(0, 500)}
  - User Context: ${JSON.stringify(userContext)}
  
  Guidelines:
  1. Tone: Professional and courteous
  2. Length: 3-5 sentences
  3. Structure:
     - Brief acknowledgment
     - Direct response to key points
     - Clear next steps or call to action
  4. Avoid technical jargon
  5. Proofread for clarity and grammar
  
  IMPORTANT:
  - Be concise
  - Reflect the sender's communication style
  - Provide actionable response`;
  
        const reply = await llmModel.prompt(replyPrompt);
        
        return this.sanitizeReply(reply);
      } catch (error) {
        console.error('AI Reply Generation Error:', error);
        return this.getFallbackReply();
      }
    },
  
    sanitizeReply(reply) {
      if (!reply || reply.length < 50) {
        return this.getFallbackReply();
      }
  
      return reply.replace(/[<>]/g, '')
                 .trim()
                 .split('\n')
                 .map(line => line.trim())
                 .join('\n');
    },
  
    getFallbackReply() {
      return `Thank you for your email. I appreciate you reaching out and will review your message carefully. 
  I'll get back to you with a detailed response soon.
  
  Best regards,
  [Your Name]`;
    },
  
    async createEmailDraft(token, messageId, replyContent) {
      try {
        const originalEmailResponse = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}`, 
          {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        );
        const originalEmail = await originalEmailResponse.json();
  
        const headers = originalEmail.payload.headers;
        const fromHeader = headers.find(header => 
          header.name.toLowerCase() === 'from'
        );
        const subjectHeader = headers.find(header => 
          header.name.toLowerCase() === 'subject'
        );
  
        const recipientEmail = fromHeader ? fromHeader.value : '';
        const originalSubject = subjectHeader ? 
          `Re: ${subjectHeader.value}` : 'Re: Your Email';
  
        const draftPayload = {
          message: {
            raw: btoa(
              `To: ${recipientEmail}\r\n` +
              `Subject: ${originalSubject}\r\n` +
              `Content-Type: text/plain; charset="UTF-8"\r\n` +
              `Content-Transfer-Encoding: 7bit\r\n\r\n` +
              `${replyContent}`
            ).replace(/\+/g, '-').replace(/\//g, '_')
          }
        };
  
        const createDraftResponse = await fetch(
          'https://gmail.googleapis.com/gmail/v1/users/me/drafts', 
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(draftPayload)
          }
        );
  
        const draftResult = await createDraftResponse.json();
        return {
          success: true,
          draftId: draftResult.id,
          recipientEmail: recipientEmail
        };
      } catch (error) {
        console.error('Draft Creation Error:', error);
        return { 
          success: false, 
          error: error.message 
        };
      }
    },
  
    async applyLabel(token, messageId, labelName) {
      try {
        const labelsResponse = await fetch(
          'https://gmail.googleapis.com/gmail/v1/users/me/labels', 
          {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        );
        const labelsData = await labelsResponse.json();
    
        let labelId = labelsData.labels?.find(
          label => label.name.toLowerCase() === labelName.toLowerCase()
        )?.id;
    
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
    
        return modifyResponse.ok;
      } catch (error) {
        console.error('Comprehensive label application error:', error);
        return false;
      }
    }
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
      if (!emailContent || 
          (typeof emailContent === 'string' && 
           (emailContent.trim().startsWith('<') || 
            emailContent.trim() === '' || 
            emailContent.length < 10))) {
        return this.getRandomFallbackLabel();
      }
  
      try {
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
          const emails = await EmailUtils.fetchEmails(token);
          const processResults = [];
          
          for (const email of emails.messages || []) {
            try {
              const emailContent = await EmailUtils.getEmailContent(token, email.id);
              
              const labelName = await OnDeviceAIHandler.generateLabel(
                emailContent, 
                request.instructions || 'Automatically categorize email'
              );
  
              const labelApplied = labelName ? 
                await EmailUtils.applyLabel(token, email.id, labelName) : 
                false;
  
              const replyContent = await EmailUtils.generateEmailReply(
                emailContent, 
                request.userContext || {}
              );
  
              const draftResult = await EmailUtils.createEmailDraft(
                token, 
                email.id, 
                replyContent
              );
  
              processResults.push({
                emailId: email.id,
                label: labelName,
                labelApplied: labelApplied,
                replyGenerated: !!replyContent,
                draftCreated: draftResult.success,
                draftId: draftResult.draftId
              });
            } catch (emailError) {
              console.error('Email Processing Error:', emailError);
              processResults.push({
                emailId: email.id,
                error: emailError.message
              });
            }
          }
          
          sendResponse({ 
            status: `Processed ${emails.messages?.length || 0} emails`,
            results: processResults
          });
        } catch (error) {
          console.error('Comprehensive Processing Error:', error);
          sendResponse({ 
            status: `Error: ${error.message}`,
            error: error
          });
        }
      });
      
      return true;
    }
  });
  
  console.log('Enhanced Gmail AI Assistant Background Script Loaded');