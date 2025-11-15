class TranscriptAPI {
    /**
     * Retrieves the transcript of a particular video.
     * @param {string} id - The YouTube video ID
     * @param {string} [langCode] - ISO 639-1 language code
     * @param {object} [config] - Fetch options
     */
    static async getTranscript(id, langCode, config = {}) {
        const url = new URL("https://www.youtube.com/watch");
        url.searchParams.set("v", id);

        try {
            const response = await fetch(
                "https://tactiq-apps-prod.tactiq.io/transcript",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        ...config.headers,
                    },
                    body: JSON.stringify({
                        langCode: langCode || "en",
                        videoUrl: url.toString(),
                    }),
                    ...config,
                },
            );

            if (!response.ok) {
                if (response.status === 406)
                    throw new Error("invalid video ID");
                if (response.status === 503)
                    throw new Error("video unavailable or captions disabled");
                throw new Error(`HTTP error ${response.status}`);
            }

            const data = await response.json();
            return data.captions.map(({ dur, ...rest }) => ({
                ...rest,
                duration: dur,
            }));
        } catch (e) {
            throw e;
        }
    }

    /**
     * Checks if a video with the specified ID exists on YouTube.
     * @param {string} id - The YouTube video ID
     * @param {object} [config] - Fetch options
     */
    static async validateID(id, config = {}) {
        const url = new URL("https://video.google.com/timedtext");
        url.searchParams.set("type", "track");
        url.searchParams.set("v", id);
        url.searchParams.set("id", "0");
        url.searchParams.set("lang", "en");

        try {
            const response = await fetch(url.toString(), config);
            return response.ok;
        } catch (_) {
            return false;
        }
    }
}

export default TranscriptAPI;
