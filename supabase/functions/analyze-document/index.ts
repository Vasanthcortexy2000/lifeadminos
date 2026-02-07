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

    const { rawText, documentName } = await req.json();

    // Server-side input validation
    if (rawText && rawText.length > 500000) {
      return new Response(
        JSON.stringify({ error: 'Document too large. Maximum 500KB of text.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sanitize document name (limit length and remove unsafe characters)
    const sanitizedName = documentName?.slice(0, 255).replace(/[^a-zA-Z0-9._\- ]/g, '_') || 'unnamed';

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

    console.log('Analyzing document:', sanitizedName);
    console.log('Text length:', rawText.length);

    const systemPrompt = `You are a calm, supportive document analyst. Extract obligations, deadlines, and required actions from documents using clear, non-alarmist language.

RULES FOR PRIORITY LEVELS (use calm terminology):
- "high": Important items that need attention soon - legal matters, compliance deadlines, financial obligations, health appointments, immigration deadlines
- "medium": Standard administrative tasks - renewals, applications, regular deadlines
- "low": Informational items, optional tasks, or flexible-timing items

RULES FOR DOMAIN CLASSIFICATION:
Classify each obligation into ONE of these life domains:
- "visa": Immigration, visas, passports, work permits, citizenship, travel documents
- "work": Employment, job, salary, contracts, shifts, roster, workplace compliance
- "health": Medical appointments, medicare, vaccinations, health insurance, doctor visits
- "finance": Tax, banking, payments, loans, rent, bills, superannuation
- "study": University, school, courses, exams, assignments, education
- "housing": Lease agreements, rental, property, accommodation, moving, landlord matters
- "legal": Court, lawyer, licenses, registrations, compliance, police checks
- "general": Everything else that doesn't fit above

RULES FOR SUBJECT/TOPIC DETECTION:
- For study documents, extract course codes (e.g., COMP9417, MATH1234)
- For work documents, extract project or department names
- Group related items by their subject/topic for easier management

CRITICAL RULES FOR STEPS:
- ALWAYS generate at least 3 concrete, actionable steps for every obligation
- Steps must be short, plain-English, and immediately actionable
- Use calm, supportive language (e.g., "When you're ready, prepare..." instead of "You must immediately...")
- Never return an empty steps array

STEP EXAMPLES BY OBLIGATION TYPE:
- For "Proof of Right to Work": 1) Gather required identity documents 2) Log in to the relevant portal 3) Upload documents and confirm submission
- For appointments: 1) Check appointment details 2) Prepare required documents 3) Attend or reschedule if needed
- For payments/invoices: 1) Review the payment amount and due date 2) Set up payment method 3) Complete payment and save confirmation

OUTPUT REQUIREMENTS:
- Return ONLY valid JSON, no markdown, no commentary
- Each title must be max 60 characters
- Each summary must be 1-2 sentences in plain English
- Each consequence must be exactly 1 sentence describing what happens if missed (use calm language)
- Steps MUST contain 3-5 simple, actionable items (NEVER empty)
- Confidence should reflect how certain you are about this obligation (0.0-1.0)
- Domain should be one of: visa, work, health, finance, study, housing, legal, general
- If a subject or topic is detected (course code, project name), include it
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
                          description: 'high=needs attention soon, medium=standard admin, low=flexible/informational' 
                        },
                        consequence: { 
                          type: 'string', 
                          description: 'One sentence: what happens if this is not completed (use calm language)' 
                        },
                        steps: { 
                          type: 'array', 
                          items: { type: 'string' },
                          description: 'REQUIRED: 3-5 concrete action steps. Never empty. Use supportive language.',
                          minItems: 3,
                          maxItems: 5
                        },
                        confidence: {
                          type: 'number',
                          minimum: 0,
                          maximum: 1,
                          description: 'How confident you are about this obligation (0.0-1.0)'
                        },
                        domain: {
                          type: 'string',
                          enum: ['visa', 'work', 'health', 'finance', 'study', 'housing', 'legal', 'general'],
                          description: 'Life domain category for this obligation'
                        },
                        subject: {
                          type: 'string',
                          nullable: true,
                          description: 'Subject or course code for grouping (e.g., COMP9417, Project Alpha)'
                        },
                        topic: {
                          type: 'string',
                          nullable: true,
                          description: 'Topic or assignment name for sub-grouping (e.g., Assignment 2, Final Exam)'
                        }
                      },
                      required: ['title', 'summary', 'risk_level', 'consequence', 'steps', 'confidence', 'domain']
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
    
    // Fallback steps by obligation type keywords
    const getDefaultSteps = (title: string, summary: string): string[] => {
      const text = `${title} ${summary}`.toLowerCase();
      
      if (text.includes('visa') || text.includes('immigration') || text.includes('right to work')) {
        return ['Gather required identity documents', 'Log in to the relevant portal when ready', 'Upload documents and confirm submission'];
      }
      if (text.includes('appointment') || text.includes('meeting') || text.includes('interview')) {
        return ['Check appointment details and location', 'Prepare any required documents', 'Attend or reschedule if needed'];
      }
      if (text.includes('payment') || text.includes('invoice') || text.includes('bill') || text.includes('fee')) {
        return ['Review the payment amount and due date', 'Set up your preferred payment method', 'Complete payment and save confirmation'];
      }
      if (text.includes('contract') || text.includes('agreement') || text.includes('sign')) {
        return ['Review terms and conditions at your pace', 'Prepare any required signatures', 'Return signed documents by deadline'];
      }
      if (text.includes('submit') || text.includes('application') || text.includes('form')) {
        return ['Gather all required information', 'Complete the application form', 'Submit and save confirmation'];
      }
      if (text.includes('assignment') || text.includes('essay') || text.includes('project')) {
        return ['Review the requirements carefully', 'Break down into manageable parts', 'Submit before the deadline'];
      }
      // Generic fallback
      return ['Review what\'s needed', 'Gather any required information', 'Complete when you\'re ready'];
    };

    // Fallback domain detection
    const detectDomain = (title: string, summary: string): string => {
      const text = `${title} ${summary}`.toLowerCase();
      
      const visaKeywords = ['visa', 'passport', 'immigration', 'bridging', 'migration', 'citizenship', 'travel document'];
      const workKeywords = ['work', 'job', 'employment', 'salary', 'payroll', 'contract', 'shift', 'roster'];
      const healthKeywords = ['health', 'medical', 'doctor', 'hospital', 'medicare', 'insurance', 'vaccination', 'appointment'];
      const financeKeywords = ['tax', 'bank', 'payment', 'loan', 'rent', 'bill', 'finance', 'money', 'superannuation'];
      const studyKeywords = ['study', 'university', 'school', 'course', 'enrol', 'exam', 'assignment', 'education'];
      const housingKeywords = ['lease', 'rental', 'property', 'accommodation', 'moving', 'landlord', 'tenant'];
      const legalKeywords = ['legal', 'court', 'lawyer', 'police', 'license', 'registration', 'compliance'];

      if (visaKeywords.some(k => text.includes(k))) return 'visa';
      if (workKeywords.some(k => text.includes(k))) return 'work';
      if (healthKeywords.some(k => text.includes(k))) return 'health';
      if (financeKeywords.some(k => text.includes(k))) return 'finance';
      if (studyKeywords.some(k => text.includes(k))) return 'study';
      if (housingKeywords.some(k => text.includes(k))) return 'housing';
      if (legalKeywords.some(k => text.includes(k))) return 'legal';
      
      return 'general';
    };

    // Validate and clean the obligations, ensuring at least 3 steps
    const validatedObligations = (result.obligations || []).map((ob: any) => {
      const title = String(ob.title || '').slice(0, 60);
      const summary = String(ob.summary || '');
      let steps = Array.isArray(ob.steps) ? ob.steps.slice(0, 5).map(String).filter((s: string) => s.trim()) : [];
      
      // Ensure minimum 3 steps - use fallback if needed
      if (steps.length < 3) {
        const fallbackSteps = getDefaultSteps(title, summary);
        // Fill in missing steps from fallback
        while (steps.length < 3 && fallbackSteps.length > 0) {
          const fallbackStep = fallbackSteps.shift()!;
          if (!steps.includes(fallbackStep)) {
            steps.push(fallbackStep);
          }
        }
      }

      // Ensure domain is valid
      const validDomains = ['visa', 'work', 'health', 'finance', 'study', 'housing', 'legal', 'general'];
      let domain = validDomains.includes(ob.domain) ? ob.domain : detectDomain(title, summary);

      return {
        title,
        summary,
        due_date: ob.due_date && /^\d{4}-\d{2}-\d{2}$/.test(ob.due_date) ? ob.due_date : null,
        risk_level: ['low', 'medium', 'high'].includes(ob.risk_level) ? ob.risk_level : 'medium',
        consequence: String(ob.consequence || ''),
        steps,
        confidence: typeof ob.confidence === 'number' ? Math.min(1, Math.max(0, ob.confidence)) : 0.5,
        domain,
        subject: ob.subject || null,
        topic: ob.topic || null
      };
    });

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
