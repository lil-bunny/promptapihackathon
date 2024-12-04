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

    async applyLabel(token, messageId, labelDetails) {
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
            label => label.name.toLowerCase() === labelDetails.name.toLowerCase()
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
                  name: labelDetails.name,
                  color: {
                    backgroundColor: labelDetails.color.backgroundColor,
                    textColor: labelDetails.color.textColor
                  },
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
  };
  
// AI Label Generation Handler
class OnDeviceAIHandler {
    // Utility method to generate a vibrant, unique color
    static generateVibrantColor(seed) {
        // Use a hash function to generate consistent colors based on seed
        const hash = (str) => {
            let hash = 0;
            for (let i = 0; i < str.length; i++) {
                const char = str.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash; // Convert to 32bit integer
            }
            return Math.abs(hash);
        };

        // Generate hue based on seed
        const hue = hash(seed) % 360;
        
        // Generate a vibrant color with high saturation and moderate lightness
        return {
            backgroundColor: `hsl(${hue}, 70%, 55%)`,
            textColor: this.getContrastYIQ(`hsl(${hue}, 70%, 55%)`)
        };
    }

    // Utility method to determine text color based on background brightness
    static getContrastYIQ(hexcolor) {
        // Convert HSL to RGB first
        const hsl2rgb = (h, s, l) => {
            h /= 360;
            s /= 100;
            l /= 100;
            let r, g, b;
            if (s === 0) {
                r = g = b = l;
            } else {
                const hue2rgb = (p, q, t) => {
                    if (t < 0) t += 1;
                    if (t > 1) t -= 1;
                    if (t < 1/6) return p + (q - p) * 6 * t;
                    if (t < 1/2) return q;
                    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                    return p;
                };
                const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
                const p = 2 * l - q;
                r = hue2rgb(p, q, h + 1/3);
                g = hue2rgb(p, q, h);
                b = hue2rgb(p, q, h - 1/3);
            }
            return [
                Math.round(r * 255),
                Math.round(g * 255),
                Math.round(b * 255)
            ];
        };

        // Extract HSL values
        const match = hexcolor.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
        const [h, s, l] = match.slice(1).map(Number);
        const [r, g, b] = hsl2rgb(h, s, l);

        // Calculate YIQ brightness
        const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
        
        // Return black or white depending on brightness
        return (yiq >= 128) ? '#000000' : '#FFFFFF';
    }

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
            return this.generateDynamicLabel('Uncategorized');
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

            const labelPrompt = `Distill this email into ONE descriptive word that captures its essence:
            
            Email Snippet:
            ${emailContent.substring(0, 500)}
            
            Context:
            ${userInstructions}
            
            IMPORTANT: 
            - Single descriptive word
            - Capture the email's primary purpose or theme
            - Use a clear, concise term`;

            const labelGenerationStrategies = [
                async () => {
                    const response = await llmModel.prompt(labelPrompt);
                    return this.generateDynamicLabel(response);
                },
                () => {
                    const lowercaseContent = emailContent.toLowerCase();
                    const contentKeywords = [
                        { keyword: 'invoice', label: 'Bill' },
                        { keyword: 'meeting', label: 'Agenda' },
                        { keyword: 'receipt', label: 'Purchase' },
                        { keyword: 'invitation', label: 'Event' },
                        { keyword: 'schedule', label: 'Plan' }
                    ];

                    const matchedKeyword = contentKeywords.find(
                        item => lowercaseContent.includes(item.keyword)
                    );

                    return this.generateDynamicLabel(
                        matchedKeyword ? matchedKeyword.label : 'Misc'
                    );
                },
                () => this.generateDynamicLabel('Unknown')
            ];

            for (const strategy of labelGenerationStrategies) {
                try {
                    const labelStyle = await strategy();
                    if (labelStyle) return labelStyle;
                } catch (strategyError) {
                    console.warn('Label generation strategy failed:', strategyError);
                }
            }

            return this.generateDynamicLabel('Default');
        } catch (error) {
            console.error('Comprehensive label generation error:', error);
            return this.generateDynamicLabel('Fallback');
        }
    }

    static generateDynamicLabel(baseName) {
        // Sanitize the base name
        const sanitizedName = baseName
            .replace(/[^a-zA-Z ]/g, '')
            .trim()
            .split(' ')[0]
            .substring(0, 15)
            .replace(/^./, c => c.toUpperCase());

        // Generate color based on the sanitized name
        const color = this.generateVibrantColor(sanitizedName);

        return {
            name: sanitizedName,
            color: color
        };
    }
}
  
// Main message listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'startLabeling') {
        chrome.identity.getAuthToken({ interactive: false }, async (token) => {
            try {
                const emails = await EmailUtils.fetchEmails(token);
                const labelResults = [];
                
                for (const email of emails.messages || []) {
                    try {
                        const emailContent = await EmailUtils.getEmailContent(token, email.id);
                        
                        // Generate label using AI with dynamic styles
                        const labelDetails = await OnDeviceAIHandler.generateLabel(
                            emailContent, 
                            request.instructions || 'Automatically categorize email'
                        );
                        
                        if (labelDetails) {
                            // Apply label using utility method with color
                            const labelApplied = await EmailUtils.applyLabel(token, email.id, labelDetails);
                            labelResults.push({
                                emailId: email.id,
                                label: labelDetails.name,
                                color: labelDetails.color,
                                success: labelApplied
                            });
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