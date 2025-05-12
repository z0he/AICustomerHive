import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, ArrowRight, AlertCircle, DollarSign, Frown } from "lucide-react";

export default function LandingPage() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-slate-50">
      {/* Navbar */}
      <header className="container mx-auto py-6 px-4 md:px-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-xl">A</span>
          </div>
          <h1 className="text-xl font-bold">AICRM</h1>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate("/auth")}>
            Log in
          </Button>
          <Button onClick={() => navigate("/auth?tab=register")}>
            Try for free
          </Button>
        </div>
      </header>

      {/* Hero section */}
      <section className="container mx-auto px-4 md:px-6 pt-12 pb-24 text-center">
        <Badge className="mb-4 py-1.5 px-4 text-sm font-medium">The CRM Built for Humans, Powered by AI</Badge>
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
          CRMs Weren't Built for You. <br />
          So We Built One That Was.
        </h1>
        <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-12">
          Ditch the bloated dashboards, shady pricing traps, and endless integrations.
          Welcome to a CRM that's fast, friendly, and freaking smart.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button size="lg" className="py-6 px-6 text-lg" onClick={() => navigate("/auth?tab=register")}>
            Try it FREE — No credit card required
          </Button>
          <Button size="lg" variant="outline" className="py-6 px-6 text-lg">
            Watch a 3-minute demo
          </Button>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-slate-50 py-24">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-bold mb-4">"No More Upsells. No More Excel."</h2>
            <p className="text-xl text-muted-foreground">Everything you need, powered by AI. Nothing you don't.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="overflow-hidden border-0 shadow-lg">
              <CardContent className="p-0">
                <div className="bg-primary/10 p-6">
                  <AlertCircle className="h-12 w-12 text-primary mb-4" />
                  <h3 className="text-xl font-bold mb-2">🚨 Problem #1: Feature Bloat, Locked Behind Paywalls</h3>
                  <div className="space-y-1 mb-4">
                    <p className="text-muted-foreground"><strong>Their CRM:</strong> Traps you in freemium hell, hiding critical tools behind upgrade prompts.</p>
                    <p><strong>Ours:</strong> Gives you the whole toolkit from day one—with smart defaults and zero clutter.</p>
                  </div>
                </div>
                <div className="p-6">
                  <h4 className="font-semibold mb-4">Your Fix:</h4>
                  <ul className="space-y-3">
                    <li className="flex gap-2">
                      <Check className="h-5 w-5 text-primary flex-shrink-0" />
                      <span>Smart Lead Scoring & Qualification — Done for you via AI.</span>
                    </li>
                    <li className="flex gap-2">
                      <Check className="h-5 w-5 text-primary flex-shrink-0" />
                      <span>360° Customer Profiles — Tag, filter, sort, segment however you want.</span>
                    </li>
                    <li className="flex gap-2">
                      <Check className="h-5 w-5 text-primary flex-shrink-0" />
                      <span>Campaigns, Emails, A/B Tests — No add-ons, no BS.</span>
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden border-0 shadow-lg">
              <CardContent className="p-0">
                <div className="bg-primary/10 p-6">
                  <DollarSign className="h-12 w-12 text-primary mb-4" />
                  <h3 className="text-xl font-bold mb-2">💸 Problem #2: Punishing Pricing, Tricky Contracts</h3>
                  <div className="space-y-1 mb-4">
                    <p className="text-muted-foreground"><strong>Their CRM:</strong> Forces you to "level up" every time you hit an arbitrary limit.</p>
                    <p><strong>Ours:</strong> Flat pricing. No hidden fees. Unlimited contacts.</p>
                  </div>
                </div>
                <div className="p-6">
                  <h4 className="font-semibold mb-4">Your Fix:</h4>
                  <ul className="space-y-3">
                    <li className="flex gap-2">
                      <Check className="h-5 w-5 text-primary flex-shrink-0" />
                      <span>Automated Email Sequences & Drip Campaigns</span>
                    </li>
                    <li className="flex gap-2">
                      <Check className="h-5 w-5 text-primary flex-shrink-0" />
                      <span>Integrated Calendar, Meeting Links, and Reminders</span>
                    </li>
                    <li className="flex gap-2">
                      <Check className="h-5 w-5 text-primary flex-shrink-0" />
                      <span>Real-time Dashboards & Performance Reports</span>
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden border-0 shadow-lg">
              <CardContent className="p-0">
                <div className="bg-primary/10 p-6">
                  <Frown className="h-12 w-12 text-primary mb-4" />
                  <h3 className="text-xl font-bold mb-2">😵 Problem #3: Bad UX, Clunky Integrations, Zero Support</h3>
                  <div className="space-y-1 mb-4">
                    <p className="text-muted-foreground"><strong>Their CRM:</strong> Needs a dedicated admin. Or a PhD. Or therapy.</p>
                    <p><strong>Ours:</strong> Works out of the box, even with Outlook, Gmail, LinkedIn & Office365.</p>
                  </div>
                </div>
                <div className="p-6">
                  <h4 className="font-semibold mb-4">Your Fix:</h4>
                  <ul className="space-y-3">
                    <li className="flex gap-2">
                      <Check className="h-5 w-5 text-primary flex-shrink-0" />
                      <span>Voice-Activated AI Assistant — Operate your CRM hands-free.</span>
                    </li>
                    <li className="flex gap-2">
                      <Check className="h-5 w-5 text-primary flex-shrink-0" />
                      <span>AI-Powered Guidance — Get campaign tips, follow-up suggestions, and messaging help.</span>
                    </li>
                    <li className="flex gap-2">
                      <Check className="h-5 w-5 text-primary flex-shrink-0" />
                      <span>Smart Tasks & Nudges — AI sets your to-do list based on real customer actions.</span>
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Second tagline */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4 md:px-6 text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold mb-4">"Actually Use Every Feature You're Paying For."</h2>
            <p className="text-xl text-muted-foreground mb-6">Our tools don't just sit there. They work. Automatically.</p>
          </div>
          
          <div className="max-w-4xl mx-auto mt-16">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="bg-slate-50 rounded-lg p-8 text-left">
                <h3 className="text-xl font-bold mb-4">✅ Intelligent Lead Management</h3>
                <p className="text-muted-foreground mb-2">Smart scoring, auto-qualification, tags, ownership, activity history</p>
                <p className="font-medium">Works like magic. Feels like common sense.</p>
              </div>
              
              <div className="bg-slate-50 rounded-lg p-8 text-left">
                <h3 className="text-xl font-bold mb-4">✅ AI-Powered Campaigns & Content</h3>
                <p className="text-muted-foreground mb-2">Email & drip campaigns with A/B testing</p>
                <p className="font-medium">Natural language AI helps write, segment, and optimise</p>
              </div>
              
              <div className="bg-slate-50 rounded-lg p-8 text-left">
                <h3 className="text-xl font-bold mb-4">✅ Full Campaign Management Suite</h3>
                <p className="text-muted-foreground mb-2">Multi-channel. Multi-step. Auto-optimised.</p>
                <p className="font-medium">Real-time conversion insights and audience analysis</p>
              </div>
              
              <div className="bg-slate-50 rounded-lg p-8 text-left">
                <h3 className="text-xl font-bold mb-4">✅ 360° Customer & Activity Tracking</h3>
                <p className="text-muted-foreground mb-2">Custom fields, lifecycle stages, engagement scoring</p>
                <p className="font-medium">See what matters. Ditch the noise.</p>
              </div>
            </div>
            
            <div className="grid gap-6 md:grid-cols-2 mt-6">
              <div className="bg-slate-50 rounded-lg p-8 text-left">
                <h3 className="text-xl font-bold mb-4">✅ Advanced Dashboards & Analytics</h3>
                <p className="text-muted-foreground mb-2">Funnel views, growth tracking, interactive graphs</p>
                <p className="font-medium">Replace 5 tabs and 3 tools with 1 clear command centre</p>
              </div>
              
              <div className="bg-slate-50 rounded-lg p-8 text-left">
                <h3 className="text-xl font-bold mb-4">✅ Smart Tasks & Automation</h3>
                <p className="text-muted-foreground mb-2">AI-suggested actions. Auto-prioritised.</p>
                <p className="font-medium">Integrated calendar, reminders, team accountability</p>
              </div>
              
              <div className="bg-slate-50 rounded-lg p-8 text-left">
                <h3 className="text-xl font-bold mb-4">✅ Scheduling & Coordination Built-In</h3>
                <p className="text-muted-foreground mb-2">Events, calls, video links, categories, colour codes</p>
                <p className="font-medium">No more juggling external tools just to book a meeting</p>
              </div>
              
              <div className="bg-slate-50 rounded-lg p-8 text-left">
                <h3 className="text-xl font-bold mb-4">✅ Enterprise-Grade Security from Day One</h3>
                <p className="text-muted-foreground mb-2">Role-based permissions, encrypted data, full audit trails</p>
                <p className="font-medium">GDPR-compliant, secure APIs—no compromises</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Third tagline */}
      <section className="py-24 bg-slate-50">
        <div className="container mx-auto px-4 md:px-6 text-center">
          <h2 className="text-3xl font-bold mb-4">"Setup in Minutes. Results in Days. Not Months."</h2>
          <p className="text-xl text-muted-foreground mb-16 max-w-3xl mx-auto">Your CRM shouldn't feel like a second job. Ours doesn't.</p>
          
          <div className="max-w-4xl mx-auto">
            <div className="grid gap-8 md:grid-cols-3">
              <Card className="text-left p-6 border-0 shadow-md">
                <h3 className="text-xl font-bold mb-3">"Switching CRMs is painful."</h3>
                <p className="text-muted-foreground mb-4">We agree. That's why we do the hard part.</p>
                <p className="flex items-start gap-2">
                  <ArrowRight className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
                  <span>Free migration. Smart field-mapping. CSV import that actually works.</span>
                </p>
              </Card>
              
              <Card className="text-left p-6 border-0 shadow-md">
                <h3 className="text-xl font-bold mb-3">"What if this doesn't work?"</h3>
                <p className="text-muted-foreground mb-4">Try it free. Full features. No time limits.</p>
                <p className="flex items-start gap-2">
                  <ArrowRight className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
                  <span>If you've been burned before, this one's built to earn your trust back.</span>
                </p>
              </Card>
              
              <Card className="text-left p-6 border-0 shadow-md">
                <h3 className="text-xl font-bold mb-3">"Why is this better than HubSpot/Salesforce?"</h3>
                <p className="text-muted-foreground mb-4">Because our CRM works for you—not the other way around.</p>
                <p className="flex items-start gap-2">
                  <ArrowRight className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
                  <span>Simple UX. Real AI. Transparent pricing. Built for small teams, not massive org charts.</span>
                </p>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* CTA section */}
      <section className="py-24 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 md:px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Let Go of the CRM Bloat. Embrace Growth Without the Guesswork.
          </h2>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
            <Button size="lg" variant="secondary" className="py-6 px-6 text-lg bg-white text-primary hover:bg-white/90" onClick={() => navigate("/auth?tab=register")}>
              🟢 Try it FREE — No credit card required
            </Button>
            <Button size="lg" variant="outline" className="py-6 px-6 text-lg border-white text-white hover:bg-white/10">
              📽 Watch a 3-minute demo
            </Button>
            <Button size="lg" variant="outline" className="py-6 px-6 text-lg border-white text-white hover:bg-white/10">
              🤝 Book a call with our team
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-200 py-12">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-2 mb-6 md:mb-0">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">A</span>
              </div>
              <h2 className="text-lg font-bold">AICRM</h2>
            </div>
            
            <div className="flex gap-8 mb-6 md:mb-0">
              <a href="#" className="hover:text-white transition-colors">Features</a>
              <a href="#" className="hover:text-white transition-colors">Pricing</a>
              <a href="#" className="hover:text-white transition-colors">Testimonials</a>
              <a href="#" className="hover:text-white transition-colors">Contact</a>
            </div>
            
            <div>
              <Button variant="outline" size="sm" className="border-slate-700 text-slate-300 hover:text-white hover:border-slate-600">
                Log In
              </Button>
            </div>
          </div>
          
          <div className="border-t border-slate-800 mt-8 pt-8 text-center text-sm text-slate-400">
            © {new Date().getFullYear()} CRM.ai. All rights reserved. Privacy Policy | Terms of Service
          </div>
        </div>
      </footer>
    </div>
  );
}