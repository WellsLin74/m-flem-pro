'use server';
/**
 * @fileOverview This file implements a Genkit flow for generating AI-powered flood risk insights.
 * 
 * - generateFloodRiskInsights - A function that provides narrative insights and detailed explanations
 *   for calculated flood loss estimations and suggested ratios.
 * - GenerateFloodRiskInsightsInput - The input type for the generateFloodRiskInsights function.
 * - GenerateFloodRiskInsightsOutput - The return type for the generateFloodRiskInsights function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateFloodRiskInsightsInputSchema = z.object({
  companyName: z.string().describe('The name of the company.'),
  plantName: z.string().describe('The name of the plant.'),
  l10HeightMeters: z
    .number()
    .describe('The L10 height in meters, representing a critical flood level.'),
  floodHeightAglMeters: z
    .number()
    .describe('The flood height above ground level in meters.'),
  buildingInitialValueM: z.number().describe('Initial building value in millions USD.'),
  facilityInitialValueM: z.number().describe('Initial facility value in millions USD.'),
  toolsInitialValueM: z.number().describe('Initial tools value in millions USD.'),
  fixtureInitialValueM: z.number().describe('Initial fixture value in millions USD.'),
  stockInitialValueM: z.number().describe('Initial stock value in millions USD.'),
  bi12mInitialValueM: z
    .number()
    .describe('Initial business interruption (12 months) value in millions USD.'),
  buildingBasementLossRatio: z
    .number()
    .min(0)
    .max(1)
    .describe('Loss ratio for building assets in the basement (0-1).'),
  buildingL10LossRatio: z
    .number()
    .min(0)
    .max(1)
    .describe('Loss ratio for building assets at L10 height (0-1).'),
  toolsBasementLossRatio: z
    .number()
    .min(0)
    .max(1)
    .describe('Loss ratio for tools assets in the basement (0-1).'),
  toolsL10LossRatio: z
    .number()
    .min(0)
    .max(1)
    .describe('Loss ratio for tools assets at L10 height (0-1).'),
  ffsBasementLossRatio: z
    .number()
    .min(0)
    .max(1)
    .describe('Loss ratio for facility, fixture, and stock assets in the basement (0-1).'),
  ffsL10LossRatio: z
    .number()
    .min(0)
    .max(1)
    .describe('Loss ratio for facility, fixture, and stock assets at L10 height (0-1).'),
  totalLossEstimateM: z.number().describe('Total estimated flood loss in millions USD.'),
});
export type GenerateFloodRiskInsightsInput = z.infer<typeof GenerateFloodRiskInsightsInputSchema>;

const GenerateFloodRiskInsightsOutputSchema = z
  .string()
  .describe('Narrative insights and detailed explanations of flood risk and loss estimation.');
export type GenerateFloodRiskInsightsOutput = z.infer<typeof GenerateFloodRiskInsightsOutputSchema>;

export async function generateFloodRiskInsights(
  input: GenerateFloodRiskInsightsInput
): Promise<GenerateFloodRiskInsightsOutput> {
  return generateFloodRiskInsightsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'floodRiskInsightsPrompt',
  input: {schema: GenerateFloodRiskInsightsInputSchema},
  output: {schema: GenerateFloodRiskInsightsOutputSchema},
  prompt: `You are an expert risk analyst specializing in industrial flood damage assessment.
Your task is to provide comprehensive narrative insights and detailed explanations for flood loss estimations.

Analyze the following data for the plant located at {{companyName}} - {{plantName}}:

**Flood Parameters:**
- L10 Height (critical elevation): {{{l10HeightMeters}}} meters
- Actual Flood Height AGL: {{{floodHeightAglMeters}}} meters

**Initial Asset Values (Millions USD):**
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

**Total Estimated Flood Loss: {{{totalLossEstimateM}}} Million USD**

Based on this information, provide a detailed analysis covering:
1.  **Overall Risk Assessment:** Explain the significance of the flood height relative to the L10 height and its implications.
2.  **Asset-Specific Impact:** Elaborate on how each category of assets (Building, Facility, Tools, Fixtures, Stock) is affected by the basement and L10 flood loss ratios. Discuss why certain assets might have higher or lower ratios.
3.  **Key Risk Factors:** Identify the primary drivers of the total estimated loss.
4.  **Implications and Recommendations (General):** Suggest general strategies for mitigation or further investigation based on the analysis. Keep recommendations high-level and focused on risk management.

Ensure your explanation is clear, concise, and uses professional language suitable for a plant manager, avoiding overly technical jargon where possible. Focus on providing actionable understanding of the financial impact and risk profile.
`,
});

const generateFloodRiskInsightsFlow = ai.defineFlow(
  {
    name: 'generateFloodRiskInsightsFlow',
    inputSchema: GenerateFloodRiskInsightsInputSchema,
    outputSchema: GenerateFloodRiskInsightsOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    return output!;
  }
);
