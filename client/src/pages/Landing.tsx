import React from "react";
import { Link } from "wouter";
import { 
  ArrowRight, 
  Check, 
  Zap, 
  LineChart, 
  Users, 
  Mail,
  BrainCircuit 
} from "lucide-react";
import AIcrmLogo from "@/components/logo/AIcrmLogo";
import { AccentButton } from "@/components/ui/accent-button";
import { BrandGradient } from "@/components/ui/brand-gradient";
import { BrandBadge } from "@/components/ui/brand-badge";

const Landing: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white py-4 px-6 border-b border-slate-200">
        <div className="container mx-auto flex justify-between items-center">
          <AIcrmLogo width={40} height={40} />
          <div className="flex items-center space-x-6">
            <Link href="/features" className="text-slate-600 hover:text-[#0082AE] font-medium">Features</Link>
            <Link href="/pricing" className="text-slate-600 hover:text-[#0082AE] font-medium">Pricing</Link>
            <Link href="/contact" className="text-slate-600 hover:text-[#0082AE] font-medium">Contact</Link>
            <Link href="/auth">
              <AccentButton variant="outline" className="ml-4">
                Log In
              </AccentButton>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <BrandGradient className="py-20 text-white">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center">
            <BrandBadge variant="accentLight" className="mb-4">AI-POWERED CRM</BrandBadge>
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              The CRM Built for Humans, Powered by AI
            </h1>
            <p className="text-xl mb-8 text-white/90">
              CRMs weren't built for you—until now. AICRM finally delivers what every business deserves: simplicity that drives results.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <AccentButton className="px-8 py-3 text-base">
                Get Started Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </AccentButton>
              <Link href="/demo">
                <button className="bg-white text-[#0082AE] hover:bg-white/90 px-8 py-3 rounded-md font-medium text-base">
                  Watch Demo
                </button>
              </Link>
            </div>
          </div>
        </div>
      </BrandGradient>

      {/* Features Section */}
      <section className="py-20 bg-slate-50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Features Built for Growth</h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              Everything you need to manage leads, nurture relationships, and close more deals—without the complexity.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature Card 1 */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-100">
              <div className="w-12 h-12 bg-[#0082AE]/10 rounded-lg flex items-center justify-center mb-4">
                <BrainCircuit className="text-[#0082AE]" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-slate-900">AI Assistant</h3>
              <p className="text-slate-600 mb-4">
                Get instant insights and recommendations based on your customer data.
              </p>
              <ul className="space-y-2">
                <li className="flex items-center">
                  <Check className="text-[#8AC33E] mr-2 h-5 w-5" />
                  <span className="text-slate-700">Voice & chat assistants</span>
                </li>
                <li className="flex items-center">
                  <Check className="text-[#8AC33E] mr-2 h-5 w-5" />
                  <span className="text-slate-700">Automated insights</span>
                </li>
              </ul>
            </div>

            {/* Feature Card 2 */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-100">
              <div className="w-12 h-12 bg-[#0082AE]/10 rounded-lg flex items-center justify-center mb-4">
                <LineChart className="text-[#0082AE]" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-slate-900">Smart Analytics</h3>
              <p className="text-slate-600 mb-4">
                Track performance and identify opportunities with real-time data.
              </p>
              <ul className="space-y-2">
                <li className="flex items-center">
                  <Check className="text-[#8AC33E] mr-2 h-5 w-5" />
                  <span className="text-slate-700">Custom dashboards</span>
                </li>
                <li className="flex items-center">
                  <Check className="text-[#8AC33E] mr-2 h-5 w-5" />
                  <span className="text-slate-700">Conversion tracking</span>
                </li>
              </ul>
            </div>

            {/* Feature Card 3 */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-100">
              <div className="w-12 h-12 bg-[#0082AE]/10 rounded-lg flex items-center justify-center mb-4">
                <Mail className="text-[#0082AE]" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-slate-900">Email Campaigns</h3>
              <p className="text-slate-600 mb-4">
                Create, send, and analyze email campaigns that convert.
              </p>
              <ul className="space-y-2">
                <li className="flex items-center">
                  <Check className="text-[#8AC33E] mr-2 h-5 w-5" />
                  <span className="text-slate-700">AI-generated templates</span>
                </li>
                <li className="flex items-center">
                  <Check className="text-[#8AC33E] mr-2 h-5 w-5" />
                  <span className="text-slate-700">A/B testing</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="bg-[#00556E] text-white py-16">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to transform your customer relationships?</h2>
          <p className="text-white/80 max-w-2xl mx-auto mb-8">
            Join thousands of businesses using AICRM to grow faster and smarter.
          </p>
          <AccentButton className="px-8 py-3 text-base">
            Start Your Free Trial
          </AccentButton>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white py-12 border-t border-slate-200">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <AIcrmLogo width={32} height={32} />
              <p className="mt-4 text-slate-600">
                AI-powered CRM for modern businesses.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-slate-900 mb-4">Product</h4>
              <ul className="space-y-2">
                <li><Link href="/features" className="text-slate-600 hover:text-[#0082AE]">Features</Link></li>
                <li><Link href="/pricing" className="text-slate-600 hover:text-[#0082AE]">Pricing</Link></li>
                <li><Link href="/roadmap" className="text-slate-600 hover:text-[#0082AE]">Roadmap</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-slate-900 mb-4">Company</h4>
              <ul className="space-y-2">
                <li><Link href="/about" className="text-slate-600 hover:text-[#0082AE]">About</Link></li>
                <li><Link href="/contact" className="text-slate-600 hover:text-[#0082AE]">Contact</Link></li>
                <li><Link href="/careers" className="text-slate-600 hover:text-[#0082AE]">Careers</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-slate-900 mb-4">Legal</h4>
              <ul className="space-y-2">
                <li><Link href="/privacy" className="text-slate-600 hover:text-[#0082AE]">Privacy</Link></li>
                <li><Link href="/terms" className="text-slate-600 hover:text-[#0082AE]">Terms</Link></li>
                <li><Link href="/cookies" className="text-slate-600 hover:text-[#0082AE]">Cookies</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-slate-200 text-center text-slate-500">
            <p>&copy; {new Date().getFullYear()} AICRM. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;