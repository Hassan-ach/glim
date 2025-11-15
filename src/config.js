/**
 * Glim Configuration Module
 *
 * This module handles loading and managing configuration settings for Glim.
 * It supports loading from chrome.storage.
 *
 * @module config
 * @author Bagi
 */

// Default configuration
const defaultConfig = {
    // API settings
    api: {
        provider: "google", // Options: google, openai, anthropic, localai
        key: "",
        model: "gemini-2.0-flash",
        // Additional model settings
        temperature: 0.7, // Controls randomness (0.0-1.0)
        max_tokens: 4000, // Maximum tokens in the response
        endpoint: "http://localhost:11434/api/generate", // For localai provider
    },
    // Content generation settings
    content: {
        maxTopics: 5,
        maxQuestionsPerTopic: 3,
        codeLang: "en",
        theme: "default",
    },
    // Output settings
    output: {
        dirname: "output",
    },
};

/**
 * Create a default configuration in storage
 * @async
 * @returns {Promise<void>}
 */
export async function createDefaultConfig() {
    try {
        await chrome.storage.sync.set({ glimConfig: defaultConfig });
        console.log("✅ Default config saved to storage");
    } catch (error) {
        console.error(`❌ Failed to save config: ${error.message}`);
    }
}

/**
 * Load configuration from chrome.storage
 * @async
 * @returns {Promise<object>} Configuration object
 */
export async function loadConfig() {
    try {
        const result = await chrome.storage.sync.get("glimConfig");

        if (result.glimConfig) {
            return mergeConfigs(defaultConfig, result.glimConfig);
        }

        // No config found, return default
        return defaultConfig;
    } catch (error) {
        console.error(`Error loading configuration: ${error.message}`);
        return defaultConfig;
    }
}

/**
 * Save configuration to chrome.storage
 * @async
 * @param {object} config - Configuration object to save
 * @returns {Promise<void>}
 */
export async function saveConfig(config) {
    try {
        await chrome.storage.sync.set({ glimConfig: config });
        console.log("✅ Config saved successfully");
    } catch (error) {
        console.error(`❌ Failed to save config: ${error.message}`);
    }
}

// Helper function to deep merge configs
function mergeConfigs(defaultObj, userObj) {
    if (!userObj) return defaultObj;

    const result = { ...defaultObj };

    for (const [key, value] of Object.entries(userObj)) {
        if (value && typeof value === "object" && !Array.isArray(value)) {
            result[key] = mergeConfigs(defaultObj[key] || {}, value);
        } else {
            result[key] = value;
        }
    }

    return result;
}

// Export default config for reference
export const defaultConfiguration = defaultConfig;

// Initialize config on first install
export async function initConfig() {
    const result = await chrome.storage.sync.get("glimConfig");
    if (!result.glimConfig) {
        await createDefaultConfig();
    }
}
