// Function to detect user role
function detectUserRole() {
  const buttonLabel = document.querySelector('.MuiButton-label.jss20');
  
  if (buttonLabel) {
    const buttonText = buttonLabel.textContent.trim();
    return buttonText === 'Start Reviewing' ? 'reviewer' : 'attempter';
  }
  
  return null;
}

// Function to extract prompt text
function extractPromptText() {
  // Find all step cards
  const stepCards = document.querySelectorAll('[data-testid="step-card"]');
  
  const prompts = [];
  
  stepCards.forEach((stepCard) => {
    // Find all divs within the step card
    const divs = stepCard.querySelectorAll('div');
    
    // Find the turn number heading
    let turnHeading = null;
    for (const div of divs) {
      if (div.textContent.includes('Turn #') && div.textContent.includes('Prompt')) {
        turnHeading = div;
        break;
      }
    }
    
    if (turnHeading) {
      // Extract the turn number from the heading text
      const turnMatch = turnHeading.textContent.match(/Turn #(\d+)/);
      const turnNumber = turnMatch ? turnMatch[1] : 'unknown';
      
      // Find the contenteditable div within this step card
      const contentDiv = stepCard.querySelector('div[contenteditable="false"]');
      
      if (contentDiv) {
        const promptText = contentDiv.textContent.trim();
        prompts.push({
          turnNumber: turnNumber,
          text: promptText
        });
      }
    }
  });
  
  // Send prompts to background script if we found any
  if (prompts.length > 0) {
    chrome.runtime.sendMessage({
      type: 'UPDATE_PROMPTS',
      prompts: prompts
    });
  }
}

// Send role information to background script
function sendRoleToBackground() {
  const role = detectUserRole();
  if (role) {
    chrome.runtime.sendMessage({
      type: 'UPDATE_ROLE',
      role: role
    });
  }
}

// Function to check for role periodically
function startRoleDetection() {
  // Initial check
  sendRoleToBackground();
  
  // Set up an interval to keep checking
  const checkInterval = setInterval(() => {
    const role = detectUserRole();
    if (role) {
      sendRoleToBackground();
      clearInterval(checkInterval); // Stop checking once we find it
    }
  }, 1000); // Check every second
  
  // Stop checking after 30 seconds to avoid infinite checking
  setTimeout(() => {
    clearInterval(checkInterval);
  }, 30000);
}

// Function to check for prompts periodically
function startPromptDetection() {
  // Initial check
  extractPromptText();
  
  // Set up an interval to keep checking
  const checkInterval = setInterval(() => {
    extractPromptText();
  }, 5000); // Check every 5 seconds
  
  // Stop checking after 5 minutes to avoid infinite checking
  setTimeout(() => {
    clearInterval(checkInterval);
  }, 300000);
}

// Try multiple ways to detect when the page is ready
window.addEventListener('load', () => {
  startRoleDetection();
  startPromptDetection();
});

document.addEventListener('DOMContentLoaded', () => {
  startRoleDetection();
  startPromptDetection();
});

// Watch for DOM changes
const observer = new MutationObserver(() => {
  const role = detectUserRole();
  if (role) {
    sendRoleToBackground();
  }
  
  // Also check for prompts when DOM changes
  extractPromptText();
});

// Start observing the document with the configured parameters
observer.observe(document.body, {
  childList: true,
  subtree: true
});

// Also run detection when URL changes (for single-page apps)
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    startRoleDetection();
    startPromptDetection();
  }
}).observe(document, { subtree: true, childList: true }); 