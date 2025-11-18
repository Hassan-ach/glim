/**
 * Glim Processing Nodes
 *
 * This module defines the processing nodes used in the Glim video summarization pipeline.
 * Each node handles a specific part of the processing workflow.
 *
 * @module nodes
 * @author Bagi
 */

import yaml from "js-yaml";
import { Node, BatchNode } from "./pocketflow.js";
import { callLLM } from "./utils/callLLM.js";
import { getVideoInfo } from "./utils/youtubeProcessor.js";
import { _generateHtmlForTheme } from "./utils/htmlGenerator.js";
import { loadConfig } from "./config.js";
import logger from "./utils/logger.js";

// Define the specific nodes for the Glim YouTube Content Processor

/**
 * ProcessYouTubeURL node
 *
 * First node in the pipeline that processes a YouTube URL
 * and extracts video information and transcript.
 */
class ProcessYouTubeURL extends Node {
    /**
     * Create new ProcessYouTubeURL node
     * @param {number} maxRetries - Maximum retry attempts
     * @param {number} wait - Wait time between retries in seconds
     */
    constructor(maxRetries = 2, wait = 10) {
        super(maxRetries, wait);
    }

    /**
     * Prepare processing by extracting URL from shared state
     * @param {Object} shared - Shared state object
     * @returns {string} YouTube URL to process
     */
    async prep(shared) {
        logger.debug("Preparing to process YouTube URL");
        const config = await loadConfig();
        const url = shared.url || "";
        const lang = shared.lang || config.content?.codeLang || "";
        return { url, lang };
    }

    /**
     * Execute URL processing to extract video information
     * @param {string} url - YouTube video URL
     * @returns {Object} Video information
     * @throws {Error} If URL is missing or processing fails
     */
    async exec(data) {
        const { url, lang } = data;
        if (!url) {
            logger.error("No YouTube URL provided");
            throw new Error("No YouTube URL provided");
        }

        logger.info(`Processing YouTube URL: ${url}`);
        const videoInfo = await getVideoInfo(url, lang);

        if (videoInfo.error) {
            logger.error(`Error processing video: ${videoInfo.error}`);
            process.exit(-1);
            throw new Error(`Error processing video: ${videoInfo.error}`);
        }

        return videoInfo;
    }

    /**
     * Post-processing after video information extraction
     * @param {Object} shared - Shared state object
     * @param {string} prepRes - URL from prep stage
     * @param {Object} execRes - Video information from exec stage
     * @returns {string} Next action to take
     */
    async post(shared, prepRes, execRes) {
        try {
            if (!execRes) {
                logger.warn("No video information to store");
                return "error";
            }

            // Store video information in shared state
            shared.video_info = execRes;
            shared.processing_start_time = Date.now();

            // Log summary of extracted information
            logger.info(`Video title: ${execRes.title || "Unknown"}`);
            logger.info(
                `Transcript length: ${(execRes.transcript || "").length} characters`,
            );
            logger.info(`Video ID: ${execRes.video_id || "Unknown"}`);

            if (execRes.duration) {
                const durationMin = Math.floor(execRes.duration / 60);
                const durationSec = Math.round(execRes.duration % 60);
                logger.info(
                    `Video duration: ${durationMin}:${durationSec.toString().padStart(2, "0")}`,
                );
            }

            return "default";
        } catch (error) {
            logger.error(`Error in post-processing: ${error.message}`);
            return "error";
        }
    }

    /**
     * Fallback handler for when execution fails
     * @param {string} prepRes - YouTube URL from prep stage
     * @param {Error} error - The error that occurred
     * @throws {Error} Re-throws the original error
     */
    async execFallback(prepRes, error) {
        logger.error(`All retries failed for URL processing: ${error.message}`);
        throw new Error(`Failed to process YouTube URL: ${error.message}`);
    }
}

class ExtractTopicsAndQuestions extends Node {
    /**
     * Extract interesting topics and generate questions from the video transcript
     */
    constructor(maxRetries = 2, wait = 10) {
        super(maxRetries, wait);
    }

    async prep(shared) {
        /**
         * Get transcript and title from video_info
         */
        const config = await loadConfig();
        const videoInfo = shared.video_info || {};
        const transcript = videoInfo.transcript || "";
        const title = videoInfo.title || "";
        const lang = shared.lang || config.content?.codeLang || "en";
        return { transcript, title, lang };
    }

    async exec(data) {
        /**
         * Extract topics and generate questions using LLM
         */
        const { transcript, title, lang, topicsNumber, maxQuestionsPerTopic } =
            data;

        // Single prompt to extract topics and questions together
        const config = await loadConfig();
        const prompt = `You are an expert content analyzer. Given a YouTube video transcript, identify at most ${config.content?.maxTopics || 5} most interesting topics discussed and generate at most ${config.content?.maxQuestionsPerTopic || 3} most thought-provoking questions for each topic.
These questions don't need to be directly asked in the video. It's good to have clarification questions.

VIDEO TITLE: ${title}

TRANSCRIPT:
${transcript}

For your answers:
1. All answers must be in The language that have this ISO code: ${lang} only. Do not respond in any other language, even if the question is asked in a different language. 

Format your response in YAML:

\`\`\`yaml
topics:
  - title: |
        First Topic Title
    questions:
      - |
        Question 1 about first topic?
      - |
        Question 2 ...
  - title: |
        Second Topic Title
    questions:
        ...
\`\`\`
`;

        const response = await callLLM(prompt);

        // Extract YAML content
        let yamlContent;
        if (response.includes("```yaml")) {
            yamlContent = response.split("```yaml")[1].split("```")[0].trim();
        } else {
            yamlContent = response;
        }

        const parsed = yaml.load(yamlContent);
        let rawTopics = parsed.topics || [];

        // Ensure we have at most 5 or maxTopics from config topics
        // config is already loaded above in this function
        rawTopics = rawTopics.slice(0, config.content?.maxTopics || 5);

        // Format the topics and questions for our data structure
        const resultTopics = [];
        for (const topic of rawTopics) {
            const topicTitle = topic.title || "";
            const rawQuestions = topic.questions || [];

            // Create a complete topic with questions
            resultTopics.push({
                title: topicTitle,
                questions: rawQuestions.map((q) => ({
                    original: q,
                    rephrased: "",
                    answer: "",
                })),
            });
        }

        return resultTopics;
    }

    async post(shared, prepRes, execRes) {
        /**
         * Store topics with questions in shared
         */
        shared.topics = execRes;

        // Count total questions
        const totalQuestions = execRes.reduce(
            (sum, topic) => sum + (topic.questions || []).length,
            0,
        );

        logger.info(
            `Extracted ${execRes.length} topics with ${totalQuestions} questions`,
        );
        return "default";
    }
}
class ProcessContent extends BatchNode {
    /**
     * Process each topic for rephrasing and answering
     */
    constructor(maxRetries = 2, wait = 10) {
        super(maxRetries, wait);
    }

    async prep(shared) {
        /**
         * Return list of topics for batch processing
         */
        const config = await loadConfig();
        const lang = shared.lang || config.content?.codeLang || "en";
        const topics = shared.topics || [];
        const videoInfo = shared.video_info || {};
        const transcript = videoInfo.transcript || "";

        // FIXED: Validate inputs
        if (!Array.isArray(topics) || topics.length === 0) {
            logger.warn("No topics found for processing");
            return [];
        }

        if (!transcript || transcript.trim() === "") {
            logger.warn("No transcript found for processing");
        }

        const batchItems = [];
        for (const topic of topics) {
            // FIXED: Validate topic structure
            if (!topic || !topic.title) {
                logger.warn("Invalid topic structure:", topic);
                continue;
            }

            // FIXED: Validate questions array
            const questions = Array.isArray(topic.questions)
                ? topic.questions
                : [];
            if (questions.length === 0) {
                logger.warn(`No questions found for topic: ${topic.title}`);
            }

            batchItems.push({
                topic: { ...topic },
                transcript,
                lang,
            });
        }

        return batchItems;
    }

    async exec(item) {
        /**
         * Process a topic using LLM
         */
        try {
            const { topic, transcript, lang } = item;

            // FIXED: Validate item structure
            if (!topic || !topic.title) {
                throw new Error("Invalid topic structure in exec");
            }

            const topicTitle = topic.title;
            const questions = Array.isArray(topic.questions)
                ? topic.questions
                : [];

            // FIXED: Handle empty questions array
            if (questions.length === 0) {
                return {
                    title: topicTitle,
                    rephrased_title: topicTitle,
                    questions: [],
                };
            }

            // FIXED: Validate question structure and extract original text safely
            const validQuestions = questions
                .filter((q) => q && q.original)
                .map((q) => q.original);

            if (validQuestions.length === 0) {
                logger.warn(
                    `No valid questions found for topic: ${topicTitle}`,
                );
                return {
                    title: topicTitle,
                    rephrased_title: topicTitle,
                    questions: [],
                };
            }

            const questionsList = validQuestions
                .map((q) => `- ${q}`)
                .join("\n");
            const questionsTemplate = validQuestions
                .map(
                    (q, i) =>
                        `  - original: |\n        ${q}${i === 0 ? "\n    rephrased: |\n        Interesting question in 15 words\n    answer: |\n        Simple answer that a 5-year-old could understand in 100 words" : "\n    ..."}`,
                )
                .join("\n");

            const prompt = `You are a content simplifier for children. Given a topic and questions from a YouTube video, rephrase the topic title and questions to be clearer, and provide simple ELI5 (Explain Like I'm 5) answers.

TOPIC: ${topicTitle}

QUESTIONS:
${questionsList}

TRANSCRIPT EXCERPT:
${transcript}

For topic title and questions:
1. Keep them catchy and interesting, but short

For your answers:
1. Format them using HTML with <b> and <i> tags for highlighting. 
2. Prefer lists with <ol> and <li> tags. Ideally, <li> followed by <b> for the key points.
3. Quote important keywords but explain them in easy-to-understand language (e.g., "<b>Quantum computing</b> is like having a super-fast magical calculator")
4. Keep answers interesting but short
5. All answers must be in The language that have this ISO code: ${lang} only. Do not respond in any other language, even if the question is asked in a different language. 

Format your response in YAML:

\`\`\`yaml
rephrased_title: |
    Interesting topic title in 10 words
questions:
${questionsTemplate}
\`\`\`
`;

            const response = await callLLM(prompt);

            // FIXED: Better YAML extraction with error handling
            let yamlContent;
            try {
                if (response.includes("```yaml")) {
                    const yamlMatch = response.match(
                        /```yaml\s*([\s\S]*?)\s*```/,
                    );
                    if (yamlMatch) {
                        yamlContent = yamlMatch[1].trim();
                    } else {
                        yamlContent = response
                            .split("```yaml")[1]
                            .split("```")[0]
                            .trim();
                    }
                } else if (response.includes("```")) {
                    // Handle cases where LLM uses just ``` without yaml
                    const codeMatch = response.match(/```\s*([\s\S]*?)\s*```/);
                    if (codeMatch) {
                        yamlContent = codeMatch[1].trim();
                    } else {
                        yamlContent = response;
                    }
                } else {
                    yamlContent = response;
                }
            } catch (error) {
                logger.error("Error extracting YAML content:", error);
                yamlContent = response;
            }

            // FIXED: Better YAML parsing with error handling
            let parsed;
            try {
                parsed = yaml.load(yamlContent);
            } catch (yamlError) {
                logger.error("YAML parsing error:", yamlError);
                logger.error("Raw response:", response);
                logger.error("Extracted YAML:", yamlContent);

                // FIXED: Fallback to original data if parsing fails
                return {
                    title: topicTitle,
                    rephrased_title: topicTitle,
                    questions: validQuestions.map((q) => ({
                        original: q,
                        rephrased: q,
                        answer: "",
                    })),
                };
            }

            // FIXED: Validate parsed structure
            if (!parsed || typeof parsed !== "object") {
                logger.error("Invalid parsed YAML structure:", parsed);
                return {
                    title: topicTitle,
                    rephrased_title: topicTitle,
                    questions: validQuestions.map((q) => ({
                        original: q,
                        rephrased: q,
                        answer: "",
                    })),
                };
            }

            const rephrasedTitle = parsed.rephrased_title || topicTitle;
            const processedQuestions = Array.isArray(parsed.questions)
                ? parsed.questions
                : [];

            const result = {
                title: topicTitle,
                rephrased_title: rephrasedTitle,
                questions: processedQuestions,
            };

            return result;
        } catch (error) {
            logger.error("Error processing topic:", error);
            // FIXED: Return fallback structure instead of throwing
            return {
                title: item.topic?.title || "Unknown Topic",
                rephrased_title: item.topic?.title || "Unknown Topic",
                questions: [],
            };
        }
    }

    async execFallback(prepRes, error) {
        /**
         * FIXED: Provide fallback when all retries fail
         */
        logger.error("All retries failed for topic processing:", error);

        // Return a basic structure to prevent downstream failures
        return {
            title: prepRes.topic?.title || "Unknown Topic",
            rephrased_title: prepRes.topic?.title || "Unknown Topic",
            questions: [],
        };
    }

    async post(shared, prepRes, execResList) {
        /**
         * Update topics with processed content in shared
         */

        // Utility: Normalize strings for consistent comparison
        function normalize(str) {
            return typeof str === "string"
                ? str.trim().replace(/\s+/g, " ")
                : "";
        }

        try {
            // Validate inputs
            if (!shared || !Array.isArray(shared.topics)) {
                logger.error("Invalid shared state or topics array");
                return "error";
            }

            if (!Array.isArray(execResList)) {
                logger.error("Invalid execution results list");
                return "error";
            }

            const topics = shared.topics;

            // Handle empty results
            if (execResList.length === 0) {
                logger.warn("No execution results to process");
                return "default";
            }

            // Map of original topic title to processed content
            const titleToProcessed = {};
            for (const result of execResList) {
                if (result && result.title) {
                    titleToProcessed[result.title] = result;
                } else {
                    logger.warn("Invalid result structure:", result);
                }
            }

            // Update the topics with processed content
            for (const topic of topics) {
                if (!topic || !topic.title) {
                    logger.warn("Invalid topic structure in post:", topic);
                    continue;
                }

                const topicTitle = topic.title;
                if (titleToProcessed[topicTitle]) {
                    const processed = titleToProcessed[topicTitle];

                    // Update topic with rephrased title
                    topic.rephrased_title = processed.rephrased_title;

                    if (!Array.isArray(processed.questions)) {
                        logger.warn(
                            `Invalid questions array for topic: ${topicTitle}`,
                        );
                        continue;
                    }

                    // Build map of normalized original -> processed question
                    const origToProcessed = {};
                    for (const q of processed.questions) {
                        if (q && q.original) {
                            origToProcessed[normalize(q.original)] = q;
                        }
                    }

                    // Update each question in the topic
                    if (Array.isArray(topic.questions)) {
                        for (const q of topic.questions) {
                            if (!q || !q.original) {
                                logger.warn("Invalid question structure:", q);
                                continue;
                            }

                            const normalizedOriginal = normalize(q.original);
                            if (origToProcessed[normalizedOriginal]) {
                                const processedQ =
                                    origToProcessed[normalizedOriginal];
                                q.rephrased =
                                    processedQ.rephrased || q.original;
                                q.answer = processedQ.answer || "";
                            } else {
                                q.rephrased = q.rephrased || q.original;
                                q.answer = q.answer || "";
                            }
                        }
                    }
                }
            }

            shared.topics = topics;

            try {
                logger.info(
                    `Processed content for ${execResList.length} topics`,
                );
            } catch (loggerError) {
                logger.log(
                    `Processed content for ${execResList.length} topics`,
                );
            }

            return "default";
        } catch (error) {
            logger.error("Error in post processing:", error);
            return "error";
        }
    }
}

class GenerateHTML extends Node {
    /**
     * Generate HTML output from processed content
     */
    constructor(maxRetries = 2, wait = 10) {
        super(maxRetries, wait);
    }

    async prep(shared) {
        /**
         * Get video info and topics from shared
         */
        const config = await loadConfig();
        const videoInfo = shared.video_info || {};
        const topics = shared.topics || [];
        const theme = shared.theme || config.content?.theme || "default";
        const lang = shared.lang || config.content?.codeLang || "en";

        return { video_info: videoInfo, topics, theme, lang };
    }

    async exec(data) {
        /**
         * Generate HTML using html_generator
         */
        const { video_info: videoInfo, topics, theme, lang } = data;

        const title = videoInfo.title || "YouTube Video Summary";
        const thumbnailUrl = videoInfo.thumbnail_url || "";

        // Prepare sections for HTML
        const sections = [];
        for (const topic of topics) {
            // Skip topics without questions
            if (!topic.questions || topic.questions.length === 0) {
                continue;
            }

            // Use rephrased_title if available, otherwise use original title
            const sectionTitle = topic.rephrased_title || topic.title || "";

            // Prepare bullets for this section
            const bullets = [];
            for (const question of topic.questions) {
                // Use rephrased question if available, otherwise use original
                const q = question.rephrased || question.original || "";
                const a = question.answer || "";

                // Only add bullets if both question and answer have content
                if (q.trim() && a.trim()) {
                    bullets.push([q, a]);
                }
            }

            // Only include section if it has bullets
            if (bullets.length > 0) {
                sections.push({ title: sectionTitle, bullets });
            }
        }

        // Generate HTML
        const config = await loadConfig();
        const htmlContent = _generateHtmlForTheme(
            theme,
            title,
            thumbnailUrl,
            sections,
            lang || config.content?.codeLang || "en",
        );
        return htmlContent;
    }

    async post(shared, prepRes, execRes) {
        /**
         * Store HTML output in shared
         */
        shared.html_output = execRes;
        return "default";
    }
}

export {
    ProcessYouTubeURL,
    ExtractTopicsAndQuestions,
    ProcessContent,
    GenerateHTML,
};
