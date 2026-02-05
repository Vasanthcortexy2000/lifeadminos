import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, Mail, Lock, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';

const emailSchema = z.string().email('Please enter a valid email address');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; confirmPassword?: string }>({});
  
  const { signIn, signUp, user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Redirect if already logged in
  useEffect(() => {
    if (user && !loading) {
      navigate('/');
    }
  }, [user, loading, navigate]);

  const validateForm = () => {
    const newErrors: { email?: string; password?: string; confirmPassword?: string } = {};
    
    try {
      emailSchema.parse(email);
    } catch (e) {
      if (e instanceof z.ZodError) {
        newErrors.email = e.errors[0].message;
      }
    }

    try {
      passwordSchema.parse(password);
    } catch (e) {
      if (e instanceof z.ZodError) {
        newErrors.password = e.errors[0].message;
      }
    }

    if (!isLogin && password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            toast({
              title: 'Login failed',
              description: 'Invalid email or password. Please try again.',
              variant: 'destructive'
            });
          } else if (error.message.includes('Email not confirmed')) {
            toast({
              title: 'Email not verified',
              description: 'Please check your email and click the verification link.',
              variant: 'destructive'
            });
          } else {
            toast({
              title: 'Login failed',
              description: error.message,
              variant: 'destructive'
            });
          }
        } else {
          navigate('/');
        }
      } else {
        const { error } = await signUp(email, password);
        if (error) {
          if (error.message.includes('already registered')) {
            toast({
              title: 'Account exists',
              description: 'An account with this email already exists. Try logging in instead.',
              variant: 'destructive'
            });
          } else {
            toast({
              title: 'Sign up failed',
              description: error.message,
              variant: 'destructive'
            });
          }
        } else {
          toast({
            title: 'Check your email',
            description: 'We sent you a verification link. Please check your inbox.',
          });
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" role="status" aria-label="Loading">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row auth-background">
      {/* Left Side - Branding & Value Proposition */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary/5 flex-col justify-center px-12 py-16">
        <div className="max-w-md mx-auto">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
              <Shield className="w-7 h-7 text-primary-foreground" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Life Admin OS</h1>
              <p className="text-sm text-muted-foreground">Your responsibility guardian</p>
            </div>
          </div>

          {/* Tagline */}
          <h2 className="text-3xl font-semibold text-foreground mb-4 leading-tight">
            The last reminder app you'll ever need.
          </h2>
          
          <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
            Deadlines, appointments, follow-ups, timetables—everything that needs action, tracked in one place. Upload any document and get every due date extracted with step-by-step guidance on what to do next.
          </p>

          {/* What it does */}
          <div className="bg-card/60 rounded-xl p-5 mb-6 border border-border/50">
            <p className="text-sm font-medium text-foreground mb-3">What you get:</p>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-3">
                <div className="w-5 h-5 rounded bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-primary text-xs">📄</span>
                </div>
                <span className="text-muted-foreground"><span className="text-foreground font-medium">Automatic extraction</span> — Drop any document and get every deadline, due date & requirement instantly</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-5 h-5 rounded bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-primary text-xs">✓</span>
                </div>
                <span className="text-muted-foreground"><span className="text-foreground font-medium">Guided steps</span> — Know exactly what to do next with clear action items for every task</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-5 h-5 rounded bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-primary text-xs">🔔</span>
                </div>
                <span className="text-muted-foreground"><span className="text-foreground font-medium">Perfect timing</span> — Reminders when you actually need them, with follow-ups until it's done</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-5 h-5 rounded bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-primary text-xs">📅</span>
                </div>
                <span className="text-muted-foreground"><span className="text-foreground font-medium">One dashboard</span> — Everything organised by priority so nothing slips through</span>
              </li>
            </ul>
          </div>

          {/* Use cases */}
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground/80">Works for:</span> Assignments, exams, visa renewals, appointments, bills, subscriptions, contracts, follow-ups—if it has a date, it's tracked.
          </p>
        </div>
      </div>

      {/* Right Side - Auth Form */}
      <div className="flex-1 flex flex-col">
        {/* Mobile Header */}
        <header className="border-b border-border bg-card/80 backdrop-blur-sm lg:hidden" role="banner">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
                <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-primary-foreground" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <h1 className="text-base sm:text-lg font-semibold text-foreground">Life Admin OS</h1>
                <p className="text-xs text-muted-foreground hidden sm:block">Your responsibility guardian</p>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex items-center justify-center px-4 sm:px-6 py-8 sm:py-12" id="main-content">
          <div className="w-full max-w-md">
            {/* Mobile Value Prop */}
            <div className="lg:hidden mb-6 sm:mb-8 text-center">
              <h2 className="text-xl sm:text-2xl font-semibold text-foreground mb-2">
                {isLogin ? 'Welcome back' : 'Never miss anything again.'}
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground">
                {isLogin 
                  ? "Your deadlines and reminders are waiting." 
                  : "Deadlines, reminders, follow-ups, and guided steps—all in one place. The only app that tracks everything and tells you exactly what to do."}
              </p>
            </div>

            {/* Desktop Header */}
            <div className="hidden lg:block text-center mb-6 sm:mb-8">
              <h2 className="text-xl sm:text-2xl font-semibold text-foreground mb-2">
                {isLogin ? 'Welcome back' : 'Create your account'}
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground">
                {isLogin 
                  ? "I've been keeping track of things for you." 
                  : "Start organizing your life responsibilities today."}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5" noValidate>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 min-h-[48px] sm:min-h-[44px]"
                    required
                    aria-invalid={errors.email ? 'true' : undefined}
                    aria-describedby={errors.email ? 'email-error' : undefined}
                    autoComplete="email"
                  />
                </div>
                {errors.email && (
                  <p id="email-error" className="text-sm text-destructive" role="alert">{errors.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 min-h-[48px] sm:min-h-[44px]"
                    required
                    aria-invalid={errors.password ? 'true' : undefined}
                    aria-describedby={errors.password ? 'password-error' : undefined}
                    autoComplete={isLogin ? 'current-password' : 'new-password'}
                  />
                </div>
                {errors.password && (
                  <p id="password-error" className="text-sm text-destructive" role="alert">{errors.password}</p>
                )}
              </div>

              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-sm font-medium">
                    Confirm Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10 min-h-[48px] sm:min-h-[44px]"
                      required
                      aria-invalid={errors.confirmPassword ? 'true' : undefined}
                      aria-describedby={errors.confirmPassword ? 'confirm-password-error' : undefined}
                      autoComplete="new-password"
                    />
                  </div>
                  {errors.confirmPassword && (
                    <p id="confirm-password-error" className="text-sm text-destructive" role="alert">{errors.confirmPassword}</p>
                  )}
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full min-h-[48px] bg-[hsl(15_65%_55%)] hover:bg-[hsl(15_65%_48%)] text-white" 
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <span>Please wait...</span>
                ) : (
                  <>
                    {isLogin ? 'Sign in' : 'Create account'}
                    <ArrowRight className="ml-2 w-4 h-4" aria-hidden="true" />
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setErrors({});
                }}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors min-h-[44px] py-2 px-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
              >
                {isLogin 
                  ? "Don't have an account? Sign up" 
                  : 'Already have an account? Sign in'}
              </button>
            </div>

            {/* Trust Message */}
            <div className="mt-6 sm:mt-8 p-4 bg-secondary/50 rounded-xl" role="note">
              <p className="text-xs text-muted-foreground text-center leading-relaxed">
                Your documents stay private and secure. We never sell or share your data.
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
