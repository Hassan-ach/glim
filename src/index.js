/**
 * Glim: YouTube Video Summarizer
 *
 * Main entry point for the Glim application.
 * Handles processing YouTube videos in browser extension context.
 *
 * @author Bagi
 * @version 1.0.0
 */

import { createYouTubeProcessorFlow } from "./flow.js";
import { loadConfig } from "./config.js";
import logger from "./utils/logger.js";
import { verifyProviderRequirements } from "./utils/callLLM.js";

/**
 * Process a YouTube video
 * @param {string} url - YouTube video URL
 * @param {object} options - Processing options
 * @returns {Promise<object>} Processing result
 */
async function processVideo(url, options = {}) {
    try {
        logger.info(`Starting YouTube content processor for URL: ${url}`);

        // Load config from storage
        const config = await loadConfig();

        // Override config with options if provided
        if (options.provider) {
            config.api.provider = options.provider;
        }
        if (options.apiKey) {
            config.api.key = options.apiKey;
        }
        if (options.theme) {
            config.content.theme = options.theme;
        }
        if (options.lang) {
            config.content.codeLang = options.lang;
        }

        // Validate provider requirements
        const provider = config.api?.provider?.toLowerCase();
        if (!(await verifyProviderRequirements(provider))) {
            logger.warn(
                `Issues detected with provider '${provider}'. The application may not function correctly.`,
            );
        }

        logger.info(`Using AI provider: ${provider}`);

        // Create flow
        const flow = createYouTubeProcessorFlow();

        // Initialize shared memory
        const shared = {
            url: url,
            theme: options.theme || config.content.theme || "default",
            lang: options.lang || config.content.codeLang || "en",
        };

        // Run the flow
        await flow.run(shared);

        logger.info("Processing completed successfully!");

        return {
            success: true,
            data: shared,
        };
    } catch (error) {
        logger.error(`Error processing video: ${error.message}`);
        return {
            success: false,
            error: error.message,
        };
    }
}
export { processVideo };
