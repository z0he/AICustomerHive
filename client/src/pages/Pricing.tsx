import React from "react";
import { Link } from "wouter";
import { ArrowLeft, Check } from "lucide-react";
import AIcrmLogo from "@/components/logo/AIcrmLogo";
import { BrandGradient } from "@/components/ui/brand-gradient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

const Pricing: React.FC = () => {
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
            <Link href="/features" className="text-slate-600 hover:text-[#0082AE] font-medium">Features</Link>
            <Link href="/pricing" className="text-[#0082AE] font-medium">Pricing</Link>
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
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl max-w-3xl mx-auto mb-8 text-white/90">
            No hidden fees. No complicated tiers. Just one straightforward plan.
          </p>
          <Link href="/">
            <Button variant="secondary" className="px-6">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Home
            </Button>
          </Link>
        </div>
      </BrandGradient>

      {/* Pricing Section */}
      <section className="py-20 bg-slate-50">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            <Card className="shadow-lg border-4 border-[#0082AE]">
              <CardHeader className="text-center bg-[#0082AE]/10 pb-6">
                <CardTitle className="text-3xl font-bold text-[#0082AE]">Free Plan</CardTitle>
                <p className="text-2xl font-bold mt-4">$0 <span className="text-slate-500 text-lg font-normal">/ month</span></p>
                <p className="text-slate-600 mt-2">Try it for free with full functionality</p>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 mt-1">
                      <Check className="h-5 w-5 text-[#8AC33E]" />
                    </div>
                    <div className="ml-3">
                      <p className="text-slate-900 font-medium">Complete CRM Suite</p>
                      <p className="text-slate-600 text-sm">All features included, no arbitrary limitations</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="flex-shrink-0 mt-1">
                      <Check className="h-5 w-5 text-[#8AC33E]" />
                    </div>
                    <div className="ml-3">
                      <p className="text-slate-900 font-medium">AI-Powered Tools</p>
                      <p className="text-slate-600 text-sm">Voice assistant, smart campaigns, automated insights</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="flex-shrink-0 mt-1">
                      <Check className="h-5 w-5 text-[#8AC33E]" />
                    </div>
                    <div className="ml-3">
                      <p className="text-slate-900 font-medium">Unlimited Contacts</p>
                      <p className="text-slate-600 text-sm">No per-user or per-contact pricing</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="flex-shrink-0 mt-1">
                      <Check className="h-5 w-5 text-[#8AC33E]" />
                    </div>
                    <div className="ml-3">
                      <p className="text-slate-900 font-medium">Email & Calendar Integration</p>
                      <p className="text-slate-600 text-sm">Works with your existing email provider and calendar</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="flex-shrink-0 mt-1">
                      <Check className="h-5 w-5 text-[#8AC33E]" />
                    </div>
                    <div className="ml-3">
                      <p className="text-slate-900 font-medium">Web Forms & Tracking</p>
                      <p className="text-slate-600 text-sm">Capture leads directly from your website</p>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col space-y-4 bg-slate-50 pb-8">
                <a href="https://aicrm.co.uk/auth?tab=register">
                  <Button className="w-full py-6 text-lg">Try it FREE — No credit card required</Button>
                </a>
                <p className="text-center text-slate-500 text-sm">No credit card required. Start using the full platform immediately.</p>
              </CardFooter>
            </Card>
            
            <div className="text-center mt-16">
              <h3 className="text-2xl font-bold text-slate-900 mb-4">Coming Soon: Premium Plans</h3>
              <p className="text-slate-600 max-w-2xl mx-auto">
                We're currently developing additional premium plans with enhanced features and support options.
                For now, enjoy our comprehensive free tier with full functionality.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-6 text-slate-900">Ready to Get Started?</h2>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto mb-8">
            Join thousands of businesses who've already simplified their customer relationship management.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <a href="https://aicrm.co.uk/auth?tab=register">
              <Button className="px-8 py-3 text-base">
                Try it FREE Today
              </Button>
            </a>
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

export default Pricing;