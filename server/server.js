const express = require("express");
const cors = require("cors");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const app = express();
const PORT = 3001;

// Enable CORS for all routes
app.use(cors());

// Initialize Google Generative AI
const genAI = new GoogleGenerativeAI("AIzaSyAZ3vUKmJxStPNtqWCothLqthPiW1cmS0g");

// SSE Endpoint
app.get("/recipeStream", async (req, res) => {
  const ingredients = req.query.ingredients;
  const mealType = req.query.mealType;
  const cuisine = req.query.cuisine;
  const cookingTime = req.query.cookingTime;
  const complexity = req.query.complexity;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  // Function to send messages
  const sendEvent = (chunk) => {
    let chunkResponse;
    if (chunk.choices[0].finish_reason === "stop") {
      res.write(`data: ${JSON.stringify({ action: "close" })}\n\n`);
    } else {
      if (
        chunk.choices[0].delta.role &&
        chunk.choices[0].delta.role === "assistant"
      ) {
        chunkResponse = {
          action: "start",
        };
      } else {
        chunkResponse = {
          action: "chunk",
          chunk: chunk.choices[0].delta.content,
        };
      }
      res.write(`data: ${JSON.stringify(chunkResponse)}\n\n`);
    }
  };

  async function run() {
    try {
      // For text-only input, use the gemini-pro model
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });
  
      const prompt = [];
      prompt.push("Generate a recipe that incorporates the following details:");
      prompt.push(`[Ingredients: ${ingredients}]`);
      prompt.push(`[Meal Type: ${mealType}]`);
      prompt.push(`[Cuisine Preference: ${cuisine}]`);
      prompt.push(`[Cooking Time: ${cookingTime}]`);
      prompt.push(`[Complexity: ${complexity}]`);
      prompt.push(
        "Please provide a detailed recipe, including steps for preparation and cooking. Only use the ingredients provided."
      );
      prompt.push(
        "The recipe should highlight the fresh and vibrant flavors of the ingredients."
      );
      prompt.push(
        "Also give the recipe a suitable name in its local language based on cuisine preference."
      );
    
      const messages = [
        {
          role: "system",
          content: prompt.join(" "),
        },
      ];
    
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Send recipe text back to client
      sendEvent({ choices: [{ delta: { content: text } }] });
    } catch (error) {
      console.error("Error occurred:", error);
      sendEvent({ choices: [{ finish_reason: "stop" }] });
    }
  }

  // Call run function with provided parameters
  run();

});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
