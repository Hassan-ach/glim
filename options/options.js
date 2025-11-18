/**
 * Options Page Script
 * Handles loading and saving configuration from the options page
 */

import { loadConfig, saveConfig, defaultConfiguration } from "../src/config.js";

// DOM elements
const form = document.getElementById("configForm");
const statusMessage = document.getElementById("statusMessage");
const resetBtn = document.getElementById("resetBtn");
// const temperatureInput = document.getElementById("temperature");
// const temperatureValue = document.getElementById("temperatureValue");

// Update temperature display
// temperatureInput.addEventListener("input", (e) => {
//     temperatureValue.textContent = e.target.value;
// });

/**
 * Show status message
 * @param {string} message - Message to display
 * @param {string} type - 'success' or 'error'
 */
function showStatus(message, type = "success") {
    statusMessage.textContent = message;
    statusMessage.className = `status-message ${type}`;
    statusMessage.style.display = "block";

    // Auto-hide after 3 seconds
    setTimeout(() => {
        statusMessage.style.display = "none";
    }, 3000);
}

/**
 * Load configuration and populate form
 */
async function loadConfiguration() {
    try {
        const config = await loadConfig();

        // Populate API settings
        // document.getElementById("apiProvider").value =
        //     config.api.provider || "google";
        // document.getElementById("apiKey").value = config.api.key || "";
        // document.getElementById("apiModel").value =
        //   config.api.model || "gemini-2.0-flash";

        // Populate content settings
        document.getElementById("maxTopics").value =
            config.content.maxTopics || 5;
        document.getElementById("maxQuestionsPerTopic").value =
            config.content.maxQuestionsPerTopic || 3;
        document.getElementById("codeLang").value =
            config.content.codeLang || "en";
        document.getElementById("theme").value =
            config.content.theme || "default";

        console.log("✅ Configuration loaded successfully");
    } catch (error) {
        console.error("❌ Error loading configuration:", error);
        showStatus("Error loading configuration. Using defaults.", "error");
    }
}

/**
 * Save configuration from form
 */
async function saveConfiguration(event) {
    event.preventDefault();

    try {
        // Build config object from form data
        const config = {
            api: {
                // provider: document.getElementById("apiProvider").value,
                // key: document.getElementById("apiKey").value,
                // model: document.getElementById("apiModel").value,
                // temperature: parseFloat(
                //     document.getElementById("temperature").value,
                // ),
                //     max_tokens: parseInt(
                //         document.getElementById("maxTokens").value,
                //     ),
                //     endpoint: document.getElementById("apiEndpoint").value,
            },
            content: {
                maxTopics: parseInt(document.getElementById("maxTopics").value),
                maxQuestionsPerTopic: parseInt(
                    document.getElementById("maxQuestionsPerTopic").value,
                ),
                codeLang: document.getElementById("codeLang").value,
                theme: document.getElementById("theme").value,
            },
        };

        // Validate required fields
        // if (!config.api.provider) {
        //     showStatus("Please select an API provider", "error");
        //     return;
        // }

        // if (config.api.provider !== "localai" && !config.api.key) {
        //     showStatus("API key is required for non-local providers", "error");
        //     return;
        // }

        // Save configuration
        await saveConfig(config);
        showStatus("Configuration saved successfully!", "success");

        console.log("✅ Configuration saved:", config);
    } catch (error) {
        console.error("❌ Error saving configuration:", error);
        showStatus("Error saving configuration. Please try again.", "error");
    }
}

/**
 * Reset form to default values
 */
async function resetToDefaults() {
    if (
        !confirm(
            "Are you sure you want to reset all settings to default values?",
        )
    ) {
        return;
    }

    try {
        // Populate form with default values
        const config = defaultConfiguration;

        // document.getElementById("apiProvider").value = config.api.provider;
        // document.getElementById("apiKey").value = config.api.key;
        // document.getElementById("apiModel").value = config.api.model;
        // document.getElementById("temperature").value = config.api.temperature;
        // temperatureValue.textContent = config.api.temperature;
        // document.getElementById("maxTokens").value = config.api.max_tokens;
        // document.getElementById("apiEndpoint").value = config.api.endpoint;

        document.getElementById("maxTopics").value = config.content.maxTopics;
        document.getElementById("maxQuestionsPerTopic").value =
            config.content.maxQuestionsPerTopic;
        document.getElementById("codeLang").value = config.content.codeLang;
        document.getElementById("theme").value = config.content.theme;

        // Save defaults
        await saveConfig(config);
        showStatus("Configuration reset to defaults and saved!", "success");

        console.log("✅ Configuration reset to defaults");
    } catch (error) {
        console.error("❌ Error resetting configuration:", error);
        showStatus("Error resetting configuration. Please try again.", "error");
    }
}

// Event listeners
form.addEventListener("submit", saveConfiguration);
resetBtn.addEventListener("click", resetToDefaults);

// Load configuration when page loads
document.addEventListener("DOMContentLoaded", loadConfiguration);
