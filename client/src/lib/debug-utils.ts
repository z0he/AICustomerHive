// Simple utility function to help debug API responses
export function debugApiResponse(response: any, context: string = ''): any {
  if (context) {
    console.log(`[DEBUG] ${context}:`, response);
  } else {
    console.log('[DEBUG] API Response:', response);
  }
  return response;
}