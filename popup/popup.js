/**
 * Popup Script for YT-Summarize Extension
 * Handles user interactions and configuration checks
 */

import { loadConfig, initConfig } from '../src/config.js';
import { processVideo } from '../src/index.js';

// DOM elements
const statusMessage = document.getElementById('statusMessage');
const urlDisplay = document.getElementById('urlDisplay');
const currentUrlSpan = document.getElementById('currentUrl');
const summaryBtn = document.getElementById('summaryBtn');
const optionsBtn = document.getElementById('optionsBtn');
const loading = document.getElementById('loading');

let currentTab = null;

/**
 * Show status message
 * @param {string} message - Message to display
 * @param {string} type - 'warning', 'error', or 'info'
 */
function showStatus(message, type = 'info') {
    statusMessage.textContent = message;
    statusMessage.className = `status-message ${type}`;
    statusMessage.style.display = 'block';
}

/**
 * Hide status message
 */
function hideStatus() {
    statusMessage.style.display = 'none';
}

/**
 * Show loading state
 */
function showLoading() {
    loading.classList.add('active');
    summaryBtn.disabled = true;
}

/**
 * Hide loading state
 */
function hideLoading() {
    loading.classList.remove('active');
    summaryBtn.disabled = false;
}

/**
 * Check if current tab is a YouTube video
 */
async function checkCurrentTab() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        currentTab = tab;
        
        if (tab && tab.url) {
            const isYouTube = tab.url.includes('youtube.com/watch') || tab.url.includes('youtu.be/');
            
            if (isYouTube) {
                urlDisplay.style.display = 'block';
                currentUrlSpan.textContent = tab.url;
                summaryBtn.disabled = false;
                return true;
            } else {
                urlDisplay.style.display = 'block';
                currentUrlSpan.textContent = tab.url;
                showStatus('Please navigate to a YouTube video page to summarize.', 'warning');
                summaryBtn.disabled = true;
                return false;
            }
        } else {
            showStatus('Unable to get current tab URL.', 'error');
            summaryBtn.disabled = true;
            return false;
        }
    } catch (error) {
        console.error('Error checking current tab:', error);
        showStatus('Error accessing current tab.', 'error');
        summaryBtn.disabled = true;
        return false;
    }
}

/**
 * Check if configuration exists and is valid
 */
async function checkConfig() {
    try {
        const config = await loadConfig();
        
        // Check if API key is set (for non-local providers)
        if (config.api.provider !== 'localai' && !config.api.key) {
            showStatus(
                '⚠️ Configuration required! Please set your API key in the options.',
                'warning'
            );
            return false;
        }
        
        hideStatus();
        return true;
    } catch (error) {
        console.error('Error checking config:', error);
        showStatus('Error loading configuration. Please configure the extension.', 'error');
        return false;
    }
}

/**
 * Initialize configuration if it doesn't exist
 */
async function initializeConfig() {
    try {
        await initConfig();
        const config = await loadConfig();
        
        // If still no API key after init, show warning
        if (config.api.provider !== 'localai' && !config.api.key) {
            showStatus(
                '⚠️ Please configure your API key in the options before summarizing.',
                'warning'
            );
            return false;
        }
        
        return true;
    } catch (error) {
        console.error('Error initializing config:', error);
        showStatus('Error initializing configuration.', 'error');
        return false;
    }
}

/**
 * Handle summarize button click
 */
async function handleSummarize() {
    if (!currentTab || !currentTab.url) {
        showStatus('No YouTube video URL found.', 'error');
        return;
    }

    const url = currentTab.url;
    const isYouTube = url.includes('youtube.com/watch') || url.includes('youtu.be/');
    
    if (!isYouTube) {
        showStatus('Please navigate to a YouTube video page first.', 'warning');
        return;
    }

    // Check config before processing
    const hasConfig = await checkConfig();
    if (!hasConfig) {
        showStatus('Please configure your API key in the options first.', 'warning');
        // Open options page
        chrome.runtime.openOptionsPage();
        return;
    }

    showLoading();
    hideStatus();

    try {
        showStatus('Processing video... This may take a moment.', 'info');
        
        const result = await processVideo(url);

        hideLoading();

        if (result.success && result.data.html) {
            // Create new tab with the HTML content
            const blob = new Blob([result.data.html], { type: 'text/html' });
            const blobUrl = URL.createObjectURL(blob);

            chrome.tabs.create({ url: blobUrl });
            
            // Close popup
            window.close();
        } else {
            showStatus(
                result.error || 'Failed to process video. Please try again.',
                'error'
            );
        }
    } catch (error) {
        hideLoading();
        console.error('Error processing video:', error);
        showStatus(
            `Error: ${error.message || 'Failed to process video. Please check your configuration.'}`,
            'error'
        );
    }
}

/**
 * Handle options button click
 */
function handleOptions() {
    chrome.runtime.openOptionsPage();
    window.close();
}

// Initialize popup
async function init() {
    // Initialize config if needed
    await initializeConfig();
    
    // Check current tab
    await checkCurrentTab();
    
    // Check configuration
    await checkConfig();
    
    // Set up event listeners
    summaryBtn.addEventListener('click', handleSummarize);
    optionsBtn.addEventListener('click', handleOptions);
}

// Run initialization when popup opens
init();

