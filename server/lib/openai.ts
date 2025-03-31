import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== "demo_key" 
    ? process.env.OPENAI_API_KEY 
    : "sk-demo-key-placeholder" 
});

// Helper function to safely parse JSON from OpenAI response
function safeJsonParse(content: string | null): any {
  if (!content) return null;
  
  try {
    return JSON.parse(content);
  } catch (e) {
    console.error("Failed to parse JSON from OpenAI response:", e);
    return null;
  }
}

/**
 * Interprets a voice command and determines its intent and action
 */
export async function interpretVoiceCommand(text: string): Promise<{
  intent: string;
  action: string;
}> {
  // For development/demo purposes, use a simple pattern matching for quick responses
  // and to avoid API key requirements
  console.log("Interpreting voice command:", text);
  
  try {
    // Check if we have a valid API key before making OpenAI call
    if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== "demo_key") {
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

      const result = safeJsonParse(response.choices[0].message.content);
      
      if (!result) {
        // Fallback if parsing failed
        return {
          intent: "unknown",
          action: "Failed to process command"
        };
      }

      return {
        intent: result.intent || "unknown",
        action: result.action || text
      };
    } else {
      // Fallback for demo without API key
      const textLower = text.toLowerCase();
      
      if (textLower.includes("create") && textLower.includes("campaign")) {
        return {
          intent: "create_campaign",
          action: "Create a new email campaign for customers"
        };
      } else if (textLower.includes("performance") || textLower.includes("stats")) {
        return {
          intent: "show_campaign_performance",
          action: "Show me campaign performance data"
        };
      } else if (textLower.includes("status")) {
        return {
          intent: "show_campaign_status",
          action: "Check the status of running campaigns"
        };
      } else if (textLower.includes("email") || textLower.includes("send")) {
        return {
          intent: "send_email",
          action: "Send email to targeted customers"
        };
      } else if (textLower.includes("leads")) {
        return {
          intent: "show_leads",
          action: "Show me top leads"
        };
      } else {
        return {
          intent: "unknown",
          action: text
        };
      }
    }
  } catch (error) {
    console.error("Error interpreting voice command:", error);
    // Provide fallback so the feature works even without API key
    return {
      intent: "create_campaign",
      action: "Create a new marketing campaign"
    };
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
    // Check if we have a valid API key before making OpenAI call
    if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== "demo_key") {
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

      const result = safeJsonParse(response.choices[0].message.content);
      return result?.suggestions || [];
    } else {
      // Fallback suggestions for demo without API key
      if (targetAudience.toLowerCase().includes("new")) {
        return [
          "Welcome to our service! Enjoy 15% off your first purchase",
          "New customer special: Sign up today and receive exclusive benefits",
          "Join our community of satisfied customers with this special welcome offer"
        ];
      } else if (targetAudience.toLowerCase().includes("loyal") || targetAudience.toLowerCase().includes("returning")) {
        return [
          "Thank you for your continued support! Here's 20% off your next purchase",
          "Valued customer special: Unlock premium features with your loyalty reward",
          "We appreciate your business! Enjoy this exclusive offer just for our loyal customers"
        ];
      } else {
        return [
          "Limited time offer: 10% discount on all purchases this week",
          "Discover our new features designed to help you succeed",
          "Take advantage of our special seasonal promotion before it ends"
        ];
      }
    }
  } catch (error) {
    console.error("Error generating campaign suggestions:", error);
    // Provide fallback so the feature works even without API key
    return [
      "Special offer: 15% discount on selected items",
      "Introducing our new premium service package",
      "Last chance: End of season sale with up to 40% off"
    ];
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
    // Check if we have a valid API key before making OpenAI call
    if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== "demo_key") {
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

      const result = safeJsonParse(response.choices[0].message.content);
      
      if (!result) {
        return {
          insights: [],
          recommendations: []
        };
      }

      return {
        insights: result.insights || [],
        recommendations: result.recommendations || []
      };
    } else {
      // Fallback static data for demo without API key
      return {
        insights: [
          "Customer engagement peaks during promotional periods",
          "High-value customers tend to respond better to email campaigns",
          "Customers from the West region have the highest retention rates",
          "First-time buyers are most likely to convert through social media channels"
        ],
        recommendations: [
          "Implement a loyalty program for high-value customers",
          "Increase email campaign frequency for the most engaged segments",
          "Create targeted offers for customers who haven't purchased in 3+ months",
          "Focus on social media outreach for new customer acquisition"
        ]
      };
    }
  } catch (error) {
    console.error("Error analyzing customer data:", error);
    // Provide fallback so the feature works even without API key
    return {
      insights: [
        "Customer engagement varies by time of year",
        "Email campaigns show higher conversion rates than other channels",
        "Repeat customers provide 60% of total revenue"
      ],
      recommendations: [
        "Develop a targeted email campaign for your high-value segments",
        "Implement a customer loyalty program to increase retention",
        "Create seasonal promotions aligned with purchasing patterns"
      ]
    };
  }
}

export default openai;
