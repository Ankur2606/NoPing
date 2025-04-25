/**
 * Gemini API integration for FlowSync
 * 
 * This module provides functions to interact with Google's Gemini API
 */

const { GoogleGenerativeAI } = require("@google/generative-ai");
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Get API key from environment variables
const API_KEY = process.env.GEMINI_API_KEY;

// Initialize the Gemini API client
const genAI = new GoogleGenerativeAI(API_KEY);

/**
 * Call Gemini API with a prompt and optional structured data
 * 
 * @param {string} prompt - The prompt to send to Gemini API
 * @param {Object} data - Optional structured data to enhance the prompt
 * @param {Object} options - Optional configuration for the API call
 * @param {string} options.model - The model to use (defaults to 'gemini-pro')
 * @param {number} options.temperature - Temperature for response generation (0.0-1.0)
 * @param {number} options.topK - Top-k for sampling
 * @param {number} options.topP - Top-p for sampling
 * @param {number} options.maxOutputTokens - Maximum output tokens
 * @returns {Promise<Object>} - The response from Gemini API
 */
const callGeminiAPI = async (prompt, data = {}, options = {}) => {
  try {
    // Check if API key is configured
    if (!API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured in environment variables");
    }

    // Default options
    const defaultOptions = {
      model: "gemini-pro",
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 1024
    };

    // Merge default options with user-provided options
    const modelOptions = { ...defaultOptions, ...options };
    
    // Select the model
    const model = genAI.getGenerativeModel({ model: modelOptions.model });

    // Prepare the prompt with structured data if provided
    let enhancedPrompt = prompt;
    if (Object.keys(data).length > 0) {
      enhancedPrompt += "\n\nHere's the contextual data:\n" + 
                        JSON.stringify(data, null, 2);
    }

    // Generate content
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: enhancedPrompt }] }],
      generationConfig: {
        temperature: modelOptions.temperature,
        topK: modelOptions.topK,
        topP: modelOptions.topP,
        maxOutputTokens: modelOptions.maxOutputTokens,
      }
    });

    const response = result.response;
    
    return {
      success: true,
      text: response.text(),
      result: response
    };
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    return {
      success: false,
      error: error.message,
      details: error
    };
  }
};

/**
 * Stream response from Gemini API with a prompt and optional structured data
 *
 * @param {string} prompt - The prompt to send to Gemini API
 * @param {Object} data - Optional structured data to enhance the prompt
 * @param {Object} options - Optional configuration for the API call
 * @returns {AsyncGenerator} - An async generator that yields chunks of the response
 */
const streamGeminiResponse = async function* (prompt, data = {}, options = {}) {
  try {
    // Check if API key is configured
    if (!API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured in environment variables");
    }

    // Default options
    const defaultOptions = {
      model: "gemini-pro",
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 1024
    };

    // Merge default options with user-provided options
    const modelOptions = { ...defaultOptions, ...options };
    
    // Select the model
    const model = genAI.getGenerativeModel({ model: modelOptions.model });

    // Prepare the prompt with structured data if provided
    let enhancedPrompt = prompt;
    if (Object.keys(data).length > 0) {
      enhancedPrompt += "\n\nHere's the contextual data:\n" + 
                        JSON.stringify(data, null, 2);
    }

    // Generate content in streaming mode
    const result = await model.generateContentStream({
      contents: [{ role: "user", parts: [{ text: enhancedPrompt }] }],
      generationConfig: {
        temperature: modelOptions.temperature,
        topK: modelOptions.topK,
        topP: modelOptions.topP,
        maxOutputTokens: modelOptions.maxOutputTokens,
      }
    });

    for await (const chunk of result.stream) {
      yield chunk.text();
    }
  } catch (error) {
    console.error("Error streaming from Gemini API:", error);
    yield JSON.stringify({
      success: false,
      error: error.message
    });
  }
};

module.exports = {
  callGeminiAPI,
  streamGeminiResponse
};