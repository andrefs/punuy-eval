import MistralClient, { ToolChoice } from "@mistralai/mistralai";
import "dotenv/config";
const apiKey = process.env.MISTRAL_API_KEY;

console.log("API Key:", apiKey);

const run = async () => {
  const client = new MistralClient(apiKey);

  const chatResponse = await client.chat({
    model: "mistral-large-latest",
    messages: [
      {
        role: "user",
        content:
          "Give me a list of 10 French cheeses so that I could choose the best one.",
      },
    ],
    toolChoice: "any",

    tools: [
      {
        type: "function",
        // omitting description seems to yield better results
        function: {
          name: "choose_cheese",
          description: "Choose the best French cheese.",
          parameters: {
            type: "object",
            properties: {
              cheeses: {
                type: "array",
                items: { type: "string" },
              },
            },
            required: ["cheeses"],
          },
        },
      },
    ],
  });

  console.log("XXXXXXXXXXXX 1", JSON.stringify(chatResponse, null, 2));
  //console.log("Chat:", chatResponse.choices[0].message.content);
};

run().then(() => console.log("Done"));
