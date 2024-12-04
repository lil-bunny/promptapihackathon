class OnDeviceAIHandler {
    // Predefined label categories to fallback on
    static FALLBACK_LABELS = [
      'Work', 'Personal', 'Finance', 
      'Promotions', 'Social', 'Updates', 
      'Urgent', 'Important', 'Low Priority'
    ];
  
    static async initializeAI() {
      // Comprehensive AI initialization attempt
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
      try {
        const ai = await this.initializeAI();
        
        // Multiple model creation attempts
        const llmModel = 
          await (ai.languageModel?.create?.() || 
                 ai.createLanguageModel?.() || 
                 ai.models?.languageModel?.create?.());
  
        if (!llmModel) {
          throw new Error('Could not create language model');
        }
  
        // Simplified, more constrained prompt
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
  
        // Attempt label generation with multiple fallback strategies
        const labelGenerationStrategies = [
          async () => {
            // Primary AI generation attempt
            const response = await llmModel.prompt(labelPrompt);
            return this.sanitizeLabel(response);
          },
          () => {
            // Content-based classification
            const lowercaseContent = emailContent.toLowerCase();
            if (lowercaseContent.includes('invoice') || lowercaseContent.includes('bill')) 
              return 'Finance';
            if (lowercaseContent.includes('meeting') || lowercaseContent.includes('schedule')) 
              return 'Work';
            return this.getRandomFallbackLabel();
          },
          () => this.getRandomFallbackLabel()
        ];
  
        // Try strategies in order
        for (const strategy of labelGenerationStrategies) {
          try {
            const label = await strategy();
            if (label) return label;
          } catch (strategyError) {
            console.warn('Label generation strategy failed:', strategyError);
          }
        }
  
        // Ultimate fallback
        return this.getRandomFallbackLabel();
      } catch (error) {
        console.error('Comprehensive label generation error:', error);
        
        // Log detailed error information
        if (error instanceof NotSupportedError) {
          console.error('Potential language model restriction:', error);
        }
  
        // Return a safe, generic label
        return this.getRandomFallbackLabel();
      }
    }
  
    // Helper method to sanitize and validate labels
    static sanitizeLabel(label) {
      if (!label) return this.getRandomFallbackLabel();
  
      // Clean label: remove special chars, trim, capitalize first letter
      const cleanedLabel = label
        .replace(/[^a-zA-Z ]/g, '')  // Remove special characters
        .trim()
        .split(' ')[0]  // Take first word
        .substring(0, 15)  // Limit length
        .replace(/^./, c => c.toUpperCase());  // Capitalize first letter
  
      return cleanedLabel || this.getRandomFallbackLabel();
    }
  
    // Method to get a random fallback label
    static getRandomFallbackLabel() {
      return this.FALLBACK_LABELS[
        Math.floor(Math.random() * this.FALLBACK_LABELS.length)
      ];
    }
  }
  
  // Expose for use in background script
  self.OnDeviceAIHandler = OnDeviceAIHandler;