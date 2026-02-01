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

CRITICAL RULES FOR STEPS:
- ALWAYS generate at least 3 concrete, actionable steps for every obligation
- Steps must be short, plain-English, and immediately actionable
- If the document does not explicitly list steps, INFER reasonable administrative steps based on the obligation type
- Never return an empty steps array
- Even if confidence is low, still provide best-guess steps

STEP EXAMPLES BY OBLIGATION TYPE:
- For "Proof of Right to Work": 1) Gather required identity documents 2) Log in to the relevant government or employer portal 3) Upload documents and confirm submission
- For appointments: 1) Check appointment details 2) Prepare required documents 3) Attend or reschedule if needed
- For payments/invoices: 1) Review the payment amount and due date 2) Set up payment method 3) Complete payment and save confirmation
- For visa/immigration: 1) Gather passport and supporting documents 2) Complete required application forms 3) Submit documents and track application status
- For contracts/agreements: 1) Review terms and conditions carefully 2) Prepare any required signatures or documentation 3) Return signed documents by deadline

OUTPUT REQUIREMENTS:
- Return ONLY valid JSON, no markdown, no commentary
- Each title must be max 60 characters
- Each summary must be 1-2 sentences in plain English
- Each consequence must be exactly 1 sentence describing what happens if missed
- Steps MUST contain 3-5 simple, actionable items (NEVER empty)
- Confidence should reflect how certain you are about this obligation (0.0-1.0)
- Domain should be one of: visa, work, health, finance, study, housing, legal, general
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
                          description: 'REQUIRED: 3-5 concrete action steps. Never empty. Infer reasonable steps if not explicitly stated.',
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
    
    // Fallback steps by obligation type keywords
    const getDefaultSteps = (title: string, summary: string): string[] => {
      const text = `${title} ${summary}`.toLowerCase();
      
      if (text.includes('visa') || text.includes('immigration') || text.includes('right to work')) {
        return ['Gather required identity documents', 'Log in to the relevant government or employer portal', 'Upload documents and confirm submission'];
      }
      if (text.includes('appointment') || text.includes('meeting') || text.includes('interview')) {
        return ['Check appointment details and location', 'Prepare required documents', 'Attend or reschedule if needed'];
      }
      if (text.includes('payment') || text.includes('invoice') || text.includes('bill') || text.includes('fee')) {
        return ['Review the payment amount and due date', 'Set up payment method', 'Complete payment and save confirmation'];
      }
      if (text.includes('contract') || text.includes('agreement') || text.includes('sign')) {
        return ['Review terms and conditions carefully', 'Prepare any required signatures', 'Return signed documents by deadline'];
      }
      if (text.includes('submit') || text.includes('application') || text.includes('form')) {
        return ['Gather all required information', 'Complete the application form', 'Submit and save confirmation'];
      }
      // Generic fallback
      return ['Review the requirements carefully', 'Gather any required documents or information', 'Complete the task and confirm'];
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
        domain
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
