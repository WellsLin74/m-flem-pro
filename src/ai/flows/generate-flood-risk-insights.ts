'use server';
/**
 * @fileOverview This file implements a Genkit flow for generating AI-powered flood risk insights.
 * 
 * - generateFloodRiskInsights - A function that provides narrative insights and detailed explanations
 *   for calculated flood loss estimations and suggested ratios.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateFloodRiskInsightsInputSchema = z.object({
  companyName: z.string().describe('The name of the company.'),
  plantName: z.string().describe('The name of the plant.'),
  fabL10HeightMeters: z.number().describe('The FAB L10 height in meters.'),
  cupL10HeightMeters: z.number().describe('The CUP L10 height in meters.'),
  floodHeightAglMeters: z.number().describe('The flood height above ground level in meters.'),
  buildingInitialValueM: z.number().describe('Initial building value in million NTD.'),
  facilityInitialValueM: z.number().describe('Initial facility value in million NTD.'),
  toolsInitialValueM: z.number().describe('Initial tools value in million NTD.'),
  fixtureInitialValueM: z.number().describe('Initial fixture value in million NTD.'),
  stockInitialValueM: z.number().describe('Initial stock value in million NTD.'),
  bi12mInitialValueM: z.number().describe('Initial business interruption (12 months) value in million NTD.'),
  buildingBasementLossRatio: z.number().min(0).max(1).describe('Loss ratio for building assets in the basement (0-1).'),
  buildingL10LossRatio: z.number().min(0).max(1).describe('Loss ratio for building assets at L10 height (0-1).'),
  toolsBasementLossRatio: z.number().min(0).max(1).describe('Loss ratio for tools assets in the basement (0-1).'),
  toolsL10LossRatio: z.number().min(0).max(1).describe('Loss ratio for tools assets at L10 height (0-1).'),
  ffsBasementLossRatio: z.number().min(0).max(1).describe('Loss ratio for facility, fixture, and stock assets in the basement (0-1).'),
  ffsL10LossRatio: z.number().min(0).max(1).describe('Loss ratio for facility, fixture, and stock assets at L10 height (0-1).'),
  totalLossEstimateM: z.number().describe('Total estimated flood loss in million NTD.'),
});

const GenerateFloodRiskInsightsOutputSchema = z.object({
  insights: z.string().describe('Narrative insights and detailed explanations of flood risk and loss estimation.')
});

export type GenerateFloodRiskInsightsInput = z.infer<typeof GenerateFloodRiskInsightsInputSchema>;
export type GenerateFloodRiskInsightsOutput = z.infer<typeof GenerateFloodRiskInsightsOutputSchema>;

// Lazy registration variables
let _prompt: any = null;
let _flow: any = null;

function getPrompt() {
  if (!_prompt) {
    _prompt = ai.definePrompt({
      name: 'floodRiskInsightsPrompt',
      input: {schema: GenerateFloodRiskInsightsInputSchema},
      output: {schema: GenerateFloodRiskInsightsOutputSchema},
      config: {
        safetySettings: [
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
        ],
      },
      prompt: `You are an expert risk analyst specializing in industrial flood damage assessment.
Your task is to provide comprehensive narrative insights and detailed explanations for flood loss estimations.

Analyze the following data for the plant located at {{companyName}} - {{plantName}}:

**Flood Parameters:**
- FAB L10 Height (critical elevation): {{{fabL10HeightMeters}}} meters
- CUP L10 Height (critical elevation): {{{cupL10HeightMeters}}} meters
- Actual Flood Height AGL: {{{floodHeightAglMeters}}} meters

**Initial Asset Values (Million NTD):**
- Building: {{{buildingInitialValueM}}}
- Facility: {{{facilityInitialValueM}}}
- Tools: {{{toolsInitialValueM}}}
- Fixture: {{{fixtureInitialValueM}}}
- Stock: {{{stockInitialValueM}}}
- Business Interruption (12M): {{{bi12mInitialValueM}}}

**Calculated Loss Ratios (0-1, 1 = 100% loss) for Basement / L10 Flood Impact:**
- Building (Basement): {{{buildingBasementLossRatio}}}
- Building (L10): {{{buildingL10LossRatio}}}
- Tools (Basement): {{{toolsBasementLossRatio}}}
- Tools (L10): {{{toolsL10LossRatio}}}
- Facility/Fixture/Stock (Basement): {{{ffsBasementLossRatio}}}
- Facility/Fixture/Stock (L10): {{{ffsL10LossRatio}}}

**Total Estimated Flood Loss: {{{totalLossEstimateM}}} Million NTD**

Based on this information, provide a detailed analysis covering:
1.  **Overall Risk Assessment:** Explain the significance of the flood height relative to the FAB and CUP L10 heights and its implications.
2.  **Asset-Specific Impact:** Elaborate on how each category of assets (Building, Facility, Tools, Fixtures, Stock) is affected by the basement and L10 flood loss ratios. Discuss why certain assets might have higher or lower ratios.
3.  **Key Risk Factors:** Identify the primary drivers of the total estimated loss.
4.  **Implications and Recommendations (General):** Suggest general strategies for mitigation or further investigation based on the analysis. Keep recommendations high-level and focused on risk management.

Ensure your explanation is clear, concise, and uses professional language suitable for a plant manager.`,
    });
  }
  return _prompt;
}

function getFlow() {
  if (!_flow) {
    _flow = ai.defineFlow(
      {
        name: 'generateFloodRiskInsightsFlow',
        inputSchema: GenerateFloodRiskInsightsInputSchema,
        outputSchema: GenerateFloodRiskInsightsOutputSchema,
      },
      async (input) => {
        try {
          const prompt = getPrompt();
          const {output} = await prompt(input);
          if (!output || !output.insights) {
            return { insights: "AI Simulation Error: The model could not generate a narrative at this time." };
          }
          return output;
        } catch (error) {
          console.error('Flow execution failed:', error);
          return { insights: "System Alert: The AI insights engine encountered a runtime exception." };
        }
      }
    );
  }
  return _flow;
}

/**
 * Public wrapper for the flood risk insights flow.
 */
export async function generateFloodRiskInsights(
  input: GenerateFloodRiskInsightsInput
): Promise<string> {
  const flow = getFlow();
  const result = await flow(input);
  return result.insights;
}
