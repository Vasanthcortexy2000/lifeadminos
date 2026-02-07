import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
 import { Shield, Mail, Lock, ArrowRight, FileUp, ListChecks, BellRing } from 'lucide-react';
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
      {/* Value Proposition - Visible on all screens */}
      <div className="lg:w-1/2 bg-primary/5 flex flex-col justify-center px-6 sm:px-8 lg:px-12 py-8 lg:py-16">
        <div className="max-w-md mx-auto w-full">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-6 lg:mb-8">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
              <Shield className="w-7 h-7 text-primary-foreground" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Life Admin OS</h1>
              <p className="text-sm text-muted-foreground">We remember so you don't have to.</p>
            </div>
          </div>

          {/* Tagline */}
          <h2 className="text-2xl lg:text-3xl font-semibold text-foreground mb-3 lg:mb-4 leading-tight">
            We remember so you don't have to.
          </h2>
          
          <p className="text-base lg:text-lg text-muted-foreground mb-6 leading-relaxed">
            When life gets busy, we make sure nothing slips through.
          </p>

          {/* 3 Value Props - Compact on mobile, expanded on desktop */}
          <div className="grid grid-cols-3 gap-3 lg:grid-cols-1 lg:gap-4 mb-6">
            <div className="flex flex-col items-center lg:flex-row lg:items-start gap-2 lg:gap-4 text-center lg:text-left">
              <div className="w-10 h-10 lg:w-11 lg:h-11 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <FileUp className="w-5 h-5 lg:w-6 lg:h-6 text-primary" aria-hidden="true" />
              </div>
              <div>
                <h3 className="text-xs lg:text-sm font-semibold text-foreground">Drop any document</h3>
                <p className="hidden lg:block text-sm text-muted-foreground">We extract deadlines and action items instantly</p>
              </div>
            </div>
            
            <div className="flex flex-col items-center lg:flex-row lg:items-start gap-2 lg:gap-4 text-center lg:text-left">
              <div className="w-10 h-10 lg:w-11 lg:h-11 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <ListChecks className="w-5 h-5 lg:w-6 lg:h-6 text-primary" aria-hidden="true" />
              </div>
              <div>
                <h3 className="text-xs lg:text-sm font-semibold text-foreground">Get guided steps</h3>
                <p className="hidden lg:block text-sm text-muted-foreground">We tell you exactly what to do and when</p>
              </div>
            </div>
            
            <div className="flex flex-col items-center lg:flex-row lg:items-start gap-2 lg:gap-4 text-center lg:text-left">
              <div className="w-10 h-10 lg:w-11 lg:h-11 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <BellRing className="w-5 h-5 lg:w-6 lg:h-6 text-primary" aria-hidden="true" />
              </div>
              <div>
                <h3 className="text-xs lg:text-sm font-semibold text-foreground">Never forget</h3>
                <p className="hidden lg:block text-sm text-muted-foreground">We follow up until it's done</p>
              </div>
            </div>
          </div>

          {/* Universal tagline */}
          <p className="hidden lg:block text-sm text-muted-foreground border-t border-border/50 pt-4">
            If you need to remember it, we've got it covered.
          </p>
        </div>
      </div>

      {/* Right Side - Auth Form */}
      <div className="flex-1 flex flex-col">

        {/* Main Content */}
        <main className="flex-1 flex items-center justify-center px-6 sm:px-8 py-8 sm:py-12" id="main-content">
          <div className="w-full max-w-md">
            {/* Form Header */}
            <div className="text-center mb-6 sm:mb-8">
              <h2 className="text-xl sm:text-2xl font-semibold text-foreground mb-2">
                {isLogin ? 'Welcome back' : 'Create your account'}
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground">
                {isLogin 
                  ? "Your deadlines and reminders are waiting." 
                  : "Start tracking everything that matters."}
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
