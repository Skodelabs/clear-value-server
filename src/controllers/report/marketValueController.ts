import OpenAI from "openai";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Get market value based on product name and condition using OpenAI
 * @param productName The name of the product to evaluate
 * @param condition The condition of the product
 * @param considerCondition Whether to consider the condition in the valuation
 * @param currency The currency to use for the valuation (USD or CAD)
 * @param language The language to use for the response
 * @param wearTear Whether to assess repair costs for wear and tear
 * @param details Additional details about the product
 */
export async function getMarketValueWithCondition(
  productName: string, 
  condition: string, 
  considerCondition: boolean = true,
  currency: string = "USD",
  language: string = "en",
  wearTear: boolean = false,
  details?: string
): Promise<{ value: number, confidence: number, repairCost?: number }> {
  try {
    // Create a prompt that includes the product name and condition
    let prompt = `What is the current market value in ${currency} for: ${productName}`;
    
    if (considerCondition && condition) {
      prompt += ` in ${condition} condition. Consider how the condition affects the value.`;
    }
    
    // If wear and tear assessment is requested and details are provided
    if (wearTear && details) {
      prompt += ` Also, analyze the following details for wear and tear issues that would require repair: "${details}". Estimate the cost to repair these issues.`;
      prompt += ` Respond with a JSON object containing only: { "value": [estimated ${currency} amount as a number], "confidence": [confidence level between 0-1], "repairCost": [estimated repair cost in ${currency} as a number] }`;
    } else {
      prompt += ` Respond with a JSON object containing only: { "value": [estimated ${currency} amount as a number], "confidence": [confidence level between 0-1] }`;
    }
    
    // Call OpenAI API
    const response = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [
        { 
          role: "system", 
          content: `You are an expert appraiser who provides accurate market valuations for various items. 
                   Provide valuations in ${currency}.
                   ${wearTear ? 'Analyze wear and tear to estimate repair costs.' : ''}
                   Respond in ${language === 'fr' ? 'French' : 'English'} language.
                   ${language === 'fr' && wearTear ? 'Analysez l\'usure pour estimer les coûts de réparation si nécessaire.' : ''}`
        },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.2, // Lower temperature for more consistent responses
    });
    
    // Parse the response
    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Empty response from OpenAI");
    }
    
    try {
      const parsedResponse = JSON.parse(content);
      
      // Validate and sanitize the values
      let value = Number(parsedResponse.value);
      value = isNaN(value) ? 0 : value;
      
      let confidence = Number(parsedResponse.confidence);
      confidence = isNaN(confidence) ? 0.7 : confidence;
      
      let repairCost;
      if (wearTear && parsedResponse.repairCost !== undefined) {
        repairCost = Number(parsedResponse.repairCost);
        repairCost = isNaN(repairCost) ? 0 : repairCost;
      }
      
      return {
        value,
        confidence,
        repairCost
      };
    } catch (parseError) {
      console.error("Error parsing OpenAI response:", parseError);
      return {
        value: 0,
        confidence: 0.5,
        repairCost: wearTear ? 0 : undefined
      };
    }
  } catch (error) {
    console.error("Error getting market value from OpenAI:", error);
    return { value: 0, confidence: 0.5, repairCost: wearTear ? 0 : undefined };
  }
}
