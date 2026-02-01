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

    const systemPrompt = `You are an expert document analyst. Extract obligations, deadlines, and required actions from documents.

RULES FOR RISK LEVELS:
- "high": Only use when missing it has serious consequences (legal action, compliance violation, financial penalty, health appointment, visa/immigration deadline)
- "medium": Important administrative tasks with moderate consequences (late fees, service interruption, missed opportunities)
- "low": Informational items, optional tasks, or items with minimal consequences

OUTPUT REQUIREMENTS:
- Return ONLY valid JSON, no markdown, no commentary
- Each title must be max 60 characters
- Each summary must be 1-2 sentences in plain English
- Each consequence must be exactly 1 sentence describing what happens if missed
- Steps should be simple, actionable items (1-5 per obligation)
- Confidence should reflect how certain you are about this obligation (0.0-1.0)
- If no clear deadline exists, set due_date to null

Be thorough but precise. Only extract genuine obligations that require action.`;

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
          { role: 'user', content: `Analyze this document and extract all obligations as JSON:\n\n${rawText}` }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'extract_obligations',
              description: 'Extract obligations, deadlines, and required actions from a document. Returns strict JSON.',
              parameters: {
                type: 'object',
                properties: {
                  obligations: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        title: { 
                          type: 'string', 
                          description: 'Clear, concise title (max 60 chars)',
                          maxLength: 60
                        },
                        summary: { 
                          type: 'string', 
                          description: '1-2 sentences describing what needs to be done' 
                        },
                        due_date: { 
                          type: 'string', 
                          nullable: true, 
                          description: 'Deadline in YYYY-MM-DD format, or null if not specified' 
                        },
                        risk_level: { 
                          type: 'string', 
                          enum: ['low', 'medium', 'high'], 
                          description: 'high=serious consequences, medium=moderate admin, low=optional/informational' 
                        },
                        consequence: { 
                          type: 'string', 
                          description: 'One sentence: what happens if this is missed' 
                        },
                        steps: { 
                          type: 'array', 
                          items: { type: 'string' },
                          description: '1-5 simple action steps to complete this obligation',
                          minItems: 1,
                          maxItems: 5
                        },
                        confidence: {
                          type: 'number',
                          minimum: 0,
                          maximum: 1,
                          description: 'How confident you are about this obligation (0.0-1.0)'
                        }
                      },
                      required: ['title', 'summary', 'risk_level', 'consequence', 'steps', 'confidence']
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

    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== 'extract_obligations') {
      console.log('No tool call in response, returning empty obligations');
      return new Response(
        JSON.stringify({ success: true, obligations: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = JSON.parse(toolCall.function.arguments);
    
    // Validate and clean the obligations
    const validatedObligations = (result.obligations || []).map((ob: any) => ({
      title: String(ob.title || '').slice(0, 60),
      summary: String(ob.summary || ''),
      due_date: ob.due_date && /^\d{4}-\d{2}-\d{2}$/.test(ob.due_date) ? ob.due_date : null,
      risk_level: ['low', 'medium', 'high'].includes(ob.risk_level) ? ob.risk_level : 'medium',
      consequence: String(ob.consequence || ''),
      steps: Array.isArray(ob.steps) ? ob.steps.slice(0, 5).map(String) : [],
      confidence: typeof ob.confidence === 'number' ? Math.min(1, Math.max(0, ob.confidence)) : 0.5
    }));

    console.log('Extracted obligations:', validatedObligations.length);

    return new Response(
      JSON.stringify({ success: true, obligations: validatedObligations }),
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
