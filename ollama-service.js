class OllamaService {
    constructor() {
        this.baseUrl = 'http://localhost:11434/api';
    }

    async analyzeText(text) {
        try {
            const response = await fetch(`${this.baseUrl}/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: 'llama2',
                    prompt: `Analyze the following text for potential privacy concerns or dangerous terms. Focus on data collection, sharing, user rights, and any concerning clauses. Format the response as JSON with the following structure:
                    {
                        "risk_level": "high|medium|low",
                        "concerns": ["list of specific concerns"],
                        "summary": "brief summary of findings"
                    }
                    
                    Text to analyze: ${text}`,
                    stream: false
                })
            });

            const data = await response.json();
            return JSON.parse(data.response);
        } catch (error) {
            console.error('Error analyzing text with Ollama:', error);
            return {
                risk_level: 'unknown',
                concerns: ['Failed to analyze text'],
                summary: 'Error occurred during analysis'
            };
        }
    }
}

export default new OllamaService(); 