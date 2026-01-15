/**
 * SessionVault Background Service Worker
 * Handles extension lifecycle and cross-script communication
 */

// Listen for installation
chrome.runtime.onInstalled.addListener((details) => {
  console.log('[SessionVault] Extension installed:', details.reason);
  
  // Set default settings on first install
  if (details.reason === 'install') {
    chrome.storage.local.set({
      settings: {
        vaultName: 'papa',
        folderPath: 'Apps/Tools/SessionVault/logs',
        ollamaEndpoint: 'http://localhost:11434',
        ollamaModel: 'llama3.1',
        includeSummary: true,
        includeMermaid: false,
        showPreview: true
      }
    });
  }
});

// Listen for messages from content scripts or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[SessionVault] Message received:', message);
  
  if (message.action === 'checkConnection') {
    // Check Obsidian REST API connection
    checkObsidianConnection()
      .then((connected) => {
        sendResponse({ connected });
      })
      .catch((error) => {
        sendResponse({ connected: false, error: error.message });
      });
    return true; // Keep channel open for async response
  }
  
  if (message.action === 'checkOllama') {
    // Check Ollama connection
    checkOllamaConnection(message.endpoint)
      .then((connected) => {
        sendResponse({ connected });
      })
      .catch((error) => {
        sendResponse({ connected: false, error: error.message });
      });
    return true;
  }
});

/**
 * Check if Obsidian Local REST API is available
 */
async function checkObsidianConnection() {
  try {
    const response = await fetch('http://127.0.0.1:27123/', {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer'
      }
    });
    return response.ok;
  } catch (error) {
    return false;
  }
}

/**
 * Check if Ollama is available
 */
async function checkOllamaConnection(endpoint = 'http://localhost:11434') {
  try {
    const response = await fetch(`${endpoint}/api/tags`, {
      method: 'GET'
    });
    return response.ok;
  } catch (error) {
    return false;
  }
}

// Log service worker start
console.log('[SessionVault] Service worker started');
