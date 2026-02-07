import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate the user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      console.error('Auth error:', claimsError?.message);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = claimsData.claims.sub;
    console.log('Authenticated user:', userId);

    const { imageBase64, documentName, mimeType } = await req.json();

    // Server-side input validation
    // Validate image size (base64 is ~33% larger than binary, so ~13MB base64 = ~10MB file)
    if (imageBase64 && imageBase64.length > 13000000) {
      return new Response(
        JSON.stringify({ error: 'Image too large. Maximum 10MB.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate MIME type allowlist
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (mimeType && !allowedTypes.includes(mimeType)) {
      return new Response(
        JSON.stringify({ error: 'Invalid image format. Supported: JPEG, PNG, GIF, WebP' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sanitize document name
    const sanitizedName = documentName?.slice(0, 255).replace(/[^a-zA-Z0-9._\- ]/g, '_') || 'unnamed';

    if (!imageBase64) {
      console.log('No image provided');
      return new Response(
        JSON.stringify({ success: true, obligations: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Analyzing image with vision:', sanitizedName);

    const systemPrompt = `You are a calm, supportive document analyst who reads images of documents, calendars, schedules, and screenshots. 
Extract ALL events, appointments, obligations, deadlines, and required actions you can see in the image.

CRITICAL: Look carefully at the ENTIRE image. Count every distinct event, appointment, or item visible.

For calendar/schedule images:
- Extract EACH event separately, even if they repeat across days
- Include the specific date and time for each event
- "Work shift" on Mon/Tue/Wed are 3 separate obligations
- Different events (like dinners, meetings) are separate obligations

For study-related images:
- Extract course codes if visible (e.g., COMP9417, MATH1234)
- Group by subject when possible
- Include assignment names and due dates

RULES FOR PRIORITY LEVELS (use calm terminology):
- "high": Important items that need attention soon - legal matters, compliance deadlines, financial obligations, health appointments
- "medium": Standard tasks - work shifts, regular deadlines, training sessions
- "low": Social events, optional tasks, or flexible-timing items

CRITICAL RULES FOR STEPS:
- ALWAYS generate at least 3 concrete, actionable steps for every obligation
- Steps must be short, plain-English, and supportive
- For work shifts: 1) Check shift time and location 2) Prepare for work 3) Attend shift
- For training: 1) Review training details 2) Prepare any required materials 3) Attend training session
- For social events: 1) Confirm attendance 2) Note the time and location 3) Attend the event

OUTPUT REQUIREMENTS:
- Return ONLY valid JSON, no markdown, no commentary
- Each title must be max 60 characters and include the specific date
- Each summary must be 1-2 sentences in plain English
- Each consequence must be exactly 1 sentence (use calm language)
- Steps MUST contain 3-5 simple, actionable items (NEVER empty)
- Confidence should reflect how certain you are about this obligation (0.0-1.0)
- Include subject/topic when detected (course codes, project names)

Be thorough - extract EVERY visible event or obligation.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { 
            role: 'user', 
            content: [
              {
                type: 'text',
                text: `Look at this image carefully and extract ALL obligations, events, appointments, or deadlines you can see. Count each event separately, even if similar events repeat on different days.`
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType || 'image/jpeg'};base64,${imageBase64}`
                }
              }
            ]
          }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'extract_obligations',
              description: 'Extract obligations, deadlines, and required actions from an image. Returns strict JSON.',
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
                          description: 'Clear, concise title including the date (max 60 chars)',
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
                          description: 'high=needs attention soon, medium=work/standard, low=social/optional' 
                        },
                        consequence: { 
                          type: 'string', 
                          description: 'One sentence: what happens if this is missed (calm language)' 
                        },
                        steps: { 
                          type: 'array', 
                          items: { type: 'string' },
                          description: 'REQUIRED: 3-5 concrete action steps. Never empty.',
                          minItems: 3,
                          maxItems: 5
                        },
                        confidence: {
                          type: 'number',
                          minimum: 0,
                          maximum: 1,
                          description: 'How confident you are about this obligation (0.0-1.0)'
                        },
                        subject: {
                          type: 'string',
                          nullable: true,
                          description: 'Subject or course code for grouping (e.g., COMP9417)'
                        },
                        topic: {
                          type: 'string',
                          nullable: true,
                          description: 'Topic or assignment name for sub-grouping'
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
          JSON.stringify({ error: 'Taking a moment to catch up. Please try again in a few seconds.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits need topping up. Please add funds to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI request failed: ${response.status}`);
    }

    const data = await response.json();
    console.log('Vision AI response received');

    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== 'extract_obligations') {
      console.log('No tool call in response, returning empty obligations');
      return new Response(
        JSON.stringify({ success: true, obligations: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = JSON.parse(toolCall.function.arguments);
    
    // Fallback steps by obligation type keywords
    const getDefaultSteps = (title: string, summary: string): string[] => {
      const text = `${title} ${summary}`.toLowerCase();
      
      if (text.includes('shift') || text.includes('work')) {
        return ['Check shift time and location', 'Prepare for work', 'Attend shift'];
      }
      if (text.includes('training') || text.includes('course')) {
        return ['Review training details', 'Prepare any required materials', 'Attend training session'];
      }
      if (text.includes('dinner') || text.includes('lunch') || text.includes('meeting')) {
        return ['Confirm attendance', 'Note the time and location', 'Attend the event'];
      }
      if (text.includes('appointment')) {
        return ['Check appointment details', 'Prepare required documents', 'Attend or reschedule if needed'];
      }
      if (text.includes('assignment') || text.includes('exam') || text.includes('quiz')) {
        return ['Review the requirements', 'Prepare your work', 'Submit before the deadline'];
      }
      // Generic fallback
      return ['Review the details', 'Prepare as needed', 'Complete the task'];
    };

    // Validate and clean the obligations
    const validatedObligations = (result.obligations || []).map((ob: any) => {
      const title = String(ob.title || '').slice(0, 60);
      const summary = String(ob.summary || '');
      let steps = Array.isArray(ob.steps) ? ob.steps.slice(0, 5).map(String).filter((s: string) => s.trim()) : [];
      
      // Ensure minimum 3 steps
      if (steps.length < 3) {
        const fallbackSteps = getDefaultSteps(title, summary);
        while (steps.length < 3 && fallbackSteps.length > 0) {
          const fallbackStep = fallbackSteps.shift()!;
          if (!steps.includes(fallbackStep)) {
            steps.push(fallbackStep);
          }
        }
      }

      return {
        title,
        summary,
        due_date: ob.due_date && /^\d{4}-\d{2}-\d{2}$/.test(ob.due_date) ? ob.due_date : null,
        risk_level: ['low', 'medium', 'high'].includes(ob.risk_level) ? ob.risk_level : 'medium',
        consequence: String(ob.consequence || ''),
        steps,
        confidence: typeof ob.confidence === 'number' ? Math.min(1, Math.max(0, ob.confidence)) : 0.7,
        subject: ob.subject || null,
        topic: ob.topic || null
      };
    });

    console.log('Extracted obligations from vision:', validatedObligations.length);

    return new Response(
      JSON.stringify({ success: true, obligations: validatedObligations }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error analyzing image:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to analyze image' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
