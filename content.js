// content.js
let userPrompt = null;

// Function to get selected email content
function getSelectedEmailContent() {
  const emailElement = document.querySelector('.a3s');
  return emailElement ? emailElement.innerText : '';
}

// Function to create and apply label
function applyLabel(label) {
  // You'll need to implement Gmail API interaction here
  // This is a placeholder for actual Gmail label creation
  console.log('Generated Label:', label);
}

// Listener for user prompt
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'setPrompt') {
    userPrompt = request.prompt;
    
    // Trigger label generation
    const emailContent = getSelectedEmailContent();
    
    chrome.runtime.sendMessage({
      action: 'generateLabel', 
      emailContent, 
      userPrompt
    }, response => {
      if (response.label) {
        applyLabel(response.label);
      }
    });
  }
});

// Observe Gmail UI for changes to detect email selection
function observeEmailSelection() {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        // Email view likely changed
        const selectedEmail = getSelectedEmailContent();
        // You could trigger additional processing here if needed
      }
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

observeEmailSelection();