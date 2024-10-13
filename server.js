import { Telegraf } from "telegraf";
import userModel from "./src/models/User.js";
import connectDb from "./src/config/db.js";
import { message } from "telegraf/filters";
import Event from "./src/models/Event.js";

const bot = new Telegraf(process.env.BOT_TOKEN);

const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = await import("@google/generative-ai");

async function initGemini() {
  const apiKey = process.env.GEMINI_API_KEY;
  const genAI = new GoogleGenerativeAI(apiKey);

  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
  });

  const generationConfig = {
    temperature: 1,
    topP: 0.95,
    topK: 64,
    maxOutputTokens: 8192,
    responseMimeType: "text/plain",
  };

  const chatSession = model.startChat({
    generationConfig,
    history: [],
  });

  return chatSession;
}

(async () => {
  try {
    await connectDb();
    console.log("MongoDB connected");
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error);
    process.exit(1);
  }
})();

bot.start(async (ctx) => {
  const from = ctx.update.message.from;
  try {
    await userModel.findOneAndUpdate(
      { tgId: from.id },
      {
        $setOnInsert: {
          tgId: from.id,
          firstName: from.first_name,
          lastName: from.last_name,
          isBot: from.is_bot,
          userName: from.username,
        },
      },
      { upsert: true, new: true }
    );
    await ctx.reply(
      `Hey ${from.first_name}!, Welcome. I will be writing highly engaging social media posts for you 🚀 Just keep feeding me with the events throughout the day. Let's shine on social media.✨`
    );
  } catch (error) {
    console.error("Error in start command:", error);
    await ctx.reply("Something went wrong. Please try again later.");
  }
});

bot.command("generate", async (ctx) => {
  const from = ctx.update.message.from;

  const startOftheday = new Date();
  startOftheday.setHours(0, 0, 0, 0);

  const endOftheday = new Date();
  endOftheday.setHours(23, 59, 59, 999);

  try {
    const events = await Event.find({
      tgId: from.id,
      createdAt: {
        $gte: startOftheday,
        $lte: endOftheday,
      },
    });

    if (events.length === 0) {
      await ctx.reply("No events found for this day.");
      return;
    }

    try {
      const chatSession = await initGemini();

      const eventTexts = events.map((event) => event.text).join(", ");

      const response = await chatSession.sendMessage({
        contents: [
          {
            text: `Write two engaging social media posts tailored for LinkedIn and Twitter audiences. Use simple language. Focus on the following events: ${eventTexts}`
          }
        ],
        context: {
          role: "system",
          text: "You are a senior copywriter writing posts for LinkedIn and Twitter using provided events."
        }
      });

      const generatedPosts = response?.responses ?? []; // This assumes the response has a 'responses' array or an empty array

      console.log("Generated posts:", generatedPosts);

      await ctx.reply("Here are your generated posts:");
      for (const post of generatedPosts) {
        await ctx.reply(post?.text ?? ""); // Assuming the post object has a `text` field or an empty string
      }

    } catch (error) {
      console.error("Error generating posts:", error);
      await ctx.reply("Something went wrong during post generation. Please try again.");
    }

  } catch (error) {
    console.error("Error in generate command:", error);
    await ctx.reply("Something went wrong while generating posts.");
  }
});


bot.on(message("text"), async (ctx) => {
  const from = ctx.update.message.from;
  const messageText = ctx.update.message.text;

  try {
    await Event.create({
      text: messageText,
      tgId: from.id,
    });

    await ctx.reply(
      `Noted 👍, Keep texting me your thoughts. To generate the posts, just enter the command: /generate`
    );
  } catch (error) {
    console.error("Error in message handler:", error);
    await ctx.reply("Something went wrong. Please try again later.");
  }
});

bot.launch();
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
