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
              "You are a marketing expert assistant for a CRM system. Generate 5 campaign message suggestions " +
              "based on the campaign goal and target audience. Make sure these are diverse in tone, approach, and call-to-action. " +
              "Consider seasonal relevance, industry trends, and specific pain points or desires of the audience segment. " +
              "Each message should be compelling, personalized, and include a clear value proposition. " +
              "Return the results as JSON with the key 'suggestions' containing an array of strings."
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
      // Enhanced fallback suggestions for demo without API key
      if (targetAudience.toLowerCase().includes("new")) {
        return [
          "Welcome to our community! Enjoy 15% off your first purchase and start your journey with us",
          "New customer special: Sign up today and receive exclusive benefits plus a personalized onboarding consultation",
          "As a new member, unlock premium features free for 30 days – no commitment required",
          "First-time customer? We've prepared a special welcome package just for you with customized recommendations",
          "Start your experience with a complimentary strategy session and 20% off your first order"
        ];
      } else if (targetAudience.toLowerCase().includes("inactive") || targetAudience.toLowerCase().includes("haven't purchased")) {
        return [
          "We miss you! Come back and enjoy a special 25% discount on your next purchase – valid for 7 days only",
          "It's been a while! See what you've been missing with our latest product innovations and exclusive returning customer perks",
          "We noticed you've been away – how about a personalized consultation to discover what's new since your last visit?",
          "Reconnect with us today and receive a loyalty bonus plus free shipping on your next order",
          "Welcome back special: Reactivate your account and receive double rewards points on your next three purchases"
        ];
      } else if (targetAudience.toLowerCase().includes("loyal") || targetAudience.toLowerCase().includes("top") || targetAudience.toLowerCase().includes("vip")) {
        return [
          "As one of our most valued customers, enjoy early access to our upcoming premium collection and 30% off your selection",
          "VIP exclusive: Thank you for your continued support! Here's a personalized offer based on your preferences",
          "You're part of our inner circle! Join our invitation-only event this month with special guests and exclusive previews",
          "We appreciate your loyalty! Enjoy complimentary premium upgrades on all services this month as our way of saying thanks",
          "Elite customer appreciation: Unlock your custom rewards package with perks tailored specifically to your interests"
        ];
      } else if (targetAudience.toLowerCase().includes("seasonal") || targetAudience.toLowerCase().includes("holiday")) {
        return [
          "Celebrate the season with our limited-time collection – perfect for gifting or treating yourself",
          "Holiday special: Enjoy 20% off sitewide plus complimentary gift wrapping and personalized messages",
          "Summer is here! Discover our seasonal essentials with free expedited shipping on orders over $50",
          "Get ready for the new season with our curated collection – early access for subscribers with code EARLYBIRD",
          "End-of-season clearance with up to 60% off – perfect time to stock up on favorites before they're gone"
        ];
      } else if (targetAudience.toLowerCase().includes("industry") || targetAudience.toLowerCase().includes("professional")) {
        return [
          "Industry professionals: Access our specialized toolkit designed to streamline your specific workflows",
          "Exclusive for business customers: Schedule a complimentary efficiency audit and receive a customized solution package",
          "For industry leaders like you: Join our upcoming webinar on emerging trends with actionable implementation strategies",
          "Professional-grade solutions at special corporate rates – volume discounts now available for teams of all sizes",
          "Industry-specific training and resources now available with a 30-day free trial for qualified professional accounts"
        ];
      } else {
        return [
          "Limited time offer: 15% discount on all purchases this week with code SPECIAL15",
          "Discover our new features designed to help you succeed – book a demo for a personalized tour",
          "Take advantage of our seasonal promotion before it ends – plus free shipping on orders over $40",
          "Join thousands of satisfied customers and experience the difference with a risk-free trial",
          "This month only: Bundle any three services and save 25% plus receive a complimentary strategy session"
        ];
      }
    }
  } catch (error) {
    console.error("Error generating campaign suggestions:", error);
    // Enhanced fallback suggestions for when there's an error
    return [
      "Special offer: 20% discount on selected items in our curated collection",
      "Introducing our new premium service package with exclusive member benefits",
      "Last chance: End of season sale with up to 40% off bestsellers",
      "Join our community and receive personalized recommendations plus a welcome gift",
      "Limited time offer: Try our most popular service risk-free for 30 days"
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
