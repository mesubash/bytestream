import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLogin } from "@workspace/api-client-react";
import { useAuthStore } from "@/store/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Play } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function Login() {
  const [_, setLocation] = useLocation();
  const setToken = useAuthStore((s) => s.setToken);
  const { toast } = useToast();
  
  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const loginMutation = useLogin({
    mutation: {
      onSuccess: (data) => {
        setToken(data.token);
        toast({ variant: "success", title: "Welcome back!", description: "Successfully logged in." });
        setLocation("/dashboard");
      },
      onError: (error: any) => {
        toast({ 
          variant: "destructive", 
          title: "Login failed", 
          description: error?.response?.data?.message || "Invalid credentials. Please try again." 
        });
      }
    }
  });

  const onSubmit = (data: LoginForm) => {
    loginMutation.mutate({ data });
  };

  return (
    <div className="min-h-screen w-full flex relative overflow-hidden bg-black">
      {/* Background Image & Overlay */}
      <div className="absolute inset-0 z-0">
        <img 
          src={`${import.meta.env.BASE_URL}images/auth-bg.png`} 
          alt="Abstract background" 
          className="w-full h-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/40 to-transparent" />
      </div>

      <div className="relative z-10 w-full flex items-center justify-center lg:justify-start lg:pl-32 xl:pl-48 p-6">
        <div className="w-full max-w-md glass-panel rounded-3xl p-8 sm:p-10 relative overflow-hidden">
          {/* Subtle glow effect behind card */}
          <div className="absolute -top-32 -right-32 w-64 h-64 bg-primary/20 blur-[100px] rounded-full pointer-events-none" />
          
          <div className="flex items-center gap-3 mb-8 relative">
            <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.4)]">
              <Play className="w-5 h-5 text-primary-foreground ml-0.5" />
            </div>
            <span className="font-display font-bold text-2xl text-white">ByteStream</span>
          </div>

          <div className="mb-8">
            <h1 className="text-3xl font-display font-bold text-white mb-2">Sign in</h1>
            <p className="text-muted-foreground text-sm">Enter your details to access your dashboard.</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-white/80 ml-1">Email</label>
              <Input 
                {...register("email")} 
                placeholder="name@example.com" 
                error={!!errors.email}
              />
              {errors.email && <p className="text-destructive text-xs ml-1">{errors.email.message}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-white/80 ml-1">Password</label>
              <Input 
                type="password"
                {...register("password")} 
                placeholder="••••••••" 
                error={!!errors.password}
              />
              {errors.password && <p className="text-destructive text-xs ml-1">{errors.password.message}</p>}
            </div>

            <Button 
              type="submit" 
              className="w-full mt-2" 
              size="lg"
              isLoading={loginMutation.isPending}
            >
              Sign In
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link href="/register" className="text-primary hover:text-primary/80 font-medium transition-colors">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
