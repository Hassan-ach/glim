/**
 * Glim Processing Flow
 *
 * This module defines the main processing flow for the Glim application.
 * It connects the processing nodes together in a sequential pipeline.
 *
 * @module flow
 * @author Bagi
 */
import { Flow } from "./pocketflow.js";
import {
    ProcessYouTubeURL,
    ExtractTopicsAndQuestions,
    ProcessContent,
    GenerateHTML,
} from "./nodes.js";
import logger from "./utils/logger.js";

/**
 * Creates and configures the YouTube processing flow
 *
 * The flow consists of the following steps:
 * 1. Process YouTube URL to get video info and transcript
 * 2. Extract topics and questions from the video content
 * 3. Process content to generate ELI5 answers
 * 4. Generate HTML output
 *
 * @returns {Flow} Configured processing flow
 */
function createYouTubeProcessorFlow() {
    logger.info("Creating Glim YouTube processor flow");

    // Create nodes with retry configuration
    const processUrl = new ProcessYouTubeURL(2, 10);
    const extractTopicsAndQuestions = new ExtractTopicsAndQuestions(2, 10);
    const processContent = new ProcessContent(2, 10);
    const generateHtml = new GenerateHTML(2, 10);

    // Connect nodes in sequential order
    processUrl.next(extractTopicsAndQuestions);
    extractTopicsAndQuestions.next(processContent);
    processContent.next(generateHtml);

    // Create flow starting with URL processing
    const flow = new Flow(processUrl);

    logger.debug("Glim flow created successfully");
    return flow;
}

export { createYouTubeProcessorFlow };
