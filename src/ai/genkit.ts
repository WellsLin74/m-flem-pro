import {genkit} from 'genkit';
import {vertexAI} from '@genkit-ai/vertexai';

let _ai: any = null;

function getAiInstance() {
  // NEXT_PHASE is set by Next.js during build
  // If we are in the production build phase, we return a mock object
  // to avoid initializing cloud plugins (Vertex AI) which might require
  // credentials or network access that is not present in the build environment.
  if (process.env.NEXT_PHASE === 'phase-production-build') {
     return {
       definePrompt: () => () => ({ output: { insights: 'Build-time mock' } }),
       defineFlow: () => () => ({ insights: 'Build-time mock' }),
     };
  }

  if (!_ai) {
    _ai = genkit({
      plugins: [vertexAI()],
      model: 'vertexai/gemini-2.5-flash',
    });
  }
  return _ai;
}

/**
 * Export a Proxy that initializes the real Genkit instance on first access.
 * This prevents any side effects (like plugin initialization) during the 
 * Next.js build-time module evaluation.
 */
export const ai = new Proxy({} as any, {
  get(_, prop) {
    const instance = getAiInstance();
    const value = instance[prop];
    return typeof value === 'function' ? value.bind(instance) : value;
  },
  apply(_, thisArg, argumentsList) {
    const instance = getAiInstance();
    return instance.apply(thisArg, argumentsList);
  }
});
