import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { rawText, documentName } = await req.json();

    if (!rawText || rawText.trim().length === 0) {
      console.log('No text content provided');
      return new Response(
        JSON.stringify({ success: true, obligations: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Analyzing document:', documentName);
    console.log('Text length:', rawText.length);

    const systemPrompt = `You are an expert document analyst specializing in identifying obligations, deadlines, and required actions from legal, administrative, and personal documents.

Your task is to carefully read the provided document text and extract any obligations, deadlines, or required actions.

For each obligation found, provide:
- title: A clear, concise title (max 60 chars)
- summary: A brief description of what needs to be done (max 200 chars)
- due_date: The deadline in ISO format (YYYY-MM-DD) if mentioned, or null if not specified
- risk_level: Assess as "low", "medium", or "high" based on consequences of missing it
- consequence: What happens if this obligation is missed (max 150 chars)
- steps: An array of 1-5 simple action steps to complete this obligation

Be thorough but precise. Only extract genuine obligations that require action.
If the document contains no actionable obligations, return an empty array.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Please analyze this document and extract all obligations:\n\n${rawText}` }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'extract_obligations',
              description: 'Extract obligations, deadlines, and required actions from a document',
              parameters: {
                type: 'object',
                properties: {
                  obligations: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        title: { type: 'string', description: 'Clear, concise title for the obligation' },
                        summary: { type: 'string', description: 'Brief description of what needs to be done' },
                        due_date: { type: 'string', nullable: true, description: 'Deadline in YYYY-MM-DD format, or null' },
                        risk_level: { type: 'string', enum: ['low', 'medium', 'high'], description: 'Risk level if missed' },
                        consequence: { type: 'string', description: 'What happens if this is missed' },
                        steps: { 
                          type: 'array', 
                          items: { type: 'string' },
                          description: 'Simple action steps to complete this obligation'
                        }
                      },
                      required: ['title', 'summary', 'risk_level', 'consequence', 'steps']
                    }
                  }
                },
                required: ['obligations']
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'extract_obligations' } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add funds to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI request failed: ${response.status}`);
    }

    const data = await response.json();
    console.log('AI response received');

    // Extract the tool call result
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== 'extract_obligations') {
      console.log('No tool call in response, returning empty obligations');
      return new Response(
        JSON.stringify({ success: true, obligations: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = JSON.parse(toolCall.function.arguments);
    console.log('Extracted obligations:', result.obligations?.length || 0);

    return new Response(
      JSON.stringify({ success: true, obligations: result.obligations || [] }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error analyzing document:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to analyze document' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
