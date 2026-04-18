import { FunctionDeclaration, Type } from "@google/genai";

export const tools: FunctionDeclaration[] = [
  {
    name: "getCurrentTime",
    description: "Get the current local time.",
    parameters: {
      type: Type.OBJECT,
      properties: {},
    },
  },
  {
    name: "getWeather",
    description: "Get the current weather for a location.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        location: {
          type: Type.STRING,
          description: "The city and state, e.g. San Francisco, CA",
        },
      },
      required: ["location"],
    },
  },
  {
    name: "generateRandomNumber",
    description: "Generate a random number between a min and max value.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        min: {
          type: Type.NUMBER,
          description: "Minimum value",
        },
        max: {
          type: Type.NUMBER,
          description: "Maximum value",
        },
      },
      required: ["min", "max"],
    },
  },
  {
    name: "generateImage",
    description: "Generate a creative image using Xombo's Nano-Banana image generation engine. Best for visual creativity.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        prompt: {
          type: Type.STRING,
          description: "A detailed description of the image to generate.",
        },
      },
      required: ["prompt"],
    },
  },
];

export const functionHandlers: Record<string, (args: any) => any> = {
  getCurrentTime: () => {
    return { time: new Date().toLocaleTimeString() };
  },
  getWeather: ({ location }: { location: string }) => {
    // Mock weather data
    const conditions = ['Sunny', 'Cloudy', 'Rainy', 'Windy', 'Mist'];
    const temp = Math.floor(Math.random() * 30) + 10;
    return {
      location,
      temperature: `${temp}°C`,
      condition: conditions[Math.floor(Math.random() * conditions.length)],
    };
  },
  generateRandomNumber: ({ min, max }: { min: number; max: number }) => {
    return { result: Math.floor(Math.random() * (max - min + 1)) + min };
  },
  generateImage: ({ prompt }: { prompt: string }) => {
    const encodedPrompt = encodeURIComponent(prompt);
    const seed = Math.floor(Math.random() * 1000000);
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?seed=${seed}&width=1024&height=1024&nologo=true`;
    return { 
      success: true, 
      imageUrl, 
      explanation: "Image generated successfully. Please display this URL as an image." 
    };
  },
};
