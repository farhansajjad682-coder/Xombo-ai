import { GoogleGenAI, Modality } from "@google/genai";
import { tools, functionHandlers } from "../lib/functions";
import { Message } from "../types";

let genAI: GoogleGenAI | null = null;

function getGenAI() {
  if (!genAI) {
    // In Vite, process.env.GEMINI_API_KEY is replaced by a string value via the 'define' config
    // We use a local variable to help with debugging if needed
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey || apiKey === 'undefined') {
      throw new Error('GEMINI_API_KEY is not configured. Please set it in settings.');
    }
    
    genAI = new GoogleGenAI({ apiKey: apiKey });
  }
  return genAI;
}

export const chatWithGemini = async (
  messages: Message[],
  onChunk?: (text: string) => void
) => {
  const ai = getGenAI();
  const contents = messages.map(m => {
    const parts: any[] = [{ text: m.content }];
    
    if (m.image && m.image.includes(',')) {
      try {
        const base64Data = m.image.split(',')[1];
        const mimeType = m.image.split(';')[0].split(':')[1];
        if (base64Data && mimeType) {
          parts.push({
            inlineData: {
              data: base64Data,
              mimeType: mimeType
            }
          });
        }
      } catch (err) {
        console.error('Error processing image part:', err);
      }
    }

    return {
      role: m.role === 'model' ? 'model' : 'user',
      parts
    };
  });

    const config = {
      tools: [
        { googleSearch: {} },
        { functionDeclarations: tools }
      ],
      toolConfig: { includeServerSideToolInvocations: true },
      systemInstruction: "You are Xombo AI, a direct and helpful assistant. YOUR PRIMARY SPECIALTY is solving academic, technical, and logical questions from images. When an image is uploaded, analyze it with extreme precision to extract questions, math problems, or diagrams, and provide clear, step-by-step solutions. CRITICAL: When sharing code snippets (HTML, CSS, JS, etc.), YOU MUST ALWAYS use triple backticks with the language name (e.g., ```html) so they appear in a dark black box with a header. Use the generateImage tool ONLY when explicitly asked to create a NEW creative image. For image generation, EXPLICITLY output the resulting imageUrl in your final response. If you generate code, use triple backticks. Be concise but thorough. Powered by Banana Image Engine.",
    };

  try {
    // Initial call to check for tool usage
    const result = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents,
      config,
    });

    const functionCalls = result.functionCalls;
    
    if (functionCalls && functionCalls.length > 0) {
      console.log('Gemini requested tools:', functionCalls.map(f => f.name));
      
      const results = await Promise.all(functionCalls.map(async (fc) => {
        const handler = functionHandlers[fc.name];
        if (handler) {
          try {
            const data = await handler(fc.args);
            return {
              role: 'user' as const,
              parts: [{ 
                functionResponse: {
                  name: fc.name,
                  response: data
                }
              }]
            };
          } catch (e) {
            console.error(`Error in tool ${fc.name}:`, e);
            // Provide an error message back to the model so it can try to recover or explain
            return {
              role: 'user' as const,
              parts: [{
                functionResponse: {
                  name: fc.name,
                  response: { error: `Tool execution failed: ${e instanceof Error ? e.message : String(e)}` }
                }
              }]
            };
          }
        }
        return null;
      }));

      const filteredResults = results.filter((r): r is any => r !== null);

      // Follow up with tool results and stream the final text
      const stream = await ai.models.generateContentStream({
        model: "gemini-3-flash-preview",
        contents: [
          ...contents,
          result.candidates?.[0]?.content,
          ...filteredResults
        ].filter(Boolean) as any,
        config: {
          ...config,
          toolConfig: { includeServerSideToolInvocations: true }
        }
      });

      let fullText = "";
      try {
        for await (const chunk of stream) {
          // Some chunks might not have text (could just be safety info)
          const text = chunk.text;
          if (text) {
            fullText += text;
            onChunk?.(fullText);
          }
        }
      } catch (streamErr) {
        console.error('Error during streaming:', streamErr);
        if (!fullText) throw streamErr; // Only throw if we got absolutely nothing
        fullText += "\n\n[Response truncated due to a connection issue]";
        onChunk?.(fullText);
      }
      return fullText;
    }

    // No tool calls, stream the direct response
    const stream = await ai.models.generateContentStream({
      model: "gemini-3-flash-preview",
      contents,
      config,
    });

    let fullText = "";
    try {
      for await (const chunk of stream) {
        const text = chunk.text;
        if (text) {
          fullText += text;
          onChunk?.(fullText);
        }
      }
    } catch (streamErr) {
      console.error('Error during streaming:', streamErr);
      if (!fullText) throw streamErr;
      fullText += "\n\n[Response truncated due to a connection issue]";
      onChunk?.(fullText);
    }
    return fullText;

  } catch (error) {
    console.error('Gemini API Error:', error);
    // Ensure we throw something meaningful
    if (typeof error === 'object' && error !== null && 'message' in error) {
      throw error;
    }
    throw new Error('An unexpected error occurred in Gemini API');
  }
};

export const generateSpeech = async (text: string) => {
  const ai = getGenAI();
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' }, // 'Kore' is a neutral, clear voice
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    const mimeType = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.mimeType || 'audio/wav';
    
    if (!base64Audio) throw new Error('No audio data received');
    return { data: base64Audio, mimeType };
  } catch (error) {
    console.error('Speech Generation Error:', error);
    throw error;
  }
};
