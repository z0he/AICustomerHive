import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "demo_key" });

/**
 * Interprets a voice command and determines its intent and action
 */
export async function interpretVoiceCommand(text: string): Promise<{
  intent: string;
  action: string;
}> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: 
            "You are an AI assistant for a CRM system. Analyze the voice command and determine the user's intent. " +
            "Valid intents are: create_campaign, show_campaign_performance, show_campaign_status, send_email, create_lead_list, show_leads. " +
            "Return the result as JSON with intent and action fields. The action field should contain a clean version of the command."
        },
        {
          role: "user",
          content: text
        }
      ],
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0].message.content);

    return {
      intent: result.intent,
      action: result.action
    };
  } catch (error) {
    console.error("Error interpreting voice command:", error);
    throw new Error("Failed to interpret voice command");
  }
}

/**
 * Generates campaign suggestions based on customer data and campaign goal
 */
export async function generateCampaignSuggestions(
  campaignGoal: string,
  targetAudience: string
): Promise<string[]> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: 
            "You are a marketing expert assistant for a CRM system. Generate 3 campaign message suggestions " +
            "based on the campaign goal and target audience. Return the results as JSON array of strings."
        },
        {
          role: "user",
          content: `Campaign goal: ${campaignGoal}\nTarget audience: ${targetAudience}`
        }
      ],
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0].message.content);

    return result.suggestions || [];
  } catch (error) {
    console.error("Error generating campaign suggestions:", error);
    throw new Error("Failed to generate campaign suggestions");
  }
}

/**
 * Analyzes customer data to provide insights and recommendations
 */
export async function analyzeCustomerData(customerData: any[]): Promise<{
  insights: string[];
  recommendations: string[];
}> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: 
            "You are a data analyst for a CRM system. Analyze the customer data provided and generate insights " +
            "and recommendations. Return the results as JSON with insights and recommendations arrays."
        },
        {
          role: "user",
          content: `Customer data: ${JSON.stringify(customerData)}`
        }
      ],
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0].message.content);

    return {
      insights: result.insights || [],
      recommendations: result.recommendations || []
    };
  } catch (error) {
    console.error("Error analyzing customer data:", error);
    throw new Error("Failed to analyze customer data");
  }
}

export default openai;
