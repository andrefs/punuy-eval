import {
  GenerateContentRequest,
  GoogleGenerativeAI,
  SchemaType,
} from "@google/generative-ai";
import "dotenv/config";
const apiKey = process.env.GOOGLE_API_KEY;

console.log("API Key:", apiKey);

const genAI = new GoogleGenerativeAI(apiKey!);

const run = async () => {
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash-002",
    generationConfig: {
      maxOutputTokens: 2048,
      temperature: 1,
      topP: 1,
    },
  });

  const req: GenerateContentRequest = {
    contents: [
      {
        role: "model" as const,
        parts: [
          {
            text: "You are a helpful assistant that outputs only valid JSON.",
          },
          {
            text: "Produce only valid JSON output and do not put any text outside of the JSON object.",
          },
        ],
      },
      {
        role: "user" as const,
        parts: [{ text: "Give me a list of 10 French cheeses." }],
      },
    ],
    tools: [
      {
        functionDeclarations: [
          {
            name: "choose_cheese",
            description: "Choose the best French cheese.",
            parameters: {
              type: SchemaType.OBJECT,
              properties: {
                cheeses: {
                  type: SchemaType.ARRAY,
                  items: { type: SchemaType.STRING },
                },
              },
              required: ["cheeses"],
            },
          },
        ],
      },
    ],
  };

  const result = await model.generateContent(req);

  console.log("XXXXXXXXXXXX 1", JSON.stringify(result, null, 2));
  //console.log("Chat:", chatResponse.choices[0].message.content);
};

run().then(() => console.log("Done"));
