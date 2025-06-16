import React from "react";
import { Link } from "wouter";
import { 
  ArrowRight, 
  Check, 
  AlertTriangle, 
  DollarSign, 
  FrownIcon, 
  Mail,
  BrainCircuit,
  LineChart,
  Calendar,
  Shield 
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
          <AIcrmLogo width={180} height={60} />
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
            <h1 className="text-4xl md:text-6xl font-bold mb-6 text-white">
              CRMs Weren't Built for You. So We Built One That Was.
            </h1>
            <p className="text-xl mb-8 text-white/90">
              Ditch the bloated dashboards, shady pricing traps, and endless integrations.
              Welcome to a CRM that's fast, friendly, and freaking smart.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <a href="https://ai-crmuk.replit.app/auth?tab=register" target="_blank" rel="noopener noreferrer">
                <AccentButton className="px-8 h-9 text-base">
                  Try it FREE
                </AccentButton>
              </a>
              <button 
                className="bg-white text-[#0082AE] hover:bg-white/90 px-8 h-9 rounded-md font-medium text-base inline-flex items-center justify-center"
                onClick={() => window.open('https://app.arcade.software/share/lUpQ9EzkDA2vPyNM5PUe', '_blank')}
              >
                Or Explore the Interactive Demo
              </button>
            </div>
          </div>
        </div>
      </BrandGradient>

      {/* Section Headers */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-3">"No More Upsells. No More Excel."</h2>
              <p className="text-slate-600">Everything you need, powered by AI. Nothing you don't.</p>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-3">"Actually Use Every Feature You're Paying For."</h2>
              <p className="text-slate-600">Our tools don't just sit there. They work. Automatically.</p>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-3">"Setup in Minutes. Results in Days. Not Months."</h2>
              <p className="text-slate-600">Your CRM shouldn't feel like a second job. Ours doesn't.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pain Points Section */}
      <section className="py-20 bg-slate-50">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-slate-900 mb-16">TOP 3 PAIN POINTS (AND HOW YOU FIX THEM)</h2>

          {/* Problem 1 */}
          <div className="max-w-4xl mx-auto mb-16 bg-white p-8 rounded-lg shadow-sm">
            <div className="flex items-start">
              <div className="mr-4 mt-1">
                <AlertTriangle className="text-[#8AC33E]" size={32} />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">Problem #1: Feature Bloat, Locked Behind Paywalls</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="bg-slate-50 p-4 rounded-md">
                    <p className="font-semibold text-slate-900 mb-1">Their CRM:</p>
                    <p className="text-slate-700">Traps you in freemium hell, hiding critical tools behind upgrade prompts.</p>
                  </div>
                  <div className="bg-[#0082AE]/10 p-4 rounded-md">
                    <p className="font-semibold text-[#0082AE] mb-1">Ours:</p>
                    <p className="text-slate-700">Gives you the whole toolkit from day one—with smart defaults and zero clutter.</p>
                  </div>
                </div>
                <h4 className="text-lg font-semibold text-slate-900 mb-3">Your Fix:</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white border border-slate-200 p-4 rounded-md">
                    <div className="flex items-center mb-2">
                      <Check className="text-[#8AC33E] mr-2" size={20} />
                      <span className="font-medium">Smart Lead Scoring & Qualification</span>
                    </div>
                    <p className="text-slate-600 text-sm">Done for you via AI.</p>
                  </div>
                  <div className="bg-white border border-slate-200 p-4 rounded-md">
                    <div className="flex items-center mb-2">
                      <Check className="text-[#8AC33E] mr-2" size={20} />
                      <span className="font-medium">360° Customer Profiles</span>
                    </div>
                    <p className="text-slate-600 text-sm">Tag, filter, sort, segment however you want.</p>
                  </div>
                  <div className="bg-white border border-slate-200 p-4 rounded-md">
                    <div className="flex items-center mb-2">
                      <Check className="text-[#8AC33E] mr-2" size={20} />
                      <span className="font-medium">Campaigns, Emails, A/B Tests</span>
                    </div>
                    <p className="text-slate-600 text-sm">No add-ons, no BS.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Problem 2 */}
          <div className="max-w-4xl mx-auto mb-16 bg-white p-8 rounded-lg shadow-sm">
            <div className="flex items-start">
              <div className="mr-4 mt-1">
                <DollarSign className="text-[#8AC33E]" size={32} />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">Problem #2: Punishing Pricing, Tricky Contracts</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="bg-slate-50 p-4 rounded-md">
                    <p className="font-semibold text-slate-900 mb-1">Their CRM:</p>
                    <p className="text-slate-700">Forces you to "level up" every time you hit an arbitrary limit.</p>
                  </div>
                  <div className="bg-[#0082AE]/10 p-4 rounded-md">
                    <p className="font-semibold text-[#0082AE] mb-1">Ours:</p>
                    <p className="text-slate-700">Flat pricing. No hidden fees. Unlimited contacts.</p>
                  </div>
                </div>
                <h4 className="text-lg font-semibold text-slate-900 mb-3">Your Fix:</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white border border-slate-200 p-4 rounded-md">
                    <div className="flex items-center mb-2">
                      <Check className="text-[#8AC33E] mr-2" size={20} />
                      <span className="font-medium">Automated Email Sequences & Drip Campaigns</span>
                    </div>
                  </div>
                  <div className="bg-white border border-slate-200 p-4 rounded-md">
                    <div className="flex items-center mb-2">
                      <Check className="text-[#8AC33E] mr-2" size={20} />
                      <span className="font-medium">Integrated Calendar, Meeting Links, and Reminders</span>
                    </div>
                  </div>
                  <div className="bg-white border border-slate-200 p-4 rounded-md">
                    <div className="flex items-center mb-2">
                      <Check className="text-[#8AC33E] mr-2" size={20} />
                      <span className="font-medium">Real-time Dashboards & Performance Reports</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Problem 3 */}
          <div className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-sm">
            <div className="flex items-start">
              <div className="mr-4 mt-1">
                <FrownIcon className="text-[#8AC33E]" size={32} />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">Problem #3: Bad UX, Clunky Integrations, Zero Support</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="bg-slate-50 p-4 rounded-md">
                    <p className="font-semibold text-slate-900 mb-1">Their CRM:</p>
                    <p className="text-slate-700">Needs a dedicated admin. Or a PhD. Or therapy.</p>
                  </div>
                  <div className="bg-[#0082AE]/10 p-4 rounded-md">
                    <p className="font-semibold text-[#0082AE] mb-1">Ours:</p>
                    <p className="text-slate-700">Works out of the box, even with Outlook, Gmail, LinkedIn & Office365.</p>
                  </div>
                </div>
                <h4 className="text-lg font-semibold text-slate-900 mb-3">Your Fix:</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white border border-slate-200 p-4 rounded-md">
                    <div className="flex items-center mb-2">
                      <Check className="text-[#8AC33E] mr-2" size={20} />
                      <span className="font-medium">Voice-Activated AI Assistant</span>
                    </div>
                    <p className="text-slate-600 text-sm">Operate your CRM hands-free.</p>
                  </div>
                  <div className="bg-white border border-slate-200 p-4 rounded-md">
                    <div className="flex items-center mb-2">
                      <Check className="text-[#8AC33E] mr-2" size={20} />
                      <span className="font-medium">AI-Powered Guidance</span>
                    </div>
                    <p className="text-slate-600 text-sm">Get campaign tips, follow-up suggestions, and messaging help.</p>
                  </div>
                  <div className="bg-white border border-slate-200 p-4 rounded-md">
                    <div className="flex items-center mb-2">
                      <Check className="text-[#8AC33E] mr-2" size={20} />
                      <span className="font-medium">Smart Tasks & Nudges</span>
                    </div>
                    <p className="text-slate-600 text-sm">AI sets your to-do list based on real customer actions.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Everything You Get Section */}
      <BrandGradient className="py-20 text-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">EVERYTHING YOU GET (ALL-IN)</h2>
            <p className="text-white/90 max-w-2xl mx-auto">
              We built this CRM from the ground up to solve every single complaint we heard from frustrated users like you.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
            {/* Feature 1 */}
            <div className="bg-white p-6 rounded-lg shadow-md border border-white/10">
              <div className="w-12 h-12 bg-[#0082AE]/20 rounded-lg flex items-center justify-center mb-4">
                <BrainCircuit className="text-[#0082AE]" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-slate-900">Intelligent Lead Management</h3>
              <p className="text-slate-600 mb-4">
                Smart scoring, auto-qualification, tags, ownership, activity history
              </p>
              <p className="text-[#0082AE] italic">Works like magic. Feels like common sense.</p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white p-6 rounded-lg shadow-md border border-white/10">
              <div className="w-12 h-12 bg-[#0082AE]/20 rounded-lg flex items-center justify-center mb-4">
                <Mail className="text-[#0082AE]" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-slate-900">AI-Powered Campaigns & Content</h3>
              <p className="text-slate-600 mb-4">
                Email & drip campaigns with A/B testing
              </p>
              <p className="text-[#0082AE] italic">Natural language AI helps write, segment, and optimise</p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white p-6 rounded-lg shadow-md border border-white/10">
              <div className="w-12 h-12 bg-[#0082AE]/20 rounded-lg flex items-center justify-center mb-4">
                <LineChart className="text-[#0082AE]" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-slate-900">Advanced Dashboards & Analytics</h3>
              <p className="text-slate-600 mb-4">
                Funnel views, growth tracking, interactive graphs
              </p>
              <p className="text-[#0082AE] italic">Replace 5 tabs and 3 tools with 1 clear command centre</p>
            </div>

            {/* Feature 4 */}
            <div className="bg-white p-6 rounded-lg shadow-md border border-white/10">
              <div className="w-12 h-12 bg-[#0082AE]/20 rounded-lg flex items-center justify-center mb-4">
                <Calendar className="text-[#0082AE]" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-slate-900">Scheduling & Coordination Built-In</h3>
              <p className="text-slate-600 mb-4">
                Events, calls, video links, categories, colour codes
              </p>
              <p className="text-[#0082AE] italic">No more juggling external tools just to book a meeting</p>
            </div>
            
            {/* Security */}
            <div className="bg-white p-6 rounded-lg shadow-md border border-white/10">
              <div className="w-12 h-12 bg-[#0082AE]/20 rounded-lg flex items-center justify-center mb-4">
                <Shield className="text-[#0082AE]" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-slate-900">Enterprise-Grade Security</h3>
              <p className="text-slate-600 mb-4">
                Role-based permissions, encrypted data, full audit trails
              </p>
              <p className="text-[#0082AE] italic">GDPR-compliant, secure APIs—no compromises</p>
            </div>
          </div>
        </div>
      </BrandGradient>

      {/* Objection Killers */}
      <section className="py-20 bg-slate-50">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-slate-900 mb-12">OBJECTION KILLERS</h2>
          
          <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="text-xl font-bold text-slate-900 mb-3">"Switching CRMs is painful."</h3>
              <p className="text-slate-600 mb-4">We agree. That's why we do the hard part.</p>
              <p className="flex items-start">
                <ArrowRight className="text-[#8AC33E] mr-2 mt-1 flex-shrink-0" size={16} />
                <span className="text-slate-800">Free migration. Smart field-mapping. CSV import that actually works.</span>
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="text-xl font-bold text-slate-900 mb-3">"What if this doesn't work?"</h3>
              <p className="text-slate-600 mb-4">Try it free. Full features. No time limits.</p>
              <p className="text-slate-800">If you've been burned before, this one's built to earn your trust back.</p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="text-xl font-bold text-slate-900 mb-3">"Why is this better than HubSpot/Salesforce?"</h3>
              <p className="text-slate-600 mb-4">Because our CRM works for you—not the other way around.</p>
              <p className="text-slate-800">Simple UX. Real AI. Transparent pricing. Built for small teams, not massive org charts.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="bg-[#00556E] text-white py-16">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-4">Let Go of the CRM Bloat. Embrace Growth Without the Guesswork.</h2>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row mt-8">
            <a href="https://ai-crmuk.replit.app/auth?tab=register" target="_blank" rel="noopener noreferrer">
              <AccentButton className="px-8 py-3 text-base">
                Try it FREE — No credit card required
              </AccentButton>
            </a>
            <Link href="/demo">
              <button className="bg-white text-[#0082AE] hover:bg-white/90 px-8 py-3 rounded-md font-medium text-base">
                Watch a 3-minute demo
              </button>
            </Link>
            <Link href="/contact">
              <button className="bg-transparent border border-white text-white hover:bg-white/10 px-8 py-3 rounded-md font-medium text-base">
                Book a call with our team
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white py-12 border-t border-slate-200">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <AIcrmLogo width={160} height={60} />
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