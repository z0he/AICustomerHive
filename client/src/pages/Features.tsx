import React from "react";
import { Link } from "wouter";
import { 
  ArrowLeft,
  BrainCircuit,
  Mail,
  LineChart,
  Calendar,
  Shield,
  UserCheck,
  MessageSquare,
  BarChart4,
  Clock
} from "lucide-react";
import AIcrmLogo from "@/components/logo/AIcrmLogo";
import { BrandGradient } from "@/components/ui/brand-gradient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const FeatureCard: React.FC<{ 
  title: string; 
  description: string; 
  icon: React.ReactNode;
  highlight?: string;
}> = ({ title, description, icon, highlight }) => {
  return (
    <Card className="bg-white p-6 rounded-lg shadow-md border border-slate-200 h-full">
      <CardContent className="p-0 space-y-4">
        <div className="w-12 h-12 bg-[#0082AE]/20 rounded-lg flex items-center justify-center">
          {icon}
        </div>
        <h3 className="text-xl font-semibold text-slate-900">{title}</h3>
        <p className="text-slate-600">{description}</p>
        {highlight && (
          <p className="text-[#0082AE] italic">{highlight}</p>
        )}
      </CardContent>
    </Card>
  );
};

const Features: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white py-4 px-6 border-b border-slate-200">
        <div className="container mx-auto flex justify-between items-center">
          <Link href="/">
            <a className="flex items-center">
              <AIcrmLogo width={180} height={60} />
            </a>
          </Link>
          <div className="flex items-center space-x-6">
            <Link href="/features" className="text-[#0082AE] font-medium">Features</Link>
            <Link href="/pricing" className="text-slate-600 hover:text-[#0082AE] font-medium">Pricing</Link>
            <Link href="/contact" className="text-slate-600 hover:text-[#0082AE] font-medium">Contact</Link>
            <Link href="/auth">
              <Button variant="outline" className="ml-4">
                Log In
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <BrandGradient className="py-16 text-white">
        <div className="container mx-auto px-6 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 text-white">
            Features That Set Us Apart
          </h1>
          <p className="text-xl max-w-3xl mx-auto mb-8 text-white/90">
            Everything you need to manage customer relationships efficiently and intelligently,
            powered by the latest AI technology.
          </p>
          <Link href="/">
            <Button variant="secondary" className="px-6">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Home
            </Button>
          </Link>
        </div>
      </BrandGradient>

      {/* Features Grid */}
      <section className="py-20 bg-slate-50">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-slate-900 mb-16">OUR COMPLETE FEATURE SET</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
            <FeatureCard 
              title="Intelligent Lead Management" 
              description="Smart scoring, auto-qualification, tags, ownership, and complete activity history tracking."
              icon={<UserCheck className="text-[#0082AE]" />}
              highlight="Works like magic. Feels like common sense."
            />
            
            <FeatureCard 
              title="AI-Powered Campaigns & Content" 
              description="Email & drip campaigns with A/B testing and AI-generated content suggestions."
              icon={<Mail className="text-[#0082AE]" />}
              highlight="Natural language AI helps write, segment, and optimize."
            />
            
            <FeatureCard 
              title="Advanced Dashboards & Analytics" 
              description="Funnel views, growth tracking, interactive graphs and customizable reports."
              icon={<LineChart className="text-[#0082AE]" />}
              highlight="Replace 5 tabs and 3 tools with 1 clear command center."
            />
            
            <FeatureCard 
              title="Scheduling & Coordination Built-In" 
              description="Events, calls, video links, categories, and color codes without external tools."
              icon={<Calendar className="text-[#0082AE]" />}
              highlight="No more juggling external tools just to book a meeting."
            />
            
            <FeatureCard 
              title="Enterprise-Grade Security" 
              description="Role-based permissions, encrypted data, full audit trails, and GDPR compliance."
              icon={<Shield className="text-[#0082AE]" />}
              highlight="GDPR-compliant, secure APIs—no compromises."
            />
            
            <FeatureCard 
              title="Voice-Activated AI Assistant" 
              description="Control your CRM with natural language commands and get insights instantly."
              icon={<BrainCircuit className="text-[#0082AE]" />}
              highlight="Work hands-free and get more done in less time."
            />
            
            <FeatureCard 
              title="Smart Messaging & Communication" 
              description="Templated responses, personalized outreach, and multichannel communication."
              icon={<MessageSquare className="text-[#0082AE]" />}
              highlight="Reach the right person, with the right message, at the right time."
            />
            
            <FeatureCard 
              title="Performance Monitoring" 
              description="Track team and individual metrics, set goals, and get real-time feedback."
              icon={<BarChart4 className="text-[#0082AE]" />}
              highlight="Know exactly where you stand and how to improve."
            />
            
            <FeatureCard 
              title="Automated Follow-ups & Tasks" 
              description="Never miss an opportunity with smart reminders and prioritized task lists."
              icon={<Clock className="text-[#0082AE]" />}
              highlight="AI sets your to-do list based on real customer actions."
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-6 text-slate-900">Ready to Experience These Features?</h2>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto mb-8">
            Try our CRM risk-free today and discover how these powerful features can transform your business.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link href="/auth?tab=register">
              <Button className="px-8 py-3 text-base">
                Try it FREE — No credit card required
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-12">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-6 md:mb-0">
              <AIcrmLogo width={150} height={50} />
              <p className="mt-2 text-slate-400">The CRM Built for Humans, Powered by AI</p>
            </div>
            <div className="flex space-x-8">
              <Link href="/features" className="text-white hover:text-[#0082AE]">Features</Link>
              <Link href="/pricing" className="text-white hover:text-[#0082AE]">Pricing</Link>
              <Link href="/contact" className="text-white hover:text-[#0082AE]">Contact</Link>
            </div>
          </div>
          <div className="border-t border-slate-800 mt-8 pt-8 text-center text-slate-400">
            <p>© {new Date().getFullYear()} AI-CRM. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Features;